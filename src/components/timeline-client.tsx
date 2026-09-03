"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { EmptyState } from "@/components/empty-state"
import { formatDate } from "@/lib/constants"
import { cn } from "@/lib/utils"
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BedDouble,
  CalendarDays,
  ClipboardList,
  FileText,
  FlaskConical,
  Pill,
  Scan,
  Slice,
  Stethoscope,
  Syringe,
  Upload,
  UserRound,
  type LucideIcon,
} from "lucide-react"

export interface TimelineEventItem {
  id: string
  date: string
  title: string
  description: string
  category: string
  sourceDocId: string | null
}

/**
 * Category metadata.
 *
 * - `chip`     → filled style with soft background + colored text
 *                (more visually distinct than the prior outline variant)
 * - `iconBox`  → soft-fill container for the category icon.
 * - `dot`      → border color used for the hollow ring dot on the timeline rail.
 *
 * Colors follow the clinical palette requested for MedUnbox
 * (lab=emerald, diagnosis=amber, medication=rose, procedure=sky,
 *  hospital=violet, vaccination=teal, visit=slate, imaging=cyan,
 *  surgery=orange, allergy=red, other=gray).
 */
const CATEGORY_META: Record<
  string,
  { label: string; icon: LucideIcon; chip: string; iconBox: string; dot: string }
> = {
  LAB_TEST: {
    label: "Lab Test",
    icon: FlaskConical,
    chip: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300",
    iconBox:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
    dot: "border-emerald-500",
  },
  DIAGNOSIS: {
    label: "Diagnosis",
    icon: Stethoscope,
    chip: "bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300",
    iconBox:
      "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
    dot: "border-amber-500",
  },
  MEDICATION_START: {
    label: "Medication Started",
    icon: Pill,
    chip: "bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300",
    iconBox: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
    dot: "border-rose-500",
  },
  MEDICATION_STOP: {
    label: "Medication Stopped",
    icon: Pill,
    chip: "bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400",
    iconBox:
      "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400",
    dot: "border-rose-400",
  },
  PROCEDURE: {
    label: "Procedure",
    icon: ClipboardList,
    chip: "bg-sky-100 text-sky-700 dark:bg-sky-950/70 dark:text-sky-300",
    iconBox: "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300",
    dot: "border-sky-500",
  },
  HOSPITALIZATION: {
    label: "Hospitalization",
    icon: BedDouble,
    chip: "bg-violet-100 text-violet-700 dark:bg-violet-950/70 dark:text-violet-300",
    iconBox:
      "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300",
    dot: "border-violet-500",
  },
  VACCINATION: {
    label: "Vaccination",
    icon: Syringe,
    chip: "bg-teal-100 text-teal-700 dark:bg-teal-950/70 dark:text-teal-300",
    iconBox: "bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300",
    dot: "border-teal-500",
  },
  VISIT: {
    label: "Visit",
    icon: UserRound,
    chip: "bg-slate-100 text-slate-700 dark:bg-slate-800/70 dark:text-slate-300",
    iconBox:
      "bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300",
    dot: "border-slate-500",
  },
  IMAGING: {
    label: "Imaging",
    icon: Scan,
    chip: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/70 dark:text-cyan-300",
    iconBox: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300",
    dot: "border-cyan-500",
  },
  SURGERY: {
    label: "Surgery",
    icon: Slice,
    chip: "bg-orange-100 text-orange-700 dark:bg-orange-950/70 dark:text-orange-300",
    iconBox:
      "bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300",
    dot: "border-orange-500",
  },
  ALLERGY: {
    label: "Allergy",
    icon: AlertCircle,
    chip: "bg-red-100 text-red-700 dark:bg-red-950/70 dark:text-red-300",
    iconBox: "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300",
    dot: "border-red-500",
  },
  OTHER: {
    label: "Other",
    icon: FileText,
    chip: "bg-gray-100 text-gray-700 dark:bg-gray-800/70 dark:text-gray-300",
    iconBox:
      "bg-gray-100 text-gray-700 dark:bg-gray-800/60 dark:text-gray-300",
    dot: "border-gray-500",
  },
}

