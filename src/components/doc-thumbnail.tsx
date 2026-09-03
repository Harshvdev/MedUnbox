"use client"

import { FileText, FileType, ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { categoryLabel } from "@/lib/constants"

interface DocThumbnailProps {
  thumbnailUrl?: string | null
  mimeType: string
  title: string
  category: string
  className?: string
  /** Show the category label as a small overlay strip at the bottom of the thumbnail. */
  showLabel?: boolean
}

const CATEGORY_COLOR: Record<string, string> = {
  LAB_REPORT: "from-emerald-500/20 to-emerald-500/5 text-emerald-600",
  PRESCRIPTION: "from-rose-500/20 to-rose-500/5 text-rose-600",
  IMAGING: "from-cyan-500/20 to-cyan-500/5 text-cyan-600",
  DISCHARGE_SUMMARY: "from-violet-500/20 to-violet-500/5 text-violet-600",
  PATHOLOGY: "from-amber-500/20 to-amber-500/5 text-amber-600",
  RADIOLOGY: "from-sky-500/20 to-sky-500/5 text-sky-600",
  CARDIOLOGY: "from-red-500/20 to-red-500/5 text-red-600",
  OPD_CONSULTATION: "from-teal-500/20 to-teal-500/5 text-teal-600",
  VACCINATION: "from-fuchsia-500/20 to-fuchsia-500/5 text-fuchsia-600",
  INSURANCE: "from-slate-500/20 to-slate-500/5 text-slate-600",
  OTHER: "from-primary/20 to-primary/5 text-primary",
}

const CATEGORY_OVERLAY: Record<string, string> = {
  LAB_REPORT: "bg-emerald-500/85 text-white",
  PRESCRIPTION: "bg-rose-500/85 text-white",
  IMAGING: "bg-cyan-500/85 text-white",
  DISCHARGE_SUMMARY: "bg-violet-500/85 text-white",
  PATHOLOGY: "bg-amber-500/85 text-white",
  RADIOLOGY: "bg-sky-500/85 text-white",
  CARDIOLOGY: "bg-red-500/85 text-white",
  OPD_CONSULTATION: "bg-teal-500/85 text-white",
  VACCINATION: "bg-fuchsia-500/85 text-white",
  INSURANCE: "bg-slate-500/85 text-white",
  OTHER: "bg-primary/85 text-primary-foreground",
}

function shortLabel(category: string): string {
  // Short, abbreviation-friendly label that fits in a 56px-wide overlay.
  const map: Record<string, string> = {
    LAB_REPORT: "Lab",
    PRESCRIPTION: "Rx",
    IMAGING: "Imaging",
    DISCHARGE_SUMMARY: "Discharge",
    PATHOLOGY: "Path",
    RADIOLOGY: "Radiology",
    CARDIOLOGY: "Cardio",
    OPD_CONSULTATION: "OPD",
    VACCINATION: "Vaccine",
    INSURANCE: "Insurance",
    OTHER: "Doc",
  }
  return map[category] ?? categoryLabel(category)
}

export function DocThumbnail({
  thumbnailUrl,
  mimeType,
  title,
  category,
  className,
  showLabel = true,
}: DocThumbnailProps) {
  const isImage = mimeType.startsWith("image/")
  const isPdf = mimeType === "application/pdf"
  const colorClass = CATEGORY_COLOR[category] ?? CATEGORY_COLOR.OTHER
  const overlayClass = CATEGORY_OVERLAY[category] ?? CATEGORY_OVERLAY.OTHER
  const label = shortLabel(category)

  const labelStrip = showLabel ? (
    <span
      className={cn(
        "absolute inset-x-0 bottom-0 block truncate bg-clip-padding px-1 py-px text-center text-[8px] font-semibold uppercase leading-tight tracking-wide",
        overlayClass,
      )}
    >
      {label}
    </span>
  ) : null

  if (thumbnailUrl && isImage) {
    return (
      <div
        className={cn(
          "relative h-14 w-12 shrink-0 overflow-hidden rounded-lg border bg-muted",
          className,
        )}
        title={title}
      >
        <img src={thumbnailUrl} alt={title} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/0" />
        {labelStrip}
      </div>
    )
  }

  return (
    <div
      className={cn(
        "relative flex h-14 w-12 shrink-0 flex-col items-center justify-center overflow-hidden rounded-lg border bg-gradient-to-br",
        colorClass,
        className,
      )}
      title={title}
    >
      <div className="flex flex-1 items-center justify-center">
        {isPdf ? (
          <FileType className="h-5 w-5" />
        ) : isImage ? (
          <ImageIcon className="h-5 w-5" />
        ) : (
          <FileText className="h-5 w-5" />
        )}
      </div>
      {labelStrip}
    </div>
  )
}
