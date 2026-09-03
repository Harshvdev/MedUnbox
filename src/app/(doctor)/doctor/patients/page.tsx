import Link from "next/link"
import { getCurrentDoctor } from "@/lib/session"
import { db } from "@/lib/db"
import {
  Users,
  ArrowRight,
  Clock,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  formatDate,
  categoryLabel,
} from "@/lib/constants"
import { EmptyState } from "@/components/empty-state"
import { PatientListFilters } from "./patient-list-filters"

type StatusFilter = "active" | "expired" | "revoked" | "all"

interface ShareRow {
  id: string
  patientId: string
  createdAt: Date
  expiresAt: Date
  revokedAt: Date | null
  isActive: boolean
  duration: string
  scope: string
  categories: string[]
  documentIds: string[]
  patient: {
    id: string
    user: { name: string | null; email: string }
    dateOfBirth: Date | null
    gender: string | null
  }
}

function statusOf(share: {
  isActive: boolean
  revokedAt: Date | null
  expiresAt: Date
}): "active" | "expired" | "revoked" {
  if (share.revokedAt) return "revoked"
  if (!share.isActive || share.expiresAt <= new Date()) return "expired"
  return "active"
}

export default async function DoctorPatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>
}) {
  const doctor = await getCurrentDoctor()
  if (!doctor) return null

  const sp = await searchParams
  const q = (sp.q ?? "").trim().toLowerCase()
  const status = (sp.status ?? "active") as StatusFilter

  // Fetch all shares for this doctor — we'll filter in memory because the
  // status is a derived field (active vs expired vs revoked). The list is
  // bounded by # of patients a single doctor interacts with.
  const allShares: ShareRow[] = await db.share.findMany({
    where: { doctorId: doctor.id },
    include: {
      patient: {
        include: { user: { select: { name: true, email: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  const now = new Date()
  const filtered = allShares.filter((s) => {
    const st =
      s.revokedAt
        ? "revoked"
        : !s.isActive || s.expiresAt <= now
        ? "expired"
        : "active"
    if (status !== "all" && st !== status) return false
    if (q) {
      const name = (s.patient.user.name ?? "").toLowerCase()
      const email = s.patient.user.email.toLowerCase()
      if (!name.includes(q) && !email.includes(q)) return false
    }
    return true
  })

  const counts = {
    active: allShares.filter((s) => !s.revokedAt && s.isActive && s.expiresAt > now).length,
    expired: allShares.filter((s) => !s.revokedAt && (!s.isActive || s.expiresAt <= now)).length,
    revoked: allShares.filter((s) => s.revokedAt !== null).length,
    all: allShares.length,
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Patients</h1>
          <p className="text-muted-foreground">
            Patients who have shared their records with you
          </p>
        </div>
      </div>

      <PatientListFilters
        initialQuery={sp.q ?? ""}
        initialStatus={status}
        counts={counts}
      />

      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-0">
            <EmptyState
              icon={Users}
              title={q || status !== "active" ? "No matching patients" : "No active patient shares"}
              description={
                q || status !== "active"
                  ? "Try adjusting your search or filter"
                  : "When a patient shares their records with you, they will appear here"
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((share) => {
            const st = statusOf(share)
            return (
              <Card key={share.id} className="transition-shadow hover:shadow-sm">
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {(share.patient.user.name ?? share.patient.user.email ?? "P")
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                    <Link
                      href={`/doctor/patients/${share.patientId}`}
                      className="min-w-0 flex-1"
                    >
                      <p className="truncate font-medium hover:underline">
                        {share.patient.user.name ?? share.patient.user.email}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {share.patient.user.email}
                      </p>
                    </Link>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                    <div className="flex flex-wrap gap-1">
                      {share.categories.length === 0 ? (
                        <Badge variant="outline" className="text-[10px]">
                          No categories
                        </Badge>
                      ) : (
                        share.categories.slice(0, 3).map((c) => (
                          <Badge key={c} variant="secondary" className="text-[10px]">
                            {categoryLabel(c)}
                          </Badge>
                        ))
                      )}
                      {share.categories.length > 3 && (
                        <Badge variant="outline" className="text-[10px]">
                          +{share.categories.length - 3}
                        </Badge>
                      )}
                    </div>

                    <StatusBadge status={st} />

                    <div className="flex items-center gap-1 text-xs text-muted-foreground min-w-[120px]">
                      <Clock className="h-3 w-3" />
                      {st === "active"
                        ? share.duration === "UNTIL_REVOKED"
                          ? "Until revoked"
                          : `Expires ${formatDate(share.expiresAt)}`
                        : st === "expired"
                        ? `Expired ${formatDate(share.expiresAt)}`
                        : `Revoked ${formatDate(share.revokedAt!)}`}
                    </div>

                    <Button
                      size="sm"
                      variant={st === "active" ? "outline" : "ghost"}
                      disabled={st !== "active"}
                      asChild={st === "active"}
                    >
                      {st === "active" ? (
                        <Link href={`/doctor/patients/${share.patientId}`}>
                          View <ArrowRight className="ml-1 h-3.5 w-3.5" />
                        </Link>
                      ) : (
                        <span>View</span>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: "active" | "expired" | "revoked" }) {
  const map = {
    active: { label: "Active", variant: "default" as const, className: "" },
    expired: { label: "Expired", variant: "outline" as const, className: "text-amber-600" },
    revoked: { label: "Revoked", variant: "outline" as const, className: "text-destructive" },
  }
  const m = map[status]
  return (
    <Badge variant={m.variant} className={`text-[10px] ${m.className}`}>
      {m.label}
    </Badge>
  )
}
