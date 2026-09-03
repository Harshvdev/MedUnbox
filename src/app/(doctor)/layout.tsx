import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/session"
import { AppSidebar } from "@/components/app-sidebar"
import { AppHeader } from "@/components/app-header"

export default async function DoctorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (user.role !== "DOCTOR") redirect("/dashboard")

  return (
    <div className="flex min-h-screen">
      <AppSidebar role="DOCTOR" userName={user.name} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}
