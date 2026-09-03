import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser, getCurrentPatient } from "@/lib/session"
import { db } from "@/lib/db"
import { askMyRecords } from "@/lib/rag"
import { z } from "zod"

const askSchema = z.object({
  question: z.string().min(5).max(500),
  patientId: z.string().optional(),
  shareId: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const parsed = askSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid question" }, { status: 400 })
    }

    const { question, patientId, shareId } = parsed.data

    // Authorization: patient asks about their own records, or doctor with active share
    let targetPatientId = patientId
    let activeShareId = shareId

    if (user.role === "PATIENT") {
      const patient = await getCurrentPatient()
      if (!patient) return NextResponse.json({ error: "No patient profile" }, { status: 403 })
      targetPatientId = patient.id
      activeShareId = undefined
    } else if (user.role === "DOCTOR") {
      // Doctor must have an active share for this patient
      if (!targetPatientId) {
        return NextResponse.json({ error: "Patient ID required" }, { status: 400 })
      }
      const share = await db.share.findFirst({
        where: {
          doctor: { userId: user.id },
          patientId: targetPatientId,
          isActive: true,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
      })
      if (!share) {
        return NextResponse.json({ error: "No active access to this patient's records" }, { status: 403 })
      }
      activeShareId = share.id
    }

    const result = await askMyRecords(question, targetPatientId!, user.id, activeShareId)

    return NextResponse.json(result)
  } catch (err) {
    console.error("Ask error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to process question" },
      { status: 500 }
    )
  }
}

// Get recent Q&A history
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    let queries
    if (user.role === "PATIENT") {
      const patient = await getCurrentPatient()
      if (!patient) return NextResponse.json({ error: "No patient profile" }, { status: 403 })
      queries = await db.aiQuery.findMany({
        where: { patientId: patient.id },
        include: { answer: { include: { evidence: { include: { document: true } } } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      })
    } else {
      const doctor = await db.doctor.findUnique({ where: { userId: user.id } })
      if (!doctor) return NextResponse.json({ error: "No doctor profile" }, { status: 403 })
      queries = await db.aiQuery.findMany({
        where: { share: { doctorId: doctor.id } },
        include: {
          answer: { include: { evidence: { include: { document: true } } } },
          share: { include: { patient: { include: { user: true } } } },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      })
    }

    return NextResponse.json({ queries })
  } catch (err) {
    console.error("Ask history error:", err)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
