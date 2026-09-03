import { db } from "@/lib/db"
import { processDocumentPage } from "@/lib/ai"
import { getSignedDocumentUrl } from "@/lib/imagekit"
import { detectConflicts, detectTrends, buildTimelineEvents } from "@/lib/analysis"

/**
 * MedUnbox Document Processing Pipeline
 *
 * Upload → OCR + Validation → Medical Entity Extraction → Structured Storage
 *   → Duplicate Detection → Conflict Detection → Timeline → Trends
 *
 * Uses Gemini-compatible vision AI for OCR + structured extraction (handles
 * scanned, handwritten, tilted, and regional-language documents in one pass).
 *
 * The file is downloaded server-side from ImageKit (private) and passed to the
 * vision API as a base64 data URL — the AI never receives a raw private URL.
 */

/**
 * Download a file from ImageKit via its signed URL and return a base64 data URL.
 */
async function fetchAsDataUrl(signedUrl: string, mimeType: string): Promise<string> {
  const res = await fetch(signedUrl)
  if (!res.ok) {
    throw new Error(`Failed to fetch file from ImageKit: ${res.status} ${res.statusText}`)
  }
  const buf = Buffer.from(await res.arrayBuffer())
  const b64 = buf.toString("base64")
  return `data:${mimeType};base64,${b64}`
}

const CATEGORY_LABELS: Record<string, string> = {
  LAB_REPORT: "Lab Report",
  PRESCRIPTION: "Prescription",
  IMAGING: "Imaging",
  DISCHARGE_SUMMARY: "Discharge Summary",
  PATHOLOGY: "Pathology Report",
  RADIOLOGY: "Radiology Report",
  CARDIOLOGY: "Cardiology Report",
  OPD_CONSULTATION: "OPD Consultation",
  VACCINATION: "Vaccination Record",
  INSURANCE: "Insurance Document",
  OTHER: "Medical Document",
}

