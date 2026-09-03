import { NextResponse } from "next/server"
import { getCurrentPatient } from "@/lib/session"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const patient = await getCurrentPatient()
    if (!patient) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const documents = await db.document.findMany({
      where: { patientId: patient.id },
      orderBy: { uploadedAt: "desc" },
      select: {
        id: true,
        title: true,
        category: true,
        status: true,
        mimeType: true,
        fileSize: true,
        pageCount: true,
        language: true,
        thumbnailUrl: true,
        uploadedAt: true,
        processedAt: true,
        _count: { select: { medicalValues: true, medicalEntities: true } },
      },
    })

    return NextResponse.json({ documents })
  } catch (err) {
    console.error("List documents error:", err)
    return NextResponse.json({ error: "Failed to list documents" }, { status: 500 })
  }
}
