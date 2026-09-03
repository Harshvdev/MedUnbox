import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import {
  Siren,
  Droplet,
  ShieldAlert,
  AlertTriangle,
  Activity,
  Pill,
  Phone,
  Mail,
  User,
  Clock,
  Stethoscope,
  HeartPulse,
  type LucideIcon,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Emergency Medical Information · MedUnbox",
  description: "Emergency access view for first responders",
  robots: { index: false, follow: false },
}

// ---------------------------------------------------------------
// Severity metadata — red/rose palette for urgency, high contrast.
// ---------------------------------------------------------------
const SEVERITY_META: Record<
  string,
  { label: string; badge: string; border: string }
> = {
  SEVERE: {
    label: "Severe",
    badge:
      "border-rose-300 bg-rose-500 text-white dark:border-rose-700 dark:bg-rose-700 dark:text-white",
    border: "border-l-rose-500",
  },
  MODERATE: {
    label: "Moderate",
    badge:
      "border-amber-300 bg-amber-500 text-white dark:border-amber-700 dark:bg-amber-700 dark:text-white",
    border: "border-l-amber-500",
  },
  MILD: {
    label: "Mild",
    badge:
      "border-emerald-300 bg-emerald-500 text-white dark:border-emerald-700 dark:bg-emerald-700 dark:text-white",
    border: "border-l-emerald-500",
  },
}

const UNKNOWN_SEVERITY = {
  label: "Severity unknown",
  badge: "border-border bg-muted text-muted-foreground",
  border: "border-l-border",
}

function severityMeta(severity: string | null) {
  if (!severity) return UNKNOWN_SEVERITY
  return SEVERITY_META[severity.toUpperCase()] ?? UNKNOWN_SEVERITY
}

function parseReaction(rawText: string): string | null {
  const sep = " - "
  const idx = rawText.indexOf(sep)
  if (idx === -1) return null
  const after = rawText.substring(idx + sep.length).trim()
  return after.length > 0 ? after : null
}

interface EmergencyData {
  patient: {
    name: string
    bloodGroup: string | null
  }
  allergies: {
    id: string
    allergen: string
    severity: string | null
    reaction: string | null
  }[]
  conditions: {
    id: string
    name: string
    severity: string | null
    notes: string | null
  }[]
  medications: {
    id: string
    name: string
    dosage: string | null
    frequency: string | null
    route: string | null
    notes: string | null
  }[]
  contact: {
    name: string
    relation: string
    phone: string | null
    email: string | null
  }
  accessedAt: string
}

/**
 * Loads the emergency view payload directly from the DB (mirrors the logic
 * in /api/emergency/[code] but without an HTTP roundtrip). Public page —
 * no auth required.
 */
async function loadEmergencyData(code: string): Promise<EmergencyData | null> {
  const access = await db.emergencyAccess.findUnique({
    where: { accessCode: code },
    include: {
      patient: {
        include: { user: { select: { name: true } } },
      },
    },
  })

  if (!access || !access.isActive) return null

  const patient = access.patient

  const [allergyEntities, activeDiagnoses, activeMedications] = await Promise.all([
    db.medicalEntity.findMany({
      where: { category: "ALLERGY", document: { patientId: patient.id } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        entityLabel: true,
        normalizedValue: true,
        rawText: true,
      },
    }),
    db.diagnosis.findMany({
      where: { patientId: patient.id, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, severity: true, notes: true },
    }),
    db.medication.findMany({
      where: { patientId: patient.id, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        dosage: true,
        frequency: true,
        route: true,
        notes: true,
      },
    }),
  ])

  // Best-effort audit log — public view, no userId.
  try {
    await db.auditLog.create({
      data: {
        userId: null,
        action: "EMERGENCY_ACCESS_VIEWED",
        resource: "EmergencyAccess",
        resourceId: access.id,
        metadata: {
          contactName: access.contactName,
          patientId: patient.id,
        },
      },
    })
  } catch (e) {
    console.error("Audit log write failed:", e)
  }

  return {
    patient: {
      name: patient.user.name ?? "Patient",
      bloodGroup: patient.bloodGroup ?? null,
    },
    allergies: allergyEntities.map((e) => {
      const allergen = e.entityLabel.replace(/^Allergy:\s*/i, "")
      return {
        id: e.id,
        allergen,
        severity: e.normalizedValue ?? null,
        reaction: parseReaction(e.rawText),
      }
    }),
    conditions: activeDiagnoses.map((d) => ({
      id: d.id,
      name: d.name,
      severity: d.severity ?? null,
      notes: d.notes ?? null,
    })),
    medications: activeMedications.map((m) => ({
      id: m.id,
      name: m.name,
      dosage: m.dosage ?? null,
      frequency: m.frequency ?? null,
      route: m.route ?? null,
      notes: m.notes ?? null,
    })),
    contact: {
      name: access.contactName,
      relation: access.contactRelation,
      phone: access.contactPhone ?? null,
      email: access.contactEmail ?? null,
    },
    accessedAt: new Date().toISOString(),
  }
}

