import Link from "next/link"
import {
  Activity,
  FileText,
  Pill,
  Stethoscope,
  TrendingUp,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  formatDate,
  formatDateTime,
  categoryLabel,
  TREND_DIRECTION_META,
  VALUE_STATUS_META,
} from "@/lib/constants"
import {
  TimelineEventIcon,
  TrendDirectionIcon,
  CategoryIcon,
} from "@/components/medical-icons"
import { EmptyState } from "@/components/empty-state"

interface TimelineEventRow {
  id: string
  date: Date
  title: string
  description: string
  category: string
  sourceDocId: string | null
  document: { title: string; category: string } | null
}

interface ValueRow {
  id: string
  entity: string
  label: string
  value: string
  numericValue: number | null
  unit: string | null
  referenceRange: string | null
  status: string
  recordedAt: Date | null
  document: { title: string }
  sourceText: string
}

interface EntityGroup {
  entity: string
  label: string
  unit: string | null
  values: ValueRow[]
}

interface DocumentRow {
  id: string
  title: string
  category: string
  status: string
  mimeType: string
  uploadedAt: Date
  processedAt: Date | null
}

interface DiagnosisRow {
  id: string
  name: string
  severity: string | null
  icdCode: string | null
  status: string
  diagnosedAt: Date | null
  notes: string | null
  sourceDocId: string | null
}

interface MedicationRow {
  id: string
  name: string
  dosage: string | null
  frequency: string | null
  route: string | null
  status: string
  startDate: Date | null
  endDate: Date | null
  sourceDocId: string | null
}

interface TrendRow {
  id: string
  entity: string
  label: string
  direction: string
  unit: string | null
  latestValue: number
  previousValue: number | null
  changePercent: number | null
  status: string
  dataPoints: number
  lastUpdated: Date
}

interface DeepViewContentProps {
  patientId: string
  timelineEvents: TimelineEventRow[]
  valuesByEntity: EntityGroup[]
  documents: DocumentRow[]
  diagnoses: DiagnosisRow[]
  medications: MedicationRow[]
  trends: TrendRow[]
}

