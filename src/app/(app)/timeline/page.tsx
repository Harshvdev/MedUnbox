import { redirect } from "next/navigation"
import { getCurrentPatient } from "@/lib/session"
import { db } from "@/lib/db"
import { TimelineClient } from "@/components/timeline-client"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Timeline · MedUnbox",
}

export default async function TimelinePage() {
  const patient = await getCurrentPatient()
  if (!patient) {
    redirect("/login")
    return
  }

  const events = await db.timelineEvent.findMany({
    where: { patientId: patient.id },
    orderBy: { date: "desc" },
  })

  const serialized = events.map((e) => ({
    id: e.id,
    date: e.date.toISOString(),
    title: e.title,
    description: e.description,
    category: e.category,
    sourceDocId: e.sourceDocId,
  }))

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Medical Timeline</h1>
        <p className="text-muted-foreground">
          {events.length} event{events.length === 1 ? "" : "s"} across your medical history
        </p>
      </div>
      <TimelineClient events={serialized} />
    </div>
  )
}