export default async function PublicEmergencyPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const data = await loadEmergencyData(code)
  if (!data) {
    notFound()
    return
  }

  const accessedAt = new Date(data.accessedAt).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

  // Sort allergies by severity (SEVERE first)
  const severityOrder: Record<string, number> = {
    SEVERE: 0,
    MODERATE: 1,
    MILD: 2,
  }
  const sortedAllergies = [...data.allergies].sort((a, b) => {
    const sa = a.severity ? severityOrder[a.severity.toUpperCase()] ?? 99 : 99
    const sb = b.severity ? severityOrder[b.severity.toUpperCase()] ?? 99 : 99
    return sa - sb
  })

  return (
    <div className="min-h-screen bg-rose-50/40 dark:bg-rose-950/20">
      {/* Top banner — high-contrast red */}
      <header className="border-b-4 border-rose-600 bg-rose-600 text-white">
        <div className="mx-auto max-w-4xl px-4 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/15 ring-2 ring-white/30">
              <Siren className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight uppercase sm:text-2xl">
                Emergency Medical Information
              </h1>
              <p className="text-xs text-rose-100 sm:text-sm">
                Critical patient info for first responders · MedUnbox
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8 space-y-5">
        {/* Patient identity + blood group — most critical, large */}
        <Card className="overflow-hidden border-2 border-rose-500 bg-white dark:bg-background">
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                  Patient
                </p>
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  {data.patient.name}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Accessed {accessedAt}
                </p>
              </div>

              {/* Blood group — large, prominent */}
              <div className="shrink-0 rounded-xl border-2 border-rose-500 bg-rose-500 px-5 py-3 text-center text-white shadow-sm">
                <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-rose-50">
                  <Droplet className="h-3 w-3" /> Blood Group
                </div>
                <p className="mt-0.5 text-3xl font-black leading-none tracking-tight sm:text-4xl">
                  {data.patient.bloodGroup ?? "Unknown"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Allergies — most urgent section, displayed before everything else */}
        <Section
          icon={ShieldAlert}
          title="Allergies"
          accent="rose"
          count={sortedAllergies.length}
          empty="No allergies recorded in this patient's records."
        >
          {sortedAllergies.length > 0 && (
            <div className="space-y-2">
              {sortedAllergies.map((a) => {
                const meta = severityMeta(a.severity)
                return (
                  <div
                    key={a.id}
                    className={cn(
                      "flex items-start justify-between gap-3 rounded-lg border border-l-4 bg-white p-3 dark:bg-background",
                      meta.border
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold leading-tight">{a.allergen}</p>
                      {a.reaction && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Reaction: {a.reaction}
                        </p>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className={cn("shrink-0 text-[10px] font-bold uppercase tracking-wide", meta.badge)}
                    >
                      {meta.label}
                    </Badge>
                  </div>
                )
              })}
            </div>
          )}
        </Section>

        {/* Active conditions */}
        <Section
          icon={Activity}
          title="Active Conditions"
          accent="rose"
          count={data.conditions.length}
          empty="No active conditions recorded."
        >
          {data.conditions.length > 0 && (
            <div className="space-y-2">
              {data.conditions.map((c) => (
                <div
                  key={c.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-l-4 border-l-rose-400 bg-white p-3 dark:bg-background"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-tight">{c.name}</p>
                    {c.notes && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{c.notes}</p>
                    )}
                  </div>
                  {c.severity && (
                    <Badge
                      variant="outline"
                      className="shrink-0 border-rose-300 bg-rose-500/10 text-rose-700 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-300 text-[10px] font-bold uppercase tracking-wide"
                    >
                      {c.severity}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Active medications */}
        <Section
          icon={Pill}
          title="Active Medications"
          accent="rose"
          count={data.medications.length}
          empty="No active medications recorded."
        >
          {data.medications.length > 0 && (
            <div className="space-y-2">
              {data.medications.map((m) => (
                <div
                  key={m.id}
                  className="rounded-lg border border-l-4 border-l-rose-400 bg-white p-3 dark:bg-background"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold leading-tight">{m.name}</p>
                    <div className="flex flex-wrap justify-end gap-1">
                      {m.dosage && (
                        <Badge variant="outline" className="text-[10px] font-semibold">
                          {m.dosage}
                        </Badge>
                      )}
                      {m.route && (
                        <Badge variant="outline" className="text-[10px] font-semibold">
                          {m.route}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {(m.frequency || m.notes) && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {m.frequency && <span>{m.frequency}</span>}
                      {m.frequency && m.notes && <span> · </span>}
                      {m.notes && <span>{m.notes}</span>}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Emergency contact */}
        <Section
          icon={User}
          title="Emergency Contact"
          accent="rose"
          count={null}
        >
          <div className="rounded-lg border border-l-4 border-l-rose-500 bg-white p-4 dark:bg-background">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-0.5">
                <p className="font-semibold leading-tight">{data.contact.name}</p>
                <p className="text-xs text-muted-foreground">
                  {data.contact.relation}
                </p>
              </div>
              <div className="flex flex-col gap-1 text-sm sm:items-end">
                {data.contact.phone && (
                  <a
                    href={`tel:${data.contact.phone}`}
                    className="inline-flex items-center gap-1.5 font-medium text-rose-700 hover:underline dark:text-rose-400"
                  >
                    <Phone className="h-3.5 w-3.5" /> {data.contact.phone}
                  </a>
                )}
                {data.contact.email && (
                  <a
                    href={`mailto:${data.contact.email}`}
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:underline"
                  >
                    <Mail className="h-3.5 w-3.5" /> {data.contact.email}
                  </a>
                )}
              </div>
            </div>
          </div>
        </Section>

        {/* Footer / disclaimer */}
        <Card className="border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/30">
          <CardContent className="space-y-3 p-4 sm:p-5">
            <div className="flex items-start gap-2 text-sm text-rose-900 dark:text-rose-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                <strong>Medical disclaimer.</strong> This information is auto-extracted
                from the patient&apos;s uploaded medical records and may be incomplete,
                outdated, or inaccurate. It is provided to assist first responders in an
                emergency. Always verify critical information directly with the patient
                when possible, and rely on clinical judgment and on-site assessment.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-rose-200 pt-3 text-xs text-rose-700 dark:border-rose-800 dark:text-rose-300">
              <span className="inline-flex items-center gap-1">
                <Stethoscope className="h-3 w-3" /> For emergency use only
              </span>
              <span className="inline-flex items-center gap-1">
                <HeartPulse className="h-3 w-3" /> No documents or lab values shared
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" /> Accessed {accessedAt}
              </span>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t border-rose-200 bg-white py-4 text-center text-xs text-muted-foreground dark:border-rose-900 dark:bg-background">
        Powered by MedUnbox · Patient-controlled emergency access
      </footer>
    </div>
  )
}

// ---------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------

function Section({
  icon: Icon,
  title,
  accent,
  count,
  empty,
  children,
}: {
  icon: LucideIcon
  title: string
  accent: "rose"
  count: number | null
  empty?: string
  children?: React.ReactNode
}) {
  const hasItems = count === null || count > 0
  return (
    <Card className="overflow-hidden border-rose-200 bg-white dark:border-rose-900/50 dark:bg-background">
      <CardHeader className="bg-rose-500/10 px-4 py-3 sm:px-5">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Icon className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          <span>{title}</span>
          {count !== null && count > 0 && (
            <Badge className="ml-1 bg-rose-600 text-white hover:bg-rose-600">
              {count}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-5">
        {hasItems ? (
          children
        ) : (
          <p className="text-sm text-muted-foreground">{empty}</p>
        )}
      </CardContent>
    </Card>
  )
}
