import Link from "next/link"
import { getCurrentPatient, getCurrentUser } from "@/lib/session"
import { db } from "@/lib/db"
import {
  FileText,
  Activity,
  Share2,
  AlertTriangle,
  TrendingUp,
  Upload,
  Brain,
  ArrowRight,
  Pill,
  Stethoscope,
  HeartPulse,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  Download,
  ShieldAlert,
  Siren,
  Target,
  type LucideIcon,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  formatDate,
  formatDateShort,
  timeAgo,
  categoryLabel,
  shareDurationLabel,
  VALUE_STATUS_META,
} from "@/lib/constants"
import { EmptyState } from "@/components/empty-state"
import { cn } from "@/lib/utils"
import { HealthScoreCard } from "@/components/health-score-card"

export default async function DashboardPage() {
  const patient = await getCurrentPatient()
  const user = await getCurrentUser()
  if (!patient || !user) return null

  const [
    docCount,
    activeShares,
    conflicts,
    recentDocs,
    recentEvents,
    medCount,
    diagCount,
    abnormalCount,
    recentValues,
    activeMeds,
    activeDiagnoses,
    trends,
    // --- Activity feed sources ---
    recentAbnormal,
    recentDiagnoses,
    recentMeds,
    recentConflicts,
    recentShares,
    // --- Allergies ---
    allergyCount,
    severeAllergies,
    // --- Health goals ---
    activeGoalsCount,
    overdueGoalsCount,
    upcomingGoals,
  ] = await Promise.all([
    db.document.count({ where: { patientId: patient.id } }),
    db.share.count({
      where: { patientId: patient.id, isActive: true, revokedAt: null, expiresAt: { gt: new Date() } },
    }),
    db.conflict.count({ where: { patientId: patient.id, status: "UNRESOLVED" } }),
    db.document.findMany({
      where: { patientId: patient.id },
      orderBy: { uploadedAt: "desc" },
      take: 5,
      include: { _count: { select: { medicalValues: true } } },
    }),
    db.timelineEvent.findMany({
      where: { patientId: patient.id },
      orderBy: { date: "desc" },
      take: 5,
      include: { document: true },
    }),
    db.medication.count({ where: { patientId: patient.id, status: "ACTIVE" } }),
    db.diagnosis.count({ where: { patientId: patient.id, status: "ACTIVE" } }),
    db.medicalValue.count({
      where: {
        patientId: patient.id,
        status: { in: ["ABNORMAL_LOW", "ABNORMAL_HIGH", "CRITICAL"] },
      },
    }),
    db.medicalValue.findMany({
      where: {
        patientId: patient.id,
        status: { in: ["ABNORMAL_LOW", "ABNORMAL_HIGH", "CRITICAL"] },
      },
      include: { document: true },
      orderBy: { recordedAt: "desc" },
      take: 4,
    }),
    db.medication.findMany({
      where: { patientId: patient.id, status: "ACTIVE" },
      take: 5,
    }),
    db.diagnosis.findMany({
      where: { patientId: patient.id, status: "ACTIVE" },
      take: 5,
    }),
    db.trend.findMany({
      where: { patientId: patient.id },
      orderBy: { lastUpdated: "desc" },
      take: 4,
    }),
    // --- Activity feed sources ---
    db.medicalValue.findMany({
      where: {
        patientId: patient.id,
        status: { in: ["ABNORMAL_LOW", "ABNORMAL_HIGH", "CRITICAL"] },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { document: true },
    }),
    db.diagnosis.findMany({
      where: { patientId: patient.id },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    db.medication.findMany({
      where: { patientId: patient.id },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    db.conflict.findMany({
      where: { patientId: patient.id },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    db.share.findMany({
      where: { patientId: patient.id },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: { doctor: { include: { user: true } } },
    }),
    // --- Allergies ---
    db.medicalEntity.count({
      where: {
        category: "ALLERGY",
        document: { patientId: patient.id },
      },
    }),
    db.medicalEntity.findMany({
      where: {
        category: "ALLERGY",
        document: { patientId: patient.id },
        normalizedValue: { equals: "SEVERE", mode: "insensitive" },
      },
      include: { document: { select: { id: true, title: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    // --- Health goals ---
    db.healthGoal.count({
      where: { patientId: patient.id, status: "ACTIVE" },
    }),
    db.healthGoal.count({
      where: {
        patientId: patient.id,
        status: "ACTIVE",
        dueDate: { lt: new Date() },
      },
    }),
    db.healthGoal.findMany({
      where: {
        patientId: patient.id,
        status: "ACTIVE",
        dueDate: { gte: new Date() },
      },
      orderBy: { dueDate: "asc" },
      take: 3,
    }),
  ])

  // Emergency-access readiness — shown as a subtle warning card if the
  // patient has no emergency contacts set up yet.
  const emergencyAccessCount = await db.emergencyAccess.count({
    where: { patientId: patient.id, isActive: true },
  })

  // Build unified, chronologically-sorted activity feed (max 8 items)
  const activities = buildActivityFeed({
    docs: recentDocs,
    values: recentAbnormal,
    diagnoses: recentDiagnoses,
    meds: recentMeds,
    conflicts: recentConflicts,
    shares: recentShares,
    timeline: recentEvents,
  })

  // Smart stat card — color reflects state, not just category
  const stats: StatItem[] = [
    {
      label: "Documents",
      value: docCount,
      icon: FileText,
      href: "/documents",
      tone: "primary",
      sub: docCount === 0 ? "Get started" : `${docCount} in vault`,
    },
    {
      label: "Active Shares",
      value: activeShares,
      icon: Share2,
      href: "/sharing",
      tone: activeShares > 0 ? "emerald" : "muted",
      sub: activeShares === 0 ? "No active access" : `${activeShares} doctor${activeShares === 1 ? "" : "s"}`,
    },
    {
      label: "Conflicts",
      value: conflicts,
      icon: conflicts > 0 ? AlertTriangle : CheckCircle2,
      href: "/conflicts",
      tone: conflicts > 0 ? "amber" : "emerald",
      sub: conflicts > 0 ? "Needs review" : "All clear",
    },
    {
      label: "Abnormal Labs",
      value: abnormalCount,
      icon: abnormalCount > 0 ? HeartPulse : CheckCircle2,
      href: "/trends",
      tone: abnormalCount > 0 ? "rose" : "emerald",
      sub: abnormalCount === 0 ? "Within range" : `${abnormalCount} flagged`,
    },
  ]

  const firstName = user.name?.split(" ")[0] ?? "there"
  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-7xl">
      {/* Header — refined hierarchy */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-primary">{greeting}, {firstName}</p>
          <h1 className="text-2xl font-semibold tracking-tight">Your Medical Vault</h1>
          <p className="text-sm text-muted-foreground">
            {docCount > 0
              ? `${docCount} document${docCount === 1 ? "" : "s"} · ${abnormalCount} flagged value${abnormalCount === 1 ? "" : "s"} · ${activeShares} active share${activeShares === 1 ? "" : "s"}`
              : "Start by uploading your first medical document"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm" className="h-9">
            <Link href="/ask"><Brain className="mr-1.5 h-4 w-4" /> Ask AI</Link>
          </Button>
          {docCount > 0 && (
            <Button asChild variant="outline" size="sm" className="h-9">
              <Link href="/export"><Download className="mr-1.5 h-4 w-4" /> Export</Link>
            </Button>
          )}
          <Button asChild size="sm" className="h-9">
            <Link href="/documents"><Upload className="mr-1.5 h-4 w-4" /> Upload</Link>
          </Button>
        </div>
      </div>

      {/* Stats — smart tone, subtle hover lift */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="group">
            <Card className="relative overflow-hidden border-border/60 transition-all duration-200 hover:border-primary/40 hover:shadow-md">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", TONE_BG[s.tone])}>
                    <s.icon className={cn("h-5 w-5", TONE_TEXT[s.tone])} />
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </div>
                <p className="mt-3 text-3xl font-bold tracking-tight tabular-nums">{s.value}</p>
                <p className="text-sm font-medium">{s.label}</p>
                <p className="text-xs text-muted-foreground">{s.sub}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Emergency access readiness warning */}
      {emergencyAccessCount === 0 && (
        <Link href="/emergency" className="group block">
          <Card className="border-amber-500/40 bg-amber-500/5 transition-all hover:border-amber-500/70 hover:shadow-md">
            <CardContent className="flex items-start gap-3 p-4 sm:p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/15">
                <Siren className="h-5 w-5 text-amber-600 dark:text-amber-500" />
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  Set up Emergency Access
                </p>
                <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
                  Ensure critical info — blood group, allergies, conditions, medications —
                  is available to first responders via a special access code.
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center text-xs font-medium text-amber-700 transition-transform group-hover:translate-x-0.5 dark:text-amber-400">
                Set up <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </span>
            </CardContent>
          </Card>
        </Link>
      )}

      {/* Health Score + Health Insights — AI-driven cards */}
      {docCount > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          <HealthScoreCard />
          {(docCount > 0 || trends.length > 0 || abnormalCount > 0) && (
            <HealthInsights
              abnormalCount={abnormalCount}
              activeDiagnoses={activeDiagnoses}
              trends={trends}
              recentAbnormal={recentValues}
            />
          )}
        </div>
      )}

      {/* First-time onboarding prompt */}
      {docCount === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-3 p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Upload className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Upload your first document</h3>
              <p className="text-sm text-muted-foreground">
                Add a lab report, prescription, or scan to get started
              </p>
            </div>
            <Button asChild>
              <Link href="/documents">Go to Documents <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity feed + Quick Actions sidebar */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Activity feed (2/3 width) */}
        <Card className="border-border/60 lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div className="space-y-0.5">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" /> Recent Activity
              </CardTitle>
              <CardDescription className="text-xs">
                Latest events across your medical vault
              </CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-primary">
              <Link href="/timeline">View all <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <EmptyState
                icon={Activity}
                title="No recent activity"
                description="Upload documents to start populating your activity feed"
              />
            ) : (
              <div className="max-h-96 overflow-y-auto scroll-thin pr-1">
                <ol className="relative space-y-1 pl-10">
                  {/* Continuous vertical rail aligned to icon center
                      (link p-1.5 = 6px + icon half = 16px → center at 22px) */}
                  <div
                    className="absolute left-[22px] top-[22px] bottom-[22px] z-10 w-px bg-border"
                    aria-hidden
                  />
                  {activities.map((a) => {
                    const meta = ACTIVITY_META[a.type]
                    const Icon = meta.icon
                    return (
                      <li key={a.id} className="relative">
                        <Link
                          href={a.href}
                          className="group -ml-10 flex items-start gap-3 rounded-lg p-1.5 transition-colors hover:bg-accent/50"
                        >
                          <div
                            className={cn(
                              "relative z-20 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-4 ring-background",
                              meta.bg,
                            )}
                          >
                            <Icon className={cn("h-4 w-4", meta.text)} />
                          </div>
                          <div className="min-w-0 flex-1 pt-0.5">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-medium leading-snug">{a.title}</p>
                              <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground tabular-nums">
                                {timeAgo(a.timestamp)}
                              </span>
                            </div>
                            <p className="truncate text-xs text-muted-foreground">{a.description}</p>
                          </div>
                        </Link>
                      </li>
                    )
                  })}
                </ol>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions sidebar (1/3 width) */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Quick Actions
            </CardTitle>
            <CardDescription className="text-xs">Jump to common tasks</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button asChild variant="outline" className="h-11 justify-start">
              <Link href="/documents">
                <Upload className="mr-2 h-4 w-4 text-primary" /> Upload Document
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-11 justify-start">
              <Link href="/ask">
                <Brain className="mr-2 h-4 w-4 text-primary" /> Ask AI
              </Link>
            </Button>
            {docCount > 0 ? (
              <Button asChild variant="outline" className="h-11 justify-start">
                <Link href="/export">
                  <Download className="mr-2 h-4 w-4 text-primary" /> Export Records
                </Link>
              </Button>
            ) : (
              <Button variant="outline" className="h-11 justify-start" disabled>
                <Download className="mr-2 h-4 w-4 text-muted-foreground" /> Export Records
              </Button>
            )}
            <Button asChild variant="outline" className="h-11 justify-start">
              <Link href="/sharing">
                <Share2 className="mr-2 h-4 w-4 text-primary" /> Share Access
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Severe allergies warning banner */}
      {severeAllergies.length > 0 && (
        <Card className="border-rose-500/40 bg-rose-500/5">
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/15">
                  <ShieldAlert className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                </div>
                <div className="min-w-0 space-y-1">
                  <p className="flex items-center gap-2 text-sm font-semibold text-rose-800 dark:text-rose-300">
                    Severe allergy alert
                    <Badge
                      variant="outline"
                      className="border-rose-300 bg-rose-500/10 text-rose-700 dark:border-rose-700/60 dark:bg-rose-950/40 dark:text-rose-300"
                    >
                      {severeAllergies.length} severe
                    </Badge>
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {severeAllergies.map((a) => (
                      <Link
                        key={a.id}
                        href={`/documents/${a.documentId}`}
                        className="inline-flex items-center gap-1 rounded-md border border-rose-300/60 bg-background/60 px-2 py-0.5 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-500/10 dark:border-rose-700/50 dark:text-rose-300"
                      >
                        <ShieldAlert className="h-3 w-3" />
                        {a.entityLabel.replace(/^Allergy:\s*/i, "")}
                      </Link>
                    ))}
                  </div>
                  <p className="text-xs text-rose-700/80 dark:text-rose-300/80">
                    Ensure healthcare providers are informed before any new treatment.
                  </p>
                </div>
              </div>
              <Button asChild variant="outline" size="sm" className="shrink-0 border-rose-300 text-rose-700 hover:bg-rose-500/10 dark:border-rose-700/60 dark:text-rose-300">
                <Link href="/allergies">
                  View all <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Health Goals summary — only shown when goals exist or as a soft CTA */}
      <HealthGoalsSummary
        activeCount={activeGoalsCount}
        overdueCount={overdueGoalsCount}
        upcoming={upcomingGoals}
      />

      {/* Active diagnoses & meds */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Stethoscope className="h-4 w-4 text-primary" /> Active Conditions
              {allergyCount > 0 && (
                <Link
                  href="/allergies"
                  className="ml-auto inline-flex items-center gap-1 rounded-full border border-rose-300/70 bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-700 transition-colors hover:bg-rose-500/20 dark:border-rose-700/60 dark:bg-rose-950/40 dark:text-rose-300"
                  title={`${allergyCount} allerg${allergyCount === 1 ? "y" : "ies"} recorded`}
                >
                  <ShieldAlert className="h-3 w-3" />
                  {allergyCount} allerg{allergyCount === 1 ? "y" : "ies"}
                </Link>
              )}
            </CardTitle>
            <CardDescription className="text-xs">Diagnoses currently being managed</CardDescription>
          </CardHeader>
          <CardContent>
            {activeDiagnoses.length === 0 ? (
              <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" /> No active conditions recorded
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto scroll-thin pr-1">
                {activeDiagnoses.map((d) => (
                  <div key={d.id} className="flex items-start gap-2 rounded-lg border border-border/50 p-2.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-rose-500/10">
                      <Stethoscope className="h-3.5 w-3.5 text-rose-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{d.name}</p>
                      <div className="flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                        {d.severity && <span>{d.severity}</span>}
                        {d.diagnosedAt && <span>· {formatDate(d.diagnosedAt)}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Pill className="h-4 w-4 text-primary" /> Active Medications
            </CardTitle>
            <CardDescription className="text-xs">Currently prescribed</CardDescription>
          </CardHeader>
          <CardContent>
            {activeMeds.length === 0 ? (
              <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" /> No active medications recorded
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto scroll-thin pr-1">
                {activeMeds.map((m) => (
                  <div key={m.id} className="flex items-start gap-2 rounded-lg border border-border/50 p-2.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
                      <Pill className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{m.name}</p>
                      <div className="flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                        {m.dosage && <span>{m.dosage}</span>}
                        {m.frequency && <span>· {m.frequency}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ============================================================
// Recent Activity feed — unified chronological merge
// ============================================================

type ActivityType =
  | "upload"
  | "abnormal"
  | "diagnosis"
  | "medication"
  | "conflict"
  | "share"
  | "timeline"

interface ActivityItem {
  id: string
  type: ActivityType
  title: string
  description: string
  timestamp: Date
  href: string
}

/**
 * Per-type visual metadata. Colors follow the clinical palette:
 * upload=primary(teal), abnormal=amber, diagnosis=rose,
 * medication=violet, conflict=amber, share=emerald, timeline=sky.
 */
const ACTIVITY_META: Record<
  ActivityType,
  { icon: LucideIcon; bg: string; text: string; label: string }
> = {
  upload: {
    icon: Upload,
    bg: "bg-primary/10",
    text: "text-primary",
    label: "Upload",
  },
  abnormal: {
    icon: AlertTriangle,
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
    label: "Abnormal",
  },
  diagnosis: {
    icon: Stethoscope,
    bg: "bg-rose-500/10",
    text: "text-rose-600 dark:text-rose-400",
    label: "Diagnosis",
  },
  medication: {
    icon: Pill,
    bg: "bg-violet-500/10",
    text: "text-violet-600 dark:text-violet-400",
    label: "Medication",
  },
  conflict: {
    icon: AlertTriangle,
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
    label: "Conflict",
  },
  share: {
    icon: Share2,
    bg: "bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
    label: "Share",
  },
  timeline: {
    icon: Activity,
    bg: "bg-sky-500/10",
    text: "text-sky-600 dark:text-sky-400",
    label: "Timeline",
  },
}

/**
 * Merge recent records from 7 tables into a single chronological feed.
 * Each source is mapped to a unified ActivityItem shape, then sorted
 * by timestamp descending and capped at 8 items.
 */
function buildActivityFeed(input: {
  docs: any[]
  values: any[]
  diagnoses: any[]
  meds: any[]
  conflicts: any[]
  shares: any[]
  timeline: any[]
}): ActivityItem[] {
  const items: ActivityItem[] = []

  // Document uploads
  for (const doc of input.docs) {
    const count = doc._count?.medicalValues ?? 0
    items.push({
      id: `upload-${doc.id}`,
      type: "upload",
      title: `"${doc.title}" uploaded`,
      description: `${categoryLabel(doc.category)} · ${count} value${count === 1 ? "" : "s"} extracted`,
      timestamp: doc.uploadedAt,
      href: `/documents/${doc.id}`,
    })
  }

  // Abnormal findings detected
  for (const v of input.values) {
    const meta = VALUE_STATUS_META[v.status] ?? VALUE_STATUS_META.UNKNOWN
    const statusWord = meta.label.toLowerCase()
    const valStr = `${v.value}${v.unit ? ` ${v.unit}` : ""}`
    items.push({
      id: `abnormal-${v.id}`,
      type: "abnormal",
      title: `${v.label} ${statusWord}: ${valStr}`,
      description: v.document ? `Found in "${v.document.title}"` : "Flagged for review",
      timestamp: v.createdAt,
      href: v.documentId ? `/documents/${v.documentId}` : "/trends",
    })
  }

  // New diagnoses
  for (const d of input.diagnoses) {
    items.push({
      id: `diagnosis-${d.id}`,
      type: "diagnosis",
      title: `Diagnosis: ${d.name}`,
      description: d.severity ? `Severity: ${d.severity}` : "New diagnosis added",
      timestamp: d.createdAt,
      href: "/timeline",
    })
  }

  // New medications prescribed
  for (const m of input.meds) {
    const parts = [m.dosage, m.frequency].filter(Boolean)
    items.push({
      id: `medication-${m.id}`,
      type: "medication",
      title: `Medication: ${m.name}`,
      description: parts.length > 0 ? parts.join(" · ") : "Added to records",
      timestamp: m.createdAt,
      href: "/timeline",
    })
  }

  // Conflicts detected
  for (const c of input.conflicts) {
    items.push({
      id: `conflict-${c.id}`,
      type: "conflict",
      title: `Conflict: ${c.label}`,
      description: `${c.valueA} vs ${c.valueB}`,
      timestamp: c.createdAt,
      href: "/conflicts",
    })
  }

  // Shares created
  for (const s of input.shares) {
    const doctorName = s.doctor?.user?.name ?? "a doctor"
    const durLabel = shareDurationLabel(s.duration)
    const catCount = Array.isArray(s.categories) ? s.categories.length : 0
    items.push({
      id: `share-${s.id}`,
      type: "share",
      title: `Access shared with ${doctorName}`,
      description: `${durLabel} · ${catCount} categor${catCount === 1 ? "y" : "ies"}`,
      timestamp: s.createdAt,
      href: "/sharing",
    })
  }

  // Timeline events
  for (const ev of input.timeline) {
    items.push({
      id: `timeline-${ev.id}`,
      type: "timeline",
      title: ev.title,
      description: ev.description || "Timeline event",
      timestamp: ev.date,
      href: ev.sourceDocId ? `/documents/${ev.sourceDocId}` : "/timeline",
    })
  }

  // Sort newest first, cap at 8
  items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  return items.slice(0, 8)
}

// ============================================================
// Health Insights Card (AI-style summary)
// ============================================================

function HealthInsights({
  abnormalCount,
  activeDiagnoses,
  trends,
  recentAbnormal,
}: {
  abnormalCount: number
  activeDiagnoses: any[]
  trends: any[]
  recentAbnormal: any[]
}) {
  const improvingTrends = trends.filter((t) => t.direction === "IMPROVING").length
  const worseningTrends = trends.filter((t) => t.direction === "WORSENING").length

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          Health Insights
          <Badge variant="secondary" className="ml-auto text-xs">Auto-generated</Badge>
        </CardTitle>
        <CardDescription className="text-xs">A quick snapshot based on your uploaded records</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-3">
          <InsightTile
            icon={HeartPulse}
            tone={abnormalCount > 0 ? "amber" : "emerald"}
            label="Flagged values"
            value={abnormalCount}
            hint={abnormalCount > 0 ? "Review recommended" : "All within range"}
          />
          <InsightTile
            icon={TrendingUp}
            tone={worseningTrends > 0 ? "rose" : "emerald"}
            label="Worsening trends"
            value={worseningTrends}
            hint={improvingTrends > 0 ? `${improvingTrends} improving` : "Stable"}
          />
          <InsightTile
            icon={Stethoscope}
            tone={activeDiagnoses.length > 0 ? "primary" : "muted"}
            label="Active conditions"
            value={activeDiagnoses.length}
            hint={activeDiagnoses.length > 0 ? "In management" : "None recorded"}
          />
        </div>

        {recentAbnormal.length > 0 && (
          <div className="space-y-1.5 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-500">
              <AlertTriangle className="h-3 w-3" /> Latest flagged values
            </p>
            <div className="space-y-1">
              {recentAbnormal.map((v) => {
                const meta = VALUE_STATUS_META[v.status] ?? VALUE_STATUS_META.UNKNOWN
                return (
                  <div key={v.id} className="flex items-center justify-between gap-2 text-sm">
                    <Link href={`/documents/${v.documentId}`} className="min-w-0 flex-1 truncate hover:underline">
                      <span className="font-medium">{v.label}</span>
                      <span className="text-muted-foreground"> · {v.document.title}</span>
                    </Link>
                    <span className="font-semibold tabular-nums">
                      {v.value}{v.unit && <span className="ml-0.5 text-xs text-muted-foreground">{v.unit}</span>}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function InsightTile({
  icon: Icon,
  tone,
  label,
  value,
  hint,
}: {
  icon: LucideIcon
  tone: "primary" | "emerald" | "amber" | "rose" | "muted"
  label: string
  value: number
  hint: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-card/60 p-3">
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", TONE_BG[tone])}>
        <Icon className={cn("h-4 w-4", TONE_TEXT[tone])} />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold tabular-nums leading-none">{value}</p>
        <p className="truncate text-xs font-medium">{label}</p>
        <p className="truncate text-xs text-muted-foreground">{hint}</p>
      </div>
    </div>
  )
}

// ============================================================
// Health Goals summary card (dashboard)
// ============================================================

function HealthGoalsSummary({
  activeCount,
  overdueCount,
  upcoming,
}: {
  activeCount: number
  overdueCount: number
  upcoming: { id: string; title: string; dueDate: Date | null; type: string }[]
}) {
  // Show a soft prompt when the patient hasn't set any goals yet, so they
  // discover the feature. Hide the card entirely only when there are no
  // active goals AND no overdue ones — otherwise the summary is useful.
  const hasAny = activeCount > 0 || overdueCount > 0
  if (!hasAny && upcoming.length === 0) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex flex-col items-start gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-0.5">
              <p className="flex items-center gap-2 text-sm font-semibold text-primary">
                Set your first health goal
              </p>
              <p className="text-xs text-muted-foreground">
                Track a lab target, medication adherence, lifestyle change, or upcoming appointment.
              </p>
            </div>
          </div>
          <Button asChild size="sm" className="shrink-0">
            <Link href="/goals">
              Add a goal <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const isOverdue = overdueCount > 0

  return (
    <Card
      className={cn(
        isOverdue
          ? "border-rose-500/40 bg-rose-500/5"
          : "border-primary/20 bg-primary/5"
      )}
    >
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                isOverdue ? "bg-rose-500/15" : "bg-primary/15"
              )}
            >
              {isOverdue ? (
                <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
              ) : (
                <Target className="h-5 w-5 text-primary" />
              )}
            </div>
            <div className="min-w-0 space-y-1">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <span className={isOverdue ? "text-rose-800 dark:text-rose-300" : "text-primary"}>
                  {isOverdue ? "Goals need attention" : "Health Goals"}
                </span>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px]",
                    isOverdue
                      ? "border-rose-300 bg-rose-500/10 text-rose-700 dark:border-rose-700/60 dark:text-rose-300"
                      : "border-primary/30 bg-primary/10 text-primary"
                  )}
                >
                  {activeCount} active
                </Badge>
                {overdueCount > 0 && (
                  <Badge
                    variant="outline"
                    className="border-rose-500/40 bg-rose-500/10 text-[10px] text-rose-700 dark:border-rose-700/60 dark:text-rose-300"
                  >
                    {overdueCount} overdue
                  </Badge>
                )}
              </p>
              {upcoming.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {upcoming.map((g) => (
                    <Link
                      key={g.id}
                      href="/goals"
                      className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background/60 px-2 py-0.5 text-xs font-medium text-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                      title={g.title}
                    >
                      <Target className="h-3 w-3 text-primary" />
                      <span className="max-w-[180px] truncate">{g.title}</span>
                      {g.dueDate && (
                        <span className="text-muted-foreground">· {formatDateShort(g.dueDate)}</span>
                      )}
                    </Link>
                  ))}
                </div>
              ) : isOverdue ? (
                <p className="text-xs text-rose-700/80 dark:text-rose-300/80">
                  Update overdue goals by marking them complete, adjusting the due date, or pausing.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No goals due soon — keep up the great work.
                </p>
              )}
            </div>
          </div>
          <Button
            asChild
            variant="outline"
            size="sm"
            className={cn(
              "shrink-0",
              isOverdue
                ? "border-rose-300 text-rose-700 hover:bg-rose-500/10 dark:border-rose-700/60 dark:text-rose-300"
                : "border-primary/30 text-primary hover:bg-primary/10"
            )}
          >
            <Link href="/goals">
              View all <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// Helpers
// ============================================================

interface StatItem {
  label: string
  value: number
  icon: LucideIcon
  href: string
  tone: "primary" | "emerald" | "amber" | "rose" | "muted"
  sub: string
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
