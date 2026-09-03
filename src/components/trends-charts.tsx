"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/empty-state"
import { TrendDirectionIcon } from "@/components/medical-icons"
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  LineChart as LineChartIcon,
  Minus,
  Upload,
} from "lucide-react"
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  LabelList,
} from "recharts"
import {
  formatDateShort,
  timeAgo,
  TREND_DIRECTION_META,
} from "@/lib/constants"

export interface TrendItem {
  id: string
  entity: string
  label: string
  direction: string
  unit: string | null
  latestValue: number
  previousValue: number | null
  changePercent: number | null
  status: string
  dataPoints: number
  lastUpdated: string
}

export interface TrendPointItem {
  valueNum: number
  unit: string | null
  recordedAt: string
}

export type TrendPointsByEntity = Record<string, TrendPointItem[]>

/**
 * Chart line color is intentionally decoupled from trend direction.
 * Direction is already encoded in the badge — the line itself stays neutral
 * (medical teal = primary) so a "Normal" value going down doesn't read as
 * alarming. Only truly critical / out-of-range values use red.
 */
const NEUTRAL_LINE = "var(--primary)" // oklch(0.55 0.12 175)
const CRITICAL_LINE = "var(--destructive)" // oklch(0.58 0.22 25)

/**
 * Status badge meta — kept consistent with VALUE_STATUS_META in constants.
 * NORMAL=emerald, NEWLY_ABNORMAL/ABNORMAL=amber, CRITICAL=red.
 */
const STATUS_BADGE: Record<
  string,
  { label: string; classes: string }
> = {
  NORMAL: {
    label: "Normal",
    classes:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  NEWLY_ABNORMAL: {
    label: "Newly Abnormal",
    classes:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300",
  },
  ABNORMAL: {
    label: "Abnormal",
    classes:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300",
  },
  CRITICAL: {
    label: "Critical",
    classes:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300",
  },
}

interface TooltipPayloadItem {
  value: number
  payload?: { date?: string; rawDate?: string }
}

interface TrendTooltipProps {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string
  unit?: string | null
}

function TrendTooltip({ active, payload, label, unit }: TrendTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const value = payload[0].value
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-popover-foreground">{label}</p>
      <p className="mt-0.5 text-muted-foreground">
        Value:{" "}
        <span className="font-semibold text-popover-foreground">
          {value}
          {unit ? ` ${unit}` : ""}
        </span>
      </p>
    </div>
  )
}

/**
 * Format a Y-axis tick: 1 decimal for small values, integer for large ones.
 * Keeps the axis readable without overwhelming the chart.
 */
function formatYTick(v: number): string {
  if (!Number.isFinite(v)) return ""
  const abs = Math.abs(v)
  if (abs >= 100) return Math.round(v).toString()
  if (abs >= 10) return v.toFixed(0)
  return v.toFixed(1)
}

/**
 * Insufficient-data state for a single trend card (only 1 data point).
 * Faint line icon + message + subtle CTA to /documents.
 */
function InsufficientDataState({ unit }: { unit?: string | null }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border/70 bg-muted/20 px-4 py-6 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
        <LineChartIcon className="h-5 w-5 text-muted-foreground/70" />
      </div>
      <p className="text-sm font-medium">Not enough data to chart yet</p>
      <p className="max-w-xs text-xs text-muted-foreground">
        Need at least 2 recorded values
        {unit ? ` for ${unit.toLowerCase()}` : ""} to draw a trend line.
      </p>
      <Link
        href="/documents"
        className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
      >
        <Upload className="h-3.5 w-3.5" />
        Upload more reports to see trends
      </Link>
    </div>
  )
}

