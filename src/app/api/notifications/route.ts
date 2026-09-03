import { NextResponse } from "next/server"
import { getCurrentPatient } from "@/lib/session"
import { db } from "@/lib/db"
import { timeAgo } from "@/lib/constants"

export async function GET() {
  try {
    const patient = await getCurrentPatient()
    if (!patient) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const now = new Date()
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    const [conflicts, recentAbnormal, expiringShares, recentShares] = await Promise.all([
      db.conflict.findMany({
        where: { patientId: patient.id, status: "UNRESOLVED" },
        orderBy: { createdAt: "desc" },
        take: 3,
      }),
      db.medicalValue.findMany({
        where: {
          patientId: patient.id,
          status: { in: ["ABNORMAL_LOW", "ABNORMAL_HIGH", "CRITICAL"] },
        },
        orderBy: { createdAt: "desc" },
        take: 3,
        include: { document: true },
      }),
      db.share.findMany({
        where: {
          patientId: patient.id,
          isActive: true,
          revokedAt: null,
          expiresAt: { gt: now, lt: nextWeek },
        },
        include: { doctor: { include: { user: true } } },
        take: 5,
      }),
      db.share.findMany({
        where: {
          patientId: patient.id,
          isActive: true,
          revokedAt: null,
          createdAt: { gt: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
        },
        include: { doctor: { include: { user: true } } },
        take: 3,
      }),
    ])

    const notifications: any[] = []

    conflicts.forEach((c) => {
      notifications.push({
        id: `conflict-${c.id}`,
        type: "conflict",
        title: `Conflict detected: ${c.label}`,
        description: `Two reports show different values: ${c.valueA} vs ${c.valueB}`,
        href: "/conflicts",
        timestamp: timeAgo(c.createdAt),
      })
    })

    recentAbnormal.forEach((v) => {
      notifications.push({
        id: `abnormal-${v.id}`,
        type: "abnormal",
        title: `${v.label} is ${v.status === "ABNORMAL_HIGH" ? "high" : v.status === "ABNORMAL_LOW" ? "low" : "critical"}: ${v.value}${v.unit ? " " + v.unit : ""}`,
        description: `Found in "${v.document.title}"`,
        href: `/documents/${v.documentId}`,
        timestamp: timeAgo(v.createdAt),
      })
    })

    expiringShares.forEach((s) => {
      notifications.push({
        id: `expiring-${s.id}`,
        type: "share_expiring",
        title: `Share with ${s.doctor.user.name ?? s.doctor.user.email} expiring soon`,
        description: `Access expires ${timeAgo(s.expiresAt)} from now`,
        href: "/sharing",
        timestamp: timeAgo(s.createdAt),
      })
    })

    recentShares.forEach((s) => {
      notifications.push({
        id: `share-${s.id}`,
        type: "share_created",
        title: `New share created with ${s.doctor.user.name ?? s.doctor.user.email}`,
        description: `The doctor now has access to your records`,
        href: "/sharing",
        timestamp: timeAgo(s.createdAt),
      })
    })

    // Sort by approximate urgency (conflicts > abnormal > expiring > share_created)
    const priority = { conflict: 0, abnormal: 1, share_expiring: 2, share_created: 3, info: 4 }
    notifications.sort((a, b) => (priority[a.type] ?? 9) - (priority[b.type] ?? 9))

    return NextResponse.json({ notifications })
  } catch (err) {
    console.error("Notifications error:", err)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
