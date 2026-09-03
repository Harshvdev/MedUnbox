import { getCurrentPatient } from "@/lib/session"
import { db } from "@/lib/db"
import { VITAL_ENTITIES } from "@/lib/processing"
import { formatDate, timeAgo, VALUE_STATUS_META } from "@/lib/constants"
import { HeartPulse, Activity, Weight, Thermometer, Wind, Droplet, Ruler, Heart, type LucideIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { VitalsCharts, VITAL_META } from "@/components/vitals-charts"
import { EmptyState } from "@/components/empty-state"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Upload } from "lucide-react"

export default async function VitalsPage() {
  const patient = await getCurrentPatient()
  if (!patient) return null

  // Fetch all vital values
  const vitals = await db.medicalValue.findMany({
    where: {
      patientId: patient.id,
      entity: { in: VITAL_ENTITIES },
    },
    orderBy: { recordedAt: "asc" },
    include: { document: true },
  })

  // Group by entity (serialize to plain objects)
  const byEntity: Record<string, any[]> = {}
  for (const v of vitals) {
    if (!byEntity[v.entity]) byEntity[v.entity] = []
    byEntity[v.entity].push({
      id: v.id,
      entity: v.entity,
      label: v.label,
      value: v.value,
      numericValue: v.numericValue,
      unit: v.unit,
      referenceRange: v.referenceRange,
      status: v.status,
      recordedAt: v.recordedAt?.toISOString() ?? new Date().toISOString(),
      sourceText: v.sourceText,
      documentId: v.documentId,
      document: { id: v.document.id, title: v.document.title },
    })
  }

  const entitiesWithData = Object.keys(byEntity)

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="space-y-1">
        <p className="flex items-center gap-1.5 text-sm font-medium text-primary">
          <HeartPulse className="h-4 w-4" /> Vital Signs
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Vitals Tracking</h1>
        <p className="text-sm text-muted-foreground">
          Track your essential vital signs over time — blood pressure, heart rate, weight, and more
        </p>
      </div>

      {vitals.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-0">
            <EmptyState
              icon={HeartPulse}
              title="No vitals recorded yet"
              description="Upload documents containing vital signs (blood pressure, heart rate, etc.) to see them tracked here"
              action={
                <Button asChild>
                  <Link href="/documents"><Upload className="mr-2 h-4 w-4" /> Upload documents</Link>
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {VITAL_ENTITIES.map((entity) => {
              const meta = VITAL_META[entity]
              if (!meta) return null
              const vals = byEntity[entity] ?? []
              const latest = vals[vals.length - 1]
              const hasData = vals.length > 0
              const Icon = meta.icon
              return (
                <div
                  key={entity}
                  className={`rounded-lg border p-3 ${hasData ? "border-border/60 bg-card" : "border-dashed border-border/30 opacity-50"}`}
                >
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${hasData ? "bg-primary/10" : "bg-muted"}`}>
                    <Icon className={`h-4 w-4 ${hasData ? meta.color : "text-muted-foreground"}`} />
                  </div>
                  <p className="mt-2 text-lg font-bold tabular-nums leading-none">
                    {hasData ? latest.value : "—"}
                  </p>
                  <p className="truncate text-xs font-medium">{meta.label}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {hasData ? `${vals.length} reading${vals.length === 1 ? "" : "s"}` : "No data"}
                  </p>
                  {hasData && latest?.recordedAt && (
                    <p className="text-[10px] text-muted-foreground/70">{timeAgo(latest.recordedAt)}</p>
                  )}
                </div>
              )
            })}
          </div>

          {/* Charts for each vital with data */}
          <VitalsCharts byEntity={byEntity} entities={entitiesWithData} />
        </>
      )}
    </div>
  )
}
