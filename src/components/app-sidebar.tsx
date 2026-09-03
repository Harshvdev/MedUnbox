"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  FileText,
  Activity,
  Share2,
  Brain,
  Settings,
  ShieldCheck,
  ShieldAlert,
  Users,
  Stethoscope,
  LogOut,
  ChevronLeft,
  TrendingUp,
  Search,
  Bell,
  Sparkles,
  HeartPulse,
  Syringe,
  Pill,
  BookOpen,
  Target,
  Siren,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { signOut } from "next-auth/react"
import { useState } from "react"

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  badgeKey?: string
}

const patientNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/summary", label: "Health Summary", icon: Sparkles },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/timeline", label: "Timeline", icon: Activity },
  { href: "/vitals", label: "Vitals", icon: HeartPulse },
  { href: "/medications", label: "Medications", icon: Pill },
  { href: "/allergies", label: "Allergies", icon: ShieldAlert },
  { href: "/immunizations", label: "Immunizations", icon: Syringe },
  { href: "/trends", label: "Trends", icon: TrendingUp },
  { href: "/lab-reference", label: "Lab Reference", icon: BookOpen },
  { href: "/conflicts", label: "Conflicts", icon: ShieldCheck },
  { href: "/care-team", label: "Care Team", icon: Users },
  { href: "/sharing", label: "Sharing", icon: Share2 },
  { href: "/emergency", label: "Emergency", icon: Siren },
  { href: "/settings", label: "Settings", icon: Settings },
]

const doctorNav: NavItem[] = [
  { href: "/doctor", label: "Dashboard", icon: LayoutDashboard },
  { href: "/doctor/patients", label: "Patients", icon: Users },
  { href: "/doctor/ask", label: "Ask My Records", icon: Brain },
]

export function AppSidebar({
  role,
  userName,
  badgeCounts,
}: {
  role: "PATIENT" | "DOCTOR"
  userName?: string | null
  badgeCounts?: { conflicts?: number; shares?: number }
}) {
  const pathname = usePathname()
  const nav = role === "DOCTOR" ? doctorNav : patientNav
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        "sticky top-0 z-20 hidden h-screen shrink-0 flex-col border-r bg-sidebar md:flex transition-all duration-200",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            {role === "DOCTOR" ? <Stethoscope className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
          </div>
          {!collapsed && (
            <div className="leading-none">
              <span className="font-bold tracking-tight">MedUnbox</span>
              <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                {role === "DOCTOR" ? "Doctor Portal" : "Patient Vault"}
              </p>
            </div>
          )}
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto h-7 w-7 text-muted-foreground"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Expand" : "Collapse"}
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
        </Button>
      </div>

      {/* Nav — grouped sections */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3 scroll-thin">
        {!collapsed && (
          <p className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            Menu
          </p>
        )}
        {nav.map((item, i) => {
          const active = pathname === item.href || pathname?.startsWith(item.href + "/")
          const badge = item.label === "Conflicts" ? badgeCounts?.conflicts
            : item.label === "Sharing" ? badgeCounts?.shares
            : undefined
          return (
            <div key={item.href}>
              {i === 12 && !collapsed && (
                <p className="px-2 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  Access
                </p>
              )}
              <Link
                href={item.href}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className={cn("h-4 w-4 shrink-0", active ? "" : "text-muted-foreground group-hover:text-foreground")} />
                {!collapsed && <span className="flex-1">{item.label}</span>}
                {!collapsed && badge !== undefined && badge > 0 && (
                  <Badge variant={active ? "secondary" : "default"} className={cn(
                    "h-5 min-w-5 px-1 text-[10px] tabular-nums",
                    active ? "" : "bg-amber-500 text-white hover:bg-amber-500"
                  )}>
                    {badge}
                  </Badge>
                )}
                {collapsed && badge !== undefined && badge > 0 && (
                  <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-amber-500" />
                )}
              </Link>
            </div>
          )
        })}
      </nav>

      {/* User — with shadow separator */}
      <div className="border-t bg-sidebar/80 p-3 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-xs font-bold text-primary-foreground shadow-sm">
            {userName?.charAt(0).toUpperCase() ?? "U"}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{userName ?? "User"}</p>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{role.toLowerCase()}</p>
            </div>
          )}
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => signOut({ callbackUrl: "/" })}
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </aside>
  )
}

export { patientNav, doctorNav }
