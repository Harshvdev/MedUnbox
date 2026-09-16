import { getCurrentPatient } from "@/lib/session"
import { db } from "@/lib/db"
import { Pill, Clock, Calendar, AlertCircle, Sunrise, Sun, Sunset, Moon, Activity, FileText } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { EmptyState } from "@/components/empty-state"
import Link from "next/link"
import { Upload } from "lucide-react"
import { formatDate } from "@/lib/constants"
import {
  MedicationsAddButton,
  MedicationRowActions,
} from "@/components/medications-actions"
import type { MedicationFormData } from "@/components/medication-add-dialog"

// Parse medication frequency into time-of-day slots
interface TimeSlot {
  period: "morning" | "afternoon" | "evening" | "night"
  label: string
  icon: typeof Sunrise
  time: string
}

const TIME_SLOTS: TimeSlot[] = [
  { period: "morning", label: "Morning", icon: Sunrise, time: "8:00 AM" },
  { period: "afternoon", label: "Afternoon", icon: Sun, time: "1:00 PM" },
  { period: "evening", label: "Evening", icon: Sunset, time: "6:00 PM" },
  { period: "night", label: "Night", icon: Moon, time: "10:00 PM" },
]

function parseFrequency(frequency: string | null): TimeSlot[] {
  if (!frequency) return []
  const freq = frequency.toUpperCase().trim()
  const slots: TimeSlot[] = []

  // Common frequency patterns
  if (freq.includes("OD") || freq === "ONCE DAILY" || freq === "DAILY") {
    slots.push(TIME_SLOTS[0]) // morning
  } else if (freq.includes("BD") || freq === "TWICE DAILY" || freq.includes("BID")) {
    slots.push(TIME_SLOTS[0], TIME_SLOTS[2]) // morning + evening
  } else if (freq.includes("TDS") || freq === "THRICE DAILY" || freq.includes("TID")) {
    slots.push(TIME_SLOTS[0], TIME_SLOTS[1], TIME_SLOTS[2]) // morning + afternoon + evening
  } else if (freq.includes("QDS") || freq === "FOUR TIMES DAILY" || freq.includes("QID")) {
    slots.push(...TIME_SLOTS) // all 4
  } else if (freq.includes("HS") || freq.includes("NIGHT") || freq.includes("BEDTIME")) {
    slots.push(TIME_SLOTS[3]) // night only
  } else if (freq.includes("PRN") || freq.includes("AS NEEDED") || freq.includes("SOS")) {
    // As needed — don't assign a slot
    return []
  } else if (freq.includes("STAT")) {
    slots.push(TIME_SLOTS[0])
  } else if (freq.includes("WEEKLY")) {
    slots.push(TIME_SLOTS[0])
  } else {
    // Default to morning if unknown
    slots.push(TIME_SLOTS[0])
  }

  return slots
}

