import { NextRequest, NextResponse } from "next/server"
import { getCurrentPatient } from "@/lib/session"
import { db } from "@/lib/db"
import { z } from "zod"

export const GOAL_TYPES = [
  "MEDICATION_ADHERENCE",
  "LAB_TARGET",
  "LIFESTYLE",
  "APPOINTMENT",
  "CUSTOM",
] as const

const goalSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(2000).optional().nullable(),
  type: z.enum(GOAL_TYPES),
  targetValue: z.string().max(200).optional().nullable(),
  currentValue: z.string().max(200).optional().nullable(),
  dueDate: z.string().optional().nullable(),
})

/**
 * GET /api/goals
 * Lists the current patient's health goals, ordered by status (ACTIVE first)
 * then by dueDate ascending (soonest first). NULL dueDates sort last.
 */
export async function GET() {
  try {
    const patient = await getCurrentPatient()
    if (!patient) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const goals = await db.healthGoal.findMany({
      where: { patientId: patient.id },
      orderBy: [
        { status: "asc" },
        { dueDate: "asc" },
        { createdAt: "desc" },
      ],
    })

    // Stable in-memory sort: keep the status ordering from the DB but
    // reorder within each status group so null dueDates come after dated
    // ones and earlier due dates come first.
    const statusOrder: Record<string, number> = {
      ACTIVE: 0,
      MISSED: 1,
      PAUSED: 2,
      COMPLETED: 3,
    }
    const sorted = [...goals].sort((a, b) => {
      const sa = statusOrder[a.status] ?? 99
      const sb = statusOrder[b.status] ?? 99
      if (sa !== sb) return sa - sb
      if (a.dueDate && b.dueDate) return a.dueDate.getTime() - b.dueDate.getTime()
      if (a.dueDate && !b.dueDate) return -1
      if (!a.dueDate && b.dueDate) return 1
      return b.createdAt.getTime() - a.createdAt.getTime()
    })

    return NextResponse.json({ goals: sorted })
  } catch (err) {
    console.error("List goals error:", err)
    return NextResponse.json({ error: "Failed to list goals" }, { status: 500 })
  }
}

/**
 * POST /api/goals
 * Creates a new health goal for the current patient. New goals start as ACTIVE.
 */
export async function POST(req: NextRequest) {
  try {
    const patient = await getCurrentPatient()
    if (!patient) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const parsed = goalSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const data = parsed.data

    const goal = await db.healthGoal.create({
      data: {
        patientId: patient.id,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        type: data.type,
        targetValue: data.targetValue?.trim() || null,
        currentValue: data.currentValue?.trim() || null,
        status: "ACTIVE",
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      },
    })

    return NextResponse.json({ ok: true, goal })
  } catch (err) {
    console.error("Create goal error:", err)
    return NextResponse.json({ error: "Failed to create goal" }, { status: 500 })
  }
}
