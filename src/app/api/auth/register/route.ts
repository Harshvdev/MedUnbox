import { NextRequest, NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { z } from "zod"
import { db } from "@/lib/db"

const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  role: z.enum(["PATIENT", "DOCTOR"]),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { name, email, password, role } = parsed.data
    const normalizedEmail = email.toLowerCase()

    const existing = await db.user.findUnique({ where: { email: normalizedEmail } })
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      )
    }

    const passwordHash = await hash(password, 12)

    const user = await db.user.create({
      data: {
        name,
        email: normalizedEmail,
        passwordHash,
        role,
      },
    })

    // Create role-specific profile
    if (role === "PATIENT") {
      await db.patient.create({
        data: { userId: user.id },
      })
    } else {
      await db.doctor.create({
        data: { userId: user.id },
      })
    }

    return NextResponse.json({ ok: true, userId: user.id })
  } catch (err) {
    console.error("Register error:", err)
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    )
  }
}
