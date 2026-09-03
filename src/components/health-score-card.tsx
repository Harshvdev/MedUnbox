"use client"

import { useQuery } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { HeartPulse, TrendingUp, TrendingDown, Minus, Activity, FileText, AlertTriangle, Pill, Stethoscope, RefreshCw, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface Factor {
  label: string
  impact: number
  detail: string
  direction: "positive" | "negative" | "neutral"
}

interface HealthScoreData {
  score: number | null
  label: string
  labelColor: string
  message?: string
  factors: Factor[]
  recommendations: string[]
  stats?: {
    abnormalTotal: number
    critical: number
    improving: number
    worsening: number
    stable: number
    conditions: number
    medications: number
    conflicts: number
    documents: number
  }
}

const COLOR_MAP: Record<string, { ring: string; text: string; bg: string; gradient: string }> = {
  emerald: { ring: "stroke-emerald-500", text: "text-emerald-600", bg: "bg-emerald-500/10", gradient: "from-emerald-500 to-emerald-400" },
  primary: { ring: "stroke-primary", text: "text-primary", bg: "bg-primary/10", gradient: "from-primary to-primary/70" },
  amber: { ring: "stroke-amber-500", text: "text-amber-600", bg: "bg-amber-500/10", gradient: "from-amber-500 to-amber-400" },
  orange: { ring: "stroke-orange-500", text: "text-orange-600", bg: "bg-orange-500/10", gradient: "from-orange-500 to-orange-400" },
  rose: { ring: "stroke-rose-500", text: "text-rose-600", bg: "bg-rose-500/10", gradient: "from-rose-500 to-rose-400" },
}

export function HealthScoreCard() {
  const { data, isLoading, refetch, isFetching } = useQuery<HealthScoreData>({
    queryKey: ["health-score"],
    queryFn: () => fetch("/api/health-score").then((r) => r.json()),
    staleTime: 60000,
  })

  if (isLoading) {
    return (
      <Card className="border-border/60">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (!data || data.score === null) {
    return (
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15">
              <HeartPulse className="h-4 w-4 text-primary" />
            </div>
            Health Score
          </CardTitle>
          <CardDescription className="text-xs">AI-computed wellness indicator</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{data?.message ?? "No data available"}</p>
        </CardContent>
      </Card>
    )
  }

  const colors = COLOR_MAP[data.labelColor] ?? COLOR_MAP.primary
  const circumference = 2 * Math.PI * 52
  const offset = circumference - (data.score / 100) * circumference

  return (
    <Card className={cn("border-border/60 overflow-hidden")}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15">
              <HeartPulse className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Health Score</CardTitle>
              <CardDescription className="text-xs">AI-computed wellness indicator</CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs gap-1">
            <button
              onClick={() => refetch()}
              className="flex items-center gap-1 hover:text-primary"
              disabled={isFetching}
            >
              <RefreshCw className={cn("h-3 w-3", isFetching && "animate-spin")} />
              Refresh
            </button>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score circle */}
        <div className="flex items-center gap-5">
          <div className="relative h-32 w-32 shrink-0">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke="var(--muted)"
                strokeWidth="10"
                opacity="0.3"
              />
              <motion.circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                strokeWidth="10"
                strokeLinecap="round"
                className={colors.ring}
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 1.2, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-3xl font-bold tabular-nums"
              >
                {data.score}
              </motion.span>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">/ 100</span>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <Badge className={cn("mb-1.5", colors.bg, colors.text, "hover:" + colors.bg)}>
              {data.label}
            </Badge>
            <p className="text-xs text-muted-foreground">
              Based on {data.stats?.documents ?? 0} documents, {data.stats?.abnormalTotal ?? 0} flagged values, {data.stats?.conditions ?? 0} conditions
            </p>
          </div>
        </div>

        {/* Contributing factors */}
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contributing Factors</p>
          {data.factors.map((f) => (
            <div key={f.label} className="flex items-center justify-between gap-2 rounded-lg border border-border/50 px-3 py-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <FactorIcon label={f.label} direction={f.direction} />
                <span className="font-medium">{f.label}</span>
                <span className="text-muted-foreground truncate">· {f.detail}</span>
              </div>
              <span className={cn(
                "shrink-0 font-semibold tabular-nums",
                f.impact > 0 && "text-emerald-600",
                f.impact < 0 && "text-rose-600",
                f.impact === 0 && "text-muted-foreground"
              )}>
                {f.impact > 0 ? "+" : ""}{f.impact}
              </span>
            </div>
          ))}
        </div>

        {/* Recommendations */}
        {data.recommendations.length > 0 && (
          <div className="rounded-lg bg-primary/5 p-3">
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
              <Activity className="h-3 w-3" /> Recommendations
            </p>
            <ul className="space-y-1">
              {data.recommendations.slice(0, 3).map((r, i) => (
                <li key={i} className="text-xs text-muted-foreground">• {r}</li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground/70 text-center">
          This score is a data-driven indicator, not a medical diagnosis. Consult your doctor for clinical assessment.
        </p>
      </CardContent>
    </Card>
  )
}

function FactorIcon({ label, direction }: { label: string; direction: string }) {
  const iconMap: Record<string, typeof TrendingUp> = {
    "Lab Values": Activity,
    "Trends": direction === "positive" ? TrendingUp : direction === "negative" ? TrendingDown : Minus,
    "Conditions": Stethoscope,
    "Medications": Pill,
    "Data Conflicts": AlertTriangle,
    "Records": FileText,
  }
  const Icon = iconMap[label] ?? Activity
  const colorClass = direction === "positive" ? "text-emerald-600" : direction === "negative" ? "text-rose-600" : "text-muted-foreground"
  return <Icon className={cn("h-3.5 w-3.5 shrink-0", colorClass)} />
}
