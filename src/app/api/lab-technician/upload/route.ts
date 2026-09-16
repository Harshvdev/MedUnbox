import { NextRequest, NextResponse } from "next/server"
import { createHash } from "crypto"
import { getCurrentUser, getCurrentLabTechnician } from "@/lib/session"
import { db } from "@/lib/db"
import { uploadDocumentToImageKit } from "@/lib/imagekit"
import { processDocument } from "@/lib/processing"

const MAX_FILE_SIZE = 25 * 1024 * 1024

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    const labTech = await getCurrentLabTechnician()
    if (!user || user.role !== "LAB_TECHNICIAN" || !labTech) {
      return NextResponse.json({ error: "Only authorized lab technicians can upload reports" }, { status: 403 })
    }

    const formData = await req.formData()
    const file = formData.get("file")
    const title = (formData.get("title") as string | null)?.trim() || "Diagnostic Lab Report"
    const patientId = formData.get("patientId") as string | null
    const testOrderId = formData.get("testOrderId") as string | null
    const resultSummary = (formData.get("resultSummary") as string | null)?.trim() || ""

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

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File exceeds 25 MB limit" }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const fileHash = createHash("sha256").update(buffer).digest("hex")

    // Upload to ImageKit or fallback
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
        category: "LAB_REPORT",
        mimeType: file.type || "application/octet-stream",
        fileSize: file.size,
        fileHash,
        pageCount: 1,
        imagekitFileId: uploaded.fileId,
        imagekitUrl: uploaded.url,
        thumbnailUrl: uploaded.thumbnailUrl,
        status: "UPLOADED",
        uploaderId: user.id,
      },
    })

    // If linked to a test order, update the order
    if (testOrderId) {
      await db.labTestOrder.update({
        where: { id: testOrderId },
        data: {
          status: "COMPLETED",
          resultSummary: resultSummary || `Uploaded lab report: ${title}`,
          documentId: document.id,
          completedAt: new Date(),
          labTechnicianId: labTech.id,
        },
      })
    }

    // Add timeline event
    await db.timelineEvent.create({
      data: {
        patientId: patient.id,
        date: new Date(),
        title: `Lab report uploaded: ${title}`,
        description: `Uploaded and verified by ${user.name || "Lab Technician"} (${labTech.labName || "Laboratory"}). ${resultSummary}`,
        category: "LAB_TEST",
        sourceDocId: document.id,
      },
    })

    // Trigger AI OCR processing asynchronously
    processDocument(document.id).catch((err) => {
      console.warn(`Processing queued for doc ${document.id}:`, err)
    })

    return NextResponse.json({
      ok: true,
      documentId: document.id,
      testOrderId,
      message: "Lab report uploaded and attached successfully",
    })
  } catch (err) {
    console.error("Lab technician upload error:", err)
    return NextResponse.json({ error: "Failed to upload lab report" }, { status: 500 })
  }
}
