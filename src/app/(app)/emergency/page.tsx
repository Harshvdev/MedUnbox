import { redirect } from "next/navigation"
import { getCurrentPatient } from "@/lib/session"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Siren,
  Phone,
  Mail,
  ShieldCheck,
  ShieldAlert,
  Users,
  HeartPulse,
  Activity,
  AlertTriangle,
  ExternalLink,
  Eye,
  KeyRound,
  Info,
  type LucideIcon,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { formatDate } from "@/lib/constants"
import {
  EmergencyContactAddButton,
} from "@/components/emergency-contact-dialog"
import {
  EmergencyContactRowActions,
  CopyAccessCodeButton,
  CopyAccessUrlButton,
} from "@/components/emergency-contact-actions"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Emergency Access · MedUnbox",
}

const RELATION_TONE: Record<string, string> = {
  Spouse: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  Doctor: "bg-primary/10 text-primary",
  Parent: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  Child: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
}

function relationTone(rel: string): string {
  return RELATION_TONE[rel] ?? "bg-muted text-muted-foreground"
}

export default async function EmergencyPage() {
  const patient = await getCurrentPatient()
  if (!patient) {
    redirect("/login")
    return
  }

  const [contacts, allergyCount, activeConditions, activeMeds] = await Promise.all([
    db.emergencyAccess.findMany({
      where: { patientId: patient.id },
      orderBy: { createdAt: "desc" },
    }),
    db.medicalEntity.count({
      where: { category: "ALLERGY", document: { patientId: patient.id } },
    }),
    db.diagnosis.count({ where: { patientId: patient.id, status: "ACTIVE" } }),
    db.medication.count({ where: { patientId: patient.id, status: "ACTIVE" } }),
  ])

  const activeContacts = contacts.filter((c) => c.isActive)
  const pausedContacts = contacts.filter((c) => !c.isActive)
  const hasAccess = contacts.length > 0
  const activeAccessCode = activeContacts[0]?.accessCode ?? null

  // Preview shape — what an emergency viewer would see
  const preview = {
    patientName: (await db.user.findUnique({
      where: { id: patient.userId },
      select: { name: true },
    }))?.name ?? "Patient",
    bloodGroup: patient.bloodGroup ?? null,
    allergyCount,
    activeConditions,
    activeMeds,
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="flex items-center gap-1.5 text-sm font-medium text-primary">
            <Siren className="h-4 w-4" /> Emergency Access
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Critical Info for First Responders
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Designate trusted contacts who can access your critical medical information
            (allergies, blood group, conditions, medications) using a special access code —
            without giving them full access to your records.
          </p>
        </div>
        <EmergencyContactAddButton />
      </div>

      {/* Prominent CTA when no contacts set up */}
      {contacts.length === 0 && (
        <Card className="border-rose-500/40 bg-gradient-to-br from-rose-500/5 via-card to-card">
          <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-rose-500/10">
                <Siren className="h-6 w-6 text-rose-600" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">Set Up Emergency Access</h2>
                <p className="text-sm text-muted-foreground max-w-lg">
                  Ensure your critical medical information — blood group, allergies, conditions, medications —
                  is instantly available to first responders and trusted contacts in an emergency.
                </p>
              </div>
            </div>
            <EmergencyContactAddButton />
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={Users}
          tone="primary"
          label="Contacts"
          value={contacts.length}
          hint={activeContacts.length === contacts.length ? "All active" : `${pausedContacts.length} paused`}
        />
        <StatCard
          icon={activeAccessCode ? ShieldCheck : ShieldAlert}
          tone={activeAccessCode ? "emerald" : "amber"}
          label="Code status"
          value={activeAccessCode ? "Active" : "Inactive"}
          hint={activeAccessCode ? "Ready to share" : "Add a contact"}
          isText
        />
        <StatCard
          icon={ShieldAlert}
          tone="rose"
          label="Allergies visible"
          value={allergyCount}
          hint={allergyCount === 0 ? "None recorded" : "Auto-shared"}
        />
        <StatCard
          icon={HeartPulse}
          tone="emerald"
          label="Active meds"
          value={activeMeds}
          hint={activeMeds === 0 ? "None recorded" : "Auto-shared"}
        />
      </div>

      {/* Access code card — prominent */}
      {hasAccess && activeAccessCode && (
        <Card className="overflow-hidden border-primary/30 bg-gradient-to-br from-primary/5 via-background to-background">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="h-4 w-4 text-primary" /> Emergency Access Code
            </CardTitle>
            <CardDescription className="text-xs">
              Share this code (or the link below) with your designated contact. First
              responders can view your critical info at the public emergency page — no
              login required.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-primary/20 bg-background p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Access code
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <code className="font-mono text-lg font-bold tracking-wide text-foreground sm:text-xl break-all">
                  {activeAccessCode}
                </code>
                <CopyAccessCodeButton code={activeAccessCode} />
              </div>
            </div>

            <div className="rounded-lg border border-border/60 bg-background p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Public emergency URL
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <code className="min-w-0 flex-1 break-all font-mono text-xs text-muted-foreground sm:text-sm">
                  /emergency/{activeAccessCode}
                </code>
                <CopyAccessUrlButton code={activeAccessCode} />
                <Button asChild variant="ghost" size="sm" className="shrink-0 gap-1.5">
                  <Link href={`/emergency/${activeAccessCode}`} target="_blank">
                    <ExternalLink className="h-3.5 w-3.5" /> Open
                  </Link>
                </Button>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <p>
                Anyone with this code can view your emergency medical info. Only share it
                with people you trust. If a code is leaked, pause or delete the contact
                here to revoke access instantly.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!hasAccess && (
        <Card className="border-dashed border-primary/30 bg-primary/5">
          <CardContent className="flex flex-col items-center justify-center gap-3 p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Siren className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Set up emergency access</h3>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Add a trusted contact to generate a special access code. First responders
                can use it to view your critical medical info — without needing full
                record access.
              </p>
            </div>
            <EmergencyContactAddButton />
          </CardContent>
        </Card>
      )}

      {/* Contacts list */}
      {hasAccess && (
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-primary" /> Emergency Contacts
            </CardTitle>
            <CardDescription className="text-xs">
              {activeContacts.length} active · {pausedContacts.length} paused ·{" "}
              {contacts.length} total
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {contacts.map((c) => (
              <div
                key={c.id}
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-4 transition-colors",
                  c.isActive
                    ? "border-border/60 bg-background hover:bg-accent/30"
                    : "border-dashed border-border/50 bg-muted/30 opacity-75"
                )}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <span className="text-sm font-bold text-primary">
                    {c.contactName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium leading-tight">{c.contactName}</p>
                    <Badge
                      variant="outline"
                      className={cn("text-[10px] font-semibold", relationTone(c.contactRelation))}
                    >
                      {c.contactRelation}
                    </Badge>
                    {!c.isActive && (
                      <Badge variant="secondary" className="text-[10px]">
                        Paused
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {c.contactPhone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {c.contactPhone}
                      </span>
                    )}
                    {c.contactEmail && (
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {c.contactEmail}
                      </span>
                    )}
                    <span>Added {formatDate(c.createdAt)}</span>
                  </div>
                  {c.isActive && (
                    <div className="pt-1.5">
                      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                        code: {c.accessCode}
                      </code>
                    </div>
                  )}
                </div>
                <EmergencyContactRowActions
                  contact={{
                    id: c.id,
                    contactName: c.contactName,
                    contactRelation: c.contactRelation,
                    contactPhone: c.contactPhone,
                    contactEmail: c.contactEmail,
                    isActive: c.isActive,
                  }}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Preview — what emergency viewers see */}
      {hasAccess && activeAccessCode && (
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Eye className="h-4 w-4 text-primary" /> Preview — What Emergency Viewers See
            </CardTitle>
            <CardDescription className="text-xs">
              The public emergency view shows only critical info — no documents, lab
              values, or notes. Open the live page to see exactly what is shared.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <PreviewItem
                icon={Siren}
                label="Patient name"
                value={preview.patientName ?? "—"}
              />
              <PreviewItem
                icon={HeartPulse}
                label="Blood group"
                value={preview.bloodGroup ?? "Not set"}
                highlight={!preview.bloodGroup}
              />
              <PreviewItem
                icon={ShieldAlert}
                label="Allergies"
                value={String(allergyCount)}
                hint={allergyCount === 0 ? "None recorded" : "With severity"}
              />
              <PreviewItem
                icon={Activity}
                label="Active conditions"
                value={String(activeConditions)}
                hint={activeConditions === 0 ? "None recorded" : "Shared"}
              />
            </div>
            <Separator className="my-4" />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <p>
                  Active medications ({activeMeds}) are also included. Set your blood
                  group on the profile/settings page so first responders can see it.
                </p>
              </div>
              <Button asChild variant="outline" size="sm" className="shrink-0 gap-1.5">
                <Link href={`/emergency/${activeAccessCode}`} target="_blank">
                  <ExternalLink className="h-3.5 w-3.5" /> Open public view
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Footer disclaimer */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="flex items-start gap-2 p-4 text-xs text-amber-800 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p>
            Emergency access shares critical info only — allergies, blood group, active
            conditions, and active medications. It does NOT share documents, lab values,
            or your full medical history. The information shown is auto-extracted from
            your uploaded records and may be incomplete — always verify critical
            information with on-site medical staff.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------

const TONE_BG: Record<string, string> = {
  primary: "bg-primary/10",
  emerald: "bg-emerald-500/10",
  amber: "bg-amber-500/10",
  rose: "bg-rose-500/10",
}
const TONE_TEXT: Record<string, string> = {
  primary: "text-primary",
  emerald: "text-emerald-600 dark:text-emerald-400",
  amber: "text-amber-600 dark:text-amber-400",
  rose: "text-rose-600 dark:text-rose-400",
}

function StatCard({
  icon: Icon,
  tone,
  label,
  value,
  hint,
  isText = false,
}: {
  icon: LucideIcon
  tone: "primary" | "emerald" | "amber" | "rose"
  label: string
  value: number | string
  hint: string
  isText?: boolean
}) {
  return (
    <Card className="border-border/60">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", TONE_BG[tone])}>
            <Icon className={cn("h-4 w-4", TONE_TEXT[tone])} />
          </div>
        </div>
        <p className="mt-2 text-2xl font-bold tabular-nums leading-none">
          {isText ? value : value}
        </p>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  )
}

function PreviewItem({
  icon: Icon,
  label,
  value,
  hint,
  highlight = false,
}: {
  icon: LucideIcon
  label: string
  value: string
  hint?: string
  highlight?: boolean
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <p
        className={cn(
          "mt-1 text-sm font-semibold",
          highlight ? "text-amber-600 dark:text-amber-400" : "text-foreground"
        )}
      >
        {value}
      </p>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  )
}
