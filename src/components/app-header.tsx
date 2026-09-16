"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { Menu, ShieldCheck, Stethoscope, X, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { useState } from "react"
import { patientNav, doctorNav, pharmacistNav, labTechNav } from "@/components/app-sidebar"
import { signOut } from "next-auth/react"
import { GlobalSearch } from "@/components/global-search"
import { NotificationsLoader } from "@/components/notifications-loader"
import { Pill, FlaskConical } from "lucide-react"

import { LanguageToggle } from "@/components/language-toggle"
import { useLanguage } from "@/lib/i18n"
import { Headphones } from "lucide-react"

export function AppHeader() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const { t } = useLanguage()
  const [mobileOpen, setMobileOpen] = useState(false)
  const role = session?.user?.role || "PATIENT"
  const nav =
    role === "DOCTOR"
      ? doctorNav
      : role === "PHARMACIST"
      ? pharmacistNav
      : role === "LAB_TECHNICIAN"
      ? labTechNav
      : patientNav
  const userName = session?.user?.name

  const HeaderIcon =
    role === "DOCTOR"
      ? Stethoscope
      : role === "PHARMACIST"
      ? Pill
      : role === "LAB_TECHNICIAN"
      ? FlaskConical
      : ShieldCheck

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
            <HeaderIcon className="h-3.5 w-3.5" />
          </div>
          <span className="font-bold">MedUnbox</span>
        </div>

        {/* Global search (patient only for now) */}
        {role === "PATIENT" && <GlobalSearch />}

        <div className="ml-auto flex items-center gap-2">
          {role === "PATIENT" && <NotificationsLoader />}
          <Link
            href="/customer-care"
            title={t("header.help")}
            className="hidden sm:inline-flex items-center justify-center h-8 w-8 rounded-lg border border-border/80 bg-background/60 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <Headphones className="h-4 w-4" />
          </Link>
          <LanguageToggle />
          <ThemeToggle />
          <div className="hidden h-5 w-px bg-border sm:block" />
          <span className="hidden text-sm font-medium sm:block">{userName}</span>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 bg-sidebar shadow-xl">
            <div className="flex h-14 items-center justify-between border-b px-4">
              <span className="font-bold">{t("nav.menu")}</span>
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <nav className="space-y-1 p-3">
              {nav.map((item) => {
                const active = pathname === item.href || pathname?.startsWith(item.href + "/")
                const itemLabel = t(item.labelKey, item.label)
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
                    {itemLabel}
                  </Link>
                )
              })}
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4" />
                {t("nav.signOut")}
              </button>
            </nav>
          </div>
        </div>
      )}
    </>
  )
}
