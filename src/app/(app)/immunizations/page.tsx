import { getCurrentPatient } from "@/lib/session"
import { db } from "@/lib/db"
import { Syringe, Calendar, User, Building2, Hash, AlertCircle, CheckCircle2, Clock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { EmptyState } from "@/components/empty-state"
import Link from "next/link"
import { Upload } from "lucide-react"
import { formatDate } from "@/lib/constants"
import { ImmunizationAddButton } from "@/components/immunization-add-dialog"

export default async function ImmunizationsPage() {
  const patient = await getCurrentPatient()
  if (!patient) return null

  // Fetch immunization entities
  const immunizations = await db.medicalEntity.findMany({
    where: {
      category: "IMMUNIZATION",
      document: { patientId: patient.id },
    },
    include: {
      document: { select: { id: true, title: true, uploadedAt: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  // Parse the rawText to extract details (format: "Vaccine (Dose N) on YYYY-MM-DD by Doctor")
  const parsed = immunizations.map((imm) => {
    const vaccine = imm.entityLabel.replace(/^Vaccination:\s*/i, "")
    const doseMatch = imm.rawText.match(/\(Dose (\d+)\)/)
    const dateMatch = imm.rawText.match(/on (\d{4}-\d{2}-\d{2})/)
    const byMatch = imm.rawText.match(/by (.+)$/)
    return {
      id: imm.id,
      vaccine,
      dose: doseMatch ? parseInt(doseMatch[1]) : null,
      dateAdministered: dateMatch ? dateMatch[1] : null,
      administeredBy: byMatch ? byMatch[1] : null,
      document: imm.document,
      createdAt: imm.createdAt,
    }
  })

  // Group by vaccine
  const byVaccine = new Map<string, typeof parsed>()
  for (const p of parsed) {
    const arr = byVaccine.get(p.vaccine) ?? []
    arr.push(p)
    byVaccine.set(p.vaccine, arr)
  }

  // Check for upcoming/recent (within 30 days)
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const recentCount = parsed.filter(
    (p) => p.dateAdministered && new Date(p.dateAdministered) > thirtyDaysAgo
  ).length

  // Stats
  const totalDoses = parsed.length
  const uniqueVaccines = byVaccine.size

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="flex items-center gap-1.5 text-sm font-medium text-primary">
            <Syringe className="h-4 w-4" /> Immunization Records
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Vaccination History</h1>
          <p className="text-sm text-muted-foreground">
            Track your immunizations and vaccination schedule over time
          </p>
        </div>
        <ImmunizationAddButton />
      </div>

      {parsed.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-0">
            <EmptyState
              icon={Syringe}
              title="No immunizations recorded"
              description="Upload vaccination certificates or medical records — or manually schedule your next dose — to see them here."
              action={
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <ImmunizationAddButton />
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
          <div className="grid grid-cols-3 gap-3">
            <StatCard
              icon={Syringe}
              label="Total Doses"
              value={totalDoses}
              tone="primary"
            />
            <StatCard
              icon={CheckCircle2}
              label="Unique Vaccines"
              value={uniqueVaccines}
              tone="emerald"
            />
            <StatCard
              icon={Clock}
              label="Recent (30d)"
              value={recentCount}
              tone="amber"
            />
          </div>

          {/* Vaccination cards grouped by vaccine */}
          <div className="space-y-4">
            {Array.from(byVaccine.entries())
              .sort((a, b) => b[1].length - a[1].length)
              .map(([vaccine, doses]) => {
                const sortedDoses = doses.sort((a, b) => {
                  if (!a.dateAdministered) return 1
                  if (!b.dateAdministered) return -1
                  return new Date(b.dateAdministered).getTime() - new Date(a.dateAdministered).getTime()
                })
                const latest = sortedDoses[0]
                const latestDate = latest.dateAdministered ? new Date(latest.dateAdministered) : null
                const isRecent = latestDate && latestDate > thirtyDaysAgo

                return (
                  <Card key={vaccine} className={`border-border/60 ${isRecent ? "border-l-4 border-l-emerald-500" : ""}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                            <Syringe className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{vaccine}</CardTitle>
                            <CardDescription className="text-xs">
                              {doses.length} dose{doses.length === 1 ? "" : "s"} administered
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant="outline" className="text-xs">
                            {doses.length} dose{doses.length === 1 ? "" : "s"}
                          </Badge>
                          {isRecent && (
                            <Badge className="text-xs bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10">
                              Recent
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {sortedDoses.map((dose) => (
                        <div key={dose.id} className="rounded-lg border border-border/50 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {dose.dose && (
                                <Badge variant="secondary" className="text-xs">
                                  Dose {dose.dose}
                                </Badge>
                              )}
                              <span className="text-sm font-medium">
                                {dose.dateAdministered ? formatDate(dose.dateAdministered) : "Date unknown"}
                              </span>
                            </div>
                            <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                              <Link href={`/documents/${dose.document.id}`}>
                                Source <Upload className="ml-1 h-3 w-3" />
                              </Link>
                            </Button>
                          </div>
                          {dose.administeredBy && (
                            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                              <User className="h-3 w-3" /> Administered by {dose.administeredBy}
                            </p>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )
              })}
          </div>

          {/* Disclaimer */}
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="flex items-start gap-2 p-4 text-sm">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div>
                <p className="font-medium text-amber-700 dark:text-amber-500">Auto-extracted records</p>
                <p className="text-muted-foreground">
                  Vaccination data is automatically extracted from your uploaded documents.
                  Always confirm with your healthcare provider that your immunization records are complete and up-to-date.
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number; tone: "primary" | "emerald" | "amber" }) {
  const colorMap = {
    primary: "bg-primary/10 text-primary",
    emerald: "bg-emerald-500/10 text-emerald-600",
    amber: "bg-amber-500/10 text-amber-600",
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
