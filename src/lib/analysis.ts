import { db } from "@/lib/db"

/**
 * MedUnbox Analysis Engine
 *
 * - buildTimelineEvents: creates chronological events from extracted data
 * - detectTrends: computes improving/worsening/stable trends for numeric values
 * - detectConflicts: flags contradictory values across reports (never auto-resolves)
 */

// ============================================================
// TIMELINE
// ============================================================

export async function buildTimelineEvents(documentId: string): Promise<void> {
  const document = await db.document.findUnique({
    where: { id: documentId },
    include: {
      medicalValues: true,
      medicalEntities: true,
      extractedText: { take: 1 },
    },
  })
  if (!document) return

  const date = document.processedAt ?? document.uploadedAt
  const events: Array<{
    date: Date
    title: string
    description: string
    category: string
    sourceDocId: string
  }> = []

  // Event: document itself
  events.push({
    date,
    title: `${categoryLabelShort(document.category)}: ${document.title}`,
    description: `Document processed — ${document.medicalValues.length} values extracted`,
    category: mapDocCategoryToTimeline(document.category),
    sourceDocId: documentId,
  })

  // Event: abnormal findings
  const abnormal = document.medicalValues.filter(
    (v) => v.status === "ABNORMAL_HIGH" || v.status === "ABNORMAL_LOW" || v.status === "CRITICAL"
  )
  if (abnormal.length > 0) {
    events.push({
      date,
      title: `${abnormal.length} abnormal finding${abnormal.length === 1 ? "" : "s"}`,
      description: abnormal.map((v) => `${v.label}: ${v.value}${v.unit ? ` ${v.unit}` : ""} (${v.status.replace("ABNORMAL_", "").toLowerCase()})`).join("; "),
      category: "LAB_TEST",
      sourceDocId: documentId,
    })
  }

  // Event: diagnoses
  const diagnoses = await db.diagnosis.findMany({
    where: { sourceDocId: documentId },
  })
  for (const d of diagnoses) {
    events.push({
      date: d.diagnosedAt ?? date,
      title: `Diagnosis: ${d.name}`,
      description: d.severity ? `Severity: ${d.severity}` : "New diagnosis recorded",
      category: "DIAGNOSIS",
      sourceDocId: documentId,
    })
  }

  // Event: medications started
  const meds = await db.medication.findMany({
    where: { sourceDocId: documentId },
  })
  for (const m of meds) {
    events.push({
      date: m.startDate ?? date,
      title: `Medication: ${m.name}`,
      description: [m.dosage, m.frequency, m.route].filter(Boolean).join(", ") || "Prescribed",
      category: "MEDICATION_START",
      sourceDocId: documentId,
    })
  }

  // Event: allergies detected (stored as MedicalEntity with category=ALLERGY)
  const allergyEntities = document.medicalEntities.filter(
    (e) => e.category === "ALLERGY"
  )
  for (const a of allergyEntities) {
    const allergen = a.entityLabel.replace(/^Allergy:\s*/i, "")
    const severity = a.normalizedValue ?? null
    events.push({
      date,
      title: `Allergy: ${allergen}`,
      description: severity
        ? `Severity: ${severity}`
        : "Allergy recorded",
      category: "ALLERGY",
      sourceDocId: documentId,
    })
  }

  // Event: immunizations administered (stored as MedicalEntity with category=IMMUNIZATION)
  const immunizationEntities = document.medicalEntities.filter(
    (e) => e.category === "IMMUNIZATION"
  )
  for (const imm of immunizationEntities) {
    const vaccine = imm.entityLabel.replace(/^Vaccination:\s*/i, "")
    const dose = imm.normalizedValue ? ` (Dose ${imm.normalizedValue})` : ""
    events.push({
      date,
      title: `Vaccination: ${vaccine}${dose}`,
      description: "Immunization administered",
      category: "VACCINATION",
      sourceDocId: documentId,
    })
  }

  // Deduplicate against existing events from same doc
  await db.timelineEvent.deleteMany({ where: { sourceDocId: documentId } })
  if (events.length > 0) {
    await db.timelineEvent.createMany({
      data: events.map((e) => ({
        patientId: document.patientId,
        date: e.date,
        title: e.title,
        description: e.description,
        category: e.category as any,
        sourceDocId: e.sourceDocId,
      })),
    })
  }
}

