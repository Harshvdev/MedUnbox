"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Plus,
  MoreVertical,
  Pencil,
  Ban,
  Trash2,
  Loader2,
  CheckCircle2,
  Play,
  Pause,
} from "lucide-react"
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
  GoalAddDialog,
  type GoalFormData,
} from "@/components/goal-add-dialog"

/**
 * Header CTA: opens the goal add dialog. Designed to drop into the
 * server-rendered goals page header next to the title.
 */
export function GoalsAddButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)} className="shrink-0">
        <Plus className="h-4 w-4" /> Add Goal
      </Button>
      <GoalAddDialog open={open} onOpenChange={setOpen} />
    </>
  )
}

/**
 * Per-row actions for a goal. Renders a kebab dropdown with
 * Mark Complete / Mark Paused / Resume / Edit / Delete plus an inline
 * "Mark Complete" icon button on the card.
 */
export function GoalRowActions({ goal }: { goal: GoalFormData }) {
  const router = useRouter()
  const qc = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const patchMutation = useMutation({
    mutationFn: async (status: string) => {
      const res = await fetch(`/api/goals/${goal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to update goal")
      return data
    },
    onSuccess: (_data, status) => {
      const verb =
        status === "COMPLETED"
          ? "completed"
          : status === "PAUSED"
          ? "paused"
          : status === "ACTIVE"
          ? "resumed"
          : "updated"
      toast.success(`Goal ${verb}`)
      qc.invalidateQueries({ queryKey: ["goals"] })
      router.refresh()
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update goal")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/goals/${goal.id}`, { method: "DELETE" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Failed to delete")
      return data
    },
    onSuccess: () => {
      toast.success(`"${goal.title}" removed`)
      qc.invalidateQueries({ queryKey: ["goals"] })
      setDeleteOpen(false)
      router.refresh()
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to delete goal")
    },
  })

  const isActive = goal.status === "ACTIVE"
  const isPaused = goal.status === "PAUSED"
  const isCompleted = goal.status === "COMPLETED"

  return (
    <>
      <div className="flex items-center gap-1">
        {/* Quick "Mark Complete" button — only show for in-progress goals */}
        {(isActive || isPaused) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
            disabled={patchMutation.isPending}
            onClick={() => patchMutation.mutate("COMPLETED")}
            title="Mark as completed"
          >
            {patchMutation.isPending && patchMutation.variables === "COMPLETED" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Complete</span>
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              aria-label={`Actions for ${goal.title}`}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Goal actions
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
            {!isCompleted && (
              <DropdownMenuItem
                disabled={patchMutation.isPending}
                onSelect={(e) => {
                  e.preventDefault()
                  patchMutation.mutate("COMPLETED")
                }}
              >
                <CheckCircle2 className="h-4 w-4" /> Mark Complete
              </DropdownMenuItem>
            )}
            {isPaused ? (
              <DropdownMenuItem
                disabled={patchMutation.isPending}
                onSelect={(e) => {
                  e.preventDefault()
                  patchMutation.mutate("ACTIVE")
                }}
              >
                <Play className="h-4 w-4" /> Resume
              </DropdownMenuItem>
            ) : isActive ? (
              <DropdownMenuItem
                disabled={patchMutation.isPending}
                onSelect={(e) => {
                  e.preventDefault()
                  patchMutation.mutate("PAUSED")
                }}
              >
                <Pause className="h-4 w-4" /> Pause
              </DropdownMenuItem>
            ) : null}
            {isCompleted && (
              <DropdownMenuItem
                disabled={patchMutation.isPending}
                onSelect={(e) => {
                  e.preventDefault()
                  patchMutation.mutate("ACTIVE")
                }}
              >
                <Ban className="h-4 w-4" /> Reopen
              </DropdownMenuItem>
            )}
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
      </div>

      {/* Edit dialog reuses the add dialog with prefilled values */}
      <GoalAddDialog open={editOpen} onOpenChange={setEditOpen} goal={goal} />

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this goal?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <strong>{goal.title}</strong>{" "}
              from your health goals. This action cannot be undone.
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
                "Delete goal"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
