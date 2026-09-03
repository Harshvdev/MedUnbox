import { NextRequest, NextResponse } from "next/server"
import { getCurrentPatient } from "@/lib/session"
import { db } from "@/lib/db"
import { z } from "zod"

const createSchema = z.object({
  contactName: z.string().min(1, "Contact name is required").max(120),
  contactRelation: z.string().min(1, "Relation is required").max(80),
  contactPhone: z.string().max(40).optional().nullable(),
  contactEmail: z
    .string()
    .email("Invalid email")
    .max(160)
    .optional()
    .nullable()
    .or(z.literal("")),
})

/**
 * GET /api/emergency-access
 * List the current patient's emergency contacts (newest first).
 */
export async function GET() {
  try {
    const patient = await getCurrentPatient()
    if (!patient) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const contacts = await db.emergencyAccess.findMany({
      where: { patientId: patient.id },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ contacts })
  } catch (err) {
    console.error("List emergency access error:", err)
    return NextResponse.json({ error: "Failed to list emergency contacts" }, { status: 500 })
  }
}

/**
 * POST /api/emergency-access
 * Create a new emergency-access contact for the current patient.
 * The accessCode is auto-generated (cuid) so the patient doesn't pick it.
 */
export async function POST(req: NextRequest) {
  try {
    const patient = await getCurrentPatient()
    if (!patient) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }

    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const data = parsed.data
    const contact = await db.emergencyAccess.create({
      data: {
        patientId: patient.id,
        contactName: data.contactName.trim(),
        contactRelation: data.contactRelation.trim(),
        contactPhone: data.contactPhone?.trim() || null,
        contactEmail: data.contactEmail?.trim() || null,
      },
    })

    // Audit log (best-effort) — emergency access creation is a security-relevant event.
    try {
      await db.auditLog.create({
        data: {
          userId: patient.userId,
          action: "EMERGENCY_ACCESS_CREATED",
          resource: "EmergencyAccess",
          resourceId: contact.id,
          metadata: {
            contactName: contact.contactName,
            contactRelation: contact.contactRelation,
          },
        },
      })
    } catch (e) {
      console.error("Audit log write failed:", e)
    }

    return NextResponse.json({ ok: true, contact })
  } catch (err) {
    console.error("Create emergency access error:", err)
    return NextResponse.json({ error: "Failed to create emergency contact" }, { status: 500 })
  }
}