const FILTERS: { value: string; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "LAB_TEST", label: "Lab Tests" },
  { value: "DIAGNOSIS", label: "Diagnoses" },
  { value: "MEDICATION_START", label: "Medications" },
  { value: "VISIT", label: "Visits" },
  { value: "PROCEDURE", label: "Procedures" },
  { value: "IMAGING", label: "Imaging" },
]

/* Date range presets for filtering the timeline */
const DATE_RANGES: { value: string; label: string; months: number | null }[] = [
  { value: "ALL", label: "All time", months: null },
  { value: "3M", label: "Last 3 months", months: 3 },
  { value: "6M", label: "Last 6 months", months: 6 },
  { value: "1Y", label: "Last year", months: 12 },
]

/* ------------------------------------------------------------------ */
/* Abnormality detection — clinical UI convention (like Epic / Cerner) */
/* ------------------------------------------------------------------ */

const CRITICAL_RE = /\bcritical\b/i
const ABNORMAL_RE = /\b(abnormal|critical|high|low)\b/i

type AbnormalState = "normal" | "abnormal" | "critical"

function getAbnormalState(ev: TimelineEventItem): AbnormalState {
  const text = `${ev.title} ${ev.description ?? ""}`
  if (CRITICAL_RE.test(text)) return "critical"
  if (ABNORMAL_RE.test(text)) return "abnormal"
  return "normal"
}

const ABNORMAL_OVERRIDE: Record<
  Exclude<AbnormalState, "normal">,
  {
    cardBorder: string
    iconBox: string
    dot: string
    pill: string
    pillLabel: string
  }
> = {
  abnormal: {
    cardBorder: "border-l-4 border-l-amber-500",
    iconBox:
      "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
    dot: "border-amber-500",
    pill:
      "bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300",
    pillLabel: "Abnormal",
  },
  critical: {
    cardBorder: "border-l-4 border-l-red-500",
    iconBox: "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300",
    dot: "border-red-500",
    pill:
      "bg-red-100 text-red-700 dark:bg-red-950/70 dark:text-red-300",
    pillLabel: "Critical",
  },
}

/* ------------------------------------------------------------------ */
/* Month helpers                                                       */
/* ------------------------------------------------------------------ */

