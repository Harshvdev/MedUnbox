import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser, getCurrentPatient } from "@/lib/session"
import { db } from "@/lib/db"
import { z } from "zod"

const profileSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  bloodGroup: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
  locale: z.string().optional(),
})

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const patient = user.role === "PATIENT" ? await getCurrentPatient() : null
  const doctor = user.role === "DOCTOR" ? await db.doctor.findUnique({ where: { userId: user.id } }) : null

  return NextResponse.json({ user, patient, doctor })
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const parsed = profileSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 })
    }
    const data = parsed.data

    // Update user name + locale
    if (data.name || data.locale) {
      await db.user.update({
        where: { id: user.id },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.locale && { locale: data.locale }),
        },
      })
    }

    // Update patient profile
    if (user.role === "PATIENT") {
      const patient = await getCurrentPatient()
      if (patient) {
        await db.patient.update({
          where: { id: patient.id },
          data: {
            ...(data.dateOfBirth !== undefined && { dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null }),
            ...(data.gender !== undefined && { gender: data.gender || null }),
            ...(data.bloodGroup !== undefined && { bloodGroup: data.bloodGroup || null }),
            ...(data.phone !== undefined && { phone: data.phone || null }),
            ...(data.address !== undefined && { address: data.address || null }),
            ...(data.emergencyContact !== undefined && { emergencyContact: data.emergencyContact || null }),
          },
        })
      }
    }

    // Update doctor profile
    if (user.role === "DOCTOR") {
      const doctor = await db.doctor.findUnique({ where: { userId: user.id } })
      if (doctor) {
        await db.doctor.update({
          where: { id: doctor.id },
          data: {
            ...(data.phone !== undefined && { phone: data.phone || null }),
          },
        })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Profile update error:", err)
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}
