"use client"

import Link from "next/link"
import { useSession } from "next-auth/react"
import { motion } from "framer-motion"
import {
  ShieldCheck,
  FileText,
  Activity,
  Brain,
  Share2,
  Stethoscope,
  Lock,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  Languages,
  AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageToggle } from "@/components/language-toggle"
import { useLanguage } from "@/lib/i18n"

export default function Home() {
  const { data: session, status } = useSession()
  const { language, t } = useLanguage()

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <span className="text-xl font-bold tracking-tight">MedUnbox</span>
            </Link>

            <nav className="hidden md:flex items-center gap-5 text-sm font-medium">
              <Link href="/" className="text-primary font-semibold">
                {t("landing.home")}
              </Link>
              <Link href="/about" className="text-muted-foreground hover:text-foreground transition-colors">
                {t("landing.about")}
              </Link>
              <Link href="/customer-care" className="text-muted-foreground hover:text-foreground transition-colors">
                {t("landing.customerCare")}
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
            {status === "authenticated" ? (
              <Button asChild className="rounded-xl shadow-sm">
                <Link
                  href={
                    session?.user?.role === "DOCTOR"
                      ? "/doctor"
                      : session?.user?.role === "PHARMACIST"
                      ? "/pharmacist"
                      : session?.user?.role === "LAB_TECHNICIAN"
                      ? "/lab-technician"
                      : "/dashboard"
                  }
                >
                  {t("landing.goToDashboard")} <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild className="rounded-xl">
                  <Link href="/login">{t("landing.signIn")}</Link>
                </Button>
                <Button asChild className="rounded-xl shadow-sm">
                  <Link href="/register">{t("landing.getStarted")}</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b">
        {/* Subtle gradient backdrop */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-grid dark:bg-grid-dark opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
        {/* Soft blurred glow behind headline */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/4 -z-0 h-[340px] w-[340px] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl dark:bg-primary/30 lg:left-1/4"
        />
        <div className="container relative mx-auto px-4 py-16 md:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            {/* Text column */}
            <motion.div
              className="text-center lg:text-left"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <Badge variant="secondary" className="mb-4 gap-1.5">
                <Lock className="h-3 w-3" /> {t("landing.heroBadge")}
              </Badge>
              <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
                {language === "hi" ? (
                  <>
                    आपका सम्पूर्ण मेडिकल इतिहास,{" "}
                    <span className="text-primary">एक सुरक्षित वॉल्ट में</span>
                  </>
                ) : (
                  <>
                    Your complete medical history,{" "}
                    <span className="text-primary">in one private vault</span>
                  </>
                )}
              </h1>
              <p className="mt-6 text-lg md:text-xl text-foreground/80">
                {t("landing.heroDesc")}
              </p>
              <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row lg:justify-start">
                <Button
                  size="lg"
                  asChild
                  className="w-full rounded-xl shadow-md shadow-primary/30 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/40 sm:w-auto"
                >
                  <Link href="/register">
                    {t("landing.createVault")} <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="w-full rounded-xl border-border bg-background/60 backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-accent sm:w-auto"
                >
                  <Link href="/login">{t("landing.existingAccount")}</Link>
                </Button>
              </div>
              {/* Trust pills */}
              <div className="mt-7 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/60 px-3 py-1.5 text-xs font-medium text-foreground/80 backdrop-blur">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> HIPAA-minded security
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/60 px-3 py-1.5 text-xs font-medium text-foreground/80 backdrop-blur">
                  <Lock className="h-3.5 w-3.5 text-primary" /> You control all access
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/60 px-3 py-1.5 text-xs font-medium text-foreground/80 backdrop-blur">
                  <Languages className="h-3.5 w-3.5 text-primary" /> Multilingual support
                </span>
              </div>
            </motion.div>

            {/* Illustration column */}
            <motion.div
              className="relative order-first lg:order-last"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, ease: "easeOut", delay: 0.15 }}
            >
              <div className="relative mx-auto max-w-md lg:max-w-none">
                {/* Soft glow behind illustration */}
                <div
                  aria-hidden
                  className="absolute inset-6 rounded-full bg-primary/15 blur-3xl dark:bg-primary/25"
                />
                <img
                  src="/hero-illustration.png"
                  alt="MedUnbox organizes your medical records into a single private vault with AI-powered insights, timeline, trends, and sharing"
                  className="relative w-full rounded-2xl"
                  loading="eager"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight">Everything a medical record should be</h2>
          <p className="mt-3 text-muted-foreground">
            Built for patients who want control, and doctors who need clarity.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.45, ease: "easeOut", delay: (i % 3) * 0.08 }}
            >
              <Card className="group relative h-full overflow-hidden border-border/60 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg">
                {/* Top accent bar revealed on hover */}
                <span
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-gradient-to-r from-primary to-primary/60 transition-transform duration-300 group-hover:scale-x-100"
                />
                <CardContent className="p-6">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-t bg-muted/30">
        <div className="container mx-auto px-4 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">How MedUnbox works</h2>
            <p className="mt-3 text-muted-foreground">
              Four steps from a stack of paper to a searchable, shareable medical history.
            </p>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-4">
            {steps.map((s, i) => (
              <motion.div
                key={s.title}
                className="relative"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.45, ease: "easeOut", delay: i * 0.1 }}
              >
                <div className="relative mb-4 h-12">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 font-bold text-lg text-primary-foreground shadow-md shadow-primary/30">
                    {i + 1}
                  </div>
                  {/* Connector line + arrow to next step (desktop only) */}
                  {i < steps.length - 1 && (
                    <div
                      aria-hidden
                      className="pointer-events-none absolute left-12 top-1/2 hidden h-px w-[calc(100%+2rem)] -translate-y-1/2 md:block"
                    >
                      <div className="h-full w-full bg-gradient-to-r from-primary/40 via-primary/20 to-transparent" />
                      <ArrowRight className="absolute right-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-primary/50" />
                    </div>
                  )}
                </div>
                <h3 className="font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Evidence example */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <Badge variant="secondary" className="mb-3">Evidence-first AI</Badge>
            <h2 className="text-3xl font-bold tracking-tight">
              Every AI answer is traceable to the source
            </h2>
            <p className="mt-4 text-muted-foreground">
              When a doctor asks &ldquo;When was the patient&apos;s Hb first below 10?&rdquo;,
              MedUnbox doesn&apos;t guess. It finds the exact report, page, and value —
              and shows the original document.
            </p>
            <ul className="mt-6 space-y-3">
              {evidencePoints.map((p) => (
                <li key={p} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="border-b bg-muted/50 px-4 py-2.5">
                <div className="flex items-center gap-2 text-sm">
                  <Stethoscope className="h-4 w-4 text-primary" />
                  <span className="font-medium">Doctor → Ask My Records</span>
                </div>
              </div>
              <div className="space-y-4 p-4 text-sm">
                <div className="rounded-lg bg-muted/60 p-3">
                  <p className="font-medium">Doctor</p>
                  <p className="mt-1 text-muted-foreground">
                    &ldquo;When was the patient&apos;s Hb first below 10?&rdquo;
                  </p>
                </div>
                <div className="rounded-lg border bg-card p-3">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2" aria-hidden>
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                    </span>
                    <p className="font-medium text-primary">MedUnbox AI</p>
                    <span className="animate-soft-pulse rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                      AI-powered
                    </span>
                  </div>
                  {/* Typing indicator dots */}
                  <div
                    className="mt-2 flex items-center gap-1"
                    aria-label="MedUnbox AI is responding"
                  >
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </div>
                  <p className="mt-3">
                    The first recorded Hb below 10 g/dL was{" "}
                    <strong>9.7 g/dL</strong> in <strong>March 2026</strong>.
                  </p>
                  <div className="mt-3 border-t pt-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Supporting evidence
                    </p>
                    <div className="mt-2 rounded-md border p-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">CBC Report — City Lab</span>
                        <Badge variant="outline" className="text-[10px]">Page 1</Badge>
                      </div>
                      <p className="mt-1 text-muted-foreground">
                        &ldquo;Hemoglobin: 9.7 g/dL (Ref: 12.0–16.0)&rdquo;
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden border-t bg-primary text-primary-foreground">
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-br from-primary-foreground/10 via-transparent to-transparent"
        />
        <div className="container relative mx-auto px-4 py-16 text-center">
          <h2 className="text-3xl font-bold tracking-tight">
            Take control of your medical history today
          </h2>
          <p className="mt-3 text-primary-foreground/80">
            Free to start. Your records stay private — always.
          </p>
          <Button
            size="lg"
            variant="secondary"
            asChild
            className="mt-6 rounded-xl shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg"
          >
            <Link href="/register">
              Create your free vault <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-background mt-auto">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <span className="font-semibold">MedUnbox</span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-5 text-xs text-muted-foreground">
              <Link href="/" className="hover:text-foreground">
                {t("landing.home")}
              </Link>
              <Link href="/about" className="hover:text-foreground">
                {t("landing.about")}
              </Link>
              <Link href="/customer-care" className="hover:text-foreground">
                {t("landing.customerCare")}
              </Link>
              <Link href="/settings" className="hover:text-foreground">
                {t("nav.settings")}
              </Link>
              <Link href="/emergency" className="hover:text-foreground text-red-500 font-medium">
                {t("nav.emergency")}
              </Link>
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            MedUnbox assists with organizing and understanding records. It does not replace
            clinical decision-making. Always consult a qualified healthcare professional.
          </p>
        </div>
      </footer>
    </div>
  )
}

const features = [
  {
    icon: FileText,
    title: "Universal document upload",
    desc: "PDFs, photos, scanned reports, handwritten prescriptions, regional-language documents — MedUnbox reads them all.",
  },
  {
    icon: Activity,
    title: "Longitudinal timeline",
    desc: "Every test, medication, diagnosis, and visit assembled into a single chronological medical history.",
  },
  {
    icon: TrendingUp,
    title: "Trend detection",
    desc: "Automatically spots improving, worsening, stable, and newly-abnormal values across your reports.",
  },
  {
    icon: AlertTriangle,
    title: "Conflict & duplicate detection",
    desc: "Flags contradictory values (e.g. blood group B+ vs O+) and duplicate uploads — never silently resolved.",
  },
  {
    icon: Brain,
    title: "Ask My Records",
    desc: "Doctors ask natural-language questions. Answers are grounded in your actual records with citations.",
  },
  {
    icon: Share2,
    title: "Smart sharing",
    desc: "Grant a doctor temporary, scoped access — by category, by document, for 1 hour to 30 days or until revoked.",
  },
  {
    icon: Stethoscope,
    title: "Quick View & Deep View",
    desc: "Doctors get a concise overview plus the full detailed history, original reports, and AI analysis.",
  },
  {
    icon: Languages,
    title: "Multilingual patient output",
    desc: "Patient-facing summaries in your language, while doctors retain English medical terminology.",
  },
  {
    icon: Lock,
    title: "Private by design",
    desc: "Originals stored privately in ImageKit. API keys never reach the browser. Access enforced server-side.",
  },
]

const steps = [
  { title: "Upload", desc: "Add your medical documents — any format, any language." },
  { title: "Process", desc: "AI extracts structured data with full provenance." },
  { title: "Review", desc: "See your timeline, trends, and flagged conflicts." },
  { title: "Share", desc: "Grant doctors temporary, scoped access when needed." },
]

const evidencePoints = [
  "Every claim cites the source report, page, and exact text.",
  "Doctors can open the original document with one click.",
  "No fabricated information — if records don't contain it, MedUnbox says so.",
  "Provenance is retained for every extracted value.",
]
