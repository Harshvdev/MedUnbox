import { NextRequest, NextResponse } from "next/server"
import { getCurrentPatient } from "@/lib/session"
import { db } from "@/lib/db"
import { formatDate, categoryLabel } from "@/lib/constants"

export async function GET(req: NextRequest) {
  try {
    const patient = await getCurrentPatient()
    if (!patient) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const q = req.nextUrl.searchParams.get("q")?.trim()
    if (!q || q.length < 2) {
      return NextResponse.json({ results: [] })
    }

    // Run searches in parallel across all record types
    const [documents, values, events, meds, diagnoses] = await Promise.all([
      db.document.findMany({
        where: {
          patientId: patient.id,
          OR: [
            { title: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 5,
        orderBy: { uploadedAt: "desc" },
      }),
      db.medicalValue.findMany({
        where: {
          patientId: patient.id,
          OR: [
            { label: { contains: q, mode: "insensitive" } },
            { entity: { contains: q, mode: "insensitive" } },
            { value: { contains: q, mode: "insensitive" } },
            { sourceText: { contains: q, mode: "insensitive" } },
          ],
        },
        include: { document: true },
        take: 8,
        orderBy: { recordedAt: "desc" },
      }),
      db.timelineEvent.findMany({
        where: {
          patientId: patient.id,
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 5,
        orderBy: { date: "desc" },
      }),
      db.medication.findMany({
        where: {
          patientId: patient.id,
          name: { contains: q, mode: "insensitive" },
        },
        take: 5,
        orderBy: { createdAt: "desc" },
      }),
      db.diagnosis.findMany({
        where: {
          patientId: patient.id,
          name: { contains: q, mode: "insensitive" },
        },
        take: 5,
        orderBy: { createdAt: "desc" },
      }),
    ])

    const results = [
      ...documents.map((d) => ({
        type: "document" as const,
        id: d.id,
        title: d.title,
        subtitle: `${categoryLabel(d.category)} · ${formatDate(d.uploadedAt)}`,
        href: `/documents/${d.id}`,
      })),
      ...values.map((v) => ({
        type: "value" as const,
        id: v.id,
        title: `${v.label}: ${v.value}${v.unit ? " " + v.unit : ""}`,
        subtitle: `${v.document.title} · ${formatDate(v.recordedAt)}`,
        href: `/documents/${v.documentId}`,
      })),
      ...events.map((e) => ({
        type: "timeline" as const,
        id: e.id,
        title: e.title,
        subtitle: `${formatDate(e.date)}`,
        href: e.sourceDocId ? `/documents/${e.sourceDocId}` : "/timeline",
      })),
      ...meds.map((m) => ({
        type: "medication" as const,
        id: m.id,
        title: m.name,
        subtitle: `${m.dosage ?? ""} ${m.frequency ?? ""} · ${m.status}`,
        href: "/timeline",
      })),
      ...diagnoses.map((d) => ({
        type: "diagnosis" as const,
        id: d.id,
        title: d.name,
        subtitle: `${d.severity ?? ""} · ${d.diagnosedAt ? formatDate(d.diagnosedAt) : "Active"}`,
        href: "/timeline",
      })),
    ]

    return NextResponse.json({ results })
  } catch (err) {
    console.error("Search error:", err)
    return NextResponse.json({ error: "Search failed" }, { status: 500 })
  }
}