export default async function MedicationsPage() {
  const patient = await getCurrentPatient()
  if (!patient) return null

  const [medications, prescriptions] = await Promise.all([
    db.medication.findMany({
      where: { patientId: patient.id },
      orderBy: { createdAt: "desc" },
    }),
    db.prescription.findMany({
      where: { patientId: patient.id },
      include: {
        doctor: { include: { user: { select: { name: true } } } },
        items: true,
        labOrders: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ])

  const activeMeds = medications.filter((m) => m.status === "ACTIVE")
  const discontinuedMeds = medications.filter((m) => m.status !== "ACTIVE")

  // Build schedule: map each time slot to medications scheduled at that time
  const schedule: Record<string, typeof activeMeds> = {
    morning: [],
    afternoon: [],
    evening: [],
    night: [],
  }
  const asNeededMeds: typeof activeMeds = []

  for (const med of activeMeds) {
    const slots = parseFrequency(med.frequency)
    if (slots.length === 0) {
      asNeededMeds.push(med)
    } else {
      for (const slot of slots) {
        schedule[slot.period].push(med)
      }
    }
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="flex items-center gap-1.5 text-sm font-medium text-primary">
            <Pill className="h-4 w-4" /> Medication Management
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Medication Schedule</h1>
          <p className="text-sm text-muted-foreground">
            Your daily medication schedule based on prescribed frequencies
          </p>
        </div>
        <MedicationsAddButton />
      </div>

      {medications.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-0">
            <EmptyState
              icon={Pill}
              title="No medications recorded"
              description="Upload prescriptions or medical records — or add a medication manually — to see your schedule here."
              iconClassName="h-16 w-16 text-primary"
              iconBgClassName="bg-primary/5 h-24 w-24"
              action={
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <MedicationsAddButton />
                  <Button asChild variant="outline">
                    <Link href="/documents"><Upload className="mr-2 h-4 w-4" /> Upload documents</Link>
                  </Button>
                </div>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard icon={Pill} label="Active" value={activeMeds.length} tone="primary" />
            <StatCard icon={Activity} label="Daily Doses" value={Object.values(schedule).flat().length} tone="emerald" />
            <StatCard icon={AlertCircle} label="As Needed" value={asNeededMeds.length} tone="amber" />
            <StatCard icon={Clock} label="Discontinued" value={discontinuedMeds.length} tone="muted" />
          </div>

          {/* Daily Schedule */}
          {activeMeds.length > 0 && (
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-4 w-4 text-primary" /> Daily Schedule
                </CardTitle>
                <CardDescription className="text-xs">
                  Suggested times based on prescribed frequency — adjust per your doctor&apos;s advice
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {TIME_SLOTS.map((slot) => {
                  const meds = schedule[slot.period]
                  if (meds.length === 0) return null
                  const Icon = slot.icon
                  return (
                    <div key={slot.period} className="flex gap-4">
                      <div className="flex w-28 shrink-0 flex-col items-center">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <p className="mt-1.5 text-xs font-medium">{slot.label}</p>
                        <p className="text-[10px] text-muted-foreground">{slot.time}</p>
                      </div>
                      <div className="flex-1 space-y-2">
                        {meds.map((med) => (
                          <div key={med.id} className="flex items-center gap-3 rounded-lg border border-border/50 p-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                              <Pill className="h-4 w-4 text-primary" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium">{med.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {med.dosage && <span>{med.dosage}</span>}
                                {med.route && <span> · {med.route}</span>}
                              </p>
                            </div>
                            {med.frequency && (
                              <Badge variant="outline" className="text-xs shrink-0">{med.frequency}</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
                {Object.values(schedule).every((m) => m.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No scheduled medications — all are as-needed
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* As-needed medications */}
          {asNeededMeds.length > 0 && (
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertCircle className="h-4 w-4 text-amber-500" /> As Needed (PRN)
                </CardTitle>
                <CardDescription className="text-xs">
                  Take only when needed, as directed by your doctor
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-2">
                {asNeededMeds.map((med) => (
                  <div key={med.id} className="flex items-center gap-3 rounded-lg border border-border/50 p-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                      <Pill className="h-4 w-4 text-amber-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{med.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {med.dosage && <span>{med.dosage}</span>}
                        {med.frequency && <span> · {med.frequency}</span>}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* All medications list */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Pill className="h-4 w-4 text-primary" /> All Medications
              </CardTitle>
              <CardDescription className="text-xs">
                Complete medication history including discontinued
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 space-y-2 overflow-y-auto scroll-thin pr-1">
                {medications.map((med) => {
                  const formData: MedicationFormData = {
                    id: med.id,
                    name: med.name,
                    dosage: med.dosage,
                    frequency: med.frequency,
                    route: med.route,
                    startDate: med.startDate,
                    endDate: med.endDate,
                    notes: med.notes,
                    status: med.status,
                  }
                  return (
                    <div key={med.id} className={`flex items-start gap-3 rounded-lg border p-3 ${med.status === "ACTIVE" ? "border-border/50" : "border-border/30 opacity-60"}`}>
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${med.status === "ACTIVE" ? "bg-primary/10" : "bg-muted"}`}>
                        <Pill className={`h-4 w-4 ${med.status === "ACTIVE" ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{med.name}</p>
                          <Badge variant={med.status === "ACTIVE" ? "default" : "secondary"} className="text-xs">
                            {med.status}
                          </Badge>
                        </div>
                        <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                          {med.dosage && <span>Dose: {med.dosage}</span>}
                          {med.frequency && <span>Frequency: {med.frequency}</span>}
                          {med.route && <span>Route: {med.route}</span>}
                        </div>
                        <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                          {med.startDate && <span>Started: {formatDate(med.startDate)}</span>}
                          {med.endDate && <span>Ended: {formatDate(med.endDate)}</span>}
                        </div>
                      </div>
                      <MedicationRowActions medication={formData} />
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Prescriptions & Clinical Orders */}
          {prescriptions.length > 0 && (
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4 text-primary" /> Doctor Prescriptions &amp; Fulfillment
                </CardTitle>
                <CardDescription className="text-xs">
                  Official clinical prescriptions issued by your doctors, fulfilled by licensed pharmacists and diagnostic labs
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {prescriptions.map((rx) => (
                  <div key={rx.id} className="p-4 rounded-xl border bg-muted/20 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
                      <div>
                        <p className="font-semibold text-sm">
                          {rx.diagnosis ? `Diagnosis: ${rx.diagnosis}` : "Clinical Prescription"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Prescribed by Dr. {rx.doctor?.user?.name || "Doctor"} • {formatDate(rx.createdAt)}
                        </p>
                      </div>
                      <Badge
                        className={
                          rx.status === "COMPLETED"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs"
                            : "bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs"
                        }
                      >
                        {rx.status}
                      </Badge>
                    </div>

                    {rx.notes && (
                      <p className="text-xs text-muted-foreground italic">
                        Doctor&apos;s Advice: {rx.notes}
                      </p>
                    )}

                    {/* Prescribed Meds */}
                    {rx.items && rx.items.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Medications &amp; Pharmacy Dispensation
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {rx.items.map((item: any) => (
                            <div key={item.id} className="p-2.5 rounded border bg-card text-xs flex justify-between items-start gap-2">
                              <div>
                                <p className="font-medium text-foreground">{item.medicationName} ({item.dosage})</p>
                                <p className="text-muted-foreground text-[11px]">{item.frequency}</p>
                                {item.instructions && <p className="text-muted-foreground text-[11px]">{item.instructions}</p>}
                                {item.dispenseNotes && <p className="text-emerald-600 text-[11px] italic mt-0.5">{item.dispenseNotes}</p>}
                              </div>
                              <Badge
                                variant="outline"
                                className={
                                  item.status === "DISPENSED"
                                    ? "text-emerald-600 border-emerald-500/30 text-[10px]"
                                    : "text-amber-600 border-amber-500/30 text-[10px]"
                                }
                              >
                                {item.status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Lab Tests */}
                    {rx.labOrders && rx.labOrders.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Diagnostic Lab Orders
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {rx.labOrders.map((lo: any) => (
                            <div key={lo.id} className="p-2.5 rounded border bg-card text-xs flex justify-between items-start gap-2">
                              <div>
                                <p className="font-medium text-foreground">{lo.testName}</p>
                                {lo.instructions && <p className="text-muted-foreground text-[11px]">{lo.instructions}</p>}
                                {lo.resultSummary && (
                                  <p className="text-emerald-600 font-medium text-[11px] mt-0.5">
                                    Result: {lo.resultSummary}
                                  </p>
                                )}
                              </div>
                              <Badge
                                variant="outline"
                                className={
                                  lo.status === "COMPLETED"
                                    ? "text-emerald-600 border-emerald-500/30 text-[10px]"
                                    : "text-amber-600 border-amber-500/30 text-[10px]"
                                }
                              >
                                {lo.status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Disclaimer */}
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="flex items-start gap-2 p-4 text-sm">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div>
                <p className="font-medium text-amber-700 dark:text-amber-500">Medication safety</p>
                <p className="text-muted-foreground">
                  Schedule times are suggestions based on standard frequency patterns. Always follow your doctor&apos;s
                  specific instructions. Do not start, stop, or change medication doses without consulting your healthcare provider.
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number; tone: "primary" | "emerald" | "amber" | "muted" }) {
  const colorMap = {
    primary: "bg-primary/10 text-primary",
    emerald: "bg-emerald-500/10 text-emerald-600",
    amber: "bg-amber-500/10 text-amber-600",
    muted: "bg-muted text-muted-foreground",
  }
  return (
    <Card className="border-border/60">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${colorMap[tone]}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums leading-none">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
