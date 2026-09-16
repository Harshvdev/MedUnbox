import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/session"
import { db } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== "DOCTOR") {
      return NextResponse.json({ error: "Only doctors can write prescriptions" }, { status: 403 })
    }

    const doctor = await db.doctor.findUnique({
      where: { userId: user.id },
    })
    if (!doctor) {
      return NextResponse.json({ error: "Doctor profile not found" }, { status: 404 })
    }

    const body = await req.json()
    const { patientId, diagnosis, notes, items = [], labOrders = [] } = body

    if (!patientId) {
      return NextResponse.json({ error: "Patient ID is required" }, { status: 400 })
    }

    const patient = await db.patient.findUnique({ where: { id: patientId } })
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 })
    }

    const prescription = await db.prescription.create({
      data: {
        patientId,
        doctorId: doctor.id,
        diagnosis,
        notes,
        status: "PENDING",
        items: {
          create: items.map((it: any) => ({
            medicationName: it.medicationName,
            dosage: it.dosage || "As directed",
            frequency: it.frequency || "Once daily",
            instructions: it.instructions || "",
            status: "PENDING",
          })),
        },
        labOrders: {
          create: labOrders.map((lo: any) => ({
            testName: lo.testName,
            instructions: lo.instructions || "",
            status: "PENDING",
          })),
        },
      },
      include: {
        items: true,
        labOrders: true,
      },
    })

    // Also add to patient's active medications
    for (const item of items) {
      if (item.medicationName) {
        await db.medication.create({
          data: {
            patientId,
            name: item.medicationName,
            dosage: item.dosage,
            frequency: item.frequency,
            notes: item.instructions,
            status: "ACTIVE",
          },
        })
      }
    }

    // Add timeline event
    await db.timelineEvent.create({
      data: {
        patientId,
        date: new Date(),
        title: `Prescription issued by Dr. ${user.name || "Doctor"}`,
        description: diagnosis ? `Diagnosis: ${diagnosis}. Prescribed ${items.length} medications and ${labOrders.length} lab tests.` : `Prescribed ${items.length} medications and ${labOrders.length} lab tests.`,
        category: "VISIT",
      },
    })

    return NextResponse.json({ ok: true, prescription })
  } catch (err) {
    console.error("Create prescription error:", err)
    return NextResponse.json({ error: "Failed to create prescription" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const patientId = searchParams.get("patientId")

    const where: any = {}
    if (patientId) where.patientId = patientId

    const prescriptions = await db.prescription.findMany({
      where,
      include: {
        doctor: { include: { user: { select: { name: true } } } },
        patient: { include: { user: { select: { name: true } } } },
        items: {
          include: { pharmacist: { include: { user: { select: { name: true } } } } },
        },
        labOrders: {
          include: { labTechnician: { include: { user: { select: { name: true } } } } },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ prescriptions })
  } catch (err) {
    console.error("Get prescriptions error:", err)
    return NextResponse.json({ error: "Failed to retrieve prescriptions" }, { status: 500 })
  }
}
