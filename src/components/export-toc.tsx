"use client"

import { useEffect, useState } from "react"

export interface TocItem {
  id: string
  label: string
  /** When true, the pill is dimmed/disabled (section not rendered). */
  hidden?: boolean
}

interface ExportTocProps {
  items: TocItem[]
}

/**
 * Sticky table-of-contents for the export/medical-summary page.
 * Renders pill-shaped anchor links that smooth-scroll to each section.
 * The currently-visible section is highlighted via IntersectionObserver.
 * Hidden when printing.
 */
export function ExportToc({ items }: ExportTocProps) {
  const [activeId, setActiveId] = useState<string | null>(items[0]?.id ?? null)

  useEffect(() => {
    if (typeof window === "undefined") return
    const visible = items.filter((i) => !i.hidden)
    if (visible.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleNow = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visibleNow[0]) setActiveId(visibleNow[0].target.id)
      },
      {
        rootMargin: "-30% 0px -55% 0px",
        threshold: [0, 0.1, 0.25, 0.5, 1],
      },
    )

    for (const item of visible) {
      const el = document.getElementById(item.id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [items])

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
    e.preventDefault()
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" })
      // Update hash without jumping
      if (typeof history !== "undefined") {
        history.replaceState(null, "", `#${id}`)
      }
      setActiveId(id)
    }
  }

  const visibleItems = items.filter((i) => !i.hidden)
  if (visibleItems.length === 0) return null

  return (
    <nav
      aria-label="On this page"
      className="sticky top-14 z-20 -mx-6 mb-6 border-b bg-background/95 px-6 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 print:hidden"
    >
      <div className="flex items-center gap-2 overflow-x-auto pb-px [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <span className="shrink-0 pr-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          On this page
        </span>
        <ul className="flex items-center gap-2">
          {visibleItems.map((item) => {
            const isActive = activeId === item.id
            return (
              <li key={item.id} className="shrink-0">
                <a
                  href={`#${item.id}`}
                  onClick={(e) => handleClick(e, item.id)}
                  className={
                    "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors " +
                    (isActive
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-foreground")
                  }
                  aria-current={isActive ? "true" : undefined}
                >
                  {item.label}
                </a>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}
