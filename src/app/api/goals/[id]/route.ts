import { NextRequest, NextResponse } from "next/server"
import { getCurrentPatient } from "@/lib/session"
import { db } from "@/lib/db"
import { z } from "zod"

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  type: z
    .enum([
      "MEDICATION_ADHERENCE",
      "LAB_TARGET",
      "LIFESTYLE",
      "APPOINTMENT",
      "CUSTOM",
    ])
    .optional(),
  targetValue: z.string().max(200).optional().nullable(),
  currentValue: z.string().max(200).optional().nullable(),
  status: z.enum(["ACTIVE", "COMPLETED", "PAUSED", "MISSED"]).optional(),
  dueDate: z.string().optional().nullable(),
})

/**
 * PATCH /api/goals/[id]
 * Update an existing goal. Ownership verified via findFirst with patientId
 * so no cross-patient update is possible.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const patient = await getCurrentPatient()
    if (!patient) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const existing = await db.healthGoal.findFirst({
      where: { id, patientId: patient.id },
    })
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const body = await req.json().catch(() => ({}))
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const data = parsed.data
    const update: Record<string, unknown> = {}

    if (data.title !== undefined) update.title = data.title.trim()
    if (data.description !== undefined) update.description = data.description?.trim() || null
    if (data.type !== undefined) update.type = data.type
    if (data.targetValue !== undefined) update.targetValue = data.targetValue?.trim() || null
    if (data.currentValue !== undefined) update.currentValue = data.currentValue?.trim() || null
    if (data.status !== undefined) update.status = data.status
    if (data.dueDate !== undefined) {
      update.dueDate = data.dueDate ? new Date(data.dueDate) : null
    }

    const updated = await db.healthGoal.update({
      where: { id },
      data: update,
    })

    return NextResponse.json({ ok: true, goal: updated })
  } catch (err) {
    console.error("Patch goal error:", err)
    return NextResponse.json({ error: "Failed to update goal" }, { status: 500 })
  }
}

/**
 * DELETE /api/goals/[id]
 * Permanently remove a goal. Ownership verified first.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const patient = await getCurrentPatient()
    if (!patient) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const existing = await db.healthGoal.findFirst({
      where: { id, patientId: patient.id },
    })
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    await db.healthGoal.delete({ where: { id } })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Delete goal error:", err)
    return NextResponse.json({ error: "Failed to delete goal" }, { status: 500 })
  }
}
