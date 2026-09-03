import { NextRequest, NextResponse } from "next/server"
import { getCurrentPatient, getCurrentUser } from "@/lib/session"
import { db } from "@/lib/db"
import { generatePatientSummary } from "@/lib/ai"
import { formatDate, VALUE_STATUS_META, TREND_DIRECTION_META } from "@/lib/constants"

/**
 * Generate a patient-facing health summary in the patient's preferred language.
 * This is the multilingual feature from the spec:
 * "Patient-facing summaries in your language, while doctors retain English medical terminology."
 */
export async function GET(req: NextRequest) {
  try {
    const patient = await getCurrentPatient()
    const user = await getCurrentUser()
    if (!patient || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Locale lives on the User record, not in the session
    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { locale: true },
    })
    const language = req.nextUrl.searchParams.get("lang") || dbUser?.locale || "en"
    const refresh = req.nextUrl.searchParams.get("refresh") === "true"

    // Gather all patient data for the summary
    const [diagnoses, medications, recentValues, trends, conflicts, documents] = await Promise.all([
      db.diagnosis.findMany({
        where: { patientId: patient.id, status: "ACTIVE" },
        orderBy: { diagnosedAt: "desc" },
      }),
      db.medication.findMany({
        where: { patientId: patient.id, status: "ACTIVE" },
      }),
      db.medicalValue.findMany({
        where: { patientId: patient.id },
        orderBy: { recordedAt: "desc" },
        take: 30,
        include: { document: true },
      }),
      db.trend.findMany({
        where: { patientId: patient.id },
        orderBy: { lastUpdated: "desc" },
      }),
      db.conflict.count({
        where: { patientId: patient.id, status: "UNRESOLVED" },
      }),
      db.document.count({
        where: { patientId: patient.id, status: "PROCESSED" },
      }),
    ])

    if (documents === 0) {
      return NextResponse.json({
        summary: null,
        message: "Upload some medical documents first, and I'll generate a personalized health summary for you.",
        language,
      })
    }

    // Build the findings text from the patient's actual records
    const findings = buildFindings({
      patientName: user.name ?? "Patient",
      age: patient.dateOfBirth
        ? Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 3600 * 1000))
        : null,
      gender: patient.gender,
      bloodGroup: patient.bloodGroup,
      diagnoses,
      medications,
      recentValues,
      trends,
      conflicts,
      documentCount: documents,
    })

    // Generate the summary in the patient's language
    const summary = await generatePatientSummary(findings, language)

    return NextResponse.json({
      summary,
      language,
      generatedAt: new Date().toISOString(),
      stats: {
        diagnoses: diagnoses.length,
        medications: medications.length,
        values: recentValues.length,
        trends: trends.length,
        conflicts,
        documents,
      },
    })
  } catch (err) {
    console.error("Summary error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate summary" },
      { status: 500 }
    )
  }
}

function buildFindings(data: {
  patientName: string
  age: number | null
  gender: string | null
  bloodGroup: string | null
  diagnoses: any[]
  medications: any[]
  recentValues: any[]
  trends: any[]
  conflicts: number
  documentCount: number
}): string {
  const parts: string[] = []

  parts.push(`Patient: ${data.patientName}`)
  if (data.age) parts.push(`Age: ${data.age}`)
  if (data.gender) parts.push(`Gender: ${data.gender}`)
  if (data.bloodGroup) parts.push(`Blood group: ${data.bloodGroup}`)
  parts.push(`Records analyzed: ${data.documentCount} document(s)`)

  // Active conditions
  if (data.diagnoses.length > 0) {
    parts.push("\nACTIVE CONDITIONS:")
    data.diagnoses.forEach((d) => {
      parts.push(`- ${d.name}${d.severity ? ` (${d.severity})` : ""}${d.diagnosedAt ? `, diagnosed ${formatDate(d.diagnosedAt)}` : ""}`)
    })
  }

  // Active medications
  if (data.medications.length > 0) {
    parts.push("\nCURRENT MEDICATIONS:")
    data.medications.forEach((m) => {
      parts.push(`- ${m.name}${m.dosage ? ` ${m.dosage}` : ""}${m.frequency ? `, ${m.frequency}` : ""}`)
    })
  }

  // Lab values — group by entity, show latest
  const byEntity = new Map<string, any[]>()
  data.recentValues.forEach((v) => {
    const arr = byEntity.get(v.entity) ?? []
    arr.push(v)
    byEntity.set(v.entity, arr)
  })

  if (byEntity.size > 0) {
    parts.push("\nKEY LAB RESULTS (most recent):")
    for (const [entity, vals] of byEntity) {
      const latest = vals[0]
      const meta = VALUE_STATUS_META[latest.status] ?? VALUE_STATUS_META.UNKNOWN
      const trend = data.trends.find((t) => t.entity === entity)
      let line = `- ${latest.label}: ${latest.value}${latest.unit ? " " + latest.unit : ""} (${meta.label})`
      if (latest.referenceRange) line += ` — reference: ${latest.referenceRange}`
      if (trend) {
        const dirMeta = TREND_DIRECTION_META[trend.direction]
        line += ` — trend: ${dirMeta?.label ?? trend.direction}`
      }
      parts.push(line)
    }
  }

  // Abnormal values highlight
  const abnormal = data.recentValues.filter(
    (v) => v.status === "ABNORMAL_LOW" || v.status === "ABNORMAL_HIGH" || v.status === "CRITICAL"
  )
  if (abnormal.length > 0) {
    parts.push("\nVALUES NEEDING ATTENTION:")
    abnormal.slice(0, 5).forEach((v) => {
      parts.push(`- ${v.label}: ${v.value}${v.unit ? " " + v.unit : ""} is ${v.status === "ABNORMAL_HIGH" ? "high" : v.status === "ABNORMAL_LOW" ? "low" : "critical"}`)
    })
  }

  // Conflicts
  if (data.conflicts > 0) {
    parts.push(`\nCONFLICTS DETECTED: ${data.conflicts} value(s) differ across reports — please review with your doctor.`)
  }

  // Trends summary
  const improving = data.trends.filter((t) => t.direction === "IMPROVING").length
  const worsening = data.trends.filter((t) => t.direction === "WORSENING").length
  if (data.trends.length > 0) {
    parts.push(`\nTRENDS: ${improving} improving, ${worsening} worsening, ${data.trends.length - improving - worsening} stable.`)
  }

  return parts.join("\n")
}
