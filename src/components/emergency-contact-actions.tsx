"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  MoreVertical,
  Pencil,
  Power,
  PowerOff,
  Trash2,
  Loader2,
  Copy,
  Check,
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
  EmergencyContactDialog,
  type EmergencyContactFormData,
} from "@/components/emergency-contact-dialog"

interface EmergencyContact extends EmergencyContactFormData {
  isActive: boolean
}

/**
 * Per-row actions for an emergency contact row. Renders a kebab dropdown
 * with Edit / Toggle active / Delete.
 */
export function EmergencyContactRowActions({
  contact,
}: {
  contact: EmergencyContact
}) {
  const router = useRouter()
  const qc = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const toggleMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/emergency-access/${contact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !contact.isActive }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to update")
      return data
    },
    onSuccess: () => {
      toast.success(
        contact.isActive ? "Emergency access paused" : "Emergency access enabled"
      )
      qc.invalidateQueries({ queryKey: ["emergency-access"] })
      router.refresh()
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update contact")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/emergency-access/${contact.id}`, {
        method: "DELETE",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Failed to delete")
      return data
    },
    onSuccess: () => {
      toast.success(`${contact.contactName} removed`)
      qc.invalidateQueries({ queryKey: ["emergency-access"] })
      setDeleteOpen(false)
      router.refresh()
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to delete contact")
    },
  })

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            aria-label={`Actions for ${contact.contactName}`}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Contact actions
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
            disabled={toggleMutation.isPending}
            onSelect={(e) => {
              e.preventDefault()
              toggleMutation.mutate()
            }}
          >
            {toggleMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : contact.isActive ? (
              <PowerOff className="h-4 w-4" />
            ) : (
              <Power className="h-4 w-4" />
            )}
            {contact.isActive ? "Pause access" : "Enable access"}
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
      <EmergencyContactDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        contact={contact}
      />

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this emergency contact?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{contact.contactName}</strong> and
              revoke their emergency access code. Anyone who currently holds the code
              will no longer be able to view your emergency medical information. This
              action cannot be undone.
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
                "Delete contact"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

/**
 * Copy-to-clipboard button for the emergency access code.
 * Shows a check icon briefly after copying.
 */
export function CopyAccessCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      toast.success("Access code copied")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Couldn't copy — please copy manually")
    }
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={handleCopy}
      className="gap-1.5"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-600" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
      {copied ? "Copied" : "Copy code"}
    </Button>
  )
}

/**
 * Copy-to-clipboard button for the full emergency URL.
 */
export function CopyAccessUrlButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      // Build a fully-qualified URL on the client side (window is available
      // because this is a client component).
      const url = `${window.location.origin}/emergency/${code}`
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success("Emergency link copied")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Couldn't copy — please copy manually")
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className="gap-1.5"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-600" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
      {copied ? "Copied" : "Copy link"}
    </Button>
  )
}
