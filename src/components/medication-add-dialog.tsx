"use client"

import { useEffect } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Loader2, Pill, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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

export const MEDICATION_FREQUENCIES = [
  { value: "OD", label: "OD — Once Daily" },
  { value: "BD", label: "BD — Twice Daily" },
  { value: "TDS", label: "TDS — Thrice Daily" },
  { value: "QDS", label: "QDS — Four Times Daily" },
  { value: "HS", label: "HS — At Night" },
  { value: "PRN", label: "PRN — As Needed" },
  { value: "Weekly", label: "Weekly" },
] as const

export const MEDICATION_ROUTES = [
  { value: "PO", label: "PO — Oral" },
  { value: "IV", label: "IV — Intravenous" },
  { value: "IM", label: "IM — Intramuscular" },
  { value: "SC", label: "SC — Subcutaneous" },
  { value: "Topical", label: "Topical" },
  { value: "Inhalation", label: "Inhalation" },
] as const

const schema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  dosage: z.string().max(100).optional(),
  frequency: z.string().optional().nullable(),
  route: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  notes: z.string().max(2000).optional(),
})

type FormValues = z.infer<typeof schema>

export interface MedicationFormData {
  id: string
  name: string
  dosage?: string | null
  frequency?: string | null
  route?: string | null
  startDate?: Date | string | null
  endDate?: Date | string | null
  notes?: string | null
  status?: string
}

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  /** When provided, the dialog operates in edit mode (PATCH). */
  medication?: MedicationFormData | null
}

function toInputDate(d?: Date | string | null): string {
  if (!d) return ""
  const date = typeof d === "string" ? new Date(d) : d
  if (isNaN(date.getTime())) return ""
  // toISOString() returns UTC; we want the calendar day as displayed.
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function MedicationAddDialog({ open, onOpenChange, medication }: Props) {
  const router = useRouter()
  const qc = useQueryClient()
  const isEdit = !!medication

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      dosage: "",
      frequency: null,
      route: null,
      startDate: null,
      endDate: null,
      notes: "",
    },
  })

  // Repopulate the form whenever the dialog opens or the medication prop
  // changes (so the same component instance can be reused for add + edit).
  useEffect(() => {
    if (!open) return
    reset({
      name: medication?.name ?? "",
      dosage: medication?.dosage ?? "",
      frequency: medication?.frequency ?? null,
      route: medication?.route ?? null,
      startDate: medication?.startDate ? toInputDate(medication.startDate) : null,
      endDate: medication?.endDate ? toInputDate(medication.endDate) : null,
      notes: medication?.notes ?? "",
    })
  }, [open, medication, reset])

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        name: values.name.trim(),
        dosage: values.dosage?.trim() || null,
        frequency: values.frequency || null,
        route: values.route || null,
        startDate: values.startDate || null,
        endDate: values.endDate || null,
        notes: values.notes?.trim() || null,
      }
      const url = isEdit ? `/api/medications/${medication!.id}` : "/api/medications"
      const method = isEdit ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to save medication")
      return data
    },
    onSuccess: () => {
      toast.success(isEdit ? "Medication updated" : "Medication added")
      qc.invalidateQueries({ queryKey: ["medications"] })
      onOpenChange(false)
      // Re-render the server component so the new/updated row appears
      router.refresh()
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to save medication")
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEdit ? (
              <Pencil className="h-4 w-4 text-primary" />
            ) : (
              <Pill className="h-4 w-4 text-primary" />
            )}
            {isEdit ? "Edit Medication" : "Add Medication Manually"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the details of this medication record."
              : "Manually add a medication to your records — useful for OTC drugs or prescriptions that aren't in your uploaded documents."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((v) => saveMutation.mutate(v))}
          className="space-y-4"
        >
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="med-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="med-name"
              placeholder="e.g. Metformin"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Dosage + Route */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="med-dosage">Dosage</Label>
              <Input
                id="med-dosage"
                placeholder="e.g. 500mg"
                {...register("dosage")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="med-route">Route</Label>
              <Controller
                control={control}
                name="route"
                render={({ field }) => (
                  <Select
                    value={field.value ?? undefined}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger id="med-route" className="w-full">
                      <SelectValue placeholder="Select route" />
                    </SelectTrigger>
                    <SelectContent>
                      {MEDICATION_ROUTES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* Frequency */}
          <div className="space-y-1.5">
            <Label htmlFor="med-freq">Frequency</Label>
            <Controller
              control={control}
              name="frequency"
              render={({ field }) => (
                <Select
                  value={field.value ?? undefined}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger id="med-freq" className="w-full">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    {MEDICATION_FREQUENCIES.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="med-start">Start date</Label>
              <Input id="med-start" type="date" {...register("startDate")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="med-end">
                End date{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <Input id="med-end" type="date" {...register("endDate")} />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="med-notes">Notes</Label>
            <Textarea
              id="med-notes"
              placeholder="e.g. Take with food. Refill by 15 Mar."
              {...register("notes")}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
                </>
              ) : isEdit ? (
                "Save changes"
              ) : (
                <>
                  <Pill className="mr-2 h-4 w-4" /> Add medication
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