export async function processDocument(documentId: string): Promise<void> {
  const document = await db.document.findUnique({
    where: { id: documentId },
    include: { patient: true },
  })

  if (!document) throw new Error("Document not found")

  // Mark as processing
  await db.document.update({
    where: { id: documentId },
    data: { status: "PROCESSING" },
  })

  try {
    // Generate a signed URL so the server can download the private file.
    const signedUrl = getSignedDocumentUrl(
      document.imagekitUrl,
      `/medunbox-documents/${document.patientId}/${documentId}`,
      3600
    )
    // Download the file and convert to base64 data URL for the vision API.
    // This keeps the private URL out of the AI request entirely.
    const dataUrl = await fetchAsDataUrl(signedUrl, document.mimeType || "image/png")
    const imageUrl = dataUrl

    const categoryLabel = CATEGORY_LABELS[document.category] ?? "Medical Document"
    const pageNumber = 1

    // Run vision extraction (OCR + entities in one pass)
    const extracted = await processDocumentPage(imageUrl, pageNumber, categoryLabel)

    // Update document metadata
    await db.document.update({
      where: { id: documentId },
      data: {
        pageCount: 1,
        language: extracted.language,
        status: "PROCESSED",
        processedAt: new Date(),
        title: extracted.reportTitle || document.title,
        processingError: null,
      },
    })

    // Create the page record
    const page = await db.documentPage.create({
      data: {
        documentId,
        pageNumber,
        imageUrl: document.imagekitUrl,
        width: null,
        height: null,
      },
    })

    // Store extracted text
    await db.extractedText.create({
      data: {
        documentId,
        pageId: page.id,
        pageNumber,
        rawText: extracted.rawText,
        cleanedText: extracted.cleanedText,
        confidence: extracted.confidence,
        language: extracted.language,
      },
    })

    // Store medical entities with provenance
    if (extracted.values.length > 0) {
      await db.medicalEntity.createMany({
        data: extracted.values.map((v) => ({
          documentId,
          pageId: page.id,
          pageNumber,
          entity: v.entity,
          entityLabel: v.label,
          category: "LAB_VALUE",
          rawText: v.sourceText,
          normalizedValue: v.value,
          confidence: extracted.confidence,
        })),
      })

      // Store medical values with full provenance
      const reportDate = extracted.reportDate ? new Date(extracted.reportDate) : document.uploadedAt
      await db.medicalValue.createMany({
        data: extracted.values.map((v) => ({
          documentId,
          patientId: document.patientId,
          entity: v.entity,
          label: v.label,
          value: v.value,
          numericValue: v.numericValue,
          unit: v.unit,
          referenceRange: v.referenceRange,
          status: mapStatus(v.status),
          recordedAt: reportDate,
          pageNumber,
          sourceText: v.sourceText,
        })),
      })
    }

    // Store vitals as medical values too (Blood Pressure, Heart Rate, Weight, BMI, etc.)
    if (extracted.vitals.length > 0) {
      const reportDate = extracted.reportDate ? new Date(extracted.reportDate) : document.uploadedAt
      const vitalRecords = extracted.vitals
        .map((v) => {
          const entity = normalizeVitalEntity(v.name)
          const numericValue = extractNumeric(v.value)
          const referenceRange = getVitalReferenceRange(entity)
          const status = classifyVital(entity, v.value, numericValue)
          return {
            documentId,
            patientId: document.patientId,
            entity,
            label: v.name,
            value: v.value,
            numericValue,
            unit: v.unit ?? null,
            referenceRange,
            status,
            recordedAt: reportDate,
            pageNumber,
            sourceText: `${v.name}: ${v.value}${v.unit ? " " + v.unit : ""}`,
          }
        })
      if (vitalRecords.length > 0) {
        await db.medicalValue.createMany({ data: vitalRecords })
      }
    }

    // Store medications
    if (extracted.medications.length > 0) {
      for (const med of extracted.medications) {
        await db.medication.create({
          data: {
            patientId: document.patientId,
            name: med.name,
            dosage: med.dosage,
            frequency: med.frequency,
            route: med.route,
            startDate: med.startDate ? new Date(med.startDate) : null,
            endDate: med.endDate ? new Date(med.endDate) : null,
            status: "ACTIVE",
            sourceDocId: documentId,
          },
        })
      }
    }

    // Store diagnoses
    if (extracted.diagnoses.length > 0) {
      for (const diag of extracted.diagnoses) {
        await db.diagnosis.create({
          data: {
            patientId: document.patientId,
            name: diag.name,
            icdCode: diag.icdCode,
            severity: diag.severity,
            status: "ACTIVE",
            diagnosedAt: diag.diagnosedAt ? new Date(diag.diagnosedAt) : null,
            sourceDocId: documentId,
          },
        })
      }
    }

    // Store allergies as medical entities (category=ALLERGY) with provenance.
    // These feed the /allergies page and the ALLERGY timeline category.
    if (extracted.allergies.length > 0) {
      for (const allergy of extracted.allergies) {
        await db.medicalEntity.create({
          data: {
            documentId,
            pageId: page.id,
            pageNumber,
            entity: allergy.name.toUpperCase().replace(/\s+/g, "_"),
            entityLabel: `Allergy: ${allergy.name}`,
            category: "ALLERGY",
            rawText: `${allergy.name}${allergy.severity ? ` (${allergy.severity})` : ""}${allergy.reaction ? ` - ${allergy.reaction}` : ""}`,
            normalizedValue: allergy.severity ?? null,
            confidence: extracted.confidence,
          },
        })
      }
    }

    // Store immunizations as medical entities (category=IMMUNIZATION) with provenance.
    // These feed the /immunizations page and the VACCINATION timeline category.
    if (extracted.immunizations.length > 0) {
      for (const imm of extracted.immunizations) {
        await db.medicalEntity.create({
          data: {
            documentId,
            pageId: page.id,
            pageNumber,
            entity: imm.vaccine.toUpperCase().replace(/\s+/g, "_"),
            entityLabel: `Vaccination: ${imm.vaccine}`,
            category: "IMMUNIZATION",
            rawText: `${imm.vaccine}${imm.doseNumber ? ` (Dose ${imm.doseNumber})` : ""}${imm.dateAdministered ? ` on ${imm.dateAdministered}` : ""}${imm.administeredBy ? ` by ${imm.administeredBy}` : ""}`,
            normalizedValue: imm.doseNumber?.toString() ?? null,
            confidence: extracted.confidence,
          },
        })
      }
    }

    // Build timeline events from this document
    await buildTimelineEvents(documentId)

    // Re-run trend detection (cross-document)
    await detectTrends(document.patientId)

    // Re-run conflict detection (cross-document)
    await detectConflicts(document.patientId)

  } catch (err) {
    console.error(`Document processing error [${documentId}]:`, err)
    await db.document.update({
      where: { id: documentId },
      data: {
        status: "FAILED",
        processingError: err instanceof Error ? err.message : "Unknown error",
      },
    })
    throw err
  }
}

