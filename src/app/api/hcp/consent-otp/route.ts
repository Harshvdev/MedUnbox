import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/session"
import { db } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !["DOCTOR", "PHARMACIST", "LAB_TECHNICIAN"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { aadhaar, otp, action } = body

    const cleanAadhaar = aadhaar?.replace(/\s+/g, "").replace(/-/g, "") ?? ""
    if (!cleanAadhaar || cleanAadhaar.length !== 12) {
      return NextResponse.json({ error: "Invalid 12-digit Aadhaar number" }, { status: 400 })
    }

    const patient = await db.patient.findFirst({
      where: { aadhaar: cleanAadhaar },
      include: { user: true },
    })

    if (!patient) {
      return NextResponse.json({ error: "Patient with this Aadhaar number was not found." }, { status: 404 })
    }

    if (action === "request") {
      // Simulate sending OTP to patient's registered mobile number
      const phone = patient.phone || "******9876"
      const maskedPhone = phone.length > 4 ? `+91 ******${phone.slice(-4)}` : "+91 ******1234"

      return NextResponse.json({
        ok: true,
        message: `Consent request OTP sent to patient's registered mobile (${maskedPhone}).`,
        patientName: patient.user.name,
      })
    }

    if (action === "verify") {
      if (!otp || otp.trim().length !== 6) {
        return NextResponse.json({ error: "Please enter a valid 6-digit consent OTP." }, { status: 400 })
      }

      // Dummy verification accepts any 6-digit OTP
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

      await db.hcpPatientAccess.upsert({
        where: {
          patientId_hcpUserId: {
            patientId: patient.id,
            hcpUserId: user.id,
          },
        },
        create: {
          patientId: patient.id,
          hcpUserId: user.id,
          hcpRole: user.role as any,
          expiresAt,
        },
        update: {
          expiresAt,
        },
      })

      // If HCP is a DOCTOR, also ensure an active Share exists for seamless backward compatibility with existing doctor views
      if (user.role === "DOCTOR") {
        const doctorProfile = await db.doctor.findUnique({ where: { userId: user.id } })
        if (doctorProfile) {
          const existingShare = await db.share.findFirst({
            where: {
              patientId: patient.id,
              doctorId: doctorProfile.id,
              isActive: true,
            },
          })
          if (!existingShare) {
            await db.share.create({
              data: {
                patientId: patient.id,
                doctorId: doctorProfile.id,
                scope: "FULL",
                duration: "TWENTY_FOUR_HOURS",
                expiresAt,
                isActive: true,
                categories: ["ALL"],
              },
            })
          }
        }
      }

      return NextResponse.json({
        ok: true,
        accessGranted: true,
        patientId: patient.id,
        patientName: patient.user.name,
      })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (err) {
    console.error("Consent OTP error:", err)
    return NextResponse.json({ error: "Failed to process consent request" }, { status: 500 })
  }
}
