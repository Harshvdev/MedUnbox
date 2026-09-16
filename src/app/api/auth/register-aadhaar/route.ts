import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { getClientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit"

const registerAadhaarSchema = z.object({
  name: z.string().min(2, "Full name must be at least 2 characters").max(80),
  aadhaar: z.string().transform((val) => val.replace(/\s+/g, "").replace(/-/g, "")),
  otp: z.string().length(6, "OTP must be 6 digits"),
})

export async function POST(req: NextRequest) {
  try {
    const limiter = rateLimit(`register-aadhaar:${getClientIp(req)}`, 15, 60 * 60 * 1000)
    if (!limiter.ok) return tooManyRequests(limiter.retryAfter)

    const body = await req.json()
    const parsed = registerAadhaarSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0] || "Invalid input"
      return NextResponse.json({ error: firstError }, { status: 400 })
    }

    const { name, aadhaar, otp } = parsed.data

    if (!/^\d{12}$/.test(aadhaar)) {
      return NextResponse.json({ error: "Aadhaar number must be exactly 12 digits" }, { status: 400 })
    }

    // Check if Aadhaar is already registered
    const existingPatient = await db.patient.findFirst({
      where: { aadhaar },
    })
    if (existingPatient) {
      return NextResponse.json(
        { error: "An account with this Aadhaar number already exists. Please sign in instead." },
        { status: 409 }
      )
    }

    let dummyEmail = `aadhaar_${aadhaar}@medunbox.local`
    const existingUser = await db.user.findUnique({ where: { email: dummyEmail } })
    if (existingUser) {
      dummyEmail = `aadhaar_${aadhaar}_${Date.now()}@medunbox.local`
    }

    const user = await db.user.create({
      data: {
        name,
        email: dummyEmail,
        role: "PATIENT",
      },
    })

    await db.patient.create({
      data: {
        userId: user.id,
        aadhaar,
      },
    })

    return NextResponse.json({ ok: true, userId: user.id })
  } catch (err) {
    console.error("Aadhaar register error:", err)
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    )
  }
}
