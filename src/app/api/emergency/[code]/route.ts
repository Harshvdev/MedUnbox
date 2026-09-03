import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

/**
 * GET /api/emergency/[code]
 *
 * PUBLIC endpoint — no auth required. Used by first responders / designated
 * emergency contacts who have been given an access code.
 *
 * Returns ONLY emergency-critical information:
 *   - patient name
 *   - blood group
 *   - allergies (with severity)
 *   - active conditions (diagnoses)
 *   - active medications
 *
 * It deliberately does NOT include documents, lab values, doctor notes, or any
 * other longitudinal record data.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params

    // Look up the emergency-access record. Only active codes are honored.
    const access = await db.emergencyAccess.findUnique({
      where: { accessCode: code },
      include: {
        patient: {
          include: {
            user: { select: { name: true } },
          },
        },
      },
    })

    if (!access || !access.isActive) {
      return NextResponse.json(
        { error: "Invalid or inactive emergency access code" },
        { status: 404 }
      )
    }

    const patient = access.patient

    // Allergies come from MedicalEntity rows with category "ALLERGY".
    // normalizedValue stores the severity (SEVERE / MODERATE / MILD).
    const allergyEntities = await db.medicalEntity.findMany({
      where: {
        category: "ALLERGY",
        document: { patientId: patient.id },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        entityLabel: true,
        normalizedValue: true,
        rawText: true,
        document: { select: { id: true, title: true } },
      },
    })

    const allergies = allergyEntities.map((e) => {
      const allergen = e.entityLabel.replace(/^Allergy:\s*/i, "")
      // Reaction is stored after the " - " separator in rawText.
      const sep = " - "
      const idx = e.rawText.indexOf(sep)
      const reaction =
        idx === -1 ? null : e.rawText.substring(idx + sep.length).trim() || null
      return {
        id: e.id,
        allergen,
        severity: e.normalizedValue ?? null,
        reaction,
      }
    })

    // Active conditions (diagnoses).
    const activeDiagnoses = await db.diagnosis.findMany({
      where: { patientId: patient.id, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        severity: true,
        notes: true,
      },
    })

    // Active medications.
    const activeMedications = await db.medication.findMany({
      where: { patientId: patient.id, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        dosage: true,
        frequency: true,
        route: true,
        notes: true,
      },
    })

    // Best-effort audit log (we don't have a userId for public access).
    try {
      await db.auditLog.create({
        data: {
          userId: null,
          action: "EMERGENCY_ACCESS_VIEWED",
          resource: "EmergencyAccess",
          resourceId: access.id,
          metadata: {
            contactName: access.contactName,
            patientId: patient.id,
          },
        },
      })
    } catch (e) {
      console.error("Audit log write failed:", e)
    }

    return NextResponse.json({
      patient: {
        name: patient.user.name ?? "Patient",
        bloodGroup: patient.bloodGroup ?? null,
      },
      allergies,
      conditions: activeDiagnoses.map((d) => ({
        id: d.id,
        name: d.name,
        severity: d.severity ?? null,
        notes: d.notes ?? null,
      })),
      medications: activeMedications.map((m) => ({
        id: m.id,
        name: m.name,
        dosage: m.dosage ?? null,
        frequency: m.frequency ?? null,
        route: m.route ?? null,
        notes: m.notes ?? null,
      })),
      contact: {
        name: access.contactName,
        relation: access.contactRelation,
        phone: access.contactPhone ?? null,
        email: access.contactEmail ?? null,
      },
      accessedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error("Public emergency access error:", err)
    return NextResponse.json(
      { error: "Failed to load emergency information" },
      { status: 500 }
    )
  }
}
