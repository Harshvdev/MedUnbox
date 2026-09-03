import Link from "next/link"
import {
  Brain,
  Droplet,
  Pill,
  ShieldAlert,
  Stethoscope,
  TestTube,
  UserRound,
  HeartPulse,
  Activity,
  AlertTriangle,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { formatDate, VALUE_STATUS_META } from "@/lib/constants"
import { EmptyState } from "@/components/empty-state"

interface ActiveDiagnosis {
  id: string
  name: string
  severity: string | null
  icdCode: string | null
  diagnosedAt: Date | null
  notes: string | null
}

interface ActiveMedication {
  id: string
  name: string
  dosage: string | null
  frequency: string | null
  route: string | null
  startDate: Date | null
  endDate: Date | null
}

interface AbnormalValue {
  id: string
  label: string
  value: string
  unit: string | null
  status: string
  recordedAt: Date | null
  document: { title: string }
}

interface Patient {
  dateOfBirth: Date | null
  gender: string | null
}

interface QuickViewContentProps {
  patientId: string
  patientName: string
  age: number | null
  gender: string | null
  bloodGroup: string | null
  activeDiagnoses: ActiveDiagnosis[]
  activeMedications: ActiveMedication[]
  abnormalValues: AbnormalValue[]
  openConflicts: number
}

export function QuickViewContent({
  patientId,
  patientName,
  age,
  gender,
  bloodGroup,
  activeDiagnoses,
  activeMedications,
  abnormalValues,
  openConflicts,
}: QuickViewContentProps) {
  const summary = [
    age !== null && { label: "Age", value: `${age} yrs`, icon: UserRound },
    gender && { label: "Gender", value: gender, icon: UserRound },
    bloodGroup && { label: "Blood Group", value: bloodGroup, icon: Droplet },
  ].filter(Boolean) as Array<{ label: string; value: string; icon: typeof UserRound }>

  return (
    <div className="space-y-6">
      {/* Patient summary + quick stats */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Patient Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No demographic data available
              </p>
            ) : (
              summary.map((s) => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <s.icon className="h-4 w-4" />
                    {s.label}
                  </span>
                  <span className="text-sm font-medium">{s.value}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile
                label="Open Conflicts"
                value={openConflicts}
                icon={ShieldAlert}
                color={openConflicts > 0 ? "text-amber-600" : "text-emerald-600"}
              />
              <StatTile
                label="Active Conditions"
                value={activeDiagnoses.length}
                icon={Stethoscope}
                color="text-primary"
              />
              <StatTile
                label="Active Meds"
                value={activeMedications.length}
                icon={Pill}
                color="text-rose-600"
              />
              <StatTile
                label="Abnormal Labs"
                value={abnormalValues.length}
                icon={TestTube}
                color="text-amber-600"
              />
            </div>
            <Button asChild className="mt-4 w-full">
              <Link href={`/doctor/ask?patientId=${patientId}`}>
                <Brain className="mr-2 h-4 w-4" /> Ask My Records about {patientName.split(" ")[0]}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Active conditions + Active medications */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Stethoscope className="h-4 w-4" /> Active Conditions
              <Badge variant="secondary" className="ml-auto">
                {activeDiagnoses.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeDiagnoses.length === 0 ? (
              <EmptyState
                icon={HeartPulse}
                title="No active conditions"
                description="No active diagnoses have been recorded"
              />
            ) : (
              <div className="max-h-72 space-y-2 overflow-y-auto scroll-thin pr-1">
                {activeDiagnoses.map((d) => (
                  <div key={d.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{d.name}</p>
                      {d.severity && (
                        <Badge variant="outline" className="text-[10px]">
                          {d.severity}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      {d.icdCode && <span>ICD: {d.icdCode}</span>}
                      {d.diagnosedAt && <span>Diagnosed {formatDate(d.diagnosedAt)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Pill className="h-4 w-4" /> Active Medications
              <Badge variant="secondary" className="ml-auto">
                {activeMedications.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeMedications.length === 0 ? (
              <EmptyState
                icon={Pill}
                title="No active medications"
                description="No active medications have been prescribed"
              />
            ) : (
              <div className="max-h-72 space-y-2 overflow-y-auto scroll-thin pr-1">
                {activeMedications.map((m) => (
                  <div key={m.id} className="rounded-lg border p-3">
                    <p className="font-medium">{m.name}</p>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      {m.dosage && <span>Dose: {m.dosage}</span>}
                      {m.frequency && <span>Frequency: {m.frequency}</span>}
                      {m.route && <span>Route: {m.route}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Latest abnormal lab values */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <TestTube className="h-4 w-4" /> Latest Abnormal Lab Values
            <Badge variant="secondary" className="ml-auto">
              {abnormalValues.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {abnormalValues.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="No abnormal values"
              description="No recent abnormal lab values detected"
            />
          ) : (
            <div className="max-h-96 space-y-2 overflow-y-auto scroll-thin pr-1">
              {abnormalValues.map((v) => {
                const meta = VALUE_STATUS_META[v.status] ?? VALUE_STATUS_META.UNKNOWN
                return (
                  <div key={v.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{v.label}</span>
                      <span className={`text-xs font-semibold ${meta.color}`}>
                        {meta.label}
                      </span>
                    </div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-lg font-bold">{v.value}</span>
                      {v.unit && (
                        <span className="text-sm text-muted-foreground">{v.unit}</span>
                      )}
                      {v.recordedAt && (
                        <span className="ml-auto text-xs text-muted-foreground">
                          {formatDate(v.recordedAt)}
                        </span>
                      )}
                    </div>
                    <Separator className="my-2" />
                    <p className="text-xs text-muted-foreground">
                      Source: <span className="text-foreground/70">{v.document.title}</span>
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conflicts warning */}
      {openConflicts > 0 && (
        <Card className="border-amber-500/50">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/10">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {openConflicts} open conflict{openConflicts === 1 ? "" : "s"} detected
              </p>
              <p className="text-xs text-muted-foreground">
                Switch to Deep View to see conflicting values across documents
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function StatTile({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string
  value: number
  icon: typeof UserRound
  color: string
}) {
  return (
    <div className="rounded-lg border p-3">
      <Icon className={`h-4 w-4 ${color}`} />
      <p className="mt-2 text-2xl font-bold leading-none">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
