"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { Menu, ShieldCheck, Stethoscope, X, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { useState } from "react"
import { patientNav, doctorNav } from "@/components/app-sidebar"
import { signOut } from "next-auth/react"
import { GlobalSearch } from "@/components/global-search"
import { NotificationsLoader } from "@/components/notifications-loader"

export function AppHeader() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const role = session?.user?.role === "DOCTOR" ? "DOCTOR" : "PATIENT"
  const nav = role === "DOCTOR" ? doctorNav : patientNav
  const userName = session?.user?.name

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2 md:hidden">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            {role === "DOCTOR" ? <Stethoscope className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
          </div>
          <span className="font-bold">MedUnbox</span>
        </div>

        {/* Global search (patient only for now) */}
        {role === "PATIENT" && <GlobalSearch />}

        <div className="ml-auto flex items-center gap-1.5">
          {role === "PATIENT" && <NotificationsLoader />}
          <ThemeToggle />
          <div className="hidden h-6 w-px bg-border sm:block" />
          <span className="hidden text-sm font-medium sm:block">{userName}</span>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 bg-sidebar shadow-xl">
            <div className="flex h-14 items-center justify-between border-b px-4">
              <span className="font-bold">Menu</span>
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <nav className="space-y-1 p-3">
              {nav.map((item) => {
                const active = pathname === item.href || pathname?.startsWith(item.href + "/")
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-sidebar-accent"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                )
              })}
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </nav>
          </div>
        </div>
      )}
    </>
  )
}