function mapStatus(s: string): "NORMAL" | "ABNORMAL_LOW" | "ABNORMAL_HIGH" | "CRITICAL" | "UNKNOWN" {
  switch (s) {
    case "NORMAL": return "NORMAL"
    case "ABNORMAL_LOW": return "ABNORMAL_LOW"
    case "ABNORMAL_HIGH": return "ABNORMAL_HIGH"
    case "CRITICAL": return "CRITICAL"
    default: return "UNKNOWN"
  }
}

/**
 * Re-process a document (e.g., after the user edits metadata).
 */
export async function reprocessDocument(documentId: string): Promise<void> {
  await db.medicalEntity.deleteMany({ where: { documentId } })
  await db.medicalValue.deleteMany({ where: { documentId } })
  await db.extractedText.deleteMany({ where: { documentId } })
  await db.documentPage.deleteMany({ where: { documentId } })
  await db.timelineEvent.deleteMany({ where: { sourceDocId: documentId } })
  await processDocument(documentId)
}

// ============================================================
// Vitals helpers
// ============================================================

const VITAL_ENTITY_MAP: Record<string, string> = {
  "blood pressure": "BLOOD_PRESSURE",
  "bp": "BLOOD_PRESSURE",
  "heart rate": "HEART_RATE",
  "pulse": "HEART_RATE",
  "weight": "WEIGHT",
  "height": "HEIGHT",
  "bmi": "BMI",
  "body mass index": "BMI",
  "temperature": "TEMPERATURE",
  "temp": "TEMPERATURE",
  "oxygen saturation": "OXYGEN_SATURATION",
  "spo2": "OXYGEN_SATURATION",
  "respiratory rate": "RESPIRATORY_RATE",
  "rr": "RESPIRATORY_RATE",
}

function normalizeVitalEntity(name: string): string {
  const key = name.toLowerCase().trim()
  return VITAL_ENTITY_MAP[key] ?? key.toUpperCase().replace(/\s+/g, "_")
}

function extractNumeric(value: string): number | null {
  // Try to extract a number from values like "120/80", "72 bpm", "98.6 F"
  const match = value.match(/(\d+\.?\d*)/)
  return match ? parseFloat(match[1]) : null
}

function getVitalReferenceRange(entity: string): string | null {
  const ranges: Record<string, string | null> = {
    BLOOD_PRESSURE: "120/80",
    HEART_RATE: "60-100",
    WEIGHT: null,
    HEIGHT: null,
    BMI: "18.5-25",
    TEMPERATURE: "97-99 F",
    OXYGEN_SATURATION: "95-100",
    RESPIRATORY_RATE: "12-20",
  }
  return ranges[entity] ?? null
}

function classifyVital(
  entity: string,
  value: string,
  numeric: number | null
): "NORMAL" | "ABNORMAL_LOW" | "ABNORMAL_HIGH" | "CRITICAL" | "UNKNOWN" {
  if (numeric === null) return "UNKNOWN"
  switch (entity) {
    case "BLOOD_PRESSURE": {
      // Systolic is first number
      const systolic = parseInt(value.match(/\d+/)?.[0] ?? "0")
      if (systolic >= 180 || systolic < 90) return "CRITICAL"
      if (systolic > 140 || systolic < 100) return "ABNORMAL_HIGH"
      return "NORMAL"
    }
    case "HEART_RATE":
      if (numeric > 120) return "ABNORMAL_HIGH"
      if (numeric < 50) return "ABNORMAL_LOW"
      return "NORMAL"
    case "BMI":
      if (numeric >= 30) return "ABNORMAL_HIGH"
      if (numeric < 18.5) return "ABNORMAL_LOW"
      return "NORMAL"
    case "OXYGEN_SATURATION":
      if (numeric < 90) return "CRITICAL"
      if (numeric < 95) return "ABNORMAL_LOW"
      return "NORMAL"
    case "TEMPERATURE":
      if (numeric > 100.4) return "ABNORMAL_HIGH"
      if (numeric < 95) return "ABNORMAL_LOW"
      return "NORMAL"
    case "RESPIRATORY_RATE":
      if (numeric > 25 || numeric < 10) return "CRITICAL"
      if (numeric > 20) return "ABNORMAL_HIGH"
      if (numeric < 12) return "ABNORMAL_LOW"
      return "NORMAL"
    default:
      return "UNKNOWN"
  }
}

export const VITAL_ENTITIES = [
  "BLOOD_PRESSURE",
  "HEART_RATE",
  "WEIGHT",
  "HEIGHT",
  "BMI",
  "TEMPERATURE",
  "OXYGEN_SATURATION",
  "RESPIRATORY_RATE",
]
