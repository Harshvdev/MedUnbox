"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Plus, MoreVertical, Pencil, Ban, Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import {
  MedicationAddDialog,
  type MedicationFormData,
} from "@/components/medication-add-dialog"

/**
 * Header CTA: opens the medication add dialog. Designed to drop into the
 * server-rendered medications page header next to the title.
 */
export function MedicationsAddButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)} className="shrink-0">
        <Plus className="h-4 w-4" /> Add Medication
      </Button>
      <MedicationAddDialog open={open} onOpenChange={setOpen} />
    </>
  )
}

function todayISO(): string {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

/**
 * Per-row actions for an item in the "All Medications" list. Renders a
 * kebab dropdown with Edit / Mark as Discontinued / Delete.
 */
export function MedicationRowActions({
  medication,
}: {
  medication: MedicationFormData
}) {
  const router = useRouter()
  const qc = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const discontinueMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/medications/${medication.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "DISCONTINUED",
          endDate: todayISO(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to discontinue")
      return data
    },
    onSuccess: () => {
      toast.success(`${medication.name} marked as discontinued`)
      qc.invalidateQueries({ queryKey: ["medications"] })
      router.refresh()
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to discontinue medication")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/medications/${medication.id}`, {
        method: "DELETE",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Failed to delete")
      return data
    },
    onSuccess: () => {
      toast.success(`${medication.name} removed`)
      qc.invalidateQueries({ queryKey: ["medications"] })
      setDeleteOpen(false)
      router.refresh()
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to delete medication")
    },
  })

  const isDiscontinued = medication.status && medication.status !== "ACTIVE"

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            aria-label={`Actions for ${medication.name}`}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Medication actions
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault()
              setEditOpen(true)
            }}
          >
            <Pencil className="h-4 w-4" /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={isDiscontinued || discontinueMutation.isPending}
            onSelect={(e) => {
              e.preventDefault()
              discontinueMutation.mutate()
            }}
          >
            {discontinueMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Ban className="h-4 w-4" />
            )}
            Mark as Discontinued
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            disabled={deleteMutation.isPending}
            onSelect={(e) => {
              e.preventDefault()
              setDeleteOpen(true)
            }}
          >
            <Trash2 className="h-4 w-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit dialog reuses the add dialog with prefilled values */}
      <MedicationAddDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        medication={medication}
      />

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this medication?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <strong>{medication.name}</strong>{" "}
              from your medication history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={(e) => {
                e.preventDefault()
                deleteMutation.mutate()
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting…
                </>
              ) : (
                "Delete medication"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
