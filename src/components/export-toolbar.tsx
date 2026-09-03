"use client"

import { Printer, ArrowLeft, Download } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ExportToolbar({ patientName }: { patientName: string }) {
  return (
    <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur print:hidden">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
        </Button>
        <Separator />
        <div>
          <p className="text-sm font-medium">Medical Summary — {patientName}</p>
          <p className="text-xs text-muted-foreground">Print or save as PDF</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Download className="mr-1.5 h-4 w-4" /> Save as PDF
        </Button>
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="mr-1.5 h-4 w-4" /> Print
        </Button>
      </div>
    </div>
  )
}

function Separator() {
  return <div className="h-6 w-px bg-border" />
}