export function DeepViewContent({
  patientId,
  timelineEvents,
  valuesByEntity,
  documents,
  diagnoses,
  medications,
  trends,
}: DeepViewContentProps) {
  return (
    <div className="space-y-6">
      {/* Complete timeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4" /> Complete Timeline
            <Badge variant="secondary" className="ml-auto">
              {timelineEvents.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {timelineEvents.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="No timeline events"
              description="No events have been extracted from this patient's records"
            />
          ) : (
            <div className="max-h-[32rem] space-y-3 overflow-y-auto scroll-thin pr-1">
              {timelineEvents.map((ev, idx) => {
                const isLast = idx === timelineEvents.length - 1
                return (
                  <div key={ev.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <TimelineEventIcon category={ev.category} className="h-3.5 w-3.5" />
                      </div>
                      {!isLast && <div className="mt-1 w-px flex-1 bg-border" />}
                    </div>
                    <div className="min-w-0 flex-1 pb-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-sm font-medium">{ev.title}</p>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(ev.date)}
                        </span>
                      </div>
                      {ev.description && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {ev.description}
                        </p>
                      )}
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-[10px]">
                          {ev.category.replace(/_/g, " ").toLowerCase()}
                        </Badge>
                        {ev.document && (
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {ev.document.title}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Medical values grouped by entity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" /> Medical Values by Entity
            <Badge variant="secondary" className="ml-auto">
              {valuesByEntity.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {valuesByEntity.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title="No medical values"
              description="No medical values have been extracted from this patient's records"
            />
          ) : (
            <div className="max-h-[32rem] space-y-4 overflow-y-auto scroll-thin pr-1">
              {valuesByEntity.map((group) => {
                const latest = group.values[group.values.length - 1]
                const trend = trends.find((t) => t.entity === group.entity)
                const meta = latest
                  ? VALUE_STATUS_META[latest.status] ?? VALUE_STATUS_META.UNKNOWN
                  : VALUE_STATUS_META.UNKNOWN
                return (
                  <div key={group.entity} className="rounded-lg border p-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{group.label}</p>
                        <p className="text-xs text-muted-foreground">{group.entity}</p>
                      </div>
                      {latest && (
                        <div className="text-right">
                          <p className="text-base font-bold">
                            {latest.value}
                            {latest.unit && (
                              <span className="ml-1 text-xs text-muted-foreground">
                                {latest.unit}
                              </span>
                            )}
                          </p>
                          <p className={`text-xs font-semibold ${meta.color}`}>
                            {meta.label}
                          </p>
                        </div>
                      )}
                    </div>

                    {trend && (
                      <div className="mt-1 flex items-center gap-2">
                        <TrendBadge trend={trend} />
                        {trend.changePercent !== null && (
                          <span className="text-xs text-muted-foreground">
                            {trend.changePercent > 0 ? "+" : ""}
                            {trend.changePercent.toFixed(1)}% change
                          </span>
                        )}
                        <span className="ml-auto text-xs text-muted-foreground">
                          {trend.dataPoints} data points
                        </span>
                      </div>
                    )}

                    <Separator className="my-2" />

                    {/* History */}
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">History</p>
                      <div className="space-y-1.5">
                        {group.values
                          .slice()
                          .reverse()
                          .slice(0, 8)
                          .map((v) => {
                            const vMeta = VALUE_STATUS_META[v.status] ?? VALUE_STATUS_META.UNKNOWN
                            return (
                              <div
                                key={v.id}
                                className="flex items-baseline justify-between gap-2 text-xs"
                              >
                                <span className="truncate text-muted-foreground">
                                  {v.recordedAt ? formatDate(v.recordedAt) : "—"}
                                </span>
                                <span className="font-medium">
                                  {v.value}
                                  {v.unit && ` ${v.unit}`}
                                </span>
                                <span className={`font-semibold ${vMeta.color}`}>
                                  {vMeta.label}
                                </span>
                                <span className="ml-auto max-w-[40%] truncate text-[10px] text-muted-foreground">
                                  {v.document.title}
                                </span>
                              </div>
                            )
                          })}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documents */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" /> Documents
            <Badge variant="secondary" className="ml-auto">
              {documents.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No documents available"
              description="No documents match your access scope"
            />
          ) : (
            <div className="max-h-96 space-y-2 overflow-y-auto scroll-thin pr-1">
              {documents.map((doc) => {
                return (
                  <Link
                    key={doc.id}
                    href={`/doctor/patients/${patientId}/documents/${doc.id}`}
                    className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <CategoryIcon category={doc.category} className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{doc.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {categoryLabel(doc.category)} · {formatDateTime(doc.uploadedAt)}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {doc.mimeType === "application/pdf"
                        ? "PDF"
                        : doc.mimeType.startsWith("image/")
                        ? "Image"
                        : "File"}
                    </Badge>
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diagnoses + Medications */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Stethoscope className="h-4 w-4" /> All Diagnoses
              <Badge variant="secondary" className="ml-auto">
                {diagnoses.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {diagnoses.length === 0 ? (
              <EmptyState
                icon={Stethoscope}
                title="No diagnoses recorded"
                description="No diagnoses have been extracted from records"
              />
            ) : (
              <div className="max-h-96 space-y-2 overflow-y-auto scroll-thin pr-1">
                {diagnoses.map((d) => (
                  <div key={d.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{d.name}</p>
                      <DiagnosisStatusBadge status={d.status} />
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      {d.severity && <span>Severity: {d.severity}</span>}
                      {d.icdCode && <span>ICD: {d.icdCode}</span>}
                      {d.diagnosedAt && <span>Diagnosed: {formatDate(d.diagnosedAt)}</span>}
                    </div>
                    {d.sourceDocId && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Source document available in patient vault
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Pill className="h-4 w-4" /> All Medications
              <Badge variant="secondary" className="ml-auto">
                {medications.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {medications.length === 0 ? (
              <EmptyState
                icon={Pill}
                title="No medications recorded"
                description="No medications have been extracted from records"
              />
            ) : (
              <div className="max-h-96 space-y-2 overflow-y-auto scroll-thin pr-1">
                {medications.map((m) => (
                  <div key={m.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{m.name}</p>
                      <MedicationStatusBadge status={m.status} />
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      {m.dosage && <span>Dose: {m.dosage}</span>}
                      {m.frequency && <span>Frequency: {m.frequency}</span>}
                      {m.route && <span>Route: {m.route}</span>}
                      {m.startDate && <span>Start: {formatDate(m.startDate)}</span>}
                      {m.endDate && <span>End: {formatDate(m.endDate)}</span>}
                    </div>
                    {m.sourceDocId && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Source document available in patient vault
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detected trends */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" /> Detected Trends
            <Badge variant="secondary" className="ml-auto">
              {trends.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {trends.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title="No trends detected"
              description="Trends require multiple values over time for the same entity"
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {trends.map((t) => (
                <TrendCard key={t.id} trend={t} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function TrendBadge({ trend }: { trend: TrendRow }) {
  const meta = TREND_DIRECTION_META[trend.direction] ?? TREND_DIRECTION_META.STABLE
  return (
    <Badge variant="outline" className={`gap-1 text-[10px] ${meta.color}`}>
      <TrendDirectionIcon direction={trend.direction} className="h-3 w-3" />
      {meta.label}
    </Badge>
  )
}

function TrendCard({ trend }: { trend: TrendRow }) {
  const meta = TREND_DIRECTION_META[trend.direction] ?? TREND_DIRECTION_META.STABLE
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{trend.label}</p>
          <p className="text-xs text-muted-foreground">{trend.entity}</p>
        </div>
        <TrendDirectionIcon direction={trend.direction} className={`h-4 w-4 ${meta.color}`} />
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-lg font-bold">{trend.latestValue}</span>
        {trend.unit && (
          <span className="text-xs text-muted-foreground">{trend.unit}</span>
        )}
        {trend.previousValue !== null && (
          <span className="ml-auto text-xs text-muted-foreground">
            prev: {trend.previousValue}
          </span>
        )}
      </div>
      <div className="mt-1 flex items-center justify-between">
        <span className={`text-xs font-semibold ${meta.color}`}>{meta.label}</span>
        <span className="text-xs text-muted-foreground">
          {trend.dataPoints} pts
        </span>
      </div>
    </div>
  )
}

function DiagnosisStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
    ACTIVE: { label: "Active", variant: "default" },
    RESOLVED: { label: "Resolved", variant: "secondary" },
    CHRONIC: { label: "Chronic", variant: "outline" },
    RECURRENT: { label: "Recurrent", variant: "outline" },
  }
  const m = map[status] ?? { label: status, variant: "outline" as const }
  return (
    <Badge variant={m.variant} className="text-[10px]">
      {m.label}
    </Badge>
  )
}

function MedicationStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
    ACTIVE: { label: "Active", variant: "default" },
    DISCONTINUED: { label: "Discontinued", variant: "outline" },
    COMPLETED: { label: "Completed", variant: "secondary" },
  }
  const m = map[status] ?? { label: status, variant: "outline" as const }
  return (
    <Badge variant={m.variant} className="text-[10px]">
      {m.label}
    </Badge>
  )
}
