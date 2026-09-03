import { NextRequest, NextResponse } from "next/server"
import { getCurrentPatient } from "@/lib/session"
import { db } from "@/lib/db"
import { reprocessDocument } from "@/lib/processing"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const patient = await getCurrentPatient()
    if (!patient) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const document = await db.document.findFirst({
      where: { id, patientId: patient.id },
    })
    if (!document) return NextResponse.json({ error: "Not found" }, { status: 404 })

    // Trigger processing (async, non-blocking)
    reprocessDocument(id).catch((err) => {
      console.error(`Reprocessing failed for doc ${id}:`, err)
    })

    return NextResponse.json({ ok: true, message: "Reprocessing started" })
  } catch (err) {
    console.error("Process error:", err)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
