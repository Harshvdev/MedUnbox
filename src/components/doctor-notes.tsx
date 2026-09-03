"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, Pin, MoreVertical, Edit2, Trash2, Loader2, StickyNote } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { DoctorNoteDialog } from "@/components/doctor-note-dialog"
import { EmptyState } from "@/components/empty-state"
import { formatDateTime, timeAgo } from "@/lib/constants"
import { toast } from "sonner"

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  general: { label: "General", color: "bg-primary/10 text-primary" },
  follow_up: { label: "Follow-up", color: "bg-amber-500/10 text-amber-600" },
  referral: { label: "Referral", color: "bg-sky-500/10 text-sky-600" },
  alert: { label: "Alert", color: "bg-rose-500/10 text-rose-600" },
}

interface Note {
  id: string
  note: string
  category: string
  isPinned: boolean
  createdAt: string
  updatedAt: string
}

export function DoctorNotes({ patientId }: { patientId: string }) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editNote, setEditNote] = useState<Note | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery<{ notes: Note[] }>({
    queryKey: ["doctor-notes", patientId],
    queryFn: () => fetch(`/api/doctor/notes?patientId=${patientId}`).then((r) => r.json()),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/doctor/notes/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Note deleted")
      qc.invalidateQueries({ queryKey: ["doctor-notes", patientId] })
      setDeleteId(null)
    },
    onError: () => toast.error("Failed to delete"),
  })

  const notes = data?.notes ?? []

  function handleEdit(note: Note) {
    setEditNote(note)
    setDialogOpen(true)
  }

  function handleAdd() {
    setEditNote(null)
    setDialogOpen(true)
  }

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <StickyNote className="h-4 w-4 text-primary" /> Clinical Notes
            </CardTitle>
            <CardDescription className="text-xs">
              Your private notes about this patient — {notes.length} note{notes.length === 1 ? "" : "s"}
            </CardDescription>
          </div>
          <Button size="sm" onClick={handleAdd}>
            <Plus className="mr-1.5 h-4 w-4" /> Add Note
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : notes.length === 0 ? (
          <EmptyState
            icon={StickyNote}
            title="No notes yet"
            description="Add clinical observations, follow-up reminders, or referral notes"
            className="py-6"
          />
        ) : (
          <div className="max-h-96 space-y-2 overflow-y-auto scroll-thin pr-1">
            {notes.map((n) => {
              const meta = CATEGORY_META[n.category] ?? CATEGORY_META.general
              return (
                <div
                  key={n.id}
                  className={`rounded-lg border p-3 ${n.isPinned ? "border-primary/40 bg-primary/5" : "border-border/50"}`}
                >
                  <div className="flex items-start gap-2">
                    {n.isPinned && <Pin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />}
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <Badge variant="outline" className={`text-xs ${meta.color}`}>{meta.label}</Badge>
                        <span className="text-xs text-muted-foreground">{timeAgo(n.createdAt)}</span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{n.note}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(n)}>
                          <Edit2 className="mr-2 h-3.5 w-3.5" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteId(n.id)}
                        >
                          <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>

      <DoctorNoteDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        patientId={patientId}
        note={editNote}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this note?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The note will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
