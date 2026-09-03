import { getCurrentPatient } from "@/lib/session"
import { db } from "@/lib/db"
import {
  Target,
  Pill,
  TestTube,
  HeartPulse,
  Calendar,
  CheckCircle2,
  Pause,
  Clock,
  AlertTriangle,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { EmptyState } from "@/components/empty-state"
import { formatDate } from "@/lib/constants"
import { cn } from "@/lib/utils"
import {
  GoalsAddButton,
  GoalRowActions,
} from "@/components/goals-actions"
import type { GoalFormData } from "@/components/goal-add-dialog"

const TYPE_META: Record<
  string,
  { icon: typeof Pill; label: string; tone: string }
> = {
  MEDICATION_ADHERENCE: { icon: Pill, label: "Medication Adherence", tone: "primary" },
  LAB_TARGET: { icon: TestTube, label: "Lab Target", tone: "emerald" },
  LIFESTYLE: { icon: HeartPulse, label: "Lifestyle", tone: "rose" },
  APPOINTMENT: { icon: Calendar, label: "Appointment", tone: "amber" },
  CUSTOM: { icon: Target, label: "Custom", tone: "primary" },
}

const STATUS_META: Record<
  string,
  { label: string; tone: string; icon: typeof CheckCircle2 }
> = {
  ACTIVE: { label: "Active", tone: "primary", icon: Clock },
  COMPLETED: { label: "Completed", tone: "emerald", icon: CheckCircle2 },
  PAUSED: { label: "Paused", tone: "muted", icon: Pause },
  MISSED: { label: "Missed", tone: "rose", icon: AlertTriangle },
}

const TONE_BG: Record<string, string> = {
  primary: "bg-primary/10",
  emerald: "bg-emerald-500/10",
  amber: "bg-amber-500/10",
  rose: "bg-rose-500/10",
  muted: "bg-muted",
}
const TONE_TEXT: Record<string, string> = {
  primary: "text-primary",
  emerald: "text-emerald-600 dark:text-emerald-400",
  amber: "text-amber-600 dark:text-amber-400",
  rose: "text-rose-600 dark:text-rose-400",
  muted: "text-muted-foreground",
}
const TONE_BADGE: Record<string, string> = {
  primary: "border-primary/30 bg-primary/10 text-primary",
  emerald:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  amber:
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  rose: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  muted: "border-border/60 bg-muted text-muted-foreground",
}

/** Try to extract the first numeric value from a free-text string. */
function parseLeadingNumber(s: string | null | undefined): number | null {
  if (!s) return null
  const m = s.match(/-?\d+(\.\d+)?/)
  if (!m) return null
  const n = parseFloat(m[0])
  return isNaN(n) ? null : n
}

/**
 * Compute a 0–100 progress percentage from current + target values.
 * - If target < current (e.g. "HbA1c < 6.0"), lower-is-better, so progress
 *   reflects how far the current value has dropped toward the target.
 * - If target > current (e.g. 10,000 steps), higher-is-better; progress is
 *   simply (current / target) capped at 100%.
 * - Returns null when we can't derive a sensible percentage.
 */
function computeProgress(
  currentStr: string | null | undefined,
  targetStr: string | null | undefined
): { percent: number; descending: boolean } | null {
  const current = parseLeadingNumber(currentStr)
  const target = parseLeadingNumber(targetStr)
  if (current === null || target === null) return null
  if (current === target) return { percent: 100, descending: false }

  if (target < current) {
    // Lower is better — anchor: current = 0%, target = 100%.
    const range = current - target
    if (range <= 0) return { percent: 100, descending: true }
    const remaining = current - target
    const percent = Math.max(0, Math.min(100, 100 - (remaining / current) * 100))
    return { percent: Math.round(percent), descending: true }
  }

  // Higher is better — current / target capped at 100.
  const percent = Math.max(0, Math.min(100, (current / target) * 100))
  return { percent: Math.round(percent), descending: false }
}

type GoalRow = {
  id: string
  title: string
  description: string | null
  type: string
  targetValue: string | null
  currentValue: string | null
  status: string
  dueDate: Date | null
  createdAt: Date
}

function isOverdue(g: GoalRow): boolean {
  return g.status === "ACTIVE" && !!g.dueDate && g.dueDate.getTime() < Date.now()
}

function toFormData(g: GoalRow): GoalFormData {
  return {
    id: g.id,
    title: g.title,
    type: g.type,
    description: g.description,
    targetValue: g.targetValue,
    currentValue: g.currentValue,
    status: g.status,
    dueDate: g.dueDate,
  }
}

export default async function GoalsPage() {
  const patient = await getCurrentPatient()
  if (!patient) return null

  const goals = await db.healthGoal.findMany({
    where: { patientId: patient.id },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
  })

  const totalCount = goals.length
  const activeCount = goals.filter((g) => g.status === "ACTIVE").length
  const completedCount = goals.filter((g) => g.status === "COMPLETED").length
  const overdueCount = goals.filter(isOverdue).length

  const activeGoals = goals.filter((g) => g.status === "ACTIVE")
  const completedGoals = goals.filter((g) => g.status === "COMPLETED")
  const pausedGoals = goals.filter((g) => g.status === "PAUSED")
  const missedGoals = goals.filter((g) => g.status === "MISSED")

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="flex items-center gap-1.5 text-sm font-medium text-primary">
            <Target className="h-4 w-4" /> Health Goals &amp; Reminders
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">My Health Goals</h1>
          <p className="text-sm text-muted-foreground">
            Set personal health targets and track your progress over time
          </p>
        </div>
        <GoalsAddButton />
      </div>

      {totalCount === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-0">
            <EmptyState
              icon={Target}
              title="No health goals yet"
              description="Create a goal to track a lab target, medication adherence, lifestyle change, or upcoming appointment reminder."
              action={
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <GoalsAddButton />
                </div>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard icon={Target} label="Total" value={totalCount} tone="primary" />
            <StatCard icon={Clock} label="Active" value={activeCount} tone="emerald" />
            <StatCard
              icon={CheckCircle2}
              label="Completed"
              value={completedCount}
              tone="muted"
            />
            <StatCard
              icon={AlertTriangle}
              label="Overdue"
              value={overdueCount}
              tone={overdueCount > 0 ? "rose" : "muted"}
            />
          </div>

          {/* Overdue warning banner */}
          {overdueCount > 0 && (
            <Card className="border-rose-500/40 bg-rose-500/5">
              <CardContent className="flex items-start gap-3 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/15">
                  <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-rose-800 dark:text-rose-300">
                    {overdueCount} goal{overdueCount === 1 ? "" : "s"} overdue
                  </p>
                  <p className="text-xs text-rose-700/80 dark:text-rose-300/80">
                    Mark them as completed, update the due date, or pause them
                    to keep your tracker accurate.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Active goals */}
          <GoalSection
            title="Active"
            icon={Clock}
            count={activeGoals.length}
            goals={activeGoals}
            emptyMessage="No active goals. Add one to start tracking."
            showActions
          />

          {/* Paused goals */}
          <GoalSection
            title="Paused"
            icon={Pause}
            count={pausedGoals.length}
            goals={pausedGoals}
            emptyMessage="No paused goals."
            showActions
          />

          {/* Missed goals */}
          {missedGoals.length > 0 && (
            <GoalSection
              title="Missed"
              icon={AlertTriangle}
              count={missedGoals.length}
              goals={missedGoals}
              emptyMessage=""
              showActions
            />
          )}

          {/* Completed goals */}
          <GoalSection
            title="Completed"
            icon={CheckCircle2}
            count={completedGoals.length}
            goals={completedGoals}
            emptyMessage="No completed goals yet — mark one as complete to celebrate a win!"
            showActions
          />
        </>
      )}

      {/* Educational footer */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-start gap-2 p-4 text-sm">
          <Target className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div>
            <p className="font-medium text-primary">Why set health goals?</p>
            <p className="text-muted-foreground">
              Specific, measurable goals — like reaching an HbA1c target or
              walking 10,000 steps a day — are strongly linked to better
              long-term outcomes. Talk to your care team before setting
              clinical targets.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================
// Goal section
// ============================================================

function GoalSection({
  title,
  icon: Icon,
  count,
  goals,
  emptyMessage,
  showActions,
}: {
  title: string
  icon: typeof Target
  count: number
  goals: GoalRow[]
  emptyMessage: string
  showActions?: boolean
}) {
  if (goals.length === 0 && !emptyMessage) return null
  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4 text-primary" /> {title}
          <Badge variant="secondary" className="ml-auto text-xs">
            {count}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {goals.length === 0 ? (
          <p className="py-3 text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {goals.map((g) => (
              <GoalCard
                key={g.id}
                goal={g}
                formData={toFormData(g)}
                overdue={isOverdue(g)}
                showActions={showActions}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================
// Goal card
// ============================================================

function GoalCard({
  goal,
  formData,
  overdue,
  showActions,
}: {
  goal: GoalRow
  formData: GoalFormData
  overdue: boolean
  showActions?: boolean
}) {
  const typeMeta = TYPE_META[goal.type] ?? TYPE_META.CUSTOM
  const statusMeta = STATUS_META[goal.status] ?? STATUS_META.ACTIVE
  const TypeIcon = typeMeta.icon
  const StatusIcon = statusMeta.icon
  const progress = computeProgress(goal.currentValue, goal.targetValue)

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border p-4 transition-colors",
        goal.status === "COMPLETED"
          ? "border-border/40 bg-muted/30"
          : overdue
          ? "border-rose-500/40 bg-rose-500/5"
          : "border-border/60 bg-card hover:border-primary/30"
      )}
    >
      {/* Header row: type icon + title + actions */}
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            TONE_BG[typeMeta.tone]
          )}
        >
          <TypeIcon className={cn("h-5 w-5", TONE_TEXT[typeMeta.tone])} />
        </div>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-sm font-semibold leading-snug",
              goal.status === "COMPLETED" && "line-through opacity-70"
            )}
          >
            {goal.title}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">{typeMeta.label}</p>
        </div>
        {showActions && <GoalRowActions goal={formData} />}
      </div>

      {/* Description */}
      {goal.description && (
        <p className="text-sm text-muted-foreground line-clamp-3">
          {goal.description}
        </p>
      )}

      {/* Target + current values */}
      {(goal.targetValue || goal.currentValue) && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {goal.targetValue && (
            <div>
              <span className="text-muted-foreground">Target: </span>
              <span className="font-medium text-foreground">{goal.targetValue}</span>
            </div>
          )}
          {goal.currentValue && (
            <div>
              <span className="text-muted-foreground">Current: </span>
              <span className="font-medium text-foreground">{goal.currentValue}</span>
            </div>
          )}
        </div>
      )}

      {/* Progress bar */}
      {progress && goal.status !== "COMPLETED" && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {progress.descending ? "Closing in on target" : "Toward target"}
            </span>
            <span className="font-semibold tabular-nums text-primary">
              {progress.percent}%
            </span>
          </div>
          <Progress value={progress.percent} className="h-2" />
        </div>
      )}

      {/* Footer: status + due date */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Badge variant="outline" className={cn("gap-1", TONE_BADGE[statusMeta.tone])}>
          <StatusIcon className="h-3 w-3" />
          {statusMeta.label}
        </Badge>
        {goal.dueDate && (
          <Badge
            variant="outline"
            className={cn(
              "gap-1",
              overdue
                ? "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                : "border-border/60 bg-muted text-muted-foreground"
            )}
          >
            <Calendar className="h-3 w-3" />
            {overdue ? "Overdue · " : "Due "}
            {formatDate(goal.dueDate)}
          </Badge>
        )}
      </div>
    </div>
  )
}

// ============================================================
// Stat card
// ============================================================

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Target
  label: string
  value: number
  tone: "primary" | "emerald" | "amber" | "rose" | "muted"
}) {
  return (
    <Card className="border-border/60">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg",
              TONE_BG[tone]
            )}
          >
            <Icon className={cn("h-5 w-5", TONE_TEXT[tone])} />
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums leading-none">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
