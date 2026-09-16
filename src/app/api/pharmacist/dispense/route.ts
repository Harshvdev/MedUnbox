import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/session"
import { db } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== "PHARMACIST") {
      return NextResponse.json({ error: "Only pharmacists can dispense prescriptions" }, { status: 403 })
    }

    const pharmacist = await db.pharmacist.findUnique({
      where: { userId: user.id },
    })

    if (!pharmacist) {
      return NextResponse.json({ error: "Pharmacist profile not found" }, { status: 404 })
    }

    const body = await req.json()
    const { itemId, status, dispenseNotes } = body

    if (!itemId) {
      return NextResponse.json({ error: "Item ID is required" }, { status: 400 })
    }

    const updatedItem = await db.prescriptionItem.update({
      where: { id: itemId },
      data: {
        status: status || "DISPENSED",
        dispensedAt: new Date(),
        pharmacistId: pharmacist.id,
        dispenseNotes: dispenseNotes || "",
      },
      include: {
        prescription: {
          include: { items: true },
        },
      },
    })

    // Check if all items in the prescription are dispensed
    const allDispensed = updatedItem.prescription.items.every((it) => it.status === "DISPENSED")
    if (allDispensed) {
      await db.prescription.update({
        where: { id: updatedItem.prescriptionId },
        data: { status: "COMPLETED" },
      })
    } else {
      await db.prescription.update({
        where: { id: updatedItem.prescriptionId },
        data: { status: "IN_PROGRESS" },
      })
    }

    return NextResponse.json({ ok: true, item: updatedItem })
  } catch (err) {
    console.error("Dispense error:", err)
    return NextResponse.json({ error: "Failed to dispense item" }, { status: 500 })
  }
}
