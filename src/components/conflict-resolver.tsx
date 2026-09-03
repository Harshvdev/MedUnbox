"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

type ResolveStatus = "RESOLVED_A" | "RESOLVED_B" | "RESOLVED_OTHER" | "DISMISSED"

const ACTIONS: { status: ResolveStatus; label: string; success: string }[] = [
  { status: "RESOLVED_A", label: "Value A is correct", success: "Marked Value A as correct" },
  { status: "RESOLVED_B", label: "Value B is correct", success: "Marked Value B as correct" },
  { status: "DISMISSED", label: "Dismiss", success: "Conflict dismissed" },
]

export function ConflictResolver({ conflictId }: { conflictId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [busy, setBusy] = useState<ResolveStatus | null>(null)

  const resolve = (status: ResolveStatus, successMsg: string) => {
    setBusy(status)
    fetch(`/api/conflicts/${conflictId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string }
          throw new Error(data.error || "Failed to resolve conflict")
        }
        toast.success(successMsg)
        startTransition(() => {
          router.refresh()
        })
      })
      .catch((err: unknown) => {
        toast.error(
          err instanceof Error ? err.message : "Failed to resolve conflict"
        )
      })
      .finally(() => setBusy(null))
  }

  return (
    <div className="flex flex-wrap gap-2">
      {ACTIONS.map((a) => {
        const isDismiss = a.status === "DISMISSED"
        const isLoading = busy === a.status
        const Icon = isDismiss ? X : Check
        return (
          <Button
            key={a.status}
            size="sm"
            variant={isDismiss ? "ghost" : "outline"}
            disabled={isPending || busy !== null}
            onClick={() => resolve(a.status, a.success)}
          >
            {isLoading ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Icon className="mr-1.5 h-3.5 w-3.5" />
            )}
            {a.label}
          </Button>
        )
      })}
    </div>
  )
}
