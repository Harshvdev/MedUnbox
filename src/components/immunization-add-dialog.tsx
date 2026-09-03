"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Loader2, Syringe, CalendarPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
}

/**
 * Dialog for manually registering a vaccination / scheduling the next dose.
 *
 * Submitting creates a synthetic placeholder Document + MedicalEntity
 * (category=IMMUNIZATION) + VACCINATION TimelineEvent via POST /api/immunizations,
 * then refreshes the server-rendered immunizations page.
 */
export function ImmunizationAddDialog({ open, onOpenChange }: Props) {
  const router = useRouter()
  const qc = useQueryClient()

  const [vaccine, setVaccine] = useState("")
  const [doseNumber, setDoseNumber] = useState("")
  const [dateAdministered, setDateAdministered] = useState("")
  const [administeredBy, setAdministeredBy] = useState("")
  const [notes, setNotes] = useState("")
  const [touched, setTouched] = useState(false)

  function reset() {
    setVaccine("")
    setDoseNumber("")
    setDateAdministered("")
    setAdministeredBy("")
    setNotes("")
    setTouched(false)
  }

  function close() {
    reset()
    onOpenChange(false)
  }

  const vaccineValid = vaccine.trim().length > 0 && vaccine.trim().length <= 200
  const doseValid = doseNumber === "" || (/^\d+$/.test(doseNumber) && Number(doseNumber) >= 1 && Number(doseNumber) <= 50)

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        vaccine: vaccine.trim(),
        doseNumber: doseNumber ? Number(doseNumber) : null,
        dateAdministered: dateAdministered || null,
        administeredBy: administeredBy.trim() || null,
        notes: notes.trim() || null,
      }
      const res = await fetch("/api/immunizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Failed to save immunization")
      return data
    },
    onSuccess: () => {
      toast.success("Immunization recorded")
      qc.invalidateQueries({ queryKey: ["immunizations"] })
      close()
      router.refresh()
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to save immunization")
    },
  })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setTouched(true)
    if (!vaccineValid) {
      toast.error("Please enter a vaccine name")
      return
    }
    if (!doseValid) {
      toast.error("Dose number must be a whole number between 1 and 50")
      return
    }
    createMutation.mutate()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) close()
        else onOpenChange(v)
      }}
    >
      <DialogContent className="max-h-[88vh] overflow-y-auto max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Syringe className="h-4 w-4 text-primary" /> Schedule / Record a Dose
          </DialogTitle>
          <DialogDescription>
            Manually log a vaccination — for example, when scheduling your
            next dose or recording a shot that isn&apos;t in your uploaded
            documents.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          {/* Vaccine name */}
          <div className="space-y-1.5">
            <Label htmlFor="imm-vaccine">
              Vaccine name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="imm-vaccine"
              placeholder="e.g. Influenza, Hepatitis B, COVID-19 booster"
              value={vaccine}
              onChange={(e) => setVaccine(e.target.value)}
              aria-invalid={touched && !vaccineValid}
              maxLength={200}
            />
            {touched && !vaccineValid && (
              <p className="text-xs text-destructive">
                Vaccine name is required
              </p>
            )}
          </div>

          {/* Dose number + Date administered */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="imm-dose">Dose number</Label>
              <Input
                id="imm-dose"
                type="number"
                inputMode="numeric"
                min={1}
                max={50}
                placeholder="e.g. 1, 2, 3"
                value={doseNumber}
                onChange={(e) => setDoseNumber(e.target.value)}
                aria-invalid={touched && !doseValid}
              />
              {touched && !doseValid && (
                <p className="text-xs text-destructive">
                  Must be a whole number 1–50
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="imm-date">
                Date administered{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <Input
                id="imm-date"
                type="date"
                value={dateAdministered}
                onChange={(e) => setDateAdministered(e.target.value)}
              />
            </div>
          </div>

          {/* Administered by */}
          <div className="space-y-1.5">
            <Label htmlFor="imm-by">
              Administered by{" "}
              <span className="text-xs font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Input
              id="imm-by"
              placeholder="e.g. Dr. R. Sharma, City Health Clinic"
              value={administeredBy}
              onChange={(e) => setAdministeredBy(e.target.value)}
              maxLength={200}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="imm-notes">
              Notes{" "}
              <span className="text-xs font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Textarea
              id="imm-notes"
              placeholder="e.g. Next dose due in 6 months. Lot #ABC123."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={2000}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
                </>
              ) : (
                <>
                  <CalendarPlus className="mr-2 h-4 w-4" /> Record dose
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Header CTA: opens the immunization add dialog. Used by the immunizations
 * page header next to the title.
 */
export function ImmunizationAddButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)} className="shrink-0">
        <CalendarPlus className="h-4 w-4" /> Schedule Next Dose
      </Button>
      <ImmunizationAddDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
