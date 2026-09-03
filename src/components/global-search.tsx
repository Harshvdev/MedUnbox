"use client"

import { Search, FileText, Activity, Pill, Stethoscope, X, Loader2, ArrowRight } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { useDebounce } from "@/hooks/use-debounce"

interface SearchResult {
  type: "document" | "value" | "timeline" | "medication" | "diagnosis"
  id: string
  title: string
  subtitle: string
  href: string
}

export function GlobalSearch() {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const debounced = useDebounce(query, 250)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  useEffect(() => {
    if (!debounced || debounced.length < 2) {
      // Skip fetch for short queries; the rendered results are gated by
      // `hasQuery` below so we don't need to synchronously reset state here.
      return
    }
    // Loading flag is set synchronously to give immediate UI feedback before
    // the async fetch resolves — this is the canonical fetch UX pattern.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    fetch(`/api/search?q=${encodeURIComponent(debounced)}`)
      .then((r) => r.json())
      .then((d) => setResults(d.results ?? []))
      .finally(() => setLoading(false))
  }, [debounced])

  // Derive the displayed results from the debounced query length so we
  // avoid calling setState synchronously inside the effect above.
  const hasQuery = !!(debounced && debounced.length >= 2)
  const effectiveResults = hasQuery ? results : []
  const showEmpty = hasQuery && !loading && effectiveResults.length === 0


  return (
    <div ref={ref} className="relative hidden sm:block">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search records…"
          className="h-9 w-44 pl-9 pr-8 text-sm lg:w-64"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("")
              setResults([])
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && (query.length >= 2) && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border bg-popover shadow-lg sm:w-96 lg:w-[28rem]">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Searching…
            </div>
          ) : showEmpty ? (
            <div className="flex flex-col items-center justify-center gap-1 py-6 text-center">
              <Search className="h-6 w-6 text-muted-foreground/40" />
              <p className="text-sm font-medium">No results found</p>
              <p className="text-xs text-muted-foreground">Try a different search term</p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto scroll-thin">
              <p className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {effectiveResults.length} result{effectiveResults.length === 1 ? "" : "s"}
              </p>
              {effectiveResults.map((r) => (
                <ResultRow key={`${r.type}-${r.id}`} result={r} onClick={() => setOpen(false)} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const TYPE_ICON = {
  document: FileText,
  value: Activity,
  timeline: Activity,
  medication: Pill,
  diagnosis: Stethoscope,
}
const TYPE_COLOR = {
  document: "text-primary bg-primary/10",
  value: "text-emerald-600 bg-emerald-500/10",
  timeline: "text-sky-600 bg-sky-500/10",
  medication: "text-rose-600 bg-rose-500/10",
  diagnosis: "text-amber-600 bg-amber-500/10",
}

function ResultRow({ result, onClick }: { result: SearchResult; onClick: () => void }) {
  const Icon = TYPE_ICON[result.type]
  const color = TYPE_COLOR[result.type]
  return (
    <Link
      href={result.href}
      onClick={onClick}
      className="group flex items-center gap-3 border-b px-4 py-2.5 transition-colors hover:bg-accent/50"
    >
      <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", color)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{result.title}</p>
        <p className="truncate text-xs text-muted-foreground">{result.subtitle}</p>
      </div>
      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" />
    </Link>
  )
}
