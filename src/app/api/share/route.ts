import { NextRequest, NextResponse } from "next/server"
import { getCurrentPatient } from "@/lib/session"
import { db } from "@/lib/db"
import { SHARE_DURATIONS } from "@/lib/constants"
import { ShareDuration, ShareScope } from "@prisma/client"

const VALID_DURATIONS = new Set<string>(SHARE_DURATIONS.map((d) => d.value))

/**
 * Compute expiresAt from a ShareDuration value.
 * UNTIL_REVOKED maps to a far-future date (1 year from now) so the row stays "active".
 */
function computeExpiresAt(duration: string): Date {
  const meta = SHARE_DURATIONS.find((d) => d.value === duration)
  if (!meta) {
    // Default to 24h for unknown durations
    return new Date(Date.now() + 24 * 60 * 60 * 1000)
  }
  if (meta.seconds === null) {
    // UNTIL_REVOKED — 1 year from now (effectively no expiry)
    return new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
  }
  return new Date(Date.now() + meta.seconds * 1000)
}

export async function GET() {
  try {
    const patient = await getCurrentPatient()
    if (!patient) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const shares = await db.share.findMany({
      where: { patientId: patient.id },
      orderBy: { createdAt: "desc" },
      include: {
        doctor: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        },
        permissions: true,
        _count: { select: { aiQueries: true } },
      },
    })

    return NextResponse.json({
      shares: shares.map((s) => ({
        id: s.id,
        accessCode: s.accessCode,
        scope: s.scope,
        duration: s.duration,
        categories: s.categories,
        documentIds: s.documentIds,
        isActive: s.isActive,
        expiresAt: s.expiresAt,
        revokedAt: s.revokedAt,
        createdAt: s.createdAt,
        doctor: s.doctor
          ? {
              id: s.doctor.id,
              name: s.doctor.user.name,
              email: s.doctor.user.email,
              image: s.doctor.user.image,
              specialization: s.doctor.specialization,
              hospital: s.doctor.hospital,
            }
          : null,
        permissions: s.permissions,
        _count: s._count,
      })),
    })
  } catch (err) {
    console.error("List shares error:", err)
    return NextResponse.json({ error: "Failed to list shares" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const patient = await getCurrentPatient()
    if (!patient) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }

    const doctorEmail: unknown = body.doctorEmail
    const categoriesRaw: unknown = body.categories
    const documentIdsRaw: unknown = body.documentIds
    const durationRaw: unknown = body.duration

    if (typeof doctorEmail !== "string" || !doctorEmail.trim()) {
      return NextResponse.json({ error: "Doctor email is required" }, { status: 400 })
    }

    const email = doctorEmail.trim().toLowerCase()
    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 })
    }

    if (typeof durationRaw !== "string" || !VALID_DURATIONS.has(durationRaw)) {
      return NextResponse.json({ error: "Invalid duration" }, { status: 400 })
    }
    const duration = durationRaw as ShareDuration

    // Categories handling
    let categories: string[] = []
    if (Array.isArray(categoriesRaw)) {
      categories = categoriesRaw
        .filter((c): c is string => typeof c === "string" && c.length > 0)
        .map((c) => c.trim())
    }

    // Document IDs handling
    let documentIds: string[] = []
    if (Array.isArray(documentIdsRaw)) {
      documentIds = documentIdsRaw
        .filter((d): d is string => typeof d === "string" && d.length > 0)
        .map((d) => d.trim())
    }

    // FULL scope if categories includes "ALL" OR categories is empty
    const isFull = categories.length === 0 || categories.includes("ALL")
    const scope: ShareScope = isFull ? "FULL" : "PARTIAL"

    // Normalize categories for storage: FULL stores ["ALL"], PARTIAL stores unique set
    const storedCategories = isFull ? ["ALL"] : Array.from(new Set(categories.filter((c) => c !== "ALL")))

    if (!isFull && storedCategories.length === 0) {
      return NextResponse.json(
        { error: "Select at least one category or choose 'All categories'" },
        { status: 400 }
      )
    }

    // Look up the doctor by email (must have role DOCTOR + a Doctor profile)
    const doctorUser = await db.user.findUnique({
      where: { email },
      include: { doctor: true },
    })

    if (!doctorUser || doctorUser.role !== "DOCTOR" || !doctorUser.doctor) {
      return NextResponse.json(
        { error: "No doctor found with that email. Ask the doctor to register on MedUnbox first." },
        { status: 404 }
      )
    }

    // Verify any explicitly-shared documentIds belong to this patient (if provided)
    if (documentIds.length > 0) {
      const ownedDocs = await db.document.findMany({
        where: { id: { in: documentIds }, patientId: patient.id },
        select: { id: true },
      })
      const ownedIds = new Set(ownedDocs.map((d) => d.id))
      documentIds = documentIds.filter((d) => ownedIds.has(d))
    }

    const expiresAt = computeExpiresAt(duration)

    // Create the share + permission records atomically
    const share = await db.share.create({
      data: {
        patientId: patient.id,
        doctorId: doctorUser.doctor.id,
        scope,
        duration,
        expiresAt,
        categories: storedCategories,
        documentIds,
        permissions: {
          create: [
            // One permission per category (or ALL marker)
            ...storedCategories.map((c) => ({
              resource: c,
              resourceType: "CATEGORY",
              canRead: true,
              canDownload: false,
              canAskAI: true,
            })),
            // One permission per documentId
            ...documentIds.map((d) => ({
              resource: d,
              resourceType: "DOCUMENT",
              canRead: true,
              canDownload: false,
              canAskAI: true,
            })),
          ],
        },
      },
      include: {
        permissions: true,
        doctor: {
          include: {
            user: { select: { id: true, name: true, email: true, image: true } },
          },
        },
      },
    })

    // Audit log (best-effort)
    try {
      await db.auditLog.create({
        data: {
          userId: patient.userId,
          action: "SHARE_CREATED",
          resource: "Share",
          resourceId: share.id,
          metadata: {
            doctorId: share.doctorId,
            scope,
            duration,
            categories: storedCategories,
            documentIds,
            expiresAt: share.expiresAt,
          },
        },
      })
    } catch (e) {
      console.error("Audit log write failed:", e)
    }

    return NextResponse.json({
      ok: true,
      share: {
        id: share.id,
        accessCode: share.accessCode,
        scope: share.scope,
        duration: share.duration,
        categories: share.categories,
        documentIds: share.documentIds,
        isActive: share.isActive,
        expiresAt: share.expiresAt,
        revokedAt: share.revokedAt,
        createdAt: share.createdAt,
        doctor: {
          id: share.doctor.id,
          name: share.doctor.user.name,
          email: share.doctor.user.email,
          image: share.doctor.user.image,
          specialization: share.doctor.specialization,
          hospital: share.doctor.hospital,
        },
        permissions: share.permissions,
      },
    })
  } catch (err) {
    console.error("Create share error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create share" },
      { status: 500 }
    )
  }
}
