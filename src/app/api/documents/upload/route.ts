import { NextRequest, NextResponse } from "next/server"
import { createHash } from "crypto"
import { getCurrentPatient } from "@/lib/session"
import { db } from "@/lib/db"
import { uploadDocumentToImageKit } from "@/lib/imagekit"
import { processDocument } from "@/lib/processing"
import { rateLimit, tooManyRequests } from "@/lib/rate-limit"
import { DOCUMENT_CATEGORIES } from "@/lib/constants"

const MAX_FILE_SIZE = 25 * 1024 * 1024
const MAX_TITLE_LENGTH = 200

// Only formats the vision-OCR pipeline can actually read.
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
])

const VALID_CATEGORIES = new Set<string>(DOCUMENT_CATEGORIES.map((c) => c.value as string))

/** Content-sniff the first bytes — the browser-supplied MIME type is not trusted. */
function matchesAllowedSignature(buf: Buffer): boolean {
  if (buf.length < 12) return false
  // PDF
  if (buf.subarray(0, 5).toString("ascii") === "%PDF-") return true
  // JPEG
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true
  // PNG
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47
  ) return true
  // WEBP: "RIFF" .... "WEBP"
  if (
    buf.subarray(0, 4).toString("ascii") === "RIFF" &&
    buf.subarray(8, 12).toString("ascii") === "WEBP"
  ) return true
  // HEIC/HEIF/AVIF container: "....ftyp" + brand
  if (buf.subarray(4, 8).toString("ascii") === "ftyp") {
    const brand = buf.subarray(8, 12).toString("ascii").toLowerCase()
    if (["heic", "heix", "heim", "heif", "mif1", "msf1"].includes(brand)) return true
  }
  return false
}

export async function POST(req: NextRequest) {
  try {
    const patient = await getCurrentPatient()
    if (!patient) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // Uploads trigger expensive AI processing — keep the rate sane per patient.
    const limiter = rateLimit(`upload:${patient.id}`, 30, 5 * 60 * 1000)
    if (!limiter.ok) return tooManyRequests(limiter.retryAfter)

    const formData = await req.formData()
    const file = formData.get("file")
    const title = (formData.get("title") as string | null)?.trim() ?? ""
    const category = formData.get("category") as string | null

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }
    if (!title || title.length > MAX_TITLE_LENGTH) {
      return NextResponse.json(
        { error: `Title is required and must be at most ${MAX_TITLE_LENGTH} characters` },
        { status: 400 }
      )
    }
    if (category && !VALID_CATEGORIES.has(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 })
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File exceeds the 25 MB limit" }, { status: 400 })
    }
    if (file.size === 0) {
      return NextResponse.json({ error: "File is empty" }, { status: 400 })
    }
    if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Unsupported file type. Upload a PDF, photo, or scan (JPEG/PNG/WebP/HEIC)." },
        { status: 415 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // Content signature check — defends against a spoofed content-type
    // hiding a script/archive inside the document vault.
    if (!matchesAllowedSignature(buffer)) {
      return NextResponse.json(
        { error: "File content does not look like a supported document format" },
        { status: 415 }
      )
    }

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
