"use client"

import Link from "next/link"
import { useSession } from "next-auth/react"
import { motion } from "framer-motion"
import {
  ShieldCheck,
  Brain,
  Activity,
  Lock,
  ArrowRight,
  Sparkles,
  Users,
  CheckCircle2,
  FileText,
  Clock,
  Shield,
  HeartPulse,
  Database,
  Eye,
  Server,
  Headphones,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageToggle } from "@/components/language-toggle"
import { useLanguage } from "@/lib/i18n"

export default function AboutPage() {
  const { data: session, status } = useSession()
  const { language, t } = useLanguage()

  const isHindi = language === "hi"

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary/20">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight">MedUnbox</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("landing.home")}
            </Link>
            <Link
              href="/about"
              className="text-primary font-semibold transition-colors"
            >
              {t("landing.about")}
            </Link>
            <Link
              href="/customer-care"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("landing.customerCare")}
            </Link>
          </nav>

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
                  {t("landing.goToDashboard")} <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" asChild className="rounded-xl">
                  <Link href="/login">{t("landing.signIn")}</Link>
                </Button>
                <Button asChild className="rounded-xl shadow-sm">
                  <Link href="/register">{t("landing.getStarted")}</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b py-20 md:py-28">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-emerald-500/5 -z-10" />
        <div className="absolute inset-0 bg-grid dark:bg-grid-dark opacity-40 -z-10" />
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/4 -z-10 h-[380px] w-[380px] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl dark:bg-primary/30"
        />

        <div className="container mx-auto px-4 max-w-5xl text-center space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-4"
          >
            <Badge variant="secondary" className="px-3.5 py-1 text-xs gap-1.5 rounded-full shadow-xs">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              {isHindi ? "मरीज़-स्वामित्व • प्रमाण-आधारित AI वॉल्ट" : "Patient Sovereignty • Evidence-First Health Vault"}
            </Badge>

            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
              {isHindi ? (
                <>
                  आपका स्वास्थ्य इतिहास, <br />
                  <span className="text-primary">आपके पूर्ण नियंत्रण में।</span>
                </>
              ) : (
                <>
                  Medicine without borders, <br />
                  <span className="text-primary">data without compromise.</span>
                </>
              )}
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              {t("about.missionDesc")}
            </p>
          </motion.div>

          {/* Stats Bar */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-8"
          >
            <div className="rounded-2xl border bg-card/70 backdrop-blur p-4 shadow-sm">
              <p className="text-3xl font-extrabold text-primary">100%</p>
              <p className="text-xs text-muted-foreground mt-1">
                {isHindi ? "मरीज़-स्वामित्व व नियंत्रण" : "Patient Controlled Consent"}
              </p>
            </div>
            <div className="rounded-2xl border bg-card/70 backdrop-blur p-4 shadow-sm">
              <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">0</p>
              <p className="text-xs text-muted-foreground mt-1">
                {isHindi ? "शून्य मनगढ़ंत AI दावे (Strict Provenance)" : "Silent AI Hallucinations"}
              </p>
            </div>
            <div className="rounded-2xl border bg-card/70 backdrop-blur p-4 shadow-sm">
              <p className="text-3xl font-extrabold text-sky-600 dark:text-sky-400">256-bit</p>
              <p className="text-xs text-muted-foreground mt-1">
                {isHindi ? "वॉल्ट एन्क्रिप्शन मानक" : "AES Vault Encryption"}
              </p>
            </div>
            <div className="rounded-2xl border bg-card/70 backdrop-blur p-4 shadow-sm">
              <p className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">24/7</p>
              <p className="text-xs text-muted-foreground mt-1">
                {isHindi ? "आपातकालीन त्वरित एक्सेस" : "Instant Emergency Access"}
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Why MedUnbox & The 4 Pillars */}
      <section className="py-20 bg-muted/20 border-b">
        <div className="container mx-auto px-4 max-w-6xl space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-3xl font-bold tracking-tight">
              {isHindi ? "MedUnbox के चार मूल स्तंभ" : "The Four Pillars of MedUnbox"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isHindi
                ? "पारंपरिक स्वास्थ्य सेवा में डेटा अस्पतालों के पास बंधा रहता है। MedUnbox इसे मरीजों के हाथों में लौटाता है।"
                : "Traditional healthcare holds data in hospital siloes. MedUnbox flips the paradigm by placing patients at the absolute center."}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Pillar 1 */}
            <Card className="rounded-2xl border-primary/20 hover:border-primary/50 transition-all hover:shadow-md">
              <CardContent className="p-6 space-y-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Lock className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-bold">{t("about.pillar1Title")}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t("about.pillar1Desc")}
                </p>
                <div className="pt-2 flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-[11px]">
                    {isHindi ? "समय-सीमित टोकन" : "Time-limited tokens"}
                  </Badge>
                  <Badge variant="outline" className="text-[11px]">
                    {isHindi ? "श्रेणीवार अनुमति" : "Scoped categories"}
                  </Badge>
                  <Badge variant="outline" className="text-[11px]">
                    {isHindi ? "तत्काल निरस्तीकरण" : "Instant revocation"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Pillar 2 */}
            <Card className="rounded-2xl border-emerald-500/20 hover:border-emerald-500/50 transition-all hover:shadow-md">
              <CardContent className="p-6 space-y-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Brain className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-bold">{t("about.pillar2Title")}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t("about.pillar2Desc")}
                </p>
                <div className="pt-2 flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-[11px]">
                    {isHindi ? "दस्तावेज़ साक्ष्य उद्धरण" : "Cited document pages"}
                  </Badge>
                  <Badge variant="outline" className="text-[11px]">
                    {isHindi ? "मूल्य सत्यापन" : "Value verification"}
                  </Badge>
                  <Badge variant="outline" className="text-[11px]">
                    {isHindi ? "विरोधाभास पहचान" : "Conflict detection"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Pillar 3 */}
            <Card className="rounded-2xl border-sky-500/20 hover:border-sky-500/50 transition-all hover:shadow-md">
              <CardContent className="p-6 space-y-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
                  <Activity className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-bold">{t("about.pillar3Title")}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t("about.pillar3Desc")}
                </p>
                <div className="pt-2 flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-[11px]">
                    {isHindi ? "दीर्घकालिक चार्ट" : "Longitudinal charts"}
                  </Badge>
                  <Badge variant="outline" className="text-[11px]">
                    {isHindi ? "बायोमार्कर रुझान" : "Biomarker trends"}
                  </Badge>
                  <Badge variant="outline" className="text-[11px]">
                    {isHindi ? "दवा परस्पर प्रभाव" : "Medication alerts"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Pillar 4 */}
            <Card className="rounded-2xl border-amber-500/20 hover:border-amber-500/50 transition-all hover:shadow-md">
              <CardContent className="p-6 space-y-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Shield className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-bold">{t("about.pillar4Title")}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t("about.pillar4Desc")}
                </p>
                <div className="pt-2 flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-[11px]">
                    ABDM Ready
                  </Badge>
                  <Badge variant="outline" className="text-[11px]">
                    DPDP Act 2023
                  </Badge>
                  <Badge variant="outline" className="text-[11px]">
                    FHIR / HL7 Aligned
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Security & Trust Standards */}
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-5xl space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-3xl font-bold tracking-tight">
              {isHindi ? "सुरक्षा एवं गोपनीयता हमारी सर्वोच्च प्राथमिकता है" : "Built for Privacy & Regulatory Compliance"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isHindi
                ? "आपका मेडिकल डेटा अत्यंत संवेदनशील है। हम इसे उच्चतम सुरक्षा मानकों के साथ सुरक्षित रखते हैं।"
                : "Medical data is the most sensitive data in existence. We treat it with institutional-grade security."}
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            <div className="rounded-2xl border p-5 bg-card/60 space-y-2.5">
              <Database className="h-5 w-5 text-primary" />
              <h4 className="font-semibold text-base">
                {isHindi ? "निजी क्लाउड स्टोरेज" : "Private Vault Storage"}
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isHindi
                  ? "सभी मूल मेडिकल दस्तावेज़ सुरक्षित और निजी तौर पर एन्क्रिप्टेड स्टोरेज में रखे जाते हैं।"
                  : "Original documents reside in isolated private buckets. Public URL leakage is structurally prevented."}
              </p>
            </div>

            <div className="rounded-2xl border p-5 bg-card/60 space-y-2.5">
              <Eye className="h-5 w-5 text-primary" />
              <h4 className="font-semibold text-base">
                {isHindi ? "ऑडिट ट्रेल्स एवं पारदर्शिता" : "Immutable Audit Trail"}
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isHindi
                  ? "हर बार जब कोई डॉक्टर या सिस्टम आपके रिकॉर्ड देखता है, तो एक स्थायी ऑडिट लॉग दर्ज होता है।"
                  : "Every share view, report query, and clinical note access is recorded with timestamps and actor ID."}
              </p>
            </div>

            <div className="rounded-2xl border p-5 bg-card/60 space-y-2.5">
              <Server className="h-5 w-5 text-primary" />
              <h4 className="font-semibold text-base">
                {isHindi ? "भूमिका-आधारित अभिगम (RBAC)" : "Role-Based Access"}
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isHindi
                  ? "मरीज़, डॉक्टर, फार्मासिस्ट और लैब तकनीशियन को केवल उनकी अधिकृत कार्यप्रणाली का ही एक्सेस मिलता है।"
                  : "Strict cryptographic separation between Patients, Doctors, Pharmacists, and Diagnostic Lab technicians."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 border-t bg-gradient-to-br from-primary/10 via-background to-primary/5">
        <div className="container mx-auto px-4 max-w-4xl text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            {isHindi
              ? "आज ही अपने मेडिकल रिकॉर्ड्स को सुरक्षित करें"
              : "Take Control of Your Medical Future Today"}
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm md:text-base">
            {isHindi
              ? "MedUnbox हमेशा मरीजों के लिए मुफ़्त और सुरक्षित है। अपने पहले दस्तावेज़ को अपलोड करके शुरुआत करें।"
              : "Experience longitudinal health tracking with zero friction. Free to start, fully private, forever yours."}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button size="lg" asChild className="rounded-xl shadow-md gap-2 w-full sm:w-auto">
              <Link href="/register">
                {isHindi ? "निःशुल्क वॉल्ट बनाएं" : "Create Your Vault"}{" "}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="rounded-xl w-full sm:w-auto">
              <Link href="/customer-care">
                <Headphones className="h-4 w-4 mr-2" />
                {isHindi ? "ग्राहक सेवा से संपर्क करें" : "Contact Customer Care"}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-background mt-auto py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <span className="font-semibold">MedUnbox</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <Link href="/" className="hover:text-foreground">
                {t("landing.home")}
              </Link>
              <Link href="/about" className="hover:text-foreground font-medium text-foreground">
                {t("landing.about")}
              </Link>
              <Link href="/customer-care" className="hover:text-foreground">
                {t("landing.customerCare")}
              </Link>
              <Link href="/settings" className="hover:text-foreground">
                {t("nav.settings")}
              </Link>
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            MedUnbox empowers patients to organize and safely share health records. It does not provide medical advice.
          </p>
        </div>
      </footer>
    </div>
  )
}
