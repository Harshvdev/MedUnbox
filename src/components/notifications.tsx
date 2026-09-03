"use client"

import { Bell, AlertTriangle, Share2, HeartPulse, Clock, CheckCircle2 } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

export interface NotificationItem {
  id: string
  type: "conflict" | "share_expiring" | "abnormal" | "share_created" | "info"
  title: string
  description: string
  href?: string
  timestamp: string
}

export function Notifications({ items }: { items: NotificationItem[] }) {
  const [open, setOpen] = useState(false)
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

  const unread = items.length

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative h-9 w-9"
        onClick={() => setOpen(!open)}
        title="Notifications"
      >
        <Bell className="h-[1.15rem] w-[1.15rem]" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border bg-popover shadow-lg md:w-96">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            {unread > 0 && <Badge variant="secondary" className="text-xs">{unread} new</Badge>}
          </div>
          <div className="max-h-96 overflow-y-auto scroll-thin">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-500/60" />
                <p className="text-sm font-medium">You&apos;re all caught up</p>
                <p className="text-xs text-muted-foreground">No new notifications</p>
              </div>
            ) : (
              items.map((n) => (
                <NotifRow key={n.id} item={n} onClick={() => setOpen(false)} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const ICON_MAP = {
  conflict: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-500/10" },
  share_expiring: { icon: Clock, color: "text-rose-600", bg: "bg-rose-500/10" },
  share_created: { icon: Share2, color: "text-emerald-600", bg: "bg-emerald-500/10" },
  abnormal: { icon: HeartPulse, color: "text-rose-600", bg: "bg-rose-500/10" },
  info: { icon: Bell, color: "text-primary", bg: "bg-primary/10" },
}

function NotifRow({ item, onClick }: { item: NotificationItem; onClick: () => void }) {
  const meta = ICON_MAP[item.type]
  const Icon = meta.icon
  const content = (
    <div className={cn("flex gap-3 border-b px-4 py-3 transition-colors hover:bg-accent/50", item.href && "cursor-pointer")}>
      <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", meta.bg)}>
        <Icon className={cn("h-4 w-4", meta.color)} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-snug">{item.title}</p>
        <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
        <p className="mt-0.5 text-[10px] text-muted-foreground/70">{item.timestamp}</p>
      </div>
    </div>
  )
  return item.href ? (
    <Link href={item.href} onClick={onClick}>
      {content}
    </Link>
  ) : (
    content
  )
}
