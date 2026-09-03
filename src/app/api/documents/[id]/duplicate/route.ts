import { NextRequest, NextResponse } from "next/server"
import { getCurrentPatient } from "@/lib/session"
import { db } from "@/lib/db"
import { deleteDocumentFromImageKit } from "@/lib/imagekit"

/**
 * Duplicate resolution API.
 * The spec says: "Do not silently delete duplicates. Allow the user to keep or merge them."
 *
 * Actions:
 * - KEEP_BOTH: mark the duplicate as intentionally kept (status → PROCESSED, duplicate.status → KEEP_BOTH)
 * - MERGE: delete the duplicate document, keep the original (duplicate.status → MERGED)
 * - DISMISS: mark as dismissed (duplicate.status → DISMISSED)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const patient = await getCurrentPatient()
    if (!patient) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const body = await req.json()
    const { action } = body as { action: "KEEP_BOTH" | "MERGE" | "DISMISS" }

    if (!["KEEP_BOTH", "MERGE", "DISMISS"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    // Verify the document belongs to this patient and is a duplicate
    const document = await db.document.findFirst({
      where: { id, patientId: patient.id, status: "DUPLICATE" },
      include: { duplicates: true },
    })
    if (!document) {
      return NextResponse.json({ error: "Duplicate not found" }, { status: 404 })
    }

    const dupRecord = document.duplicates[0]
    if (!dupRecord) {
      return NextResponse.json({ error: "No duplicate record found" }, { status: 404 })
    }

    if (action === "KEEP_BOTH") {
      // Mark duplicate doc as PROCESSED (keep it), update the duplicate record
      await db.document.update({
        where: { id },
        data: { status: "PROCESSED" },
      })
      await db.documentDuplicate.update({
        where: { id: dupRecord.id },
        data: { status: "KEEP_BOTH", resolvedAt: new Date() },
      })
      return NextResponse.json({ ok: true, action: "KEEP_BOTH" })
    }

    if (action === "MERGE") {
      // Delete the duplicate document (keep the original)
      // Don't delete from ImageKit since it reused the original's storage
      await db.documentDuplicate.update({
        where: { id: dupRecord.id },
        data: { status: "MERGED", resolvedAt: new Date() },
      })
      await db.document.delete({ where: { id } })
      return NextResponse.json({ ok: true, action: "MERGED" })
    }

    if (action === "DISMISS") {
      // Mark as dismissed but keep both
      await db.document.update({
        where: { id },
        data: { status: "PROCESSED" },
      })
      await db.documentDuplicate.update({
        where: { id: dupRecord.id },
        data: { status: "DISMISSED", resolvedAt: new Date() },
      })
      return NextResponse.json({ ok: true, action: "DISMISS" })
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (err) {
    console.error("Duplicate resolution error:", err)
    return NextResponse.json({ error: "Failed to resolve duplicate" }, { status: 500 })
  }
}
