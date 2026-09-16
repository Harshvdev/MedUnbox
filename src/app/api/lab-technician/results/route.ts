import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/session"
import { db } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== "LAB_TECHNICIAN") {
      return NextResponse.json({ error: "Only lab technicians can submit test results" }, { status: 403 })
    }

    const labTech = await db.labTechnician.findUnique({
      where: { userId: user.id },
    })
    if (!labTech) {
      return NextResponse.json({ error: "Lab technician profile not found" }, { status: 404 })
    }

    const body = await req.json()
    const { orderId, resultSummary, resultValues } = body

    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 })
    }

    const updatedOrder = await db.labTestOrder.update({
      where: { id: orderId },
      data: {
        status: "COMPLETED",
        resultSummary: resultSummary || "Report completed",
        resultValues: resultValues || null,
        completedAt: new Date(),
        labTechnicianId: labTech.id,
      },
      include: {
        prescription: true,
      },
    })

    // Log timeline event for patient
    if (updatedOrder.prescription?.patientId) {
      await db.timelineEvent.create({
        data: {
          patientId: updatedOrder.prescription.patientId,
          date: new Date(),
          title: `Lab report ready: ${updatedOrder.testName}`,
          description: resultSummary ? `Findings: ${resultSummary}` : `Completed by ${user.name || "Lab Technician"}`,
          category: "LAB_TEST",
        },
      })
    }

    return NextResponse.json({ ok: true, order: updatedOrder })
  } catch (err) {
    console.error("Submit lab result error:", err)
    return NextResponse.json({ error: "Failed to submit lab results" }, { status: 500 })
  }
}
