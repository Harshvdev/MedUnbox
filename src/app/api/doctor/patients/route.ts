import { NextResponse } from "next/server"
import { getCurrentDoctor } from "@/lib/session"
import { db } from "@/lib/db"
import { categoryLabel, formatDate } from "@/lib/constants"

/**
 * GET /api/doctor/patients
 * Returns all patients who have an active, non-revoked, non-expired Share with
 * the signed-in doctor. Used by the doctor dashboard, patient list, and the
 * patient selector on the doctor Ask page.
 */
export async function GET() {
  try {
    const doctor = await getCurrentDoctor()
    if (!doctor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const shares = await db.share.findMany({
      where: {
        doctorId: doctor.id,
        isActive: true,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        patient: {
          include: {
            user: { select: { name: true, email: true, image: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    const patients = shares.map((s) => ({
      shareId: s.id,
      patientId: s.patientId,
      name: s.patient.user.name ?? s.patient.user.email ?? "Patient",
      email: s.patient.user.email,
      image: s.patient.user.image ?? null,
      dateOfBirth: s.patient.dateOfBirth ?? null,
      gender: s.patient.gender ?? null,
      bloodGroup: s.patient.bloodGroup ?? null,
      categories: s.categories,
      documentIds: s.documentIds,
      scope: s.scope,
      duration: s.duration,
      expiresAt: s.expiresAt,
      expiresAtLabel: formatDate(s.expiresAt),
      createdAt: s.createdAt,
    }))

    return NextResponse.json({ patients })
  } catch (err) {
    console.error("Doctor patients error:", err)
    return NextResponse.json({ error: "Failed to load patients" }, { status: 500 })
  }
}

export const dynamic = "force-dynamic"
