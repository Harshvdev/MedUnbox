"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Filter } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type ConflictFilterValue = "all" | "unresolved" | "resolved"

export function ConflictFilter({ current }: { current: ConflictFilterValue }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  function onChange(value: string) {
    const sp = new URLSearchParams(params?.toString() ?? "")
    if (value === "all") {
      sp.delete("filter")
    } else {
      sp.set("filter", value)
    }
    const qs = sp.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname)
  }

  return (
    <Select value={current} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-[170px]">
        <Filter className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All conflicts</SelectItem>
        <SelectItem value="unresolved">Unresolved</SelectItem>
        <SelectItem value="resolved">Resolved</SelectItem>
      </SelectContent>
    </Select>
  )
}
