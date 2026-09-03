import { redirect } from "next/navigation"
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react"
import { getCurrentPatient } from "@/lib/session"
import { db } from "@/lib/db"
import {
  TrendsCharts,
  type TrendItem,
  type TrendPointsByEntity,
} from "@/components/trends-charts"
import { TimelineOverviewChart } from "@/components/timeline-overview-chart"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Trends · MedUnbox",
}

interface StatPill {
  key: string
  label: string
  count: number
  icon: typeof TrendingUp
  classes: string
}

export default async function TrendsPage() {
  const patient = await getCurrentPatient()
  if (!patient) {
    redirect("/login")
    return
  }

  const [trends, points] = await Promise.all([
    db.trend.findMany({
      where: { patientId: patient.id },
      orderBy: { lastUpdated: "desc" },
    }),
    db.trendPoint.findMany({
      where: { patientId: patient.id },
      orderBy: { recordedAt: "asc" },
    }),
  ])

  // Group points by entity for charting
  const pointsByEntity: TrendPointsByEntity = {}
  for (const p of points) {
    const arr = pointsByEntity[p.entity]
    const point = {
      valueNum: p.valueNum,
      unit: p.unit,
      recordedAt: p.recordedAt.toISOString(),
    }
    if (arr) arr.push(point)
    else pointsByEntity[p.entity] = [point]
  }

  const trendItems: TrendItem[] = trends.map((t) => ({
    id: t.id,
    entity: t.entity,
    label: t.label,
    direction: t.direction,
    unit: t.unit,
    latestValue: t.latestValue,
    previousValue: t.previousValue,
    changePercent: t.changePercent,
    status: t.status,
    dataPoints: t.dataPoints,
    lastUpdated: t.lastUpdated.toISOString(),
  }))

  // Summary counts — at-a-glance overview before scrolling cards.
  const counts = {
    improving: trends.filter((t) => t.direction === "IMPROVING").length,
    worsening: trends.filter((t) => t.direction === "WORSENING").length,
    stable: trends.filter((t) => t.direction === "STABLE").length,
    fluctuating: trends.filter((t) => t.direction === "FLUCTUATING").length,
    newlyAbnormal: trends.filter((t) => t.status === "NEWLY_ABNORMAL").length,
    abnormal: trends.filter((t) => t.status === "ABNORMAL").length,
    critical: trends.filter((t) => t.status === "CRITICAL").length,
  }

  const pills: StatPill[] = [
    {
      key: "improving",
      label: "Improving",
      count: counts.improving,
      icon: TrendingUp,
      classes:
        "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300",
    },
    {
      key: "worsening",
      label: "Worsening",
      count: counts.worsening,
      icon: TrendingDown,
      classes:
        "border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300",
    },
    {
      key: "stable",
      label: "Stable",
      count: counts.stable,
      icon: Minus,
      classes:
        "border-border bg-muted text-muted-foreground",
    },
    {
      key: "fluctuating",
      label: "Fluctuating",
      count: counts.fluctuating,
      icon: Minus,
      classes:
        "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300",
    },
    {
      key: "newlyAbnormal",
      label: "Newly Abnormal",
      count: counts.newlyAbnormal,
      icon: AlertTriangle,
      classes:
        "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300",
    },
    {
      key: "critical",
      label: "Critical",
      count: counts.critical,
      icon: AlertTriangle,
      classes:
        "border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300",
    },
  ]
  // Only show pills with at least 1 hit so the header stays uncluttered.
  const visiblePills = pills.filter((p) => p.count > 0)

  // Build overview chart series — top 5 entities by data point count
  const overviewSeries = trends
    .filter((t) => t.dataPoints >= 2)
    .sort((a, b) => b.dataPoints - a.dataPoints)
    .slice(0, 6)
    .map((t) => ({
      entity: t.entity,
      label: t.label,
      color: undefined as string | undefined,
      data: (pointsByEntity[t.entity] ?? []).map((p) => ({
        date: new Date(p.recordedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        value: p.valueNum,
        raw: `${p.valueNum}${p.unit ? " " + p.unit : ""}`,
      })),
    }))

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Trends</h1>
        <p className="text-muted-foreground">
          {trends.length > 0
            ? `Tracking ${trends.length} medical value${trends.length === 1 ? "" : "s"} over time`
            : "Track medical values over time as you upload reports"}
        </p>
      </div>

      {/* Summary stat pills */}
      {visiblePills.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {visiblePills.map((p) => {
            const Icon = p.icon
            return (
              <div
                key={p.key}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${p.classes}`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>
                  {p.count} {p.label}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Health overview chart — multi-line view of top trends */}
      {overviewSeries.length > 0 && <TimelineOverviewChart series={overviewSeries} />}

      <TrendsCharts trends={trendItems} pointsByEntity={pointsByEntity} />
    </div>
  )
}
