"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2, Pin, PinOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"

const schema = z.object({
  note: z.string().min(1, "Note is required").max(5000),
  category: z.enum(["general", "follow_up", "referral", "alert"]),
  isPinned: z.boolean(),
})

type FormValues = z.infer<typeof schema>

const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "follow_up", label: "Follow-up" },
  { value: "referral", label: "Referral" },
  { value: "alert", label: "Alert" },
]

interface ClinicalNote {
  id: string
  note: string
  category: string
  isPinned: boolean
}

export function DoctorNoteDialog({
  open,
  onOpenChange,
  patientId,
  note,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  patientId: string
  note?: ClinicalNote | null
}) {
  const isEdit = !!note
  const qc = useQueryClient()
  const [isPin, setIsPin] = useState(note?.isPinned ?? false)

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      note: note?.note ?? "",
      category: (note?.category as any) ?? "general",
      isPinned: note?.isPinned ?? false,
    },
  })

  const category = watch("category")

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = { ...values, isPinned: isPin, patientId }
      const url = isEdit ? `/api/doctor/notes/${note!.id}` : "/api/doctor/notes"
      const method = isEdit ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to save note")
      return data
    },
    onSuccess: () => {
      toast.success(isEdit ? "Note updated" : "Note added")
      qc.invalidateQueries({ queryKey: ["doctor-notes", patientId] })
      reset()
      setIsPin(false)
      onOpenChange(false)
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to save"),
  })

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v) }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Note" : "Add Clinical Note"}</DialogTitle>
          <DialogDescription>
            Record your clinical observations about this patient. Notes are only visible to you.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit((v) => saveMutation.mutate(v))} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="note-content">Note</Label>
            <Textarea
              id="note-content"
              placeholder="Enter your clinical observation..."
              className="min-h-[120px]"
              {...register("note")}
            />
            {errors.note && <p className="text-xs text-destructive">{errors.note.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setValue("category", v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Pin to top</Label>
              <div className="flex h-9 items-center gap-2 rounded-lg border px-3">
                <Switch
                  checked={isPin}
                  onCheckedChange={setIsPin}
                />
                <span className="text-sm text-muted-foreground">
                  {isPin ? <span className="flex items-center gap-1"><Pin className="h-3 w-3" /> Pinned</span> : "Not pinned"}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isEdit ? "Update" : "Add Note"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
