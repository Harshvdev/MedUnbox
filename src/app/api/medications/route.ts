import { NextRequest, NextResponse } from "next/server"
import { getCurrentPatient } from "@/lib/session"
import { db } from "@/lib/db"
import { z } from "zod"

const medicationSchema = z.object({
  name: z.string().min(1).max(100),
  dosage: z.string().nullable().optional(),
  frequency: z.string().nullable().optional(),
  route: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  status: z.enum(["ACTIVE", "DISCONTINUED", "COMPLETED"]).default("ACTIVE"),
  notes: z.string().nullable().optional(),
})

export async function GET() {
  try {
    const patient = await getCurrentPatient()
    if (!patient) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const medications = await db.medication.findMany({
      where: { patientId: patient.id },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    })

    return NextResponse.json({ medications })
  } catch (err) {
    console.error("List medications error:", err)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const patient = await getCurrentPatient()
    if (!patient) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const parsed = medicationSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 })
    }

    const data = parsed.data
    const medication = await db.medication.create({
      data: {
        patientId: patient.id,
        name: data.name,
        dosage: data.dosage || null,
        frequency: data.frequency || null,
        route: data.route || null,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        status: data.status,
        notes: data.notes || null,
      },
    })

    // Create a timeline event for manually added medication
    await db.timelineEvent.create({
      data: {
        patientId: patient.id,
        date: new Date(),
        title: `Medication: ${data.name}`,
        description: [data.dosage, data.frequency, data.route].filter(Boolean).join(", ") || "Manually added",
        category: "MEDICATION_START",
      },
    })

    return NextResponse.json({ ok: true, medication })
  } catch (err) {
    console.error("Create medication error:", err)
    return NextResponse.json({ error: "Failed to create medication" }, { status: 500 })
  }
}
