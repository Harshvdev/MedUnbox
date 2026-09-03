import { getCurrentPatient, getCurrentUser } from "@/lib/session"
import { db } from "@/lib/db"
import { formatDate, formatDateTime, categoryLabel, VALUE_STATUS_META, TREND_DIRECTION_META } from "@/lib/constants"
import {
  ShieldCheck,
  FileText,
  Activity,
  Pill,
  Stethoscope,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ExportToolbar } from "@/components/export-toolbar"
import { ExportToc, type TocItem } from "@/components/export-toc"

// Anchor IDs for each section of the summary — used by the TOC and the
// sticky scroll-margin so anchor jumps don't sit underneath the toolbars.
const SECTIONS = {
  patientInfo: "section-patient-info",
  summary: "section-summary",
  conditions: "section-conditions",
  medications: "section-medications",
  labValues: "section-lab-values",
  conflicts: "section-conflicts",
  documents: "section-documents",
} as const

export default async function ExportPage() {
  const patient = await getCurrentPatient()
  const user = await getCurrentUser()
  if (!patient || !user) return null

  const [
    documents,
    timelineEvents,
    medications,
    diagnoses,
    medicalValues,
    trends,
    conflicts,
    shares,
  ] = await Promise.all([
    db.document.findMany({
      where: { patientId: patient.id, status: "PROCESSED" },
      orderBy: { uploadedAt: "desc" },
    }),
    db.timelineEvent.findMany({
      where: { patientId: patient.id },
      orderBy: { date: "desc" },
      take: 50,
    }),
    db.medication.findMany({
      where: { patientId: patient.id },
      orderBy: { startDate: "desc" },
    }),
    db.diagnosis.findMany({
      where: { patientId: patient.id },
      orderBy: { diagnosedAt: "desc" },
    }),
    db.medicalValue.findMany({
      where: { patientId: patient.id },
      orderBy: { recordedAt: "desc" },
    }),
    db.trend.findMany({
      where: { patientId: patient.id },
      orderBy: { lastUpdated: "desc" },
    }),
    db.conflict.findMany({
      where: { patientId: patient.id },
      orderBy: { createdAt: "desc" },
      include: { documentA: true, documentB: true },
    }),
    db.share.findMany({
      where: { patientId: patient.id, isActive: true, revokedAt: null, expiresAt: { gt: new Date() } },
      include: { doctor: { include: { user: true } } },
    }),
  ])

  const age = patient.dateOfBirth
    ? Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null
  const patientSince = formatDate(patient.createdAt)
  // Treat the placeholder em-dash returned by formatDate for invalid dates as
  // "no value" so we don't render a row that just says "—".
  const hasPatientSince = patientSince && patientSince !== "—"

  // Build the list of patient info fields, hiding any that are empty.
  const infoFields: { label: string; value: string }[] = []
  if (user.name) infoFields.push({ label: "Name", value: user.name })
  if (age) infoFields.push({ label: "Age", value: `${age} years` })
  if (patient.gender) infoFields.push({ label: "Gender", value: patient.gender })
  if (patient.bloodGroup) infoFields.push({ label: "Blood Group", value: patient.bloodGroup })
  if (patient.phone) infoFields.push({ label: "Phone", value: patient.phone })
  if (hasPatientSince) infoFields.push({ label: "Patient Since", value: patientSince })

  // Group medical values by entity
  const valuesByEntity = new Map<string, typeof medicalValues>()
  for (const v of medicalValues) {
    const arr = valuesByEntity.get(v.entity) ?? []
    arr.push(v)
    valuesByEntity.set(v.entity, arr)
  }

  const hasConditions = diagnoses.length > 0
  const hasMedications = medications.length > 0
  const hasLabValues = valuesByEntity.size > 0
  const hasConflicts = conflicts.length > 0
  const hasDocuments = documents.length > 0

  const tocItems: TocItem[] = [
    { id: SECTIONS.patientInfo, label: "Patient Info" },
    { id: SECTIONS.summary, label: "Summary" },
    { id: SECTIONS.conditions, label: "Conditions", hidden: !hasConditions },
    { id: SECTIONS.medications, label: "Medications", hidden: !hasMedications },
    { id: SECTIONS.labValues, label: "Lab Values", hidden: !hasLabValues },
    { id: SECTIONS.conflicts, label: "Conflicts", hidden: !hasConflicts },
    { id: SECTIONS.documents, label: "Documents", hidden: !hasDocuments },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Print toolbar (hidden when printing) */}
      <ExportToolbar patientName={user.name ?? "Patient"} />

      {/* Printable document */}
      <div className="mx-auto max-w-4xl px-6 py-10 print:px-0 print:py-0 print:max-w-none">
        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-primary pb-4 print:border-black">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground print:bg-black print:text-white">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">MedUnbox Medical Summary</h1>
              <p className="text-sm text-muted-foreground">
                Generated on {formatDateTime(new Date())}
              </p>
            </div>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <p>Confidential — Patient-Controlled Record</p>
            <p>MedUnbox · medunbox.app</p>
          </div>
        </div>

        {/* Sticky table of contents (hidden when printing) */}
        <ExportToc items={tocItems} />

        {/* Patient info */}
        <section
          id={SECTIONS.patientInfo}
          className="mt-2 scroll-mt-32"
        >
          <h2 className="mb-3 text-lg font-semibold">Patient Information</h2>
          {infoFields.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              No patient information on file yet. Update your profile to include details here.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 rounded-lg border p-4 sm:grid-cols-3 print:grid-cols-3">
              {infoFields.map((f) => (
                <InfoField key={f.label} label={f.label} value={f.value} />
              ))}
            </div>
          )}
        </section>

        {/* Summary stats */}
        <section
          id={SECTIONS.summary}
          className="mt-6 scroll-mt-32"
        >
          <h2 className="mb-3 text-lg font-semibold">Summary</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 print:grid-cols-4">
            <SummaryStat icon={FileText} label="Documents" value={documents.length} />
            <SummaryStat icon={Stethoscope} label="Diagnoses" value={diagnoses.length} />
            <SummaryStat icon={Pill} label="Medications" value={medications.length} />
            <SummaryStat icon={Activity} label="Lab Values" value={medicalValues.length} />
            <SummaryStat icon={TrendingUp} label="Trends Tracked" value={trends.length} />
            <SummaryStat
              icon={AlertTriangle}
              label="Conflicts"
              value={conflicts.filter((c) => c.status === "UNRESOLVED").length}
            />
            <SummaryStat
              icon={CheckCircle2}
              label="Active Shares"
              value={shares.length}
            />
            <SummaryStat
              icon={Activity}
              label="Timeline Events"
              value={timelineEvents.length}
            />
          </div>
        </section>

        {/* Active conditions */}
        {hasConditions && (
          <section
            id={SECTIONS.conditions}
            className="mt-6 scroll-mt-32"
          >
            <h2 className="mb-3 text-lg font-semibold">Conditions & Diagnoses</h2>
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase">
                  <tr>
                    <th className="px-3 py-2 text-left">Diagnosis</th>
                    <th className="px-3 py-2 text-left">Severity</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Diagnosed</th>
                  </tr>
                </thead>
                <tbody>
                  {diagnoses.map((d) => (
                    <tr key={d.id} className="border-t">
                      <td className="px-3 py-2 font-medium">{d.name}</td>
                      <td className="px-3 py-2">{d.severity ?? "—"}</td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className="text-xs">{d.status}</Badge>
                      </td>
                      <td className="px-3 py-2">{d.diagnosedAt ? formatDate(d.diagnosedAt) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Medications */}
        {hasMedications && (
          <section
            id={SECTIONS.medications}
            className="mt-6 scroll-mt-32"
          >
            <h2 className="mb-3 text-lg font-semibold">Medications</h2>
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase">
                  <tr>
                    <th className="px-3 py-2 text-left">Medication</th>
                    <th className="px-3 py-2 text-left">Dosage</th>
                    <th className="px-3 py-2 text-left">Frequency</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Start Date</th>
                  </tr>
                </thead>
                <tbody>
                  {medications.map((m) => (
                    <tr key={m.id} className="border-t">
                      <td className="px-3 py-2 font-medium">{m.name}</td>
                      <td className="px-3 py-2">{m.dosage ?? "—"}</td>
                      <td className="px-3 py-2">{m.frequency ?? "—"}</td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className="text-xs">{m.status}</Badge>
                      </td>
                      <td className="px-3 py-2">{m.startDate ? formatDate(m.startDate) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Lab values by entity */}
        {hasLabValues && (
          <section
            id={SECTIONS.labValues}
            className="mt-6 scroll-mt-32"
          >
            <h2 className="mb-3 text-lg font-semibold">Lab Values History</h2>
            <div className="space-y-4">
              {Array.from(valuesByEntity.entries()).map(([entity, vals]) => {
                const latest = vals[0]
                const trend = trends.find((t) => t.entity === entity)
                return (
                  <div key={entity} className="rounded-lg border p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-sm font-semibold">{latest.label}</h3>
                      <div className="flex items-center gap-2">
                        {trend && (
                          <Badge variant="outline" className="text-xs">
                            {TREND_DIRECTION_META[trend.direction]?.label ?? trend.direction}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {vals.length} record{vals.length === 1 ? "" : "s"}
                        </span>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="text-muted-foreground">
                          <tr>
                            <th className="py-1 text-left">Value</th>
                            <th className="py-1 text-left">Unit</th>
                            <th className="py-1 text-left">Status</th>
                            <th className="py-1 text-left">Reference</th>
                            <th className="py-1 text-left">Date</th>
                            <th className="py-1 text-left">Source</th>
                          </tr>
                        </thead>
                        <tbody>
                          {vals.slice(0, 10).map((v) => {
                            const meta = VALUE_STATUS_META[v.status] ?? VALUE_STATUS_META.UNKNOWN
                            const doc = documents.find((d) => d.id === v.documentId)
                            return (
                              <tr key={v.id} className="border-t border-border/40">
                                <td className="py-1.5 font-medium tabular-nums">{v.value}</td>
                                <td className="py-1.5 text-muted-foreground">{v.unit ?? "—"}</td>
                                <td className={`py-1.5 ${meta.color}`}>{meta.label}</td>
                                <td className="py-1.5 text-muted-foreground">{v.referenceRange ?? "—"}</td>
                                <td className="py-1.5">{formatDate(v.recordedAt)}</td>
                                <td className="py-1.5 text-muted-foreground truncate max-w-[150px]">
                                  {doc?.title ?? "—"}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Conflicts */}
        {hasConflicts && (
          <section
            id={SECTIONS.conflicts}
            className="mt-6 scroll-mt-32"
          >
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
              <AlertTriangle className="h-5 w-5 text-amber-600" /> Detected Conflicts
            </h2>
            <div className="space-y-2">
              {conflicts.map((c) => (
                <div key={c.id} className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
                  <p className="font-medium">{c.label}</p>
                  <div className="mt-1 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Report A ({c.documentA.title}):</p>
                      <p className="font-medium">{c.valueA}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Report B ({c.documentB.title}):</p>
                      <p className="font-medium">{c.valueB}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="mt-2 text-xs">{c.status}</Badge>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Documents list */}
        {hasDocuments && (
          <section
            id={SECTIONS.documents}
            className="mt-6 scroll-mt-32"
          >
            <h2 className="mb-3 text-lg font-semibold">Documents in Vault</h2>
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase">
                  <tr>
                    <th className="px-3 py-2 text-left">Title</th>
                    <th className="px-3 py-2 text-left">Category</th>
                    <th className="px-3 py-2 text-left">Uploaded</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((d) => (
                    <tr key={d.id} className="border-t">
                      <td className="px-3 py-2 font-medium">{d.title}</td>
                      <td className="px-3 py-2">{categoryLabel(d.category)}</td>
                      <td className="px-3 py-2">{formatDate(d.uploadedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Footer / disclaimer */}
        <div className="mt-10 border-t-2 pt-4 text-xs text-muted-foreground print:border-black">
          <p className="font-semibold text-foreground">Medical Disclaimer</p>
          <p className="mt-1">
            This summary was generated by MedUnbox from documents uploaded by the patient.
            It assists with organizing and understanding records but does not replace clinical
            decision-making. Always consult a qualified healthcare professional for medical advice.
            This document contains confidential medical information — handle accordingly.
          </p>
        </div>
      </div>
    </div>
  )
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  )
}

function SummaryStat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
    </div>
  )
}
