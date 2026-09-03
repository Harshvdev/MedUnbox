import { NextRequest, NextResponse } from "next/server"
import { getCurrentPatient } from "@/lib/session"
import { db } from "@/lib/db"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const patient = await getCurrentPatient()
    if (!patient) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Strict ownership check — share must belong to this patient
    const share = await db.share.findFirst({
      where: { id, patientId: patient.id },
      include: {
        doctor: {
          include: {
            user: { select: { id: true, name: true, email: true, image: true } },
          },
        },
        permissions: true,
        _count: { select: { aiQueries: true } },
      },
    })

    if (!share) {
      return NextResponse.json({ error: "Share not found" }, { status: 404 })
    }

    return NextResponse.json({
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
        _count: share._count,
      },
    })
  } catch (err) {
    console.error("Get share error:", err)
    return NextResponse.json({ error: "Failed to fetch share" }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const patient = await getCurrentPatient()
    if (!patient) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const body = await req.json().catch(() => ({}))
    const action = typeof body?.action === "string" ? body.action : ""

    if (action !== "revoke") {
      return NextResponse.json(
        { error: "Unsupported action. Use { action: 'revoke' }" },
        { status: 400 }
      )
    }

    // Strict ownership check — only the patient who owns the share can revoke it
    const existing = await db.share.findFirst({
      where: { id, patientId: patient.id },
      select: { id: true, isActive: true, revokedAt: true, doctorId: true },
    })

    if (!existing) {
      return NextResponse.json({ error: "Share not found" }, { status: 404 })
    }

    if (!existing.isActive && existing.revokedAt) {
      return NextResponse.json({ error: "Share is already revoked" }, { status: 400 })
    }

    const now = new Date()
    const updated = await db.share.update({
      where: { id: existing.id },
      data: {
        isActive: false,
        revokedAt: now,
      },
    })

    // Audit log (best-effort)
    try {
      await db.auditLog.create({
        data: {
          userId: patient.userId,
          action: "SHARE_REVOKED",
          resource: "Share",
          resourceId: existing.id,
          metadata: { doctorId: existing.doctorId, revokedAt: now },
        },
      })
    } catch (e) {
      console.error("Audit log write failed:", e)
    }

    return NextResponse.json({
      ok: true,
      share: {
        id: updated.id,
        isActive: updated.isActive,
        revokedAt: updated.revokedAt,
      },
    })
  } catch (err) {
    console.error("Revoke share error:", err)
    return NextResponse.json({ error: "Failed to revoke share" }, { status: 500 })
  }
}

// DELETE is an alias for PATCH { action: "revoke" }
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const patient = await getCurrentPatient()
    if (!patient) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const existing = await db.share.findFirst({
      where: { id, patientId: patient.id },
      select: { id: true, isActive: true, revokedAt: true, doctorId: true },
    })

    if (!existing) {
      return NextResponse.json({ error: "Share not found" }, { status: 404 })
    }

    if (!existing.isActive && existing.revokedAt) {
      return NextResponse.json({ error: "Share is already revoked" }, { status: 400 })
    }

    const now = new Date()
    const updated = await db.share.update({
      where: { id: existing.id },
      data: { isActive: false, revokedAt: now },
    })

    try {
      await db.auditLog.create({
        data: {
          userId: patient.userId,
          action: "SHARE_REVOKED",
          resource: "Share",
          resourceId: existing.id,
          metadata: { doctorId: existing.doctorId, revokedAt: now },
        },
      })
    } catch (e) {
      console.error("Audit log write failed:", e)
    }

    return NextResponse.json({
      ok: true,
      share: {
        id: updated.id,
        isActive: updated.isActive,
        revokedAt: updated.revokedAt,
      },
    })
  } catch (err) {
    console.error("Delete (revoke) share error:", err)
    return NextResponse.json({ error: "Failed to revoke share" }, { status: 500 })
  }
}
