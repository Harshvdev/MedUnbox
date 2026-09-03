"use client"

import { useState } from "react"
import { Loader2, Share2, Mail, Clock, ShieldCheck, CheckCircle2, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { DOCUMENT_CATEGORIES, SHARE_DURATIONS, categoryLabel } from "@/lib/constants"

interface CreatedShare {
  id: string
  accessCode: string
  doctor?: { name?: string | null; email?: string | null } | null
}

interface ShareDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
}

export function ShareDialog({ open, onOpenChange }: ShareDialogProps) {
  const qc = useQueryClient()
  const [doctorEmail, setDoctorEmail] = useState("")
  const [categories, setCategories] = useState<string[]>([])
  const [duration, setDuration] = useState<string>("SEVEN_DAYS")
  const [emailTouched, setEmailTouched] = useState(false)
  const [created, setCreated] = useState<CreatedShare | null>(null)

  const allSelected = categories.includes("ALL")

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(doctorEmail.trim())
  const emailError = emailTouched && doctorEmail.length > 0 && !emailValid

  function toggleCategory(value: string) {
    setCreated(null)
    if (value === "ALL") {
      // Toggling "All categories" on clears the rest; toggling off clears everything
      setCategories((prev) =>
        prev.includes("ALL") ? [] : ["ALL"]
      )
      return
    }
    setCategories((prev) => {
      const withoutAll = prev.filter((c) => c !== "ALL")
      if (withoutAll.includes(value)) {
        return withoutAll.filter((c) => c !== value)
      }
      return [...withoutAll, value]
    })
  }

  function reset() {
    setDoctorEmail("")
    setCategories([])
    setDuration("SEVEN_DAYS")
    setEmailTouched(false)
    setCreated(null)
  }

  function close() {
    reset()
    onOpenChange(false)
  }

  const createShare = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorEmail: doctorEmail.trim(),
          categories,
          duration,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to create share")
      return data as { ok: boolean; share: CreatedShare }
    },
    onSuccess: (data) => {
      toast.success("Share created — doctor has been granted access")
      setCreated(data.share)
      qc.invalidateQueries({ queryKey: ["shares"] })
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to create share")
    },
  })

  function submit() {
    setEmailTouched(true)
    if (!emailValid) {
      toast.error("Please enter a valid doctor email")
      return
    }
    if (categories.length === 0) {
      toast.error("Select at least one category or choose 'All categories'")
      return
    }
    createShare.mutate()
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code)
      toast.success("Access code copied")
    } catch {
      toast.error("Failed to copy code")
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) close()
        else onOpenChange(v)
      }}
    >
      <DialogContent className="max-w-lg max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-4 w-4 text-primary" /> Share with doctor
          </DialogTitle>
          <DialogDescription>
            Grant a doctor temporary, scoped access to your medical records. They must have a MedUnbox doctor account.
          </DialogDescription>
        </DialogHeader>

        {created ? (
          <div className="space-y-4 py-2">
            <div className="flex flex-col items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-center dark:border-emerald-900 dark:bg-emerald-950/40">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              <p className="font-medium text-emerald-900 dark:text-emerald-200">Access granted</p>
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                {created.doctor?.name ?? created.doctor?.email ?? "Doctor"} can now view the shared records in their dashboard.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Access code
              </Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded-md border bg-muted px-3 py-2 font-mono text-sm">
                  {created.accessCode}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyCode(created.accessCode)}
                  title="Copy access code"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Share this code with the doctor — they&apos;ll enter it on their dashboard to access your records.
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={close}>Done</Button>
              <Button variant="ghost" onClick={() => setCreated(null)}>
                Create another
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-5 py-2">
            {/* Doctor email */}
            <div className="space-y-1.5">
              <Label htmlFor="doctorEmail" className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Doctor&apos;s email
              </Label>
              <Input
                id="doctorEmail"
                type="email"
                inputMode="email"
                placeholder="doctor@hospital.com"
                value={doctorEmail}
                onChange={(e) => setDoctorEmail(e.target.value)}
                onBlur={() => setEmailTouched(true)}
                aria-invalid={!!emailError}
                autoComplete="email"
              />
              {emailError && (
                <p className="text-xs text-destructive">Please enter a valid email address</p>
              )}
            </div>

            <Separator />

            {/* Categories */}
            <div className="space-y-2">
              <Label className="flex items-center justify-between">
                <span>Categories to share</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {allSelected ? "Full access" : `${categories.length} selected`}
                </span>
              </Label>

              <label
                className="flex cursor-pointer items-center gap-2.5 rounded-md border border-primary/40 bg-primary/5 px-3 py-2 hover:bg-primary/10"
              >
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={() => toggleCategory("ALL")}
                />
                <div className="flex-1">
                  <span className="text-sm font-medium">All categories</span>
                  <p className="text-xs text-muted-foreground">Grant full access to every record</p>
                </div>
                <ShieldCheck className="h-4 w-4 text-primary" />
              </label>

              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {DOCUMENT_CATEGORIES.map((c) => {
                  const checked = !allSelected && categories.includes(c.value)
                  return (
                    <label
                      key={c.value}
                      className={`flex cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2 transition-colors ${
                        checked ? "border-primary/50 bg-primary/5" : "hover:bg-accent"
                      } ${allSelected ? "pointer-events-none opacity-50" : ""}`}
                    >
                      <Checkbox
                        checked={checked}
                        disabled={allSelected}
                        onCheckedChange={() => toggleCategory(c.value)}
                      />
                      <span className="text-sm">{c.label}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            <Separator />

            {/* Duration */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" /> Access duration
              </Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SHARE_DURATIONS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Access auto-expires at the end of this period. You can revoke at any time.
              </p>
            </div>

            {/* Summary */}
            {categories.length > 0 && (
              <div className="rounded-md bg-muted/50 p-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Summary
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {allSelected ? (
                    <Badge variant="default">All categories</Badge>
                  ) : (
                    categories.map((c) => (
                      <Badge key={c} variant="secondary">
                        {categoryLabel(c)}
                      </Badge>
                    ))
                  )}
                  <Badge variant="outline">
                    {SHARE_DURATIONS.find((d) => d.value === duration)?.label}
                  </Badge>
                </div>
              </div>
            )}
          </div>
        )}

        {!created && (
          <DialogFooter>
            <Button variant="outline" onClick={close}>Cancel</Button>
            <Button onClick={submit} disabled={createShare.isPending}>
              {createShare.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating…
                </>
              ) : (
                <>
                  <Share2 className="mr-2 h-4 w-4" /> Grant access
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
