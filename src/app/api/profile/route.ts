import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser, getCurrentPatient } from "@/lib/session"
import { db } from "@/lib/db"
import { z } from "zod"

const profileSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).or(z.literal("")).optional(),
  bloodGroup: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]).or(z.literal("")).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
  locale: z.string().optional(),
  registrationNo: z.string().optional(),
  specialization: z.string().optional(),
  hospital: z.string().optional(),
  pharmacyName: z.string().optional(),
  labName: z.string().optional(),
})

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const patient = user.role === "PATIENT" ? await getCurrentPatient() : null
  const doctor = user.role === "DOCTOR" ? await db.doctor.findUnique({ where: { userId: user.id } }) : null
  const pharmacist = user.role === "PHARMACIST" ? await db.pharmacist.findUnique({ where: { userId: user.id } }) : null
  const labTechnician = user.role === "LAB_TECHNICIAN" ? await db.labTechnician.findUnique({ where: { userId: user.id } }) : null

  return NextResponse.json({ user, patient, doctor, pharmacist, labTechnician })
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
            ...(data.registrationNo !== undefined && { registrationNo: data.registrationNo || null }),
            ...(data.specialization !== undefined && { specialization: data.specialization || null }),
            ...(data.hospital !== undefined && { hospital: data.hospital || null }),
          },
        })
      }
    }

    // Update pharmacist profile
    if (user.role === "PHARMACIST") {
      const pharmacist = await db.pharmacist.findUnique({ where: { userId: user.id } })
      if (pharmacist) {
        await db.pharmacist.update({
          where: { id: pharmacist.id },
          data: {
            ...(data.phone !== undefined && { phone: data.phone || null }),
            ...(data.registrationNo !== undefined && { registrationNo: data.registrationNo || null }),
            ...(data.pharmacyName !== undefined && { pharmacyName: data.pharmacyName || null }),
          },
        })
      }
    }

    // Update lab technician profile
    if (user.role === "LAB_TECHNICIAN") {
      const labTech = await db.labTechnician.findUnique({ where: { userId: user.id } })
      if (labTech) {
        await db.labTechnician.update({
          where: { id: labTech.id },
          data: {
            ...(data.phone !== undefined && { phone: data.phone || null }),
            ...(data.registrationNo !== undefined && { registrationNo: data.registrationNo || null }),
            ...(data.labName !== undefined && { labName: data.labName || null }),
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
