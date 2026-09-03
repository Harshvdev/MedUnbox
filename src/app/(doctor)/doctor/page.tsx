import Link from "next/link"
import { getCurrentDoctor, getCurrentUser } from "@/lib/session"
import { db } from "@/lib/db"
import {
  Users,
  Brain,
  ArrowRight,
  Clock,
  Stethoscope,
  ShieldCheck,
  Calendar,
  FileText,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  formatDate,
  timeAgo,
  categoryLabel,
} from "@/lib/constants"
import { EmptyState } from "@/components/empty-state"

export default async function DoctorDashboardPage() {
  const user = await getCurrentUser()
  const doctor = await getCurrentDoctor()
  if (!user || !doctor) return null

  const now = new Date()

  // All shares for this doctor (active ones + a count of all-time queries)
  const [activeShares, totalQueries, recentQueries, patientCount] = await Promise.all([
    db.share.findMany({
      where: {
        doctorId: doctor.id,
        isActive: true,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      include: {
        patient: {
          include: { user: { select: { name: true, email: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.aiQuery.count({ where: { share: { doctorId: doctor.id } } }),
    db.aiQuery.findMany({
      where: { share: { doctorId: doctor.id } },
      include: {
        answer: true,
        share: { include: { patient: { include: { user: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    db.share.count({
      where: {
        doctorId: doctor.id,
        isActive: true,
        revokedAt: null,
        expiresAt: { gt: now },
      },
    }),
  ])

  const stats = [
    {
      label: "Active Patients",
      value: patientCount,
      icon: Users,
      href: "/doctor/patients",
      color: "text-primary",
    },
    {
      label: "Total Queries",
      value: totalQueries,
      icon: Brain,
      href: "/doctor/ask",
      color: "text-emerald-600",
    },
    {
      label: "Active Shares",
      value: activeShares.length,
      icon: ShieldCheck,
      href: "/doctor/patients",
      color: "text-rose-600",
    },
    {
      label: "Specialization",
      value: doctor.specialization ?? "—",
      icon: Stethoscope,
      href: "#",
      color: "text-amber-600",
    },
  ]

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome, {user.name ?? "Doctor"}
          </h1>
          <p className="text-muted-foreground">
            {patientCount > 0
              ? `You have access to ${patientCount} patient${patientCount === 1 ? "" : "s"} records`
              : "No patients have shared records with you yet"}
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/doctor/ask">
            <Brain className="mr-1.5 h-4 w-4" /> Ask My Records
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => {
          const isLink = s.href !== "#"
          const content = (
            <Card className="transition-shadow hover:shadow-md h-full">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                  {isLink && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
                </div>
                <p className="mt-2 text-2xl font-bold truncate">{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          )
          return isLink ? (
            <Link key={s.label} href={s.href}>
              {content}
            </Link>
          ) : (
            <div key={s.label}>{content}</div>
          )
        })}
      </div>

      {/* Active patients */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" /> Patients with Active Access
          </CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href="/doctor/patients">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {activeShares.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No patients have shared records with you yet"
              description="When a patient shares their records with you, they will appear here"
              action={
                <Button asChild variant="outline" size="sm">
                  <Link href="/doctor/ask">
                    <Brain className="mr-2 h-4 w-4" /> Go to Ask My Records
                  </Link>
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              {activeShares.map((share) => (
                <Link
                  key={share.id}
                  href={`/doctor/patients/${share.patientId}`}
                  className="flex flex-col gap-3 rounded-lg border p-4 transition-colors hover:bg-accent sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {(share.patient.user.name ?? share.patient.user.email ?? "P")
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {share.patient.user.name ?? share.patient.user.email}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {share.patient.user.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-4">
                    <div className="flex flex-wrap gap-1">
                      {share.categories.slice(0, 3).map((c) => (
                        <Badge key={c} variant="secondary" className="text-[10px]">
                          {categoryLabel(c)}
                        </Badge>
                      ))}
                      {share.categories.length > 3 && (
                        <Badge variant="outline" className="text-[10px]">
                          +{share.categories.length - 3}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {share.duration === "UNTIL_REVOKED"
                        ? "Until revoked"
                        : `Expires ${formatDate(share.expiresAt)}`}
                    </div>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/doctor/patients/${share.patientId}`}>
                        View <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent queries */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="h-4 w-4" /> Recent AI Queries
          </CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href="/doctor/ask">Ask a question</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentQueries.length === 0 ? (
            <EmptyState
              icon={Brain}
              title="No queries yet"
              description="Ask a question about a patient's records"
              action={
                <Button asChild size="sm">
                  <Link href="/doctor/ask">Start asking</Link>
                </Button>
              }
            />
          ) : (
            <div className="max-h-96 space-y-2 overflow-y-auto scroll-thin pr-1">
              {recentQueries.map((q) => (
                <Link
                  key={q.id}
                  href={`/doctor/patients/${q.patientId}`}
                  className="block rounded-lg border p-3 transition-colors hover:bg-accent"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-1 text-sm font-medium">{q.question}</p>
                    {q.answer && (
                      <Badge
                        variant={q.answer.grounded ? "default" : "outline"}
                        className="shrink-0 text-[10px]"
                      >
                        {q.answer.grounded ? "Grounded" : "Not grounded"}
                      </Badge>
                    )}
                  </div>
                  {q.answer && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {q.answer.answer}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {q.share?.patient?.user?.name ?? "Patient"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {timeAgo(q.createdAt)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
