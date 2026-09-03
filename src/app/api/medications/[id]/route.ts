import { NextRequest, NextResponse } from "next/server"
import { getCurrentPatient } from "@/lib/session"
import { db } from "@/lib/db"
import { z } from "zod"

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  dosage: z.string().max(100).optional().nullable(),
  frequency: z.string().max(50).optional().nullable(),
  route: z.string().max(50).optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "DISCONTINUED", "COMPLETED"]).optional(),
  notes: z.string().max(2000).optional().nullable(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const patient = await getCurrentPatient()
    if (!patient) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params

    // Verify ownership — findFirst with patientId ensures the med belongs to
    // the current patient (no leaked access across patients).
    const existing = await db.medication.findFirst({
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

    // Build update payload, normalizing empty strings → null for optional fields
    const update: Record<string, unknown> = {}
    if (data.name !== undefined) update.name = data.name
    if (data.dosage !== undefined) update.dosage = data.dosage?.trim() || null
    if (data.frequency !== undefined) update.frequency = data.frequency?.trim() || null
    if (data.route !== undefined) update.route = data.route?.trim() || null
    if (data.startDate !== undefined) {
      update.startDate = data.startDate ? new Date(data.startDate) : null
    }
    if (data.endDate !== undefined) {
      update.endDate = data.endDate ? new Date(data.endDate) : null
    }
    if (data.status !== undefined) update.status = data.status
    if (data.notes !== undefined) update.notes = data.notes?.trim() || null

    const updated = await db.medication.update({
      where: { id },
      data: update,
    })

    // Emit a timeline event when a medication is discontinued/completed via
    // the manual "Mark as Discontinued" action so the patient's timeline
    // reflects the change.
    if (
      data.status === "DISCONTINUED" &&
      existing.status !== "DISCONTINUED"
    ) {
      await db.timelineEvent.create({
        data: {
          patientId: patient.id,
          date: new Date(),
          title: `Discontinued: ${updated.name}`,
          description:
            [
              updated.dosage,
              updated.frequency,
              updated.route,
              updated.endDate
                ? `Stopped on ${updated.endDate.toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}`
                : "Stopped today",
            ]
              .filter(Boolean)
              .join(" · ") || "Manually discontinued",
          category: "MEDICATION_STOP",
        },
      })
    }

    return NextResponse.json({ ok: true, medication: updated })
  } catch (err) {
    console.error("Patch medication error:", err)
    return NextResponse.json({ error: "Failed to update medication" }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const patient = await getCurrentPatient()
    if (!patient) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params

    const existing = await db.medication.findFirst({
      where: { id, patientId: patient.id },
    })
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    await db.medication.delete({ where: { id } })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Delete medication error:", err)
    return NextResponse.json({ error: "Failed to delete medication" }, { status: 500 })
  }
}
