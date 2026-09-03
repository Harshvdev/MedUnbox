import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/session"
import { db } from "@/lib/db"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== "DOCTOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const doctor = await db.doctor.findUnique({ where: { userId: user.id } })
    if (!doctor) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const { id } = await params
    const existing = await db.clinicalNote.findFirst({
      where: { id, doctorId: doctor.id },
    })
    if (!existing) return NextResponse.json({ error: "Note not found" }, { status: 404 })

    const body = await req.json()
    const updated = await db.clinicalNote.update({
      where: { id },
      data: {
        ...(body.note !== undefined && { note: body.note }),
        ...(body.category !== undefined && { category: body.category }),
        ...(body.isPinned !== undefined && { isPinned: body.isPinned }),
      },
    })

    return NextResponse.json({ ok: true, note: updated })
  } catch (err) {
    console.error("Update note error:", err)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== "DOCTOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const doctor = await db.doctor.findUnique({ where: { userId: user.id } })
    if (!doctor) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const { id } = await params
    const existing = await db.clinicalNote.findFirst({
      where: { id, doctorId: doctor.id },
    })
    if (!existing) return NextResponse.json({ error: "Note not found" }, { status: 404 })

    await db.clinicalNote.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Delete note error:", err)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
