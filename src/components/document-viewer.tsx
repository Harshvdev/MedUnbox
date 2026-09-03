"use client"

import { FileText, Maximize2, X } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"

export function DocumentViewer({
  url,
  type,
  title,
}: {
  url: string
  type: "pdf" | "image"
  title: string
}) {
  const [loaded, setLoaded] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)

  return (
    <>
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg border bg-muted/30">
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <FileText className="h-8 w-8 animate-pulse text-muted-foreground" />
          </div>
        )}
        {type === "pdf" ? (
          <iframe
            src={url}
            title={title}
            className="h-full w-full"
            onLoad={() => setLoaded(true)}
          />
        ) : (
          <img
            src={url}
            alt={title}
            className="h-full w-full object-contain"
            onLoad={() => setLoaded(true)}
          />
        )}
        <Button
          variant="secondary"
          size="icon"
          className="absolute right-2 top-2 h-8 w-8 shadow-md"
          onClick={() => setFullscreen(true)}
          title="View fullscreen"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Fullscreen dialog */}
      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] h-[95vh] w-[95vw] p-0 gap-0">
          <DialogTitle className="sr-only">{title}</DialogTitle>
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <p className="truncate text-sm font-medium">{title}</p>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setFullscreen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-hidden bg-muted/30">
            {type === "pdf" ? (
              <iframe
                src={url}
                title={title}
                className="h-full w-full"
              />
            ) : (
              <img
                src={url}
                alt={title}
                className="h-full w-full object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
