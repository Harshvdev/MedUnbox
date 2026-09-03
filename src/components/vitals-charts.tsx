"use client"

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts"
import { formatDate, formatDateShort, VALUE_STATUS_META } from "@/lib/constants"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Minus, HeartPulse, Heart, Weight, Thermometer, Droplet, Wind, Ruler, Activity, Plus, type LucideIcon } from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface VitalValue {
  id: string
  entity: string
  label: string
  value: string
  numericValue: number | null
  unit: string | null
  referenceRange: string | null
  status: string
  recordedAt: string
  sourceText: string
  documentId: string
  document: { id: string; title: string }
}

interface VitalsChartsProps {
  byEntity: Record<string, VitalValue[]>
  entities: string[]
}

const VITAL_META: Record<string, { label: string; icon: LucideIcon; color: string; unit: string }> = {
  BLOOD_PRESSURE: { label: "Blood Pressure", icon: HeartPulse, color: "text-rose-600", unit: "mmHg" },
  HEART_RATE: { label: "Heart Rate", icon: Heart, color: "text-red-500", unit: "bpm" },
  WEIGHT: { label: "Weight", icon: Weight, color: "text-primary", unit: "kg" },
  HEIGHT: { label: "Height", icon: Ruler, color: "text-sky-600", unit: "cm" },
  BMI: { label: "BMI", icon: Activity, color: "text-violet-600", unit: "" },
  TEMPERATURE: { label: "Temperature", icon: Thermometer, color: "text-amber-600", unit: "°F" },
  OXYGEN_SATURATION: { label: "Oxygen Saturation", icon: Droplet, color: "text-cyan-600", unit: "%" },
  RESPIRATORY_RATE: { label: "Respiratory Rate", icon: Wind, color: "text-teal-600", unit: "breaths/min" },
}

export function VitalsCharts({ byEntity, entities }: VitalsChartsProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {entities.map((entity, i) => {
        const meta = VITAL_META[entity]
        if (!meta) return null
        const vals = byEntity[entity] ?? []
        const latest = vals[vals.length - 1]
        if (!latest) return null
        const previous = vals.length > 1 ? vals[vals.length - 2] : null
        const meta2 = VALUE_STATUS_META[latest.status] ?? VALUE_STATUS_META.UNKNOWN

        // Compute direction
        let direction: "up" | "down" | "stable" = "stable"
        if (previous && latest.numericValue && previous.numericValue) {
          if (latest.numericValue > previous.numericValue) direction = "up"
          else if (latest.numericValue < previous.numericValue) direction = "down"
        }

        // Chart data — for BP we only plot systolic (first number)
        const chartData = vals.map((v) => ({
          date: formatDateShort(v.recordedAt),
          fullDate: formatDate(v.recordedAt),
          value: entity === "BLOOD_PRESSURE" ? parseInt(v.value.match(/\d+/)?.[0] ?? "0") : v.numericValue,
          raw: v.value,
        }))

        // Reference lines for common vitals
        const refLines: number[] = []
        if (entity === "HEART_RATE") { refLines.push(60, 100) }
        if (entity === "BMI") { refLines.push(18.5, 25) }
        if (entity === "OXYGEN_SATURATION") { refLines.push(95) }
        if (entity === "RESPIRATORY_RATE") { refLines.push(12, 20) }

        const Icon = meta.icon

        return (
          <motion.div
            key={entity}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10`}>
                      <Icon className={`h-4 w-4 ${meta.color}`} />
                    </div>
                    <div>
                      <CardTitle className="text-base">{meta.label}</CardTitle>
                      <CardDescription className="text-xs">
                        {vals.length} reading{vals.length === 1 ? "" : "s"} · {meta.unit || "no unit"}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {direction === "up" && <TrendingUp className="h-4 w-4 text-emerald-500" />}
                    {direction === "down" && <TrendingDown className="h-4 w-4 text-rose-500" />}
                    {direction === "stable" && <Minus className="h-4 w-4 text-muted-foreground" />}
                    <Badge variant="outline" className={`text-xs ${meta2.color}`}>{meta2.label}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                {/* Latest value big */}
                <div className="mb-3 flex items-baseline gap-2">
                  <span className="text-3xl font-bold tabular-nums">{latest.value}</span>
                  {latest.unit && <span className="text-sm text-muted-foreground">{latest.unit}</span>}
                  {latest.referenceRange && (
                    <span className="ml-auto text-xs text-muted-foreground">Ref: {latest.referenceRange}</span>
                  )}
                </div>

                {/* Chart */}
                {chartData.length >= 2 ? (
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={20} />
                      <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} domain={["auto", "auto"]} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null
                          const p = payload[0].payload
                          return (
                            <div className="rounded-lg border bg-popover p-2 text-xs shadow-md">
                              <p className="font-medium">{p.fullDate}</p>
                              <p className="tabular-nums">{p.raw}{latest.unit ? ` ${latest.unit}` : ""}</p>
                              <p className="text-muted-foreground">Source: {latest.document.title}</p>
                            </div>
                          )
                        }}
                      />
                      {refLines.map((r, idx) => (
                        <ReferenceLine
                          key={idx}
                          y={r}
                          stroke="var(--primary)"
                          strokeDasharray="4 4"
                          strokeOpacity={0.3}
                        />
                      ))}
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="var(--primary)"
                        strokeWidth={2}
                        dot={{ r: 4, fill: "var(--primary)" }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-40 flex-col items-center justify-center gap-3 rounded-lg border border-dashed text-sm text-muted-foreground">
                    <span>Need at least 2 readings to show a trend</span>
                    <Button asChild size="sm" variant="outline">
                      <Link href="/documents">
                        <Plus className="mr-1.5 h-4 w-4" />
                        Log New Reading
                      </Link>
                    </Button>
                  </div>
                )}

                {/* Source */}
                <Link
                  href={`/documents/${latest.documentId}`}
                  className="mt-2 block truncate text-xs text-muted-foreground hover:text-primary hover:underline"
                >
                  Source: {latest.document.title}
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}

export { VITAL_META }
