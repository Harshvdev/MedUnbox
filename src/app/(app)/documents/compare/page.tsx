import { getCurrentPatient } from "@/lib/session"
import { db } from "@/lib/db"
import { getSignedDocumentUrl } from "@/lib/imagekit"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, GitCompare, FileText, AlertTriangle, ExternalLink } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { formatDate, categoryLabel, VALUE_STATUS_META } from "@/lib/constants"
import { DocumentViewer } from "@/components/document-viewer"

export default async function CompareDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>
}) {
  const patient = await getCurrentPatient()
  if (!patient) return null

  const { a: docAId, b: docBId } = await searchParams
  if (!docAId || !docBId) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-3 p-8 text-center">
            <GitCompare className="h-12 w-12 text-muted-foreground" />
            <h3 className="font-semibold">Select two documents to compare</h3>
            <p className="text-sm text-muted-foreground">
              Go to the conflicts page and click &ldquo;Compare&rdquo; on any conflict to see the reports side-by-side.
            </p>
            <Button asChild>
              <Link href="/conflicts">View Conflicts</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const [docA, docB] = await Promise.all([
    db.document.findFirst({
      where: { id: docAId, patientId: patient.id },
      include: {
        medicalValues: { orderBy: { recordedAt: "asc" } },
        extractedText: { take: 1 },
      },
    }),
    db.document.findFirst({
      where: { id: docBId, patientId: patient.id },
      include: {
        medicalValues: { orderBy: { recordedAt: "asc" } },
        extractedText: { take: 1 },
      },
    }),
  ])

  if (!docA || !docB) notFound()

  const signedUrlA = getSignedDocumentUrl(docA.imagekitUrl, "", 3600)
  const signedUrlB = getSignedDocumentUrl(docB.imagekitUrl, "", 3600)

  // Find common entities for comparison
  const entitiesA = new Map(docA.medicalValues.map((v) => [v.entity, v]))
  const entitiesB = new Map(docB.medicalValues.map((v) => [v.entity, v]))
  const allEntities = new Set([...entitiesA.keys(), ...entitiesB.keys()])

  const commonEntities = Array.from(allEntities).filter((e) => entitiesA.has(e) && entitiesB.has(e))
  const onlyInA = Array.from(allEntities).filter((e) => entitiesA.has(e) && !entitiesB.has(e))
  const onlyInB = Array.from(allEntities).filter((e) => !entitiesA.has(e) && entitiesB.has(e))

  // Find conflicting values
  const conflicts = commonEntities.filter((entity) => {
    const vA = entitiesA.get(entity)!
    const vB = entitiesB.get(entity)!
    return vA.value !== vB.value
  })

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-7xl">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/conflicts"><ArrowLeft className="mr-2 h-4 w-4" /> Back to conflicts</Link>
      </Button>

      <div className="space-y-1">
        <p className="flex items-center gap-1.5 text-sm font-medium text-primary">
          <GitCompare className="h-4 w-4" /> Side-by-Side Comparison
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Document Comparison</h1>
        <p className="text-sm text-muted-foreground">
          Compare extracted values from two reports to identify discrepancies
        </p>
      </div>

      {/* Conflict summary */}
      {conflicts.length > 0 && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="font-medium text-amber-700 dark:text-amber-500">
                {conflicts.length} conflicting value{conflicts.length === 1 ? "" : "s"} detected
              </p>
              <p className="text-sm text-muted-foreground">
                These values differ between the two reports. Review both originals to determine which is correct.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Side-by-side document viewers */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4 text-primary" /> Document A
                </CardTitle>
                <CardDescription className="text-xs truncate">{docA.title}</CardDescription>
              </div>
              <Badge variant="outline">{categoryLabel(docA.category)}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <DocumentViewer
              url={signedUrlA}
              type={docA.mimeType === "application/pdf" ? "pdf" : "image"}
              title={docA.title}
            />
            <div className="mt-3 space-y-1 text-xs text-muted-foreground">
              <p>Uploaded: {formatDate(docA.uploadedAt)}</p>
              <p>{docA.medicalValues.length} values extracted</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4 text-primary" /> Document B
                </CardTitle>
                <CardDescription className="text-xs truncate">{docB.title}</CardDescription>
              </div>
              <Badge variant="outline">{categoryLabel(docB.category)}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <DocumentViewer
              url={signedUrlB}
              type={docB.mimeType === "application/pdf" ? "pdf" : "image"}
              title={docB.title}
            />
            <div className="mt-3 space-y-1 text-xs text-muted-foreground">
              <p>Uploaded: {formatDate(docB.uploadedAt)}</p>
              <p>{docB.medicalValues.length} values extracted</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Value comparison table */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Value Comparison</CardTitle>
          <CardDescription className="text-xs">
            {commonEntities.length} common values · {conflicts.length} conflicts · {onlyInA.length + onlyInB.length} unique
          </CardDescription>
        </CardHeader>
        <CardContent>
          {commonEntities.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No common values found between these documents
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr className="border-b">
                    <th className="py-2 pr-3 text-left font-medium">Test</th>
                    <th className="py-2 px-3 text-left font-medium">Document A</th>
                    <th className="py-2 px-3 text-left font-medium">Document B</th>
                    <th className="py-2 pl-3 text-left font-medium">Match</th>
                  </tr>
                </thead>
                <tbody>
                  {commonEntities.map((entity) => {
                    const vA = entitiesA.get(entity)!
                    const vB = entitiesB.get(entity)!
                    const isConflict = vA.value !== vB.value
                    const metaA = VALUE_STATUS_META[vA.status] ?? VALUE_STATUS_META.UNKNOWN
                    return (
                      <tr key={entity} className={`border-b border-border/40 last:border-0 ${isConflict ? "bg-amber-500/5" : ""}`}>
                        <td className="py-2.5 pr-3 font-medium">{vA.label}</td>
                        <td className="py-2.5 px-3">
                          <span className="font-semibold tabular-nums">{vA.value}</span>
                          {vA.unit && <span className="ml-1 text-xs text-muted-foreground">{vA.unit}</span>}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-semibold tabular-nums">{vB.value}</span>
                          {vB.unit && <span className="ml-1 text-xs text-muted-foreground">{vB.unit}</span>}
                        </td>
                        <td className="py-2.5 pl-3">
                          {isConflict ? (
                            <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/30">
                              <AlertTriangle className="mr-1 h-3 w-3" /> Conflict
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                              Match
                            </Badge>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unique values */}
      {(onlyInA.length > 0 || onlyInB.length > 0) && (
        <div className="grid gap-6 lg:grid-cols-2">
          {onlyInA.length > 0 && (
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Only in Document A</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  {onlyInA.map((entity) => {
                    const v = entitiesA.get(entity)!
                    return (
                      <div key={entity} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{v.label}</span>
                        <span className="font-medium tabular-nums">{v.value} {v.unit}</span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
          {onlyInB.length > 0 && (
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Only in Document B</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  {onlyInB.map((entity) => {
                    const v = entitiesB.get(entity)!
                    return (
                      <div key={entity} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{v.label}</span>
                        <span className="font-medium tabular-nums">{v.value} {v.unit}</span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
