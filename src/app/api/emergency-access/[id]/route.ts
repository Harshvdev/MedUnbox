import { NextRequest, NextResponse } from "next/server"
import { getCurrentPatient } from "@/lib/session"
import { db } from "@/lib/db"
import type { Prisma } from "@prisma/client"
import { z } from "zod"

const patchSchema = z.object({
  isActive: z.boolean().optional(),
  contactName: z.string().min(1).max(120).optional(),
  contactRelation: z.string().min(1).max(80).optional(),
  contactPhone: z.string().max(40).optional().nullable(),
  contactEmail: z
    .string()
    .email()
    .max(160)
    .optional()
    .nullable()
    .or(z.literal("")),
})

/**
 * PATCH /api/emergency-access/[id]
 * Toggle isActive or update contact fields. Ownership is verified via
 * findFirst with patientId so no cross-patient access is possible.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const patient = await getCurrentPatient()
    if (!patient) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params

    const existing = await db.emergencyAccess.findFirst({
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
    if (data.isActive !== undefined) update.isActive = data.isActive
    if (data.contactName !== undefined) update.contactName = data.contactName.trim()
    if (data.contactRelation !== undefined) update.contactRelation = data.contactRelation.trim()
    if (data.contactPhone !== undefined) update.contactPhone = data.contactPhone?.trim() || null
    if (data.contactEmail !== undefined) update.contactEmail = data.contactEmail?.trim() || null

    const updated = await db.emergencyAccess.update({
      where: { id },
      data: update,
    })

    // Audit log (best-effort)
    try {
      await db.auditLog.create({
        data: {
          userId: patient.userId,
          action: "EMERGENCY_ACCESS_UPDATED",
          resource: "EmergencyAccess",
          resourceId: updated.id,
          metadata: update as Prisma.InputJsonValue,
        },
      })
    } catch (e) {
      console.error("Audit log write failed:", e)
    }

    return NextResponse.json({ ok: true, contact: updated })
  } catch (err) {
    console.error("Patch emergency access error:", err)
    return NextResponse.json({ error: "Failed to update emergency contact" }, { status: 500 })
  }
}

/**
 * DELETE /api/emergency-access/[id]
 * Permanently remove an emergency contact (and its access code).
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const patient = await getCurrentPatient()
    if (!patient) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params

    const existing = await db.emergencyAccess.findFirst({
      where: { id, patientId: patient.id },
    })
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    await db.emergencyAccess.delete({ where: { id } })

    // Audit log (best-effort)
    try {
      await db.auditLog.create({
        data: {
          userId: patient.userId,
          action: "EMERGENCY_ACCESS_DELETED",
          resource: "EmergencyAccess",
          resourceId: id,
          metadata: {
            contactName: existing.contactName,
          },
        },
      })
    } catch (e) {
      console.error("Audit log write failed:", e)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Delete emergency access error:", err)
    return NextResponse.json({ error: "Failed to delete emergency contact" }, { status: 500 })
  }
}