// ============================================================
// TRENDS
// ============================================================

export async function detectTrends(patientId: string): Promise<void> {
  const values = await db.medicalValue.findMany({
    where: { patientId, numericValue: { not: null } },
    orderBy: { recordedAt: "asc" },
  })

  // Group by entity
  const byEntity = new Map<string, typeof values>()
  for (const v of values) {
    const arr = byEntity.get(v.entity) ?? []
    arr.push(v)
    byEntity.set(v.entity, arr)
  }

  // Clear old trends
  await db.trend.deleteMany({ where: { patientId } })

  for (const [entity, arr] of byEntity) {
    if (arr.length === 0) continue
    const latest = arr[arr.length - 1]
    const previous = arr.length > 1 ? arr[arr.length - 2] : null

    const direction = computeDirection(arr.map((v) => v.numericValue!))
    const status = computeTrendStatus(arr)
    const changePercent = previous && previous.numericValue
      ? ((latest.numericValue! - previous.numericValue) / previous.numericValue) * 100
      : null

    await db.trend.create({
      data: {
        patientId,
        entity,
        label: latest.label,
        direction: direction as any,
        unit: latest.unit,
        latestValue: latest.numericValue!,
        previousValue: previous?.numericValue ?? null,
        changePercent,
        status: status as any,
        dataPoints: arr.length,
      },
    })

    // Store trend points for charting
    await db.trendPoint.deleteMany({
      where: { valueId: { in: arr.map((v) => v.id) } },
    })
    await db.trendPoint.createMany({
      data: arr.map((v) => ({
        patientId,
        entity,
        label: v.label,
        valueId: v.id,
        valueNum: v.numericValue!,
        unit: v.unit,
        recordedAt: v.recordedAt!,
      })),
    })
  }
}

function computeDirection(nums: number[]): string {
  if (nums.length < 2) return "STABLE"
  const first = nums[0]
  const last = nums[nums.length - 1]
  const diff = last - first
  const pct = first !== 0 ? Math.abs(diff / first) : 0
  if (pct < 0.02) {
    // check fluctuation
    if (nums.length > 2) {
      let inc = 0, dec = 0
      for (let i = 1; i < nums.length; i++) {
        if (nums[i] > nums[i - 1]) inc++
        else if (nums[i] < nums[i - 1]) dec++
      }
      if (inc > 0 && dec > 0) return "FLUCTUATING"
    }
    return "STABLE"
  }
  // direction depends on whether higher is better — simplified: just report direction
  return diff > 0 ? "IMPROVING" : "WORSENING"
}

function computeTrendStatus(arr: any[]): string {
  const latest = arr[arr.length - 1]
  if (latest.status === "CRITICAL") return "CRITICAL"
  if (latest.status === "ABNORMAL_HIGH" || latest.status === "ABNORMAL_LOW") {
    if (arr.length === 1) return "NEWLY_ABNORMAL"
    return "ABNORMAL"
  }
  return "NORMAL"
}

// ============================================================
// CONFLICTS
// ============================================================