function monthKey(dateStr: string): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return "unknown"
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function monthLabel(key: string): string {
  if (key === "unknown") return "Unknown date"
  const [y, m] = key.split("-")
  const d = new Date(Number(y), Number(m) - 1, 1)
  return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" })
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function TimelineClient({ events }: { events: TimelineEventItem[] }) {
  const [filter, setFilter] = useState("ALL")
  const [dateRange, setDateRange] = useState("ALL")

  const groups = useMemo(() => {
    const byCategory =
      filter === "ALL" ? events : events.filter((e) => e.category === filter)

    // Apply date range filter (presets based on months ago)
    const range = DATE_RANGES.find((r) => r.value === dateRange)
    const cutoff =
      range && range.months
        ? new Date()
        : null
    if (cutoff) cutoff.setMonth(cutoff.getMonth() - range!.months!)
    const inRange = cutoff
      ? byCategory.filter((e) => {
          const d = new Date(e.date)
          return !isNaN(d.getTime()) && d >= cutoff!
        })
      : byCategory

    const map = new Map<string, TimelineEventItem[]>()
    for (const ev of inRange) {
      const k = monthKey(ev.date)
      const arr = map.get(k)
      if (arr) arr.push(ev)
      else map.set(k, [ev])
    }
    // preserve month order (desc by date since events arrive desc)
    return Array.from(map.entries()).map(([key, items]) => ({ key, items }))
  }, [events, filter, dateRange])

  const visibleCount = groups.reduce((n, g) => n + g.items.length, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={filter} onValueChange={setFilter}>
          <div className="overflow-x-auto pb-1 scroll-thin">
            <TabsList className="w-max">
              {FILTERS.map((f) => (
                <TabsTrigger key={f.value} value={f.value}>
                  {f.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>

        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="h-9 w-[180px] shrink-0">
            <CalendarDays className="mr-1.5 h-4 w-4 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATE_RANGES.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {visibleCount === 0 ? (
        <EmptyState
          icon={Activity}
          title="No timeline events in this view"
          description={
            filter === "ALL" && dateRange === "ALL"
              ? "Upload and process documents to build your medical timeline."
              : "Try changing the category filter or expanding the date range."
          }
          action={
            filter === "ALL" && dateRange === "ALL" ? (
              <Button asChild size="sm">
                <Link href="/documents">
                  <Upload className="mr-1.5 h-4 w-4" />
                  Upload documents
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.key} className="space-y-3">
              {/* Sticky-style month header pill */}
              <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-muted/80 px-3 py-1.5 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-muted/60">
                <CalendarDays className="h-3.5 w-3.5 text-primary" />
                <span className="text-sm font-semibold text-foreground">
                  {monthLabel(group.key)}
                </span>
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  {group.items.length}{" "}
                  {group.items.length === 1 ? "event" : "events"}
                </span>
              </div>

              <ol className="relative space-y-3 pl-6">
                {/* Continuous vertical rail aligned to the dot center (x=12px) */}
                <div
                  className="absolute left-3 top-3 bottom-3 w-px bg-border"
                  aria-hidden
                />
                {group.items.map((ev, idx) => {
                  const meta = CATEGORY_META[ev.category] ?? CATEGORY_META.OTHER
                  const Icon = meta.icon
                  const abnormal = getAbnormalState(ev)
                  const override =
                    abnormal !== "normal" ? ABNORMAL_OVERRIDE[abnormal] : null

                  return (
                    <motion.li
                      key={ev.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.3,
                        delay: Math.min(idx * 0.04, 0.4),
                      }}
                      className="relative"
                    >
                      {/* Hollow ring dot — 12px with 2px colored border + background ring mask */}
                      <span
                        className={cn(
                          "absolute -left-[18px] top-5 h-3 w-3 rounded-full border-2 bg-background ring-4 ring-background transition-colors",
                          override ? override.dot : meta.dot,
                        )}
                        aria-hidden
                      />
                      <Card
                        className={cn(
                          "border-border/60 shadow-sm transition-all duration-200 hover:shadow-md hover:border-border",
                          override?.cardBorder,
                        )}
                      >
                        <CardContent className="p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex min-w-0 items-start gap-3">
                              <div
                                className={cn(
                                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                                  override ? override.iconBox : meta.iconBox,
                                )}
                              >
                                <Icon className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-medium leading-tight">
                                    {ev.title}
                                  </p>
                                  <span
                                    className={cn(
                                      "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                      meta.chip,
                                    )}
                                  >
                                    {meta.label}
                                  </span>
                                  {override && (
                                    <span
                                      className={cn(
                                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                        override.pill,
                                      )}
                                    >
                                      <AlertTriangle className="h-2.5 w-2.5" />
                                      {override.pillLabel}
                                    </span>
                                  )}
                                </div>
                                {ev.description && (
                                  <p className="mt-1.5 text-sm font-medium leading-[1.5] text-muted-foreground">
                                    {ev.description}
                                  </p>
                                )}
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {formatDate(ev.date)}
                                </p>
                              </div>
                            </div>
                            {ev.sourceDocId && (
                              <Link
                                href={`/documents/${ev.sourceDocId}`}
                                className="inline-flex shrink-0 items-center text-xs font-medium text-primary hover:underline"
                              >
                                View source
                                <ArrowRight className="ml-1 h-3 w-3" />
                              </Link>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.li>
                  )
                })}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