export function TrendsCharts({
  trends,
  pointsByEntity,
}: {
  trends: TrendItem[]
  pointsByEntity: TrendPointsByEntity
}) {
  if (trends.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-0">
          <EmptyState
            icon={Activity}
            title="No trends yet"
            description="Upload lab reports to start tracking medical values over time"
            action={
              <Link
                href="/documents"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <Upload className="h-3.5 w-3.5" />
                Upload a report
              </Link>
            }
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {trends.map((t, idx) => {
        const dirMeta =
          TREND_DIRECTION_META[t.direction] ?? {
            label: t.direction,
            color: "text-muted-foreground",
            icon: "activity",
          }
        const statusMeta =
          STATUS_BADGE[t.status] ?? {
            label: t.status,
            classes:
              "border-border bg-muted text-muted-foreground",
          }

        const points = pointsByEntity[t.entity] ?? []
        // Use raw ISO dates as the X-axis key so duplicates don't collapse,
        // but render a short label via tickFormatter.
        const chartData = points.map((p) => ({
          rawDate: p.recordedAt,
          date: formatDateShort(p.recordedAt),
          value: p.valueNum,
        }))

        const isCritical = t.status === "CRITICAL"
        const lineColor = isCritical ? CRITICAL_LINE : NEUTRAL_LINE

        const change = t.changePercent
        const ChangeIcon =
          change == null
            ? null
            : change > 0
              ? ArrowUpRight
              : change < 0
                ? ArrowDownRight
                : Minus
        const changeColor =
          change == null
            ? "text-muted-foreground"
            : change > 0
              ? "text-emerald-600"
              : change < 0
                ? "text-red-600"
                : "text-muted-foreground"

        return (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: Math.min(idx * 0.06, 0.4) }}
          >
            <Card className="h-full border-border/60">
              <CardContent className="flex flex-col p-4 sm:p-6">
                {/* Header: label (left) + direction badge (right) */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-semibold leading-tight">
                      {t.label}
                    </h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {t.dataPoints} data point{t.dataPoints === 1 ? "" : "s"}
                      {t.unit ? ` · ${t.unit}` : ""}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`shrink-0 ${dirMeta.color} border-current/20`}
                  >
                    <TrendDirectionIcon
                      direction={t.direction}
                      className="h-3 w-3"
                    />
                    {dirMeta.label}
                  </Badge>
                </div>

                {/* Latest value + unit + change% */}
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-bold tracking-tight">
                    {t.latestValue}
                  </span>
                  {t.unit && (
                    <span className="text-sm text-muted-foreground">
                      {t.unit}
                    </span>
                  )}
                  {change != null && ChangeIcon && (
                    <span
                      className={`ml-auto inline-flex items-center gap-0.5 text-xs font-medium ${changeColor}`}
                    >
                      <ChangeIcon className="h-3.5 w-3.5" />
                      {change > 0 ? "+" : ""}
                      {change.toFixed(1)}%
                    </span>
                  )}
                </div>

                {/* Status badge row */}
                <div className="mt-2">
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${statusMeta.classes}`}
                  >
                    {statusMeta.label}
                  </Badge>
                </div>

                {/* Chart or insufficient-data state */}
                {chartData.length >= 2 ? (
                  <div className="mt-4 w-full" style={{ height: 200 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={chartData}
                        margin={{ top: 8, right: 12, left: -8, bottom: 0 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="hsl(0 0% 80%)"
                          vertical={false}
                          className="opacity-50"
                        />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 11 }}
                          stroke="#94a3b8"
                          tickLine={false}
                          axisLine={false}
                          minTickGap={20}
                        />
                        <YAxis
                          tick={{ fontSize: 11 }}
                          stroke="#94a3b8"
                          tickLine={false}
                          axisLine={false}
                          width={44}
                          domain={["auto", "auto"]}
                          tickFormatter={formatYTick}
                          allowDecimals
                        />
                        <Tooltip
                          content={<TrendTooltip unit={t.unit} />}
                          cursor={{
                            stroke: lineColor,
                            strokeWidth: 1,
                            strokeDasharray: "3 3",
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke={lineColor}
                          strokeWidth={2}
                          dot={{ r: 4, fill: lineColor, strokeWidth: 0 }}
                          activeDot={{ r: 6, strokeWidth: 0 }}
                          isAnimationActive
                        >
                          {chartData.length <= 5 && (
                            <LabelList
                              dataKey="value"
                              position="top"
                              style={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                              offset={8}
                            />
                          )}
                        </Line>
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="mt-4">
                    <InsufficientDataState unit={t.unit} />
                  </div>
                )}

                {/* Footer: last updated */}
                <p className="mt-4 text-[11px] text-muted-foreground">
                  Last updated {timeAgo(t.lastUpdated)}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}
