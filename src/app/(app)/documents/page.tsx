"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  Upload,
  FileText,
  Search,
  Loader2,
  MoreVertical,
  RefreshCw,
  Trash2,
  Eye,
  CheckSquare,
  X,
  Trash,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { DocThumbnail } from "@/components/doc-thumbnail"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
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
import { DocumentUploader } from "@/components/document-uploader"
import { EmptyState } from "@/components/empty-state"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { categoryLabel, timeAgo } from "@/lib/constants"

interface DocItem {
  id: string
  title: string
  category: string
  status: string
  mimeType: string
  fileSize: number
  pageCount: number
  language: string
  thumbnailUrl: string | null
  uploadedAt: string
  processedAt: string | null
  _count: { medicalValues: number; medicalEntities: number }
}

export default function DocumentsPage() {
  const [uploadOpen, setUploadOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("ALL")
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery<{ documents: DocItem[] }>({
    queryKey: ["documents"],
    queryFn: () => fetch("/api/documents").then((r) => r.json()),
  })

  const reprocess = useMutation({
    mutationFn: (id: string) => fetch(`/api/documents/${id}/process`, { method: "POST" }),
    onSuccess: () => {
      toast.success("Reprocessing started")
      qc.invalidateQueries({ queryKey: ["documents"] })
    },
    onError: () => toast.error("Failed to reprocess"),
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed")
    },
    onSuccess: () => {
      toast.success("Document deleted")
      qc.invalidateQueries({ queryKey: ["documents"] })
    },
    onError: () => toast.error("Failed to delete"),
  })

  const bulkDelete = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.allSettled(
        ids.map((id) =>
          fetch(`/api/documents/${id}`, { method: "DELETE" }).then((r) => {
            if (!r.ok) throw new Error(`Failed to delete ${id}`)
          }),
        ),
      )
      const failed = results.filter((r) => r.status === "rejected")
      if (failed.length > 0) {
        throw new Error(`${failed.length} of ${ids.length} failed`)
      }
    },
    onSuccess: (_data, ids) => {
      toast.success(
        ids.length === 1 ? "Document deleted" : `${ids.length} documents deleted`,
      )
      setSelectedIds(new Set())
      setSelectMode(false)
      qc.invalidateQueries({ queryKey: ["documents"] })
    },
    onError: (err) => {
      // Some deletes may have succeeded; refresh list and report partial failure.
      qc.invalidateQueries({ queryKey: ["documents"] })
      setSelectedIds(new Set())
      setSelectMode(false)
      toast.error(err.message || "Some documents could not be deleted")
    },
  })

  const docs = useMemo(
    () =>
      (data?.documents ?? []).filter((d) => {
        if (filter !== "ALL" && d.category !== filter) return false
        if (search && !d.title.toLowerCase().includes(search.toLowerCase())) return false
        return true
      }),
    [data, filter, search],
  )

  const allVisibleSelected =
    docs.length > 0 && docs.every((d) => selectedIds.has(d.id))
  const someVisibleSelected =
    docs.some((d) => selectedIds.has(d.id)) && !allVisibleSelected

  function toggleSelect(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function toggleSelectAll(checked: boolean) {
    if (checked) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        docs.forEach((d) => next.add(d.id))
        return next
      })
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        docs.forEach((d) => next.delete(d.id))
        return next
      })
    }
  }

  function exitSelectMode() {
    setSelectMode(false)
    setSelectedIds(new Set())
  }

  const selectedCount = selectedIds.size

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 pb-28">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground">
            {data?.documents?.length ?? 0} document{(data?.documents?.length ?? 0) === 1 ? "" : "s"} in your vault
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={selectMode ? "secondary" : "outline"}
            onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
          >
            {selectMode ? (
              <>
                <X className="mr-2 h-4 w-4" /> Done
              </>
            ) : (
              <>
                <CheckSquare className="mr-2 h-4 w-4" /> Select
              </>
            )}
          </Button>
          <Button onClick={() => setUploadOpen(true)}>
            <Upload className="mr-2 h-4 w-4" /> Upload
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All categories</SelectItem>
            <SelectItem value="LAB_REPORT">Lab Reports</SelectItem>
            <SelectItem value="PRESCRIPTION">Prescriptions</SelectItem>
            <SelectItem value="IMAGING">Imaging</SelectItem>
            <SelectItem value="DISCHARGE_SUMMARY">Discharge Summaries</SelectItem>
            <SelectItem value="PATHOLOGY">Pathology</SelectItem>
            <SelectItem value="RADIOLOGY">Radiology</SelectItem>
            <SelectItem value="CARDIOLOGY">Cardiology</SelectItem>
            <SelectItem value="OPD_CONSULTATION">OPD</SelectItem>
            <SelectItem value="VACCINATION">Vaccination</SelectItem>
            <SelectItem value="OTHER">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Select-all row (only in select mode with results) */}
      {selectMode && docs.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5">
          <Checkbox
            id="select-all"
            checked={allVisibleSelected ? true : someVisibleSelected ? "indeterminate" : false}
            onCheckedChange={(v) => toggleSelectAll(v === true)}
            aria-label="Select all visible documents"
          />
          <label htmlFor="select-all" className="text-sm font-medium cursor-pointer select-none">
            {allVisibleSelected
              ? "All visible documents selected"
              : someVisibleSelected
              ? `${selectedCount} selected (some hidden by filter)`
              : `Select all ${docs.length} visible`}
          </label>
          {selectedCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-7 text-xs"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear selection
            </Button>
          )}
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : docs.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-0">
            <EmptyState
              icon={FileText}
              title="No documents found"
              description={search || filter !== "ALL" ? "Try changing your filters" : "Upload your first medical document to get started"}
              action={
                <Button onClick={() => setUploadOpen(true)}>
                  <Upload className="mr-2 h-4 w-4" /> Upload document
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {docs.map((doc) => {
            const isSelected = selectedIds.has(doc.id)
            return (
              <Card
                key={doc.id}
                className={cn(
                  "transition-shadow hover:shadow-sm border-border/60",
                  isSelected && "border-primary bg-primary/5 ring-1 ring-primary/20",
                )}
              >
                <CardContent className="flex items-center gap-3 p-4">
                  {selectMode && (
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(v) => toggleSelect(doc.id, v === true)}
                      aria-label={`Select ${doc.title}`}
                      className="shrink-0"
                    />
                  )}
                  <DocThumbnail
                    thumbnailUrl={doc.thumbnailUrl}
                    mimeType={doc.mimeType}
                    title={doc.title}
                    category={doc.category}
                  />
                  {selectMode ? (
                    <button
                      type="button"
                      onClick={() => toggleSelect(doc.id, !isSelected)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="truncate font-medium">{doc.title}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        <span>{categoryLabel(doc.category)}</span>
                        <span>·</span>
                        <span>{(doc.fileSize / 1024).toFixed(0)} KB</span>
                        {doc.pageCount > 1 && (
                          <>
                            <span>·</span>
                            <span>{doc.pageCount} pages</span>
                          </>
                        )}
                        <span>·</span>
                        <span>{timeAgo(doc.uploadedAt)}</span>
                        {doc._count.medicalValues > 0 && (
                          <>
                            <span>·</span>
                            <span className="text-primary">
                              {doc._count.medicalValues} values extracted
                            </span>
                          </>
                        )}
                      </div>
                    </button>
                  ) : (
                    <Link href={`/documents/${doc.id}`} className="min-w-0 flex-1">
                      <p className="truncate font-medium hover:underline">{doc.title}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        <span>{categoryLabel(doc.category)}</span>
                        <span>·</span>
                        <span>{(doc.fileSize / 1024).toFixed(0)} KB</span>
                        {doc.pageCount > 1 && (
                          <>
                            <span>·</span>
                            <span>{doc.pageCount} pages</span>
                          </>
                        )}
                        <span>·</span>
                        <span>{timeAgo(doc.uploadedAt)}</span>
                        {doc._count.medicalValues > 0 && (
                          <>
                            <span>·</span>
                            <span className="text-primary">
                              {doc._count.medicalValues} values extracted
                            </span>
                          </>
                        )}
                      </div>
                    </Link>
                  )}
                  <StatusBadge status={doc.status} />
                  {!selectMode && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/documents/${doc.id}`}><Eye className="mr-2 h-4 w-4" /> View</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => reprocess.mutate(doc.id)}
                          disabled={reprocess.isPending || doc.status === "PROCESSING"}
                        >
                          <RefreshCw className="mr-2 h-4 w-4" /> Re-process
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            if (confirm("Delete this document? This cannot be undone.")) remove.mutate(doc.id)
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Floating bulk action bar */}
      {selectMode && selectedCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 print:hidden">
          <div className="container mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-primary px-2 text-xs font-semibold text-primary-foreground tabular-nums">
                {selectedCount}
              </span>
              <span className="hidden sm:inline">
                {selectedCount === 1 ? "document selected" : "documents selected"}
              </span>
              <span className="sm:hidden">selected</span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDeleteOpen(true)}
                disabled={bulkDelete.isPending}
              >
                <Trash className="mr-1.5 h-4 w-4" />
                Delete Selected
              </Button>
              <Button variant="ghost" size="sm" onClick={exitSelectMode}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk delete confirmation */}
      <AlertDialog
        open={confirmDeleteOpen}
        onOpenChange={(open) => {
          setConfirmDeleteOpen(open)
          if (!open) {
            // keep selection intact on cancel
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangleIcon />
              Delete {selectedCount} {selectedCount === 1 ? "document" : "documents"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected{" "}
              {selectedCount === 1 ? "document" : "documents"} from your vault, including any
              extracted medical values and timeline events. <strong>This action cannot be undone.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDelete.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={bulkDelete.isPending}
              onClick={(e) => {
                e.preventDefault()
                bulkDelete.mutate(Array.from(selectedIds), {
                  onSettled: () => setConfirmDeleteOpen(false),
                })
              }}
            >
              {bulkDelete.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete permanently
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DocumentUploader open={uploadOpen} onOpenChange={setUploadOpen} onUploaded={() => qc.invalidateQueries({ queryKey: ["documents"] })} />
    </div>
  )
}

function AlertTriangleIcon() {
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-destructive/15 text-destructive">
      <Trash2 className="h-4 w-4" />
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    UPLOADED: { label: "Uploaded", variant: "secondary" },
    PROCESSING: { label: "Processing", variant: "default" },
    PROCESSED: { label: "Ready", variant: "default" },
    FAILED: { label: "Failed", variant: "destructive" },
    DUPLICATE: { label: "Duplicate", variant: "outline" },
  }
  const meta = map[status] ?? { label: status, variant: "outline" as const }
  return <Badge variant={meta.variant} className="shrink-0">{meta.label}</Badge>
}
