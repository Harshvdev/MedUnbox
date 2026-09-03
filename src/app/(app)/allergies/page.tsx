import Link from "next/link"
import { redirect } from "next/navigation"
import { getCurrentPatient } from "@/lib/session"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  FileText,
  ArrowRight,
  Upload,
  Activity,
  type LucideIcon,
} from "lucide-react"
import { EmptyState } from "@/components/empty-state"
import { formatDate, formatDateShort } from "@/lib/constants"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Allergies · MedUnbox",
}

// ---------------------------------------------------------------
// Severity metadata — emerald for MILD, amber for MODERATE,
// rose for SEVERE (rose/red accent for visual urgency).
// ---------------------------------------------------------------
const SEVERITY_ORDER: Record<string, number> = {
  SEVERE: 0,
  MODERATE: 1,
  MILD: 2,
}

const SEVERITY_META: Record<
  string,
  { label: string; badge: string; border: string; dot: string; icon: LucideIcon }
> = {
  SEVERE: {
    label: "Severe",
    badge:
      "border-rose-300 bg-rose-500/10 text-rose-700 dark:border-rose-700/60 dark:bg-rose-950/40 dark:text-rose-300",
    border: "border-l-rose-500",
    dot: "bg-rose-500",
    icon: ShieldAlert,
  },
  MODERATE: {
    label: "Moderate",
    badge:
      "border-amber-300 bg-amber-500/10 text-amber-700 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-300",
    border: "border-l-amber-500",
    dot: "bg-amber-500",
    icon: AlertTriangle,
  },
  MILD: {
    label: "Mild",
    badge:
      "border-emerald-300 bg-emerald-500/10 text-emerald-700 dark:border-emerald-700/60 dark:bg-emerald-950/40 dark:text-emerald-300",
    border: "border-l-emerald-500",
    dot: "bg-emerald-500",
    icon: ShieldCheck,
  },
}

const UNKNOWN_SEVERITY_META = {
  label: "Unspecified",
  badge:
    "border-border bg-muted text-muted-foreground dark:border-border dark:bg-muted/40",
  border: "border-l-border",
  dot: "bg-muted-foreground",
  icon: ShieldCheck,
}

function severityMeta(severity: string | null) {
  if (!severity) return UNKNOWN_SEVERITY_META
  return SEVERITY_META[severity.toUpperCase()] ?? UNKNOWN_SEVERITY_META
}

/**
 * Parse the reaction description out of the rawText we stored.
 * Stored format: `Name (SEVERITY) - reaction` (severity and reaction optional).
 */
function parseReaction(rawText: string): string | null {
  const sep = " - "
  const idx = rawText.indexOf(sep)
  if (idx === -1) return null
  const after = rawText.substring(idx + sep.length).trim()
  return after.length > 0 ? after : null
}

