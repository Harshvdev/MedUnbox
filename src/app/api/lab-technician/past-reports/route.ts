import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser, getCurrentLabTechnician } from "@/lib/session"
import { db } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    const labTech = await getCurrentLabTechnician()
    if (!user || user.role !== "LAB_TECHNICIAN" || !labTech) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const patientId = searchParams.get("patientId")

    if (!patientId) {
      return NextResponse.json({ error: "Patient ID is required" }, { status: 400 })
    }

    const patient = await db.patient.findUnique({
      where: { id: patientId },
      include: { user: true },
    })
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 })
    }

    // 1. Completed lab test orders by this lab technician for this patient
    const completedOrders = await db.labTestOrder.findMany({
      where: {
        labTechnicianId: labTech.id,
        prescription: {
          patientId: patient.id,
        },
      },
      include: {
        document: true,
        prescription: {
          include: {
            doctor: { include: { user: { select: { name: true } } } },
          },
        },
      },
      orderBy: { completedAt: "desc" },
    })

    // 2. Direct documents uploaded by this technician for this patient
    const uploadedDocs = await db.document.findMany({
      where: {
        patientId: patient.id,
        uploaderId: user.id,
      },
      orderBy: { uploadedAt: "desc" },
    })

    return NextResponse.json({
      ok: true,
      technician: {
        id: labTech.id,
        name: user.name,
        labName: labTech.labName,
        registrationNo: labTech.registrationNo,
        phone: labTech.phone,
      },
      patient: {
        id: patient.id,
        name: patient.user.name,
        aadhaar: patient.aadhaar,
        gender: patient.gender,
        bloodGroup: patient.bloodGroup,
        dateOfBirth: patient.dateOfBirth,
        phone: patient.phone,
      },
      completedOrders,
      uploadedDocs,
    })
  } catch (err) {
    console.error("Fetch past lab reports error:", err)
    return NextResponse.json({ error: "Failed to retrieve past lab reports" }, { status: 500 })
  }
}
