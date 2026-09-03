import { notFound } from "next/navigation"
import Link from "next/link"
import { getCurrentPatient } from "@/lib/session"
import { db } from "@/lib/db"
import { getSignedDocumentUrl } from "@/lib/imagekit"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { DuplicateResolver } from "@/components/duplicate-resolver"
import {
  ArrowLeft,
  FileText,
  ExternalLink,
  Pill,
  Stethoscope,
  TestTube,
  Microscope,
  Calendar,
  Languages,
  Hash,
  AlertTriangle,
} from "lucide-react"
import { categoryLabel, formatDate, formatDateTime, VALUE_STATUS_META } from "@/lib/constants"
import { DocumentViewer } from "@/components/document-viewer"

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const patient = await getCurrentPatient()
  if (!patient) return null

  const { id } = await params
  const document = await db.document.findFirst({
    where: { id, patientId: patient.id },
    include: {
      pages: { orderBy: { pageNumber: "asc" } },
      extractedText: true,
      medicalValues: { orderBy: { recordedAt: "asc" } },
      medicalEntities: true,
      duplicates: { include: { original: true } },
      duplicateOf: { include: { document: true } },
    },
  })

  if (!document) notFound()

  const signedUrl = getSignedDocumentUrl(
    document.imagekitUrl,
    `/medunbox-documents/${patient.id}/${id}`,
    3600
  )

  const isPdf = document.mimeType === "application/pdf"
  const isImage = document.mimeType.startsWith("image/")

  const medications = await db.medication.findMany({
    where: { sourceDocId: id },
  })
  const diagnoses = await db.diagnosis.findMany({
    where: { sourceDocId: id },
  })

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Back link */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/documents"><ArrowLeft className="mr-2 h-4 w-4" /> Back to documents</Link>
      </Button>

      {/* Header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight truncate">{document.title}</h1>
            <StatusBadge status={document.status} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> {categoryLabel(document.category)}</span>
            <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {formatDateTime(document.uploadedAt)}</span>
            {document.language !== "en" && (
              <span className="flex items-center gap-1"><Languages className="h-3.5 w-3.5" /> {document.language}</span>
            )}
            <span className="flex items-center gap-1"><Hash className="h-3.5 w-3.5" /> {document.fileHash.slice(0, 12)}…</span>
          </div>
        </div>
        <Button asChild variant="outline" size="sm">
          <a href={signedUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" /> Open original
          </a>
        </Button>
      </div>

      {document.processingError && document.status !== "PROCESSED" && (
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-2 p-4 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" /> Processing error: {document.processingError}
          </CardContent>
        </Card>
      )}

      {/* Duplicate resolver — when this document IS a duplicate */}
      {document.status === "DUPLICATE" && document.duplicates.length > 0 && (
        <DuplicateResolver
          documentId={document.id}
          originalTitle={document.duplicates[0].original.title}
          originalId={document.duplicates[0].originalDocId}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Original document */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" /> Original Document
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DocumentViewer
              url={signedUrl}
              type={isPdf ? "pdf" : "image"}
              title={document.title}
            />
          </CardContent>
        </Card>

        {/* Extracted values */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TestTube className="h-4 w-4" /> Extracted Values
              <Badge variant="secondary" className="ml-auto">{document.medicalValues.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {document.medicalValues.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {document.status === "PROCESSING" ? "Extracting values..." : "No values extracted from this document."}
              </p>
            ) : (
              <div className="max-h-96 space-y-2 overflow-y-auto scroll-thin pr-1">
                {document.medicalValues.map((v) => {
                  const meta = VALUE_STATUS_META[v.status] ?? VALUE_STATUS_META.UNKNOWN
                  return (
                    <div key={v.id} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">{v.label}</span>
                        <span className={`text-xs font-semibold ${meta.color}`}>{meta.label}</span>
                      </div>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-2xl font-bold tabular-nums">{v.value}</span>
                        {v.unit && <span className="text-sm text-muted-foreground">{v.unit}</span>}
                      </div>
                      {v.referenceRange && (
                        <p className="mt-0.5 text-xs text-muted-foreground">Reference: {v.referenceRange}</p>
                      )}
                      <Separator className="my-2" />
                      <div className="space-y-0.5 text-xs text-muted-foreground">
                        <p className="font-medium text-foreground/70">Source (page {v.pageNumber})</p>
                        <p className="rounded bg-muted/50 px-2 py-1 font-mono">&ldquo;{v.sourceText}&rdquo;</p>
                        {v.recordedAt && <p>Recorded: {formatDate(v.recordedAt)}</p>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Medications & Diagnoses */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Pill className="h-4 w-4" /> Medications
            </CardTitle>
          </CardHeader>
          <CardContent>
            {medications.length === 0 ? (
              <p className="text-sm text-muted-foreground">No medications extracted from this document.</p>
            ) : (
              <div className="space-y-2">
                {medications.map((m) => (
                  <div key={m.id} className="rounded-lg border p-3">
                    <p className="font-medium">{m.name}</p>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      {m.dosage && <span>Dose: {m.dosage}</span>}
                      {m.frequency && <span>Frequency: {m.frequency}</span>}
                      {m.route && <span>Route: {m.route}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Stethoscope className="h-4 w-4" /> Diagnoses
            </CardTitle>
          </CardHeader>
          <CardContent>
            {diagnoses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No diagnoses extracted from this document.</p>
            ) : (
              <div className="space-y-2">
                {diagnoses.map((d) => (
                  <div key={d.id} className="rounded-lg border p-3">
                    <p className="font-medium">{d.name}</p>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      {d.severity && <span>Severity: {d.severity}</span>}
                      {d.icdCode && <span>ICD: {d.icdCode}</span>}
                      {d.diagnosedAt && <span>Diagnosed: {formatDate(d.diagnosedAt)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Extracted text */}
      {document.extractedText[0] && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Microscope className="h-4 w-4" /> Extracted Text
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded-lg bg-muted/50 p-4 text-xs scroll-thin font-mono">
              {document.extractedText[0].cleanedText || document.extractedText[0].rawText}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Duplicate info */}
      {document.duplicates.length > 0 && (
        <Card className="border-amber-500/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-amber-600">
              <AlertTriangle className="h-4 w-4" /> Duplicate Detected
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {document.duplicates.map((dup) => (
              <div key={dup.id} className="flex items-center justify-between rounded-lg border p-3">
                <span>This document matches &ldquo;{dup.original.title}&rdquo; (hash match)</span>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/documents/${dup.originalDocId}`}>View original</Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    UPLOADED: { label: "Uploaded", variant: "secondary" },
    PROCESSING: { label: "Processing…", variant: "default" },
    PROCESSED: { label: "Processed", variant: "default" },
    FAILED: { label: "Failed", variant: "destructive" },
    DUPLICATE: { label: "Duplicate", variant: "outline" },
  }
  const meta = map[status] ?? { label: status, variant: "outline" as const }
  return <Badge variant={meta.variant}>{meta.label}</Badge>
}