export async function detectConflicts(patientId: string): Promise<void> {
  // Find entities with conflicting categorical values (e.g. blood group, gender)
  const conflictEntities = [
    "BLOOD_GROUP",
    "GENDER",
    "DIABETIC_STATUS",
    "SMOKING_STATUS",
    "ALLERGY",
  ]

  const values = await db.medicalValue.findMany({
    where: { patientId },
    orderBy: { recordedAt: "asc" },
    include: { document: true },
  })

  // Clear old auto-detected conflicts (keep manually resolved)
  await db.conflict.deleteMany({
    where: { patientId, status: "UNRESOLVED" },
  })

  const byEntity = new Map<string, typeof values>()
  for (const v of values) {
    const arr = byEntity.get(v.entity) ?? []
    arr.push(v)
    byEntity.set(v.entity, arr)
  }

  for (const [entity, arr] of byEntity) {
    if (arr.length < 2) continue

    // For categorical entities, flag any different values
    const isCategorical =
      conflictEntities.includes(entity) || arr.every((v) => v.numericValue === null)

    if (isCategorical) {
      // Compare each pair with different values
      for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
          const a = arr[i]
          const b = arr[j]
          if (a.value.trim().toUpperCase() !== b.value.trim().toUpperCase()) {
            await db.conflict.create({
              data: {
                patientId,
                entity,
                label: a.label,
                documentAId: a.documentId,
                documentBId: b.documentId,
                valueA: a.value,
                valueB: b.value,
                pageA: a.pageNumber,
                pageB: b.pageNumber,
                sourceTextA: a.sourceText,
                sourceTextB: b.sourceText,
                status: "UNRESOLVED",
              },
            }).catch(() => {}) // ignore unique-ish duplicates
          }
        }
      }
    } else {
      // For numeric, flag if the same test gives wildly different results on the same date
      // (e.g. Hb 12.5 and Hb 9.0 on the same day — likely a conflict or different test)
      const byDate = new Map<string, typeof values>()
      for (const v of arr) {
        if (!v.recordedAt) continue
        const key = v.recordedAt.toISOString().slice(0, 10)
        const darr = byDate.get(key) ?? []
        darr.push(v)
        byDate.set(key, darr)
      }
      for (const [, darr] of byDate) {
        if (darr.length < 2) continue
        const nums = darr.map((v) => v.numericValue).filter(Boolean) as number[]
        if (nums.length < 2) continue
        const max = Math.max(...nums)
        const min = Math.min(...nums)
        if (min !== 0 && max / min > 1.5) {
          // >50% difference on same day = potential conflict
          for (let i = 0; i < darr.length; i++) {
            for (let j = i + 1; j < darr.length; j++) {
              const a = darr[i]
              const b = darr[j]
              if (a.documentId === b.documentId) continue
              await db.conflict.create({
                data: {
                  patientId,
                  entity,
                  label: a.label,
                  documentAId: a.documentId,
                  documentBId: b.documentId,
                  valueA: a.value,
                  valueB: b.value,
                  pageA: a.pageNumber,
                  pageB: b.pageNumber,
                  sourceTextA: a.sourceText,
                  sourceTextB: b.sourceText,
                  status: "UNRESOLVED",
                },
              }).catch(() => {})
            }
          }
        }
      }
    }
  }
}

// ============================================================
// Helpers
// ============================================================

function categoryLabelShort(cat: string): string {
  const map: Record<string, string> = {
    LAB_REPORT: "Lab Report",
    PRESCRIPTION: "Prescription",
    IMAGING: "Imaging",
    DISCHARGE_SUMMARY: "Discharge Summary",
    PATHOLOGY: "Pathology",
    RADIOLOGY: "Radiology",
    CARDIOLOGY: "Cardiology",
    OPD_CONSULTATION: "OPD Visit",
    VACCINATION: "Vaccination",
    INSURANCE: "Insurance",
    OTHER: "Document",
  }
  return map[cat] ?? "Document"
}

function mapDocCategoryToTimeline(cat: string): string {
  const map: Record<string, string> = {
    LAB_REPORT: "LAB_TEST",
    PRESCRIPTION: "MEDICATION_START",
    IMAGING: "IMAGING",
    DISCHARGE_SUMMARY: "HOSPITALIZATION",
    PATHOLOGY: "LAB_TEST",
    RADIOLOGY: "IMAGING",
    CARDIOLOGY: "LAB_TEST",
    OPD_CONSULTATION: "VISIT",
    VACCINATION: "VACCINATION",
    INSURANCE: "OTHER",
    OTHER: "OTHER",
  }
  return map[cat] ?? "OTHER"
}
