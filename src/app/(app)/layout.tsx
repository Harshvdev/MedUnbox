import { redirect } from "next/navigation"
import { getCurrentUser, getCurrentPatient } from "@/lib/session"
import { db } from "@/lib/db"
import { AppSidebar } from "@/components/app-sidebar"
import { AppHeader } from "@/components/app-header"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (user.role === "DOCTOR") redirect("/doctor")

  const patient = await getCurrentPatient()
  let badgeCounts: { conflicts?: number; shares?: number } = {}
  if (patient) {
    const [conflicts, shares] = await Promise.all([
      db.conflict.count({ where: { patientId: patient.id, status: "UNRESOLVED" } }),
      db.share.count({
        where: { patientId: patient.id, isActive: true, revokedAt: null, expiresAt: { gt: new Date() } },
      }),
    ])
    badgeCounts = { conflicts, shares }
  }

  return (
    <div className="flex min-h-screen bg-muted/20">
      <AppSidebar role="PATIENT" userName={user.name} badgeCounts={badgeCounts} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}
