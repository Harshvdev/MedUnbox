import { NextRequest, NextResponse } from "next/server"
import { getCurrentPatient } from "@/lib/session"
import { db } from "@/lib/db"
import { deleteDocumentFromImageKit, getSignedDocumentUrl } from "@/lib/imagekit"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const patient = await getCurrentPatient()
    if (!patient) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const document = await db.document.findFirst({
      where: { id, patientId: patient.id },
      include: {
        pages: { orderBy: { pageNumber: "asc" } },
        extractedText: true,
        medicalValues: { orderBy: { recordedAt: "asc" } },
        medicalEntities: true,
        timelineEvents: true,
        duplicates: { include: { original: true } },
        duplicateOf: { include: { document: true } },
      },
    })

    if (!document) return NextResponse.json({ error: "Not found" }, { status: 404 })

    // Generate a signed URL for viewing the original (short-lived)
    const signedUrl = getSignedDocumentUrl(document.imagekitUrl, `/medunbox-documents/${patient.id}/${id}`, 3600)

    return NextResponse.json({
      document: {
        ...document,
        signedUrl,
        categoryLabel: document.category,
      },
    })
  } catch (err) {
    console.error("Get document error:", err)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const patient = await getCurrentPatient()
    if (!patient) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const document = await db.document.findFirst({
      where: { id, patientId: patient.id },
    })

    if (!document) return NextResponse.json({ error: "Not found" }, { status: 404 })

    // Delete from ImageKit (unless it's a duplicate referencing another doc)
    const isDuplicateRef = document.status === "DUPLICATE"
    if (!isDuplicateRef) {
      try {
        await deleteDocumentFromImageKit(document.imagekitFileId)
      } catch (e) {
        console.error("ImageKit delete failed:", e)
      }
    }

    await db.document.delete({ where: { id } })
    // Re-run analysis
    const { detectConflicts, detectTrends } = await import("@/lib/analysis")
    await detectConflicts(patient.id)
    await detectTrends(patient.id)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Delete document error:", err)
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 })
  }
}
