import Link from "next/link"
import { redirect } from "next/navigation"
import { getCurrentPatient } from "@/lib/session"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileText,
  GitCompare,
  Upload,
} from "lucide-react"
import { EmptyState } from "@/components/empty-state"
import { ConflictResolver } from "@/components/conflict-resolver"
import { ConflictFilter, type ConflictFilterValue } from "@/components/conflict-filter"
import { formatDateTime } from "@/lib/constants"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Conflicts · MedUnbox",
}

const STATUS_META: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  UNRESOLVED: { label: "Unresolved", variant: "outline" },
  RESOLVED_A: { label: "Resolved · A", variant: "default" },
  RESOLVED_B: { label: "Resolved · B", variant: "default" },
  RESOLVED_OTHER: { label: "Resolved · Other", variant: "default" },
  DISMISSED: { label: "Dismissed", variant: "secondary" },
}

function ValueCard({
  label,
  value,
  docId,
  docTitle,
  page,
  sourceText,
  chosen,
}: {
  label: string
  value: string
  docId: string
  docTitle: string
  page: number
  sourceText: string
  chosen?: boolean
}) {
  return (
    <div
      className={`rounded-lg border p-3 transition-colors ${
        chosen ? "border-primary/40 bg-primary/5" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        {chosen && (
          <Badge className="text-[10px]">
            Chosen
          </Badge>
        )}
      </div>
      <p className="mt-1 text-lg font-bold break-words">{value || "—"}</p>
      <Separator className="my-2" />
      <p className="text-xs text-muted-foreground">
        From{" "}
        <Link
          href={`/documents/${docId}`}
          className="font-medium text-primary hover:underline"
        >
          {docTitle}
        </Link>
        {page > 0 ? ` · Page ${page}` : ""}
      </p>
      <p className="mt-1 rounded bg-muted/60 px-2 py-1 font-mono text-xs break-words">
        &ldquo;{sourceText}&rdquo;
      </p>
    </div>
  )
}

function normalizeFilter(value: string | undefined): ConflictFilterValue {
  if (value === "unresolved" || value === "resolved") return value
  return "all"
}

export default async function ConflictsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const patient = await getCurrentPatient()
  if (!patient) {
    redirect("/login")
    return
  }

  const { filter: rawFilter } = await searchParams
  const filter = normalizeFilter(rawFilter)

  const conflicts = await db.conflict.findMany({
    where: { patientId: patient.id },
    orderBy: { createdAt: "desc" },
    include: {
      documentA: { select: { id: true, title: true } },
      documentB: { select: { id: true, title: true } },
    },
  })

  const unresolved = conflicts.filter((c) => c.status === "UNRESOLVED").length
  const resolvedCount = conflicts.length - unresolved

  const filtered =
    filter === "unresolved"
      ? conflicts.filter((c) => c.status === "UNRESOLVED")
      : filter === "resolved"
        ? conflicts.filter((c) => c.status !== "UNRESOLVED")
        : conflicts

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Detected Conflicts</h1>
          <p className="text-muted-foreground">
            {conflicts.length > 0
              ? `${conflicts.length} conflict${conflicts.length === 1 ? "" : "s"} found between your reports`
              : "When the same medical value differs across documents, you'll see them here for review"}
          </p>
        </div>
        {conflicts.length > 0 && (
          <ConflictFilter current={filter} />
        )}
      </div>

      {conflicts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-0">
            <EmptyState
              icon={AlertTriangle}
              title="No conflicts detected"
              description="Upload new documents to automatically scan for discrepancies across your reports."
              action={
                <Button asChild>
                  <Link href="/documents">
                    <Upload className="mr-2 h-4 w-4" /> Upload Documents
                  </Link>
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary banner */}
          {unresolved > 0 && (
            <Card className="border-amber-500/30 bg-amber-50 dark:bg-amber-950/30">
              <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                      {unresolved} conflict{unresolved === 1 ? "" : "s"} need{unresolved === 1 ? "s" : ""} review
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Open each conflict and choose the correct value to resolve it.
                      {resolvedCount > 0 && ` ${resolvedCount} already resolved.`}
                    </p>
                  </div>
                </div>
                <Button asChild size="sm" variant="outline" className="shrink-0 border-amber-400/60">
                  <Link href="/documents">
                    <Upload className="mr-1.5 h-3.5 w-3.5" /> Upload more
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {filtered.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-0">
                <EmptyState
                  icon={CheckCircle2}
                  title={
                    filter === "unresolved"
                      ? "No unresolved conflicts"
                      : "No resolved conflicts yet"
                  }
                  description={
                    filter === "unresolved"
                      ? "You're all caught up. Switch the filter to view resolved items."
                      : "Once you resolve a conflict, it will appear here."
                  }
                />
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filtered.map((c) => {
                const statusMeta =
                  STATUS_META[c.status] ?? STATUS_META.UNRESOLVED
                const isUnresolved = c.status === "UNRESOLVED"
                return (
                  <Card
                    key={c.id}
                    className={`border-l-4 ${
                      isUnresolved
                        ? "border-l-amber-500"
                        : "border-l-emerald-500"
                    }`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <CardTitle className="flex items-center gap-2 text-base">
                          {isUnresolved ? (
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          )}
                          {c.label}
                        </CardTitle>
                        <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Detected {formatDateTime(c.createdAt)}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <ValueCard
                          label="Value A"
                          value={c.valueA}
                          docId={c.documentAId}
                          docTitle={c.documentA?.title ?? "Document A"}
                          page={c.pageA}
                          sourceText={c.sourceTextA}
                          chosen={c.status === "RESOLVED_A"}
                        />
                        <ValueCard
                          label="Value B"
                          value={c.valueB}
                          docId={c.documentBId}
                          docTitle={c.documentB?.title ?? "Document B"}
                          page={c.pageB}
                          sourceText={c.sourceTextB}
                          chosen={c.status === "RESOLVED_B"}
                        />
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap gap-2">
                          <Button asChild size="sm" variant="default">
                            <Link href={`/documents/compare?a=${c.documentAId}&b=${c.documentBId}`}>
                              <GitCompare className="mr-1.5 h-3.5 w-3.5" /> Compare
                            </Link>
                          </Button>
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/documents/${c.documentAId}`}>
                              <FileText className="mr-1.5 h-3.5 w-3.5" /> Doc A
                            </Link>
                          </Button>
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/documents/${c.documentBId}`}>
                              <FileText className="mr-1.5 h-3.5 w-3.5" /> Doc B
                            </Link>
                          </Button>
                        </div>
                        {isUnresolved ? (
                          <ConflictResolver conflictId={c.id} />
                        ) : (
                          c.resolvedAt && (
                            <span className="text-xs text-muted-foreground">
                              Resolved {formatDateTime(c.resolvedAt)}
                            </span>
                          )
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
