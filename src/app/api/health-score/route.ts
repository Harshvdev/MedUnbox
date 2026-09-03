import { NextRequest, NextResponse } from "next/server"
import { getCurrentPatient } from "@/lib/session"
import { db } from "@/lib/db"

/**
 * Health Score API
 *
 * Computes a 0-100 wellness score based on the patient's actual records:
 * - Lab value abnormality (penalize abnormal/critical values)
 * - Trend direction (reward improving, penalize worsening)
 * - Active conditions count
 * - Active medications (slight penalty)
 * - Unresolved conflicts (penalty)
 * - Document completeness (reward more data)
 *
 * Returns a score, a label, contributing factors, and recommendations.
 * This is NOT a medical diagnosis — it's a data-driven wellness indicator.
 */
export async function GET() {
  try {
    const patient = await getCurrentPatient()
    if (!patient) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const [values, trends, diagnoses, medications, conflicts, documents] = await Promise.all([
      db.medicalValue.findMany({
        where: { patientId: patient.id },
        select: { status: true, entity: true },
      }),
      db.trend.findMany({
        where: { patientId: patient.id },
        select: { direction: true, status: true, entity: true },
      }),
      db.diagnosis.findMany({
        where: { patientId: patient.id, status: "ACTIVE" },
        select: { name: true, severity: true },
      }),
      db.medication.findMany({
        where: { patientId: patient.id, status: "ACTIVE" },
        select: { name: true },
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
        score: null,
        label: "No data",
        message: "Upload some medical documents to get a health score",
        factors: [],
        recommendations: ["Upload your latest lab report to get started"],
      })
    }

    // Compute score components
    const factors: Array<{
      label: string
      impact: number
      detail: string
      direction: "positive" | "negative" | "neutral"
    }> = []

    let score = 100

    // 1. Abnormal values (each abnormal: -3, each critical: -8)
    const critical = values.filter((v) => v.status === "CRITICAL").length
    const abnormalHigh = values.filter((v) => v.status === "ABNORMAL_HIGH").length
    const abnormalLow = values.filter((v) => v.status === "ABNORMAL_LOW").length
    const abnormalTotal = critical + abnormalHigh + abnormalLow
    const abnormalPenalty = critical * 8 + (abnormalHigh + abnormalLow) * 3
    score -= abnormalPenalty
    if (abnormalTotal > 0) {
      factors.push({
        label: "Lab Values",
        impact: -abnormalPenalty,
        detail: `${abnormalTotal} abnormal (${critical} critical)`,
        direction: "negative",
      })
    } else {
      factors.push({
        label: "Lab Values",
        impact: 0,
        detail: "All within normal range",
        direction: "positive",
      })
    }

    // 2. Trends (improving: +4 each, worsening: -5 each, stable: +1)
    const improving = trends.filter((t) => t.direction === "IMPROVING").length
    const worsening = trends.filter((t) => t.direction === "WORSENING").length
    const stable = trends.filter((t) => t.direction === "STABLE").length
    const trendBonus = improving * 4 + stable * 1 - worsening * 5
    score += trendBonus
    if (trends.length > 0) {
      factors.push({
        label: "Trends",
        impact: trendBonus,
        detail: `${improving} improving, ${worsening} worsening, ${stable} stable`,
        direction: trendBonus > 0 ? "positive" : trendBonus < 0 ? "negative" : "neutral",
      })
    }

    // 3. Active conditions (each: -4, severe: extra -3)
    const severeConditions = diagnoses.filter((d) => d.severity === "SEVERE").length
    const conditionPenalty = diagnoses.length * 4 + severeConditions * 3
    score -= conditionPenalty
    if (diagnoses.length > 0) {
      factors.push({
        label: "Conditions",
        impact: -conditionPenalty,
        detail: `${diagnoses.length} active (${severeConditions} severe)`,
        direction: "negative",
      })
    } else {
      factors.push({
        label: "Conditions",
        impact: 0,
        detail: "No active conditions",
        direction: "positive",
      })
    }

    // 4. Medications (slight penalty: -1 each, max -8)
    const medPenalty = Math.min(medications.length * 1, 8)
    score -= medPenalty
    if (medications.length > 0) {
      factors.push({
        label: "Medications",
        impact: -medPenalty,
        detail: `${medications.length} active`,
        direction: "neutral",
      })
    }

    // 5. Unresolved conflicts (each: -2)
    const conflictPenalty = conflicts * 2
    score -= conflictPenalty
    if (conflicts > 0) {
      factors.push({
        label: "Data Conflicts",
        impact: -conflictPenalty,
        detail: `${conflicts} unresolved`,
        direction: "negative",
      })
    }

    // 6. Document completeness bonus (reward: +1 per doc, max +6)
    const docBonus = Math.min(documents, 6)
    score += docBonus
    factors.push({
      label: "Records",
      impact: docBonus,
      detail: `${documents} documents`,
      direction: "positive",
    })

    // Clamp 0-100
    score = Math.max(0, Math.min(100, score))

    // Label
    let label: string
    let labelColor: string
    if (score >= 85) { label = "Excellent"; labelColor = "emerald" }
    else if (score >= 70) { label = "Good"; labelColor = "primary" }
    else if (score >= 50) { label = "Fair"; labelColor = "amber" }
    else if (score >= 30) { label = "Needs Attention"; labelColor = "orange" }
    else { label = "Critical"; labelColor = "rose" }

    // Recommendations
    const recommendations: string[] = []
    if (critical > 0) recommendations.push(`${critical} critical lab value(s) need immediate medical attention`)
    if (worsening > 0) recommendations.push(`${worsening} trend(s) are worsening — discuss with your doctor`)
    if (abnormalTotal > 0) recommendations.push(`${abnormalTotal} abnormal lab value(s) — consider lifestyle changes`)
    if (conflicts > 0) recommendations.push(`Resolve ${conflicts} data conflict(s) in your records`)
    if (severeConditions > 0) recommendations.push(`${severeConditions} severe condition(s) require active management`)
    if (recommendations.length === 0) recommendations.push("Keep up the good work! Continue regular health check-ups")

    return NextResponse.json({
      score,
      label,
      labelColor,
      factors,
      recommendations,
      stats: {
        abnormalTotal,
        critical,
        improving,
        worsening,
        stable,
        conditions: diagnoses.length,
        medications: medications.length,
        conflicts,
        documents,
      },
    })
  } catch (err) {
    console.error("Health score error:", err)
    return NextResponse.json({ error: "Failed to compute score" }, { status: 500 })
  }
}
