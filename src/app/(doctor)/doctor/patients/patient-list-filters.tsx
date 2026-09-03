"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Search, Filter } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface Counts {
  active: number
  expired: number
  revoked: number
  all: number
}

export function PatientListFilters({
  initialQuery,
  initialStatus,
  counts,
}: {
  initialQuery: string
  initialStatus: string
  counts: Counts
}) {
  const router = useRouter()
  const sp = useSearchParams()

  function update(next: Record<string, string | null>) {
    const params = new URLSearchParams(sp.toString())
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === "") params.delete(k)
      else params.set(k, v)
    }
    router.push(`/doctor/patients?${params.toString()}`)
  }

  const tabs: Array<{ key: string; label: string; count: number }> = [
    { key: "active", label: "Active", count: counts.active },
    { key: "expired", label: "Expired", count: counts.expired },
    { key: "revoked", label: "Revoked", count: counts.revoked },
    { key: "all", label: "All", count: counts.all },
  ]

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by patient name or email..."
          className="pl-9"
          defaultValue={initialQuery}
          onChange={(e) => update({ q: e.target.value })}
        />
      </div>
      <div className="flex items-center gap-1.5 overflow-x-auto">
        <Filter className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" />
        {tabs.map((t) => (
          <Button
            key={t.key}
            variant={initialStatus === t.key ? "default" : "outline"}
            size="sm"
            className={cn("shrink-0")}
            onClick={() => update({ status: t.key })}
          >
            {t.label}
            <span
              className={cn(
                "ml-1.5 rounded px-1.5 py-0.5 text-[10px] font-semibold",
                initialStatus === t.key
                  ? "bg-primary-foreground/20"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {t.count}
            </span>
          </Button>
        ))}
      </div>
    </div>
  )
}
