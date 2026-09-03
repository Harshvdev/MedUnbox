import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/session"
import { db } from "@/lib/db"
import { z } from "zod"

const noteSchema = z.object({
  patientId: z.string(),
  note: z.string().min(1).max(5000),
  category: z.enum(["general", "follow_up", "referral", "alert"]).default("general"),
  isPinned: z.boolean().default(false),
})

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== "DOCTOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const doctor = await db.doctor.findUnique({ where: { userId: user.id } })
    if (!doctor) return NextResponse.json({ error: "Doctor profile not found" }, { status: 404 })

    const patientId = req.nextUrl.searchParams.get("patientId")
    if (!patientId) {
      return NextResponse.json({ error: "patientId required" }, { status: 400 })
    }

    // Verify the doctor has an active share for this patient
    const share = await db.share.findFirst({
      where: {
        doctorId: doctor.id,
        patientId,
        isActive: true,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    })
    if (!share) {
      return NextResponse.json({ error: "No active access to this patient" }, { status: 403 })
    }

    const notes = await db.clinicalNote.findMany({
      where: { patientId, doctorId: doctor.id },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    })

    return NextResponse.json({ notes })
  } catch (err) {
    console.error("List notes error:", err)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== "DOCTOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const doctor = await db.doctor.findUnique({ where: { userId: user.id } })
    if (!doctor) return NextResponse.json({ error: "Doctor profile not found" }, { status: 404 })

    const body = await req.json()
    const parsed = noteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 })
    }

    const { patientId, note, category, isPinned } = parsed.data

    // Verify active share
    const share = await db.share.findFirst({
      where: {
        doctorId: doctor.id,
        patientId,
        isActive: true,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    })
    if (!share) {
      return NextResponse.json({ error: "No active access to this patient" }, { status: 403 })
    }

    const created = await db.clinicalNote.create({
      data: {
        patientId,
        doctorId: doctor.id,
        shareId: share.id,
        note,
        category,
        isPinned,
      },
    })

    return NextResponse.json({ ok: true, note: created })
  } catch (err) {
    console.error("Create note error:", err)
    return NextResponse.json({ error: "Failed to create note" }, { status: 500 })
  }
}
