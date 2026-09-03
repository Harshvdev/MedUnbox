"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Users,
  Loader2,
  Copy,
  Ban,
  Mail,
  Stethoscope,
  Building2,
  ShieldCheck,
  Clock,
  CalendarClock,
  Share2,
  Eye,
  type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { EmptyState } from "@/components/empty-state"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  categoryLabel,
  shareDurationLabel,
  formatDate,
  timeAgo,
} from "@/lib/constants"

interface CareTeamDoctor {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
  specialization?: string | null
  hospital?: string | null
}

interface CareTeamShare {
  id: string
  accessCode: string
  scope: string
  duration: string
  categories: string[]
  documentIds: string[]
  isActive: boolean
  expiresAt: string
  revokedAt: string | null
  createdAt: string
  doctor: CareTeamDoctor | null
}

type ShareStatus = "active" | "expired" | "revoked"

function computeStatus(
  share: Pick<CareTeamShare, "isActive" | "revokedAt" | "expiresAt">
): ShareStatus {
  if (share.revokedAt || !share.isActive) return "revoked"
  if (new Date(share.expiresAt).getTime() < Date.now()) return "expired"
  return "active"
}

function getInitials(name?: string | null): string {
  if (!name) return "DR"
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "DR"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function CareTeam({ initialShares }: { initialShares: CareTeamShare[] }) {
  const router = useRouter()
  const qc = useQueryClient()
  const [revokeTarget, setRevokeTarget] = useState<CareTeamShare | null>(null)

  const revoke = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/share/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke" }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to revoke")
      return data
    },
    onSuccess: () => {
      toast.success("Access revoked — doctor no longer has access")
      qc.invalidateQueries({ queryKey: ["shares"] })
      setRevokeTarget(null)
      router.refresh()
    },
    onError: (err: Error) => toast.error(err.message || "Failed to revoke access"),
  })

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code)
      toast.success("Access code copied")
    } catch {
      toast.error("Failed to copy code")
    }
  }

  // Group shares by computed status
  const grouped: Record<ShareStatus, CareTeamShare[]> = {
    active: [],
    expired: [],
    revoked: [],
  }
  for (const s of initialShares) {
    grouped[computeStatus(s)].push(s)
  }

  // Stats — unique doctors, active access, total shared category grants
  const uniqueDoctorIds = new Set(
    initialShares.map((s) => s.doctor?.id).filter(Boolean) as string[]
  )
  const totalDoctors = uniqueDoctorIds.size
  const activeCount = grouped.active.length
  const totalSharedCategories = initialShares.reduce((sum, s) => {
    if (s.scope === "FULL" || s.categories.includes("ALL")) return sum + 1
    return sum + s.categories.length
  }, 0)

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <p className="flex items-center gap-1.5 text-sm font-medium text-primary">
          <Users className="h-4 w-4" /> Your Care Team
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Care Team</h1>
        <p className="text-sm text-muted-foreground">
          Every doctor who has — or has had — access to your medical records
        </p>
      </div>

      {/* Stats */}
      {initialShares.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            icon={Users}
            color="bg-primary/10 text-primary"
            value={totalDoctors}
            label="Total doctors"
          />
          <StatCard
            icon={ShieldCheck}
            color="bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300"
            value={activeCount}
            label="Active access"
          />
          <StatCard
            icon={Share2}
            color="bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300"
            value={totalSharedCategories}
            label="Shared categories"
          />
        </div>
      )}

      {/* List / empty state */}
      {initialShares.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-0">
            <EmptyState
              icon={Users}
              title="No doctors in your care team yet"
              description="Share your records with a doctor to add them to your care team. You'll see them here with full access history."
              action={
                <Button asChild>
                  <Link href="/sharing">
                    <Share2 className="mr-2 h-4 w-4" /> Share records
                  </Link>
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          <Section
            title="Active"
            description="Doctors with current access to your records"
            icon={ShieldCheck}
            iconClass="text-emerald-600"
            shares={grouped.active}
            onRevoke={setRevokeTarget}
            onCopyCode={copyCode}
          />
          <Section
            title="Expired"
            description="Access periods that have lapsed — no longer active"
            icon={Clock}
            iconClass="text-amber-600"
            shares={grouped.expired}
            onRevoke={setRevokeTarget}
            onCopyCode={copyCode}
          />
          <Section
            title="Revoked"
            description="Access you have intentionally withdrawn"
            icon={Ban}
            iconClass="text-muted-foreground"
            shares={grouped.revoked}
            onRevoke={setRevokeTarget}
            onCopyCode={copyCode}
          />
        </div>
      )}

      {/* Revoke confirmation */}
      <AlertDialog
        open={!!revokeTarget}
        onOpenChange={(v) => !v && setRevokeTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke this access?</AlertDialogTitle>
            <AlertDialogDescription>
              {revokeTarget?.doctor
                ? `Dr. ${revokeTarget.doctor.name ?? revokeTarget.doctor.email ?? "the doctor"} will immediately lose access to your records. They will be moved to the "Revoked" section below. This cannot be undone.`
                : "The doctor will immediately lose access to your records. This cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revoke.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={revoke.isPending}
              onClick={(e) => {
                e.preventDefault()
                if (revokeTarget) revoke.mutate(revokeTarget.id)
              }}
            >
              {revoke.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Revoking…
                </>
              ) : (
                <>
                  <Ban className="mr-2 h-4 w-4" /> Revoke access
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function StatCard({
  icon: Icon,
  color,
  value,
  label,
}: {
  icon: LucideIcon
  color: string
  value: number
  label: string
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
        <p className="mt-2 text-2xl font-bold leading-none">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  )
}

function Section({
  title,
  description,
  icon: Icon,
  iconClass,
  shares,
  onRevoke,
  onCopyCode,
}: {
  title: string
  description: string
  icon: LucideIcon
  iconClass: string
  shares: CareTeamShare[]
  onRevoke: (s: CareTeamShare) => void
  onCopyCode: (code: string) => void
}) {
  if (shares.length === 0) return null
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Icon className={`h-4 w-4 ${iconClass}`} />
        <h2 className="text-sm font-semibold uppercase tracking-wide">{title}</h2>
        <Badge variant="secondary" className="text-xs">{shares.length}</Badge>
      </div>
      <p className="text-xs text-muted-foreground -mt-1">{description}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {shares.map((share) => (
          <DoctorCard
            key={share.id}
            share={share}
            onRevoke={() => onRevoke(share)}
            onCopyCode={onCopyCode}
          />
        ))}
      </div>
    </section>
  )
}

function DoctorCard({
  share,
  onRevoke,
  onCopyCode,
}: {
  share: CareTeamShare
  onRevoke: () => void
  onCopyCode: (code: string) => void
}) {
  const status = computeStatus(share)
  const doctor = share.doctor
  const isFull = share.scope === "FULL" || share.categories.includes("ALL")
  const visibleCategories = isFull ? [] : share.categories

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-sm">
      <CardContent className="p-4 sm:p-5 space-y-3">
        {/* Doctor info */}
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-xs font-bold text-primary-foreground">
            {getInitials(doctor?.name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="truncate font-medium leading-tight">
                {doctor?.name ? `Dr. ${doctor.name}` : "Unknown doctor"}
              </p>
              <StatusBadge status={status} />
            </div>
            {doctor?.email && (
              <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Mail className="h-3 w-3 shrink-0" />
                <span className="truncate">{doctor.email}</span>
              </div>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {doctor?.specialization && (
                <span className="inline-flex items-center gap-1">
                  <Stethoscope className="h-3 w-3 shrink-0" />
                  {doctor.specialization}
                </span>
              )}
              {doctor?.hospital && (
                <span className="inline-flex items-center gap-1">
                  <Building2 className="h-3 w-3 shrink-0" />
                  {doctor.hospital}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Categories shared */}
        {isFull ? (
          <div className="flex flex-wrap gap-1.5">
            <Badge className="bg-emerald-600 text-white">
              <ShieldCheck className="mr-1 h-3 w-3" /> Full access (all categories)
            </Badge>
          </div>
        ) : visibleCategories.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {visibleCategories.map((c) => (
              <Badge key={c} variant="secondary" className="text-xs">
                {categoryLabel(c)}
              </Badge>
            ))}
          </div>
        ) : null}

        {/* Meta — duration + expiry */}
        <div className="grid grid-cols-1 gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>Duration: {shareDurationLabel(share.duration)}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarClock className="h-3.5 w-3.5" />
            <span>
              {status === "revoked"
                ? `Revoked ${timeAgo(share.revokedAt!)}`
                : status === "expired"
                ? `Expired ${timeAgo(share.expiresAt)}`
                : `Expires ${formatDate(share.expiresAt)}`}
            </span>
          </span>
        </div>

        {/* Access code */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Access code
          </span>
          <code className="rounded border bg-muted px-2 py-0.5 font-mono text-xs">
            {share.accessCode}
          </code>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 px-2 text-xs"
            onClick={() => onCopyCode(share.accessCode)}
            title="Copy access code"
          >
            <Copy className="h-3 w-3" /> Copy
          </Button>
        </div>

        {/* Actions — always visible (not hover-gated) */}
        <div className="flex items-center justify-between gap-2 border-t pt-3">
          <Button asChild variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
            <Link href="/sharing">
              <Eye className="h-3.5 w-3.5" /> View Details
            </Link>
          </Button>
          {status === "active" && (
            <Button variant="outline" size="sm" onClick={onRevoke} className="h-8 text-destructive">
              <Ban className="mr-2 h-3.5 w-3.5" /> Revoke Access
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function StatusBadge({ status }: { status: ShareStatus }) {
  if (status === "active") {
    return (
      <Badge className="bg-emerald-600 text-white shrink-0">
        <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-white" /> Active
      </Badge>
    )
  }
  if (status === "expired") {
    return <Badge className="bg-amber-500 text-white shrink-0">Expired</Badge>
  }
  return <Badge variant="secondary" className="shrink-0">Revoked</Badge>
}
