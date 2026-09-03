"use client"

import { useState, useMemo } from "react"
import { Search, X, TestTube, Droplet, Heart, Bone, Wind, Wine, Pyramid, Activity } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

interface LabRange {
  category: string
  test: string
  range: string
  unit: string
  male: string
  female: string
  notes: string
}

// Icons defined client-side (not passed from server)
const CATEGORY_ICONS: Record<string, any> = {
  "Complete Blood Count (CBC)": TestTube,
  "Blood Glucose": Droplet,
  "Lipid Profile": Heart,
  "Kidney Function": Wine,
  "Liver Function": Activity,
  "Thyroid Function": Pyramid,
  "Electrolytes": Droplet,
  "Vitamins & Minerals": Bone,
  "Cardiac Markers": Heart,
  "Inflammatory Markers": Wind,
  "Coagulation": Droplet,
}

const CATEGORY_COLORS: Record<string, string> = {
  "Complete Blood Count (CBC)": "bg-emerald-500/10 text-emerald-600",
  "Blood Glucose": "bg-rose-500/10 text-rose-600",
  "Lipid Profile": "bg-red-500/10 text-red-600",
  "Kidney Function": "bg-amber-500/10 text-amber-600",
  "Liver Function": "bg-orange-500/10 text-orange-600",
  "Thyroid Function": "bg-violet-500/10 text-violet-600",
  "Electrolytes": "bg-cyan-500/10 text-cyan-600",
  "Vitamins & Minerals": "bg-sky-500/10 text-sky-600",
  "Cardiac Markers": "bg-pink-500/10 text-pink-600",
  "Inflammatory Markers": "bg-teal-500/10 text-teal-600",
  "Coagulation": "bg-indigo-500/10 text-indigo-600",
}

export function LabReferenceSearch({ ranges }: { ranges: LabRange[] }) {
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    if (!query.trim() || query.length < 2) return []
    const q = query.toLowerCase()
    return ranges.filter(
      (r) =>
        r.test.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.notes.toLowerCase().includes(q)
    )
  }, [query, ranges])

  if (!query.trim() || query.length < 2) return null

  return (
    <Card className="border-primary/30">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium">
            {filtered.length === 0
              ? "No matching tests found"
              : `${filtered.length} matching test${filtered.length === 1 ? "" : "s"}`}
          </p>
          <button
            onClick={() => setQuery("")}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search lab tests (e.g. hemoglobin, cholesterol, TSH)..."
            className="pl-9"
            autoFocus
          />
        </div>

        {filtered.length > 0 && (
          <div className="max-h-96 space-y-2 overflow-y-auto scroll-thin">
            {filtered.map((r) => {
              const Icon = CATEGORY_ICONS[r.category] ?? Search
              const color = CATEGORY_COLORS[r.category] ?? "bg-primary/10 text-primary"
              return (
                <Link
                  key={r.test}
                  href={`#${r.category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                  onClick={() => setQuery("")}
                  className="flex items-center gap-3 rounded-lg border border-border/50 p-3 transition-colors hover:border-primary hover:bg-accent"
                >
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{r.test}</p>
                    <p className="text-xs text-muted-foreground">{r.category}</p>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs shrink-0">
                    {r.range} {r.unit}
                  </Badge>
                </Link>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
