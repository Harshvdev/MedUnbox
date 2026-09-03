"use client"

import { useState, useCallback, useRef } from "react"
import { useDropzone } from "react-dropzone"
import { Upload, FileText, Loader2, X, CheckCircle2, AlertCircle, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { DOCUMENT_CATEGORIES } from "@/lib/constants"
import { cn } from "@/lib/utils"

interface UploadItem {
  file: File
  title: string
  category: string
  status: "pending" | "uploading" | "done" | "error" | "duplicate"
  message?: string
  documentId?: string
}

export function DocumentUploader({ open, onOpenChange, onUploaded }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onUploaded?: () => void
}) {
  const [items, setItems] = useState<UploadItem[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const onDrop = useCallback((accepted: File[]) => {
    const newItems: UploadItem[] = accepted.map((file) => ({
      file,
      title: file.name.replace(/\.[^.]+$/, ""),
      category: "LAB_REPORT",
      status: "pending",
    }))
    setItems((prev) => [...prev, ...newItems])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/*": [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"],
    },
    maxSize: 25 * 1024 * 1024,
  })

  async function uploadOne(item: UploadItem, index: number) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, status: "uploading" } : it)))
    try {
      const formData = new FormData()
      formData.append("file", item.file)
      formData.append("title", item.title)
      formData.append("category", item.category)
      const res = await fetch("/api/documents/upload", { method: "POST", body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Upload failed")
      setItems((prev) =>
        prev.map((it, i) =>
          i === index
            ? {
                ...it,
                status: data.duplicate ? "duplicate" : "done",
                message: data.message,
                documentId: data.documentId,
              }
            : it
        )
      )
      if (data.duplicate) toast.warning(data.message)
      else toast.success("Document uploaded — processing started")
      onUploaded?.()
    } catch (err) {
      setItems((prev) =>
        prev.map((it, i) =>
          i === index ? { ...it, status: "error", message: err instanceof Error ? err.message : "Failed" } : it
        )
      )
      toast.error("Upload failed")
    }
  }

  async function uploadAll() {
    for (let i = 0; i < items.length; i++) {
      if (items[i].status === "pending") {
        await uploadOne(items[i], i)
      }
    }
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  function close() {
    setItems([])
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) close(); else onOpenChange(v) }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload medical documents</DialogTitle>
          <DialogDescription>
            PDF, JPG, PNG, WebP · scanned, handwritten, and regional-language documents supported · max 25 MB
          </DialogDescription>
        </DialogHeader>

        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors",
            isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
          )}
        >
          <input {...getInputProps()} ref={inputRef} />
          <Upload className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">
            {isDragActive ? "Drop files here" : "Drag & drop files, or click to browse"}
          </p>
          <p className="text-xs text-muted-foreground">PDF, JPG, PNG, WebP · up to 25 MB</p>
        </div>

        {/* Items */}
        {items.length > 0 && (
          <div className="space-y-3">
            {items.map((item, i) => (
              <div key={i} className="rounded-lg border p-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Input
                        value={item.title}
                        onChange={(e) =>
                          setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, title: e.target.value } : it)))
                        }
                        className="h-8"
                        placeholder="Document title"
                      />
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeItem(i)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <Select
                      value={item.category}
                      onValueChange={(v) =>
                        setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, category: v } : it)))
                      }
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DOCUMENT_CATEGORIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{(item.file.size / 1024 / 1024).toFixed(2)} MB</span>
                      <span>·</span>
                      <span>{item.file.type || "unknown"}</span>
                    </div>
                    {item.status === "uploading" && (
                      <div className="flex items-center gap-2 text-sm text-primary">
                        <Loader2 className="h-4 w-4 animate-spin" /> Uploading & starting processing...
                      </div>
                    )}
                    {item.status === "done" && (
                      <div className="flex items-center gap-2 text-sm text-emerald-600">
                        <CheckCircle2 className="h-4 w-4" /> Uploaded — AI processing in progress
                      </div>
                    )}
                    {item.status === "duplicate" && (
                      <div className="flex items-center gap-2 text-sm text-amber-600">
                        <AlertCircle className="h-4 w-4" /> {item.message}
                      </div>
                    )}
                    {item.status === "error" && (
                      <div className="flex items-center gap-2 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4" /> {item.message}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={close}>Close</Button>
          <Button onClick={uploadAll} disabled={items.length === 0 || items.every((i) => i.status !== "pending")}>
            <Upload className="mr-2 h-4 w-4" />
            Upload {items.filter((i) => i.status === "pending").length > 0 ? `(${items.filter((i) => i.status === "pending").length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