export default async function AllergiesPage() {
  const patient = await getCurrentPatient()
  if (!patient) {
    redirect("/login")
    return
  }

  // Fetch all ALLERGY medical entities for this patient (via document join).
  const entities = await db.medicalEntity.findMany({
    where: {
      category: "ALLERGY",
      document: { patientId: patient.id },
    },
    include: {
      document: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  // Map to display shape + sort: SEVERE first, then MODERATE, MILD, unknown;
  // ties broken by allergen name alphabetically.
  const allergies = entities
    .map((e) => {
      const severity = e.normalizedValue ?? null
      const allergen = e.entityLabel.replace(/^Allergy:\s*/i, "")
      const reaction = parseReaction(e.rawText)
      return {
        id: e.id,
        allergen,
        severity,
        reaction,
        documentId: e.document.id,
        documentTitle: e.document.title,
        firstDetectedAt: e.createdAt,
        rawText: e.rawText,
      }
    })
    .sort((a, b) => {
      const sa = a.severity ? SEVERITY_ORDER[a.severity.toUpperCase()] ?? 99 : 99
      const sb = b.severity ? SEVERITY_ORDER[b.severity.toUpperCase()] ?? 99 : 99
      if (sa !== sb) return sa - sb
      return a.allergen.localeCompare(b.allergen)
    })

  const total = allergies.length
  const severeCount = allergies.filter((a) => a.severity?.toUpperCase() === "SEVERE").length
  const moderateCount = allergies.filter((a) => a.severity?.toUpperCase() === "MODERATE").length
  const mildCount = allergies.filter((a) => a.severity?.toUpperCase() === "MILD").length
  const unspecifiedCount = total - severeCount - moderateCount - mildCount

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="space-y-1">
        <p className="flex items-center gap-1.5 text-sm font-medium text-primary">
          <ShieldAlert className="h-4 w-4" /> Allergy Tracker
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Allergies</h1>
        <p className="text-sm text-muted-foreground">
          {total > 0
            ? `${total} allerg${total === 1 ? "y" : "ies"} detected across your documents${
                severeCount > 0 ? ` · ${severeCount} severe` : ""
              }`
            : "Drug, food, and environmental allergies detected in your medical documents"}
        </p>
      </div>

      {total === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-0">
            <EmptyState
              icon={ShieldAlert}
              title="No allergies recorded"
              description="If you have any drug, food, or environmental allergies, they'll appear here once detected in your documents"
              action={
                <Button asChild>
                  <Link href="/documents">
                    <Upload className="mr-2 h-4 w-4" /> Upload documents
                  </Link>
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryStat
              icon={ShieldAlert}
              tone="primary"
              label="Total allergies"
              value={total}
              hint={`${unspecifiedCount + mildCount + moderateCount + severeCount} recorded`}
            />
            <SummaryStat
              icon={ShieldAlert}
              tone="rose"
              label="Severe"
              value={severeCount}
              hint={severeCount > 0 ? "Avoid exposure" : "None recorded"}
            />
            <SummaryStat
              icon={AlertTriangle}
              tone="amber"
              label="Moderate"
              value={moderateCount}
              hint={moderateCount > 0 ? "Caution advised" : "None recorded"}
            />
            <SummaryStat
              icon={ShieldCheck}
              tone="emerald"
              label="Mild"
              value={mildCount}
              hint={mildCount > 0 ? "Monitor reactions" : "None recorded"}
            />
          </div>

          {/* Allergy cards */}
          <div className="space-y-3">
            {allergies.map((a) => {
              const meta = severityMeta(a.severity)
              const SeverityIcon = meta.icon
              return (
                <Card
                  key={a.id}
                  className={cn(
                    "overflow-hidden border-border/60 border-l-4 transition-all hover:shadow-md",
                    meta.border
                  )}
                >
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold tracking-tight break-words">
                            {a.allergen}
                          </h3>
                          {a.severity ? (
                            <Badge
                              variant="outline"
                              className={cn("gap-1 text-[10px] font-semibold uppercase tracking-wide", meta.badge)}
                            >
                              <SeverityIcon className="h-3 w-3" />
                              {meta.label}
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className={cn("text-[10px] font-semibold uppercase tracking-wide", meta.badge)}
                            >
                              {meta.label}
                            </Badge>
                          )}
                        </div>

                        {a.reaction ? (
                          <div className="flex items-start gap-1.5 text-sm">
                            <Activity className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <p className="text-foreground/80">
                              <span className="font-medium text-muted-foreground">Reaction: </span>
                              {a.reaction}
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No reaction description recorded
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs text-muted-foreground">
                          <Link
                            href={`/documents/${a.documentId}`}
                            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            {a.documentTitle}
                          </Link>
                          <span className="inline-flex items-center gap-1">
                            <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
                            First detected {formatDateShort(a.firstDetectedAt)}
                          </span>
                        </div>
                      </div>

                      <Button asChild variant="ghost" size="sm" className="shrink-0 self-start text-primary">
                        <Link href={`/documents/${a.documentId}`}>
                          View source
                          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Footer disclaimer */}
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="flex items-start gap-2 p-3 text-xs text-amber-800 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <p>
                This list is auto-extracted from your uploaded documents and may be incomplete.
                Always confirm your allergies with your doctor and inform healthcare providers
                before any new treatment.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------
// Summary stat card
// ---------------------------------------------------------------

const TONE_BG: Record<string, string> = {
  primary: "bg-primary/10",
  emerald: "bg-emerald-500/10",
  amber: "bg-amber-500/10",
  rose: "bg-rose-500/10",
}
const TONE_TEXT: Record<string, string> = {
  primary: "text-primary",
  emerald: "text-emerald-600 dark:text-emerald-400",
  amber: "text-amber-600 dark:text-amber-400",
  rose: "text-rose-600 dark:text-rose-400",
}

function SummaryStat({
  icon: Icon,
  tone,
  label,
  value,
  hint,
}: {
  icon: LucideIcon
  tone: "primary" | "emerald" | "amber" | "rose"
  label: string
  value: number
  hint: string
}) {
  return (
    <Card className="border-border/60">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", TONE_BG[tone])}>
            <Icon className={cn("h-4 w-4", TONE_TEXT[tone])} />
          </div>
        </div>
        <p className="mt-2 text-2xl font-bold tabular-nums leading-none">{value}</p>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  )
}
