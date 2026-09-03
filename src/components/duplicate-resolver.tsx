"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Copy, GitMerge, EyeOff, Loader2, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"

export function DuplicateResolver({
  documentId,
  originalTitle,
  originalId,
}: {
  documentId: string
  originalTitle: string
  originalId: string
}) {
  const router = useRouter()
  const [action, setAction] = useState<"KEEP_BOTH" | "MERGE" | "DISMISS" | null>(null)
  const [isPending, startTransition] = useTransition()

  async function resolve(act: "KEEP_BOTH" | "MERGE" | "DISMISS") {
    setAction(act)
    try {
      const res = await fetch(`/api/documents/${documentId}/duplicate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: act }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed")

      const messages = {
        KEEP_BOTH: "Kept both documents",
        MERGED: "Merged — duplicate removed, original kept",
        DISMISS: "Dismissed",
      }
      toast.success(messages[act])

      startTransition(() => {
        router.refresh()
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to resolve")
    } finally {
      setAction(null)
    }
  }

  return (
    <Card className="border-amber-500/40 bg-amber-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-amber-700 dark:text-amber-500">
          <Copy className="h-4 w-4" /> Duplicate Document
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          This document appears to be a duplicate of <strong className="text-foreground">&ldquo;{originalTitle}&rdquo;</strong>.
          What would you like to do?
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          <Button
            variant="outline"
            onClick={() => resolve("KEEP_BOTH")}
            disabled={isPending || action !== null}
            className="h-auto justify-start py-3"
          >
            {action === "KEEP_BOTH" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4 text-emerald-600" />
            )}
            <div className="text-left">
              <p className="text-sm font-medium">Keep both</p>
              <p className="text-xs text-muted-foreground">Retain as separate records</p>
            </div>
          </Button>
          <Button
            variant="outline"
            onClick={() => resolve("MERGE")}
            disabled={isPending || action !== null}
            className="h-auto justify-start py-3"
          >
            {action === "MERGE" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <GitMerge className="mr-2 h-4 w-4 text-primary" />
            )}
            <div className="text-left">
              <p className="text-sm font-medium">Merge</p>
              <p className="text-xs text-muted-foreground">Delete this, keep original</p>
            </div>
          </Button>
          <Button
            variant="outline"
            onClick={() => resolve("DISMISS")}
            disabled={isPending || action !== null}
            className="h-auto justify-start py-3"
          >
            {action === "DISMISS" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <EyeOff className="mr-2 h-4 w-4 text-muted-foreground" />
            )}
            <div className="text-left">
              <p className="text-sm font-medium">Dismiss</p>
              <p className="text-xs text-muted-foreground">Keep, hide warning</p>
            </div>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
