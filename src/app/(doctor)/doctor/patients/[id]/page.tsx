import { redirect } from "next/navigation"
import Link from "next/link"
import { getCurrentDoctor } from "@/lib/session"
import { db } from "@/lib/db"
import { getSignedDocumentUrl } from "@/lib/imagekit"
import {
  ArrowLeft,
  Brain,
  Droplet,
  ShieldCheck,
  UserRound,
  Clock,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  formatDate,
  categoryLabel,
} from "@/lib/constants"
import {
  computeAge,
  genderLabel,
} from "@/components/medical-icons"
import { QuickViewContent } from "./quick-view"
import { DeepViewContent } from "./deep-view"
import { DoctorNotes } from "@/components/doctor-notes"

export default async function DoctorPatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const doctor = await getCurrentDoctor()
  if (!doctor) return null

  const { id: patientId } = await params

  // Security: confirm an active, non-revoked, non-expired share exists.
  const share = await db.share.findFirst({
    where: {
      doctorId: doctor.id,
      patientId,
      isActive: true,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: {
      patient: {
        include: { user: { select: { name: true, email: true, image: true } } },
      },
    },
  })

  if (!share) {
    // Either the patient doesn't exist, or the share is inactive/expired/revoked
    redirect("/doctor/patients")
  }

  const patient = share.patient

  // Quick + Deep view data, fetched in parallel
  const [
    activeDiagnoses,
    activeMedications,
    abnormalValues,
    openConflicts,
    timelineEvents,
    allMedicalValues,
    allDocuments,
    allDiagnoses,
    allMedications,
    trends,
  ] = await Promise.all([
    db.diagnosis.findMany({
      where: { patientId, status: "ACTIVE" },
      orderBy: { diagnosedAt: "desc" },
    }),
    db.medication.findMany({
      where: { patientId, status: "ACTIVE" },
      orderBy: { startDate: "desc" },
    }),
    db.medicalValue.findMany({
      where: {
        patientId,
        status: { not: "NORMAL" },
      },
      include: { document: true },
      orderBy: { recordedAt: "desc" },
      take: 10,
    }),
    db.conflict.count({
      where: { patientId, status: "UNRESOLVED" },
    }),
    db.timelineEvent.findMany({
      where: { patientId },
      include: { document: { select: { title: true, category: true } } },
      orderBy: { date: "desc" },
    }),
    db.medicalValue.findMany({
      where: { patientId },
      include: { document: { select: { title: true, category: true } } },
      orderBy: { recordedAt: "asc" },
    }),
    db.document.findMany({
      where: { patientId },
      orderBy: { uploadedAt: "desc" },
    }),
    db.diagnosis.findMany({
      where: { patientId },
      orderBy: { diagnosedAt: "desc" },
    }),
    db.medication.findMany({
      where: { patientId },
      orderBy: { startDate: "desc" },
    }),
    db.trend.findMany({
      where: { patientId },
      orderBy: { lastUpdated: "desc" },
    }),
  ])

  // Filter the medical values / documents to those the share actually covers.
  const shareCovers = (doc: { id: string; category: string }) => {
    if (share.scope === "FULL") return true
    if (share.documentIds.includes(doc.id)) return true
    if (share.categories.includes(doc.category)) return true
    return false
  }

  const visibleMedicalValues = allMedicalValues.filter((v) =>
    shareCovers({ id: v.documentId, category: v.document.category })
  )

  const visibleAbnormal = abnormalValues.filter((v) =>
    shareCovers({ id: v.documentId, category: v.document.category })
  )

  const visibleDocuments = allDocuments.filter((d) => shareCovers(d))

  // For each visible document, generate a short-lived signed URL (300s).
  const documentsWithUrls = visibleDocuments.map((doc) => ({
    ...doc,
    signedUrl: getSignedDocumentUrl(
      doc.imagekitUrl,
      `/medunbox-documents/${patientId}/${doc.id}`,
      300
    ),
  }))

  const age = computeAge(patient.dateOfBirth)
  const gender = genderLabel(patient.gender)

  // Group medical values by entity for the deep view trend table
  const valuesByEntity = new Map<
    string,
    {
      entity: string
      label: string
      unit: string | null
      values: typeof visibleMedicalValues
    }
  >()
  for (const v of visibleMedicalValues) {
    const e = valuesByEntity.get(v.entity)
    if (e) {
      e.values.push(v)
    } else {
      valuesByEntity.set(v.entity, {
        entity: v.entity,
        label: v.label,
        unit: v.unit,
        values: [v],
      })
    }
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/doctor/patients">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to patients
        </Link>
      </Button>

      {/* Patient header */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-xl font-bold text-primary">
              {(patient.user.name ?? patient.user.email ?? "P").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">
                  {patient.user.name ?? patient.user.email}
                </h1>
                <Badge variant="secondary" className="gap-1">
                  <ShieldCheck className="h-3 w-3" /> Active access
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{patient.user.email}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {age && (
                  <span className="flex items-center gap-1">
                    <UserRound className="h-3.5 w-3.5" />
                    {age} yrs
                  </span>
                )}
                {gender && <span>{gender}</span>}
                {patient.bloodGroup && (
                  <span className="flex items-center gap-1">
                    <Droplet className="h-3.5 w-3.5" /> {patient.bloodGroup}
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {share.categories.length === 0 && share.scope !== "FULL" ? (
                  <Badge variant="outline" className="text-[10px]">
                    Specific documents only
                  </Badge>
                ) : share.scope === "FULL" ? (
                  <Badge variant="default" className="text-[10px]">
                    Full access
                  </Badge>
                ) : (
                  share.categories.map((c) => (
                    <Badge key={c} variant="secondary" className="text-[10px]">
                      {categoryLabel(c)}
                    </Badge>
                  ))
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {share.duration === "UNTIL_REVOKED"
                ? "Access until revoked"
                : `Access expires ${formatDate(share.expiresAt)}`}
            </div>
            <Button asChild size="sm">
              <Link href={`/doctor/ask?patientId=${patientId}`}>
                <Brain className="mr-2 h-4 w-4" /> Ask My Records
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="quick" className="w-full">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="quick" className="flex-1 sm:flex-initial">
            Quick View
          </TabsTrigger>
          <TabsTrigger value="deep" className="flex-1 sm:flex-initial">
            Deep View
          </TabsTrigger>
          <TabsTrigger value="notes" className="flex-1 sm:flex-initial">
            Notes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quick" className="mt-4">
          <QuickViewContent
            patientId={patientId}
            patientName={patient.user.name ?? patient.user.email ?? "Patient"}
            age={age}
            gender={gender}
            bloodGroup={patient.bloodGroup}
            activeDiagnoses={activeDiagnoses}
            activeMedications={activeMedications}
            abnormalValues={visibleAbnormal.map((v) => ({
              ...v,
              status: v.status as string,
            }))}
            openConflicts={openConflicts}
          />
        </TabsContent>

        <TabsContent value="deep" className="mt-4">
          <DeepViewContent
            patientId={patientId}
            timelineEvents={timelineEvents.map((e) => ({
              ...e,
              category: e.category as string,
            }))}
            valuesByEntity={Array.from(valuesByEntity.values()).map((g) => ({
              ...g,
              values: g.values.map((v) => ({
                ...v,
                status: v.status as string,
              })),
            }))}
            documents={documentsWithUrls.map((d) => ({
              ...d,
              status: d.status as string,
              category: d.category as string,
            }))}
            diagnoses={allDiagnoses.map((d) => ({ ...d, status: d.status as string }))}
            medications={allMedications.map((m) => ({ ...m, status: m.status as string }))}
            trends={trends.map((t) => ({
              ...t,
              direction: t.direction as string,
              status: t.status as string,
            }))}
          />
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <DoctorNotes patientId={patientId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
