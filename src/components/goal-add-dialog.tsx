"use client"

import { useEffect } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Loader2, Target, Pencil } from "lucide-react"
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

export const GOAL_TYPES = [
  { value: "MEDICATION_ADHERENCE", label: "Medication Adherence" },
  { value: "LAB_TARGET", label: "Lab Target" },
  { value: "LIFESTYLE", label: "Lifestyle" },
  { value: "APPOINTMENT", label: "Appointment" },
  { value: "CUSTOM", label: "Custom" },
] as const

const schema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  type: z.enum([
    "MEDICATION_ADHERENCE",
    "LAB_TARGET",
    "LIFESTYLE",
    "APPOINTMENT",
    "CUSTOM",
  ]),
  description: z.string().max(2000).optional(),
  targetValue: z.string().max(200).optional(),
  currentValue: z.string().max(200).optional(),
  dueDate: z.string().optional().nullable(),
})

type FormValues = z.infer<typeof schema>

export interface GoalFormData {
  id: string
  title: string
  type: string
  description?: string | null
  targetValue?: string | null
  currentValue?: string | null
  status: string
  dueDate?: Date | string | null
}

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  /** When provided, the dialog operates in edit mode (PATCH). */
  goal?: GoalFormData | null
}

function toInputDate(d?: Date | string | null): string {
  if (!d) return ""
  const date = typeof d === "string" ? new Date(d) : d
  if (isNaN(date.getTime())) return ""
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function GoalAddDialog({ open, onOpenChange, goal }: Props) {
  const router = useRouter()
  const qc = useQueryClient()
  const isEdit = !!goal

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      type: "CUSTOM",
      description: "",
      targetValue: "",
      currentValue: "",
      dueDate: null,
    },
  })

  // Repopulate the form whenever the dialog opens or the goal prop changes
  // (so the same component instance can be reused for add + edit).
  useEffect(() => {
    if (!open) return
    reset({
      title: goal?.title ?? "",
      type: (goal?.type as FormValues["type"]) ?? "CUSTOM",
      description: goal?.description ?? "",
      targetValue: goal?.targetValue ?? "",
      currentValue: goal?.currentValue ?? "",
      dueDate: goal?.dueDate ? toInputDate(goal.dueDate) : null,
    })
  }, [open, goal, reset])

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        title: values.title.trim(),
        type: values.type,
        description: values.description?.trim() || null,
        targetValue: values.targetValue?.trim() || null,
        currentValue: values.currentValue?.trim() || null,
        dueDate: values.dueDate || null,
      }
      const url = isEdit ? `/api/goals/${goal!.id}` : "/api/goals"
      const method = isEdit ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to save goal")
      return data
    },
    onSuccess: () => {
      toast.success(isEdit ? "Goal updated" : "Goal created")
      qc.invalidateQueries({ queryKey: ["goals"] })
      onOpenChange(false)
      // Re-render the server component so the new/updated row appears
      router.refresh()
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to save goal")
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
              <Target className="h-4 w-4 text-primary" />
            )}
            {isEdit ? "Edit Goal" : "Add Health Goal"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the details of this health goal."
              : "Set a personal health target — like an HbA1c goal, daily step count, or appointment reminder — and track your progress over time."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((v) => saveMutation.mutate(v))}
          className="space-y-4"
        >
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="goal-title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="goal-title"
              placeholder="e.g. Lower my HbA1c"
              aria-invalid={!!errors.title}
              {...register("title")}
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <Label htmlFor="goal-type">Type</Label>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger id="goal-type" className="w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {GOAL_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="goal-desc">Description</Label>
            <Textarea
              id="goal-desc"
              placeholder="e.g. Get my HbA1c below 6.0 over the next 3 months by following my prescribed medication and diet plan."
              {...register("description")}
            />
          </div>

          {/* Target + current values */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="goal-target">
                Target value{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <Input
                id="goal-target"
                placeholder="e.g. HbA1c < 6.0"
                {...register("targetValue")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="goal-current">
                Current value{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <Input
                id="goal-current"
                placeholder="e.g. 7.2"
                {...register("currentValue")}
              />
            </div>
          </div>

          {/* Due date */}
          <div className="space-y-1.5">
            <Label htmlFor="goal-due">
              Due date{" "}
              <span className="text-xs font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Input id="goal-due" type="date" {...register("dueDate")} />
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
                  <Target className="mr-2 h-4 w-4" /> Add goal
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
