import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/session"
import { db } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !["DOCTOR", "PHARMACIST", "LAB_TECHNICIAN"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const aadhaarRaw = searchParams.get("aadhaar")?.replace(/\s+/g, "").replace(/-/g, "") ?? ""

    if (!aadhaarRaw || aadhaarRaw.length !== 12) {
      return NextResponse.json({ error: "Please enter a valid 12-digit Aadhaar number" }, { status: 400 })
    }

    const patient = await db.patient.findFirst({
      where: { aadhaar: aadhaarRaw },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    })

    if (!patient) {
      return NextResponse.json({ error: "No patient found with this Aadhaar number." }, { status: 404 })
    }

    // Check active access
    let hasAccess = false
    const now = new Date()

    const accessGrant = await db.hcpPatientAccess.findFirst({
      where: {
        patientId: patient.id,
        hcpUserId: user.id,
        expiresAt: { gt: now },
      },
    })

    if (accessGrant) {
      hasAccess = true
    } else if (user.role === "DOCTOR") {
      const doctor = await db.doctor.findUnique({ where: { userId: user.id } })
      if (doctor) {
        const share = await db.share.findFirst({
          where: {
            patientId: patient.id,
            doctorId: doctor.id,
            isActive: true,
            expiresAt: { gt: now },
          },
        })
        if (share) hasAccess = true
      }
    }

    if (!hasAccess) {
      return NextResponse.json({
        hasAccess: false,
        requiresConsent: true,
        patient: {
          id: patient.id,
          name: patient.user.name,
          aadhaar: patient.aadhaar,
        },
      })
    }

    // Access granted — return comprehensive records
    const [documents, prescriptions, timeline, medicalValues, medications] = await Promise.all([
      db.document.findMany({
        where: { patientId: patient.id },
        orderBy: { uploadedAt: "desc" },
        take: 20,
      }),
      db.prescription.findMany({
        where: { patientId: patient.id },
        include: {
          doctor: { include: { user: { select: { name: true } } } },
          items: {
            include: { pharmacist: { include: { user: { select: { name: true } } } } },
          },
          labOrders: {
            include: { labTechnician: { include: { user: { select: { name: true } } } } },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      db.timelineEvent.findMany({
        where: { patientId: patient.id },
        orderBy: { date: "desc" },
        take: 30,
      }),
      db.medicalValue.findMany({
        where: { patientId: patient.id },
        orderBy: { recordedAt: "desc" },
        take: 40,
      }),
      db.medication.findMany({
        where: { patientId: patient.id },
        orderBy: { createdAt: "desc" },
      }),
    ])

    return NextResponse.json({
      hasAccess: true,
      requiresConsent: false,
      patient: {
        id: patient.id,
        name: patient.user.name,
        aadhaar: patient.aadhaar,
        gender: patient.gender,
        bloodGroup: patient.bloodGroup,
        dateOfBirth: patient.dateOfBirth,
        phone: patient.phone,
      },
      documents,
      prescriptions,
      timeline,
      medicalValues,
      medications,
    })
  } catch (err) {
    console.error("Patient lookup error:", err)
    return NextResponse.json({ error: "Failed to look up patient" }, { status: 500 })
  }
}
