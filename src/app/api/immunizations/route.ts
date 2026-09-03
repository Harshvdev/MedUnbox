import { NextRequest, NextResponse } from "next/server"
import { getCurrentPatient } from "@/lib/session"
import { db } from "@/lib/db"
import { z } from "zod"
import { randomUUID, createHash } from "crypto"

const immunizationSchema = z.object({
  vaccine: z.string().min(1).max(200),
  doseNumber: z.number().int().min(1).max(50).optional().nullable(),
  dateAdministered: z.string().optional().nullable(),
  administeredBy: z.string().max(200).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
})

function sanitizeEntityKey(name: string): string {
  return (
    "VACCINE_" +
    name
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
  )
}

/**
 * POST /api/immunizations
 *
 * Manually register a vaccination record. Because MedicalEntity requires a
 * documentId, we create a synthetic "manual entry" Document (no ImageKit
 * backing file) with status=PROCESSED and category=VACCINATION, then attach
 * a MedicalEntity(category=IMMUNIZATION) and emit a VACCINATION timeline
 * event. This lets the patient track vaccinations that weren't extracted
 * from an uploaded document (e.g. next-dose reminders from their doctor).
 */
export async function POST(req: NextRequest) {
  try {
    const patient = await getCurrentPatient()
    if (!patient) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const parsed = immunizationSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { vaccine, doseNumber, dateAdministered, administeredBy, notes } = parsed.data

    const vaccineName = vaccine.trim()
    const dose = doseNumber ?? null
    const dateObj = dateAdministered ? new Date(dateAdministered) : null
    const validDate = dateObj && !isNaN(dateObj.getTime()) ? dateObj : null
    const adminBy = administeredBy?.trim() || null

    // Deterministic-but-unique hash for the synthetic document so duplicate
    // detection can still flag re-uploads of the same vaccination.
    const hashInput = [
      patient.id,
      vaccineName,
      dose ?? "",
      validDate ? validDate.toISOString().slice(0, 10) : "",
      adminBy ?? "",
    ].join("|")
    const fileHash = createHash("sha256").update(hashInput).digest("hex")

    // Use a transaction so we never end up with an orphaned Document or
    // MedicalEntity if any write fails.
    const result = await db.$transaction(async (tx) => {
      // 1. Synthetic placeholder Document
      const doc = await tx.document.create({
        data: {
          patientId: patient.id,
          title: `Manual Entry: ${vaccineName}${dose ? ` (Dose ${dose})` : ""}`,
          category: "VACCINATION",
          mimeType: "manual/entry",
          fileSize: 0,
          fileHash,
          pageCount: 1,
          imagekitFileId: `manual-entry-${randomUUID()}`,
          imagekitUrl: "manual://entry",
          status: "PROCESSED",
          processedAt: new Date(),
        },
      })

      // 2. Build the rawText provenance span the immunizations page parses:
      //    "Vaccine (Dose N) on YYYY-MM-DD by Doctor"
      const header = dose ? `${vaccineName} (Dose ${dose})` : vaccineName
      const rawText =
        header +
        (validDate ? ` on ${validDate.toISOString().slice(0, 10)}` : "") +
        (adminBy ? ` by ${adminBy}` : "")

      // 3. MedicalEntity(category=IMMUNIZATION) linked to the synthetic doc
      const entity = await tx.medicalEntity.create({
        data: {
          documentId: doc.id,
          pageId: null,
          pageNumber: 1,
          entity: sanitizeEntityKey(vaccineName),
          entityLabel: `Vaccination: ${vaccineName}`,
          category: "IMMUNIZATION",
          rawText,
          normalizedValue: dose ? String(dose) : null,
          confidence: 1.0,
        },
      })

      // 4. VACCINATION timeline event for the longitudinal timeline
      const event = await tx.timelineEvent.create({
        data: {
          patientId: patient.id,
          date: validDate ?? new Date(),
          title: `Vaccination: ${vaccineName}${dose ? ` (Dose ${dose})` : ""}`,
          description: [
            validDate
              ? `Administered on ${validDate.toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}`
              : "Date not specified",
            adminBy ? `Administered by ${adminBy}` : null,
            notes?.trim() || null,
          ]
            .filter(Boolean)
            .join(" · "),
          category: "VACCINATION",
          sourceDocId: doc.id,
          metadata: { manualEntry: true, entityId: entity.id },
        },
      })

      return { doc, entity, event }
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error("Create immunization error:", err)
    return NextResponse.json({ error: "Failed to create immunization" }, { status: 500 })
  }
}
