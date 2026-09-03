import { NextRequest, NextResponse } from "next/server"
import { createHash } from "crypto"
import { getCurrentPatient } from "@/lib/session"
import { db } from "@/lib/db"
import { uploadDocumentToImageKit } from "@/lib/imagekit"
import { processDocument } from "@/lib/processing"

const MAX_FILE_SIZE = 25 * 1024 * 1024

export async function POST(req: NextRequest) {
  try {
    const patient = await getCurrentPatient()
    if (!patient) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get("file")
    const title = (formData.get("title") as string | null)?.trim()
    const category = formData.get("category") as string | null

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }
    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File exceeds the 25 MB limit" }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const fileHash = createHash("sha256").update(buffer).digest("hex")

    // Hash-based duplicate detection: identical uploads reuse the original's
    // storage and are flagged for the user to keep or merge (never auto-deleted).
    const existing = await db.document.findFirst({
      where: { patientId: patient.id, fileHash },
      orderBy: { uploadedAt: "asc" },
    })

    if (existing) {
      const duplicate = await db.document.create({
        data: {
          patientId: patient.id,
          title,
          category: (category as never) ?? "OTHER",
          mimeType: file.type || "application/octet-stream",
          fileSize: file.size,
          fileHash,
          pageCount: 1,
          imagekitFileId: existing.imagekitFileId,
          imagekitUrl: existing.imagekitUrl,
          thumbnailUrl: existing.thumbnailUrl,
          status: "DUPLICATE",
        },
      })
      await db.documentDuplicate.create({
        data: {
          documentId: duplicate.id,
          originalDocId: existing.id,
          similarity: 1,
          matchType: "HASH",
        },
      })
      return NextResponse.json({
        duplicate: true,
        documentId: duplicate.id,
        message: "This file is an exact duplicate of an existing document",
      })
    }

    const uploaded = await uploadDocumentToImageKit(
      buffer,
      file.name,
      patient.id,
      file.type || "application/octet-stream"
    )

    const document = await db.document.create({
      data: {
        patientId: patient.id,
        title,
        category: (category as never) ?? "OTHER",
        mimeType: file.type || "application/octet-stream",
        fileSize: file.size,
        fileHash,
        pageCount: 1,
        imagekitFileId: uploaded.fileId,
        imagekitUrl: uploaded.url,
        thumbnailUrl: uploaded.thumbnailUrl,
        status: "UPLOADED",
      },
    })

    // Trigger AI processing asynchronously, like the re-process route.
    processDocument(document.id).catch((err) => {
      console.error(`Processing failed for doc ${document.id}:`, err)
    })

    return NextResponse.json({
      ok: true,
      documentId: document.id,
      message: "Upload complete — processing started",
    })
  } catch (err) {
    console.error("Upload document error:", err)
    return NextResponse.json({ error: "Failed to upload document" }, { status: 500 })
  }
}
