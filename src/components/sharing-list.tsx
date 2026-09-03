"use client"

import { useState } from "react"
import {
  Share2,
  Loader2,
  Copy,
  Ban,
  Mail,
  Stethoscope,
  Building2,
  ShieldCheck,
  ShieldAlert,
  Clock,
  CalendarClock,
  CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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
import { ShareDialog } from "@/components/share-dialog"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  categoryLabel,
  shareDurationLabel,
  formatDateTime,
  timeAgo,
} from "@/lib/constants"

interface ShareDoctor {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
  specialization?: string | null
  hospital?: string | null
}

interface ShareItem {
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
  doctor: ShareDoctor | null
  _count?: { aiQueries?: number }
}

function computeStatus(
  share: Pick<ShareItem, "isActive" | "revokedAt" | "expiresAt">
): "active" | "expired" | "revoked" {
  if (share.revokedAt || !share.isActive) return "revoked"
  if (new Date(share.expiresAt).getTime() < Date.now()) return "expired"
  return "active"
}

export function SharingList({ initialShares }: { initialShares: ShareItem[] }) {
  const qc = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [revokeTarget, setRevokeTarget] = useState<ShareItem | null>(null)
  const [search, setSearch] = useState("")

  const { data, isLoading } = useQuery<{ shares: ShareItem[] }>({
    queryKey: ["shares"],
    queryFn: () => fetch("/api/share").then((r) => r.json()),
    initialData: { shares: initialShares },
  })

  const shares = data?.shares ?? initialShares

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
      toast.success("Share revoked — doctor no longer has access")
      qc.invalidateQueries({ queryKey: ["shares"] })
      setRevokeTarget(null)
    },
    onError: (err: Error) => toast.error(err.message || "Failed to revoke share"),
  })

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code)
      toast.success("Access code copied")
    } catch {
      toast.error("Failed to copy code")
    }
  }

  const filtered = shares.filter((s) => {
    if (!search) return true
    const q = search.toLowerCase()
    const doc = s.doctor
    return (
      (doc?.name?.toLowerCase().includes(q) ?? false) ||
      (doc?.email?.toLowerCase().includes(q) ?? false) ||
      (doc?.specialization?.toLowerCase().includes(q) ?? false) ||
      s.accessCode.toLowerCase().includes(q)
    )
  })

  const activeCount = shares.filter((s) => computeStatus(s) === "active").length

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sharing</h1>
          <p className="text-muted-foreground">
            Control which doctors can access your records — and for how long.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Share2 className="mr-2 h-4 w-4" /> Share with doctor
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950/60">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold">{activeCount}</p>
            <p className="text-sm text-muted-foreground">Active shares</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Share2 className="h-4 w-4 text-primary" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold">{shares.length}</p>
            <p className="text-sm text-muted-foreground">Total shares</p>
          </CardContent>
        </Card>
        <Card className="col-span-2 sm:col-span-1">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950/60">
                <ShieldAlert className="h-4 w-4 text-amber-600" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold">
              {shares.filter((s) => computeStatus(s) === "revoked").length}
            </p>
            <p className="text-sm text-muted-foreground">Revoked</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      {shares.length > 0 && (
        <Input
          placeholder="Search by doctor name, email, or access code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
      )}

      {/* List */}
      {isLoading && shares.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : shares.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-0">
            <EmptyState
              icon={Share2}
              title="No shares yet"
              description="Grant a doctor temporary, scoped access to your medical records."
              action={
                <Button onClick={() => setDialogOpen(true)}>
                  <Share2 className="mr-2 h-4 w-4" /> Share with doctor
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-0">
            <EmptyState icon={Share2} title="No matches" description="Try a different search" />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((share) => (
            <ShareCard
              key={share.id}
              share={share}
              onCopyCode={copyCode}
              onRevoke={() => setRevokeTarget(share)}
            />
          ))}
        </div>
      )}

      <ShareDialog open={dialogOpen} onOpenChange={setDialogOpen} />

      {/* Revoke confirmation */}
      <AlertDialog
        open={!!revokeTarget}
        onOpenChange={(v) => !v && setRevokeTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke this share?</AlertDialogTitle>
            <AlertDialogDescription>
              {revokeTarget?.doctor
                ? `Dr. ${revokeTarget.doctor.name ?? revokeTarget.doctor.email ?? "the doctor"} will immediately lose access to your records. This cannot be undone.`
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

function ShareCard({
  share,
  onCopyCode,
  onRevoke,
}: {
  share: ShareItem
  onCopyCode: (code: string) => void
  onRevoke: () => void
}) {
  const status = computeStatus(share)
  const doctor = share.doctor
  const isFull = share.scope === "FULL" || share.categories.includes("ALL")
  const visibleCategories = isFull ? ["ALL"] : share.categories
  const aiQueryCount = share._count?.aiQueries ?? 0

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-sm">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          {/* Doctor avatar */}
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Stethoscope className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            {/* Doctor info + status */}
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {doctor?.name ? `Dr. ${doctor.name}` : "Unknown doctor"}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {doctor?.email && (
                    <span className="inline-flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      <span className="truncate">{doctor.email}</span>
                    </span>
                  )}
                  {doctor?.specialization && (
                    <span className="inline-flex items-center gap-1">
                      <Stethoscope className="h-3 w-3" />
                      {doctor.specialization}
                    </span>
                  )}
                  {doctor?.hospital && (
                    <span className="inline-flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {doctor.hospital}
                    </span>
                  )}
                </div>
              </div>
              <StatusBadge status={status} />
            </div>

            {/* Categories */}
            <div className="flex flex-wrap gap-1.5">
              {isFull ? (
                <Badge variant="default" className="bg-emerald-600 text-white">
                  <ShieldCheck className="mr-1 h-3 w-3" /> Full access (all categories)
                </Badge>
              ) : (
                visibleCategories.map((c) => (
                  <Badge key={c} variant="secondary">
                    {categoryLabel(c)}
                  </Badge>
                ))
              )}
              {share.documentIds.length > 0 && (
                <Badge variant="outline">
                  {share.documentIds.length} document{share.documentIds.length === 1 ? "" : "s"}
                </Badge>
              )}
            </div>

            {/* Meta */}
            <div className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-xs text-muted-foreground sm:grid-cols-2">
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
                    : `Expires ${formatDateTime(share.expiresAt)}`}
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Created {timeAgo(share.createdAt)}</span>
              </span>
              {aiQueryCount > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <Share2 className="h-3.5 w-3.5" />
                  <span>{aiQueryCount} AI quer{aiQueryCount === 1 ? "y" : "ies"}</span>
                </span>
              )}
            </div>

            {/* Access code */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
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
          </div>
        </div>

        {/* Actions */}
        {status === "active" && (
          <div className="mt-4 flex justify-end border-t pt-3">
            <Button variant="outline" size="sm" onClick={onRevoke} className="text-destructive">
              <Ban className="mr-2 h-3.5 w-3.5" /> Revoke access
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function StatusBadge({ status }: { status: "active" | "expired" | "revoked" }) {
  if (status === "active") {
    return (
      <Badge className="bg-emerald-600 text-white">
        <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-white" /> Active
      </Badge>
    )
  }
  if (status === "expired") {
    return <Badge className="bg-amber-500 text-white">Expired</Badge>
  }
  return <Badge variant="secondary">Revoked</Badge>
}
