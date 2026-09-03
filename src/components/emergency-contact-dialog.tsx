"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Loader2, Siren, Pencil, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const RELATION_OPTIONS = [
  "Spouse",
  "Parent",
  "Child",
  "Sibling",
  "Other Relative",
  "Friend",
  "Neighbor",
  "Caregiver",
  "Doctor",
  "Other",
] as const

const schema = z.object({
  contactName: z.string().min(1, "Contact name is required").max(120),
  contactRelation: z.string().min(1, "Relation is required").max(80),
  contactPhone: z.string().max(40).optional().or(z.literal("")),
  contactEmail: z
    .string()
    .email("Enter a valid email")
    .max(160)
    .optional()
    .or(z.literal("")),
})

type FormValues = z.infer<typeof schema>

export interface EmergencyContactFormData {
  id: string
  contactName: string
  contactRelation: string
  contactPhone?: string | null
  contactEmail?: string | null
}

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  /** When provided, the dialog operates in edit mode (PATCH). */
  contact?: EmergencyContactFormData | null
}

export function EmergencyContactDialog({ open, onOpenChange, contact }: Props) {
  const router = useRouter()
  const qc = useQueryClient()
  const isEdit = !!contact

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      contactName: "",
      contactRelation: "",
      contactPhone: "",
      contactEmail: "",
    },
  })

  // Repopulate the form whenever the dialog opens or the contact prop changes.
  useEffect(() => {
    if (!open) return
    reset({
      contactName: contact?.contactName ?? "",
      contactRelation: contact?.contactRelation ?? "",
      contactPhone: contact?.contactPhone ?? "",
      contactEmail: contact?.contactEmail ?? "",
    })
  }, [open, contact, reset])

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        contactName: values.contactName.trim(),
        contactRelation: values.contactRelation.trim(),
        contactPhone: values.contactPhone?.trim() || null,
        contactEmail: values.contactEmail?.trim() || null,
      }
      const url = isEdit
        ? `/api/emergency-access/${contact!.id}`
        : "/api/emergency-access"
      const method = isEdit ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to save contact")
      return data
    },
    onSuccess: () => {
      toast.success(isEdit ? "Emergency contact updated" : "Emergency contact added")
      qc.invalidateQueries({ queryKey: ["emergency-access"] })
      onOpenChange(false)
      // Re-render the server component so the new/updated row appears.
      router.refresh()
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to save emergency contact")
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
              <Siren className="h-4 w-4 text-primary" />
            )}
            {isEdit ? "Edit Emergency Contact" : "Add Emergency Contact"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this emergency contact's details. The access code stays the same."
              : "Designate someone who can access your critical medical info via a special code — useful for first responders."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((v) => saveMutation.mutate(v))}
          className="space-y-4"
        >
          {/* Contact name */}
          <div className="space-y-1.5">
            <Label htmlFor="ec-name">
              Contact name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="ec-name"
              placeholder="e.g. Dr. Anita Rao or Spouse — Priya"
              aria-invalid={!!errors.contactName}
              {...register("contactName")}
            />
            {errors.contactName && (
              <p className="text-xs text-destructive">{errors.contactName.message}</p>
            )}
          </div>

          {/* Relation */}
          <div className="space-y-1.5">
            <Label htmlFor="ec-relation">
              Relation <span className="text-destructive">*</span>
            </Label>
            <Input
              id="ec-relation"
              list="ec-relation-list"
              placeholder="e.g. Spouse, Doctor, Neighbor"
              aria-invalid={!!errors.contactRelation}
              {...register("contactRelation")}
            />
            <datalist id="ec-relation-list">
              {RELATION_OPTIONS.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
            {errors.contactRelation && (
              <p className="text-xs text-destructive">{errors.contactRelation.message}</p>
            )}
          </div>

          {/* Phone + Email */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ec-phone">Phone</Label>
              <Input
                id="ec-phone"
                type="tel"
                placeholder="+91 98765 43210"
                {...register("contactPhone")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ec-email">Email</Label>
              <Input
                id="ec-email"
                type="email"
                placeholder="contact@example.com"
                aria-invalid={!!errors.contactEmail}
                {...register("contactEmail")}
              />
              {errors.contactEmail && (
                <p className="text-xs text-destructive">{errors.contactEmail.message}</p>
              )}
            </div>
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
                  <UserPlus className="mr-2 h-4 w-4" /> Add contact
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
 * Header CTA: opens the contact add dialog. Designed to drop into the
 * server-rendered emergency page header next to the title.
 */
export function EmergencyContactAddButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)} className="shrink-0">
        <UserPlus className="h-4 w-4" /> Add Contact
      </Button>
      <EmergencyContactDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
