"use client"

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts"
import { formatDate } from "@/lib/constants"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface Series {
  entity: string
  label: string
  color: string
  data: Array<{ date: string; value: number; raw: string }>
}

const COLORS = [
  "oklch(0.55 0.12 175)", // primary teal
  "oklch(0.65 0.15 145)", // emerald
  "oklch(0.70 0.13 70)",  // amber
  "oklch(0.55 0.2 25)",   // red
  "oklch(0.6 0.18 300)",  // violet
  "oklch(0.6 0.13 250)",  // sky
]

export function TimelineOverviewChart({ series }: { series: Series[] }) {
  if (series.length === 0) return null

  // Normalize each series to 0-100 scale so different-ranged metrics are comparable.
  // We use min-max normalization: normalizedValue = (value - min) / (max - min) * 100
  const normalizedSeries = series.map((s) => {
    const values = s.data.map((d) => d.value)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = max - min || 1
    return {
      ...s,
      data: s.data.map((d) => ({
        ...d,
        normalized: ((d.value - min) / range) * 100,
      })),
    }
  })

  // Merge all series into a single dataset keyed by date
  const dateMap = new Map<string, any>()
  for (const s of normalizedSeries) {
    for (const d of s.data) {
      const key = d.date
      if (!dateMap.has(key)) dateMap.set(key, { date: key })
      dateMap.get(key)[s.entity] = d.normalized
      dateMap.get(key)[`${s.entity}_raw`] = d.raw
      dateMap.get(key)[`${s.entity}_label`] = s.label
    }
  }
  const chartData = Array.from(dateMap.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Health Overview</CardTitle>
            <CardDescription className="text-xs">
              Normalized trends (0–100%) so different metrics are comparable · {chartData.length} time point{chartData.length === 1 ? "" : "s"}
            </CardDescription>
          </div>
          <Badge variant="secondary" className="text-xs">{series.length} metrics</Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={30} />
            <YAxis
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null
                return (
                  <div className="rounded-lg border bg-popover p-3 text-xs shadow-md">
                  <p className="mb-1.5 font-medium">{label}</p>
                    {payload.map((p: any) => {
                      const s = series.find((x) => x.entity === p.dataKey)
                      const raw = chartData.find((d) => d.date === label)?.[`${p.dataKey}_raw`]
                      return (
                        <div key={p.dataKey} className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                          <span className="font-medium">{s?.label ?? p.dataKey}:</span>
                          <span className="tabular-nums">{raw}</span>
                          <span className="text-muted-foreground">({Math.round(p.value)}%)</span>
                        </div>
                      )
                    })}
                  </div>
                )
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 11 }}
              iconType="circle"
              iconSize={8}
            />
            {series.map((s, i) => (
              <Line
                key={s.entity}
                type="monotone"
                dataKey={s.entity}
                name={s.label}
                stroke={s.color || COLORS[i % COLORS.length]}
                strokeWidth={2}
                dot={{ r: 4, fill: s.color || COLORS[i % COLORS.length] }}
                activeDot={{ r: 6 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
