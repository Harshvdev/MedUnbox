import { NextRequest, NextResponse } from "next/server"
import { getCurrentPatient } from "@/lib/session"
import { db } from "@/lib/db"

const ALLOWED_STATUSES = [
  "RESOLVED_A",
  "RESOLVED_B",
  "RESOLVED_OTHER",
  "DISMISSED",
] as const

type ResolveStatus = (typeof ALLOWED_STATUSES)[number]

function statusLabel(status: ResolveStatus): string {
  switch (status) {
    case "RESOLVED_A":
      return "Patient marked Value A as correct"
    case "RESOLVED_B":
      return "Patient marked Value B as correct"
    case "RESOLVED_OTHER":
      return "Patient resolved with another value"
    case "DISMISSED":
      return "Patient dismissed the conflict"
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

    const body = (await req.json().catch(() => ({}))) as { status?: unknown }
    const rawStatus = typeof body?.status === "string" ? body.status : ""

    if (!ALLOWED_STATUSES.includes(rawStatus as ResolveStatus)) {
      return NextResponse.json(
        {
          error:
            "Invalid status. Must be one of RESOLVED_A, RESOLVED_B, RESOLVED_OTHER, DISMISSED",
        },
        { status: 400 }
      )
    }

    const status = rawStatus as ResolveStatus

    // Strict ownership — conflict must belong to this patient
    const existing = await db.conflict.findFirst({
      where: { id, patientId: patient.id },
      select: { id: true, entity: true, label: true },
    })

    if (!existing) {
      return NextResponse.json({ error: "Conflict not found" }, { status: 404 })
    }

    const now = new Date()
    const updated = await db.conflict.update({
      where: { id: existing.id },
      data: {
        status,
        resolution: statusLabel(status),
        resolvedAt: now,
      },
      select: { id: true, status: true, resolvedAt: true },
    })

    // Audit log (best-effort)
    try {
      await db.auditLog.create({
        data: {
          userId: patient.userId,
          action: "CONFLICT_RESOLVED",
          resource: "Conflict",
          resourceId: existing.id,
          metadata: {
            entity: existing.entity,
            label: existing.label,
            status,
          },
        },
      })
    } catch (e) {
      console.error("Audit log write failed:", e)
    }

    return NextResponse.json({
      ok: true,
      conflict: {
        id: updated.id,
        status: updated.status,
        resolvedAt: updated.resolvedAt,
      },
    })
  } catch (err) {
    console.error("Resolve conflict error:", err)
    return NextResponse.json(
      { error: "Failed to resolve conflict" },
      { status: 500 }
    )
  }
}
