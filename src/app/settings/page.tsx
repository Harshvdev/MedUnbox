"use client"

import { useState, useEffect } from "react"
import {
  User,
  Globe,
  HeartPulse,
  Stethoscope,
  Loader2,
  Save,
  Trash2,
  ShieldAlert,
  CheckCircle2,
  Sparkles,
  Pill,
  FlaskConical,
  Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { useSession, signOut } from "next-auth/react"
import { useLanguage, type Language } from "@/lib/i18n"
import { cn } from "@/lib/utils"

interface ProfileData {
  user: { id: string; name: string | null; email: string; role: string; locale: string }
  patient: {
    id: string
    dateOfBirth: string | null
    gender: string | null
    bloodGroup: string | null
    phone: string | null
    address: string | null
    emergencyContact: string | null
  } | null
  doctor: {
    id: string
    registrationNo: string | null
    specialization: string | null
    hospital: string | null
    phone: string | null
  } | null
  pharmacist?: {
    id: string
    registrationNo: string | null
    pharmacyName: string | null
    phone: string | null
  } | null
  labTechnician?: {
    id: string
    registrationNo: string | null
    labName: string | null
    phone: string | null
  } | null
}

export default function SettingsPage() {
  const { data: session, update: updateSession } = useSession()
  const { language, setLanguage, t } = useLanguage()
  const [data, setData] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        setData(d)
        setForm({
          name: d.user?.name ?? "",
          locale: d.user?.locale ?? language,
          dateOfBirth: d.patient?.dateOfBirth ? d.patient.dateOfBirth.slice(0, 10) : "",
          gender: d.patient?.gender ?? "",
          bloodGroup: d.patient?.bloodGroup ?? "",
          phone:
            d.patient?.phone ??
            d.doctor?.phone ??
            d.pharmacist?.phone ??
            d.labTechnician?.phone ??
            "",
          address: d.patient?.address ?? "",
          emergencyContact: d.patient?.emergencyContact ?? "",
          specialization: d.doctor?.specialization ?? "",
          hospital: d.doctor?.hospital ?? "",
          registrationNo:
            d.doctor?.registrationNo ??
            d.pharmacist?.registrationNo ??
            d.labTechnician?.registrationNo ??
            "",
          pharmacyName: d.pharmacist?.pharmacyName ?? "",
          labName: d.labTechnician?.labName ?? "",
        })
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setLoading(false)
      })
  }, [language])

  function handleLanguageChange(newLang: Language) {
    setLanguage(newLang)
    setForm((prev) => ({ ...prev, locale: newLang }))
    toast.success(
      newLang === "hi"
        ? "भाषा बदलकर हिन्दी कर दी गई है"
        : "Language updated to English"
    )
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error("Failed")
      toast.success(t("settings.saved"))
      setLastSaved(new Date())
      await updateSession({ name: form.name })
    } catch {
      toast.error(t("settings.errorSave"))
    } finally {
      setSaving(false)
    }
  }

  if (loading || !data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center py-12">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    )
  }

  const role = data.user.role
  const isPatient = role === "PATIENT"
  const isDoctor = role === "DOCTOR"
  const isPharmacist = role === "PHARMACIST"
  const isLabTech = role === "LAB_TECHNICIAN"

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {t("settings.title")}
            </h1>
            <Badge variant="secondary" className="text-xs uppercase tracking-wider font-semibold">
              {role.replace("_", " ")}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {t("settings.subtitle")}
          </p>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="shadow-sm gap-2 shrink-0 rounded-xl"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saving ? t("settings.saving") : t("settings.saveChanges")}
        </Button>
      </div>

      {/* Language Preferences Card */}
      <Card className="overflow-hidden border-primary/20 shadow-sm">
        <div className="h-1.5 w-full bg-gradient-to-r from-primary via-primary/70 to-emerald-500" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Globe className="h-4 w-4 text-primary" />
            {t("settings.language")}
          </CardTitle>
          <CardDescription>
            {t("settings.languageDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {/* English Card */}
            <div
              onClick={() => handleLanguageChange("en")}
              className={cn(
                "relative flex flex-col justify-between rounded-xl border p-4 cursor-pointer transition-all hover:border-primary/60 hover:shadow-md",
                language === "en"
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
                  : "border-border bg-card/60"
              )}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-semibold text-sm">English</span>
                  <Badge variant="outline" className="ml-2 text-[10px] font-mono">
                    EN
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {t("settings.langEnDesc")}
                  </p>
                </div>
                {language === "en" && (
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3 w-3" />
                  </div>
                )}
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                Default clinical standard
              </div>
            </div>

            {/* Hindi Card */}
            <div
              onClick={() => handleLanguageChange("hi")}
              className={cn(
                "relative flex flex-col justify-between rounded-xl border p-4 cursor-pointer transition-all hover:border-primary/60 hover:shadow-md",
                language === "hi"
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
                  : "border-border bg-card/60"
              )}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-semibold text-sm">हिन्दी (Hindi)</span>
                  <Badge variant="outline" className="ml-2 text-[10px] font-mono">
                    HI
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {t("settings.langHiDesc")}
                  </p>
                </div>
                {language === "hi" && (
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3 w-3" />
                  </div>
                )}
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                <Sparkles className="h-3 w-3 text-amber-500" />
                AI सारांश एवं नेविगेशन हिन्दी में
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground pt-1">
            {t("settings.languageHelp")}
          </p>
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <User className="h-4 w-4 text-primary" /> {t("settings.account")}
          </CardTitle>
          <CardDescription>{t("settings.accountDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("settings.fullName")}</Label>
            <Input
              id="name"
              value={form.name ?? ""}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{t("settings.email")}</Label>
            <Input
              id="email"
              value={data.user.email}
              disabled
              readOnly
              className="cursor-not-allowed bg-muted/50 opacity-70 rounded-xl"
            />
            <p className="text-xs text-muted-foreground">{t("settings.emailNotice")}</p>
          </div>
        </CardContent>
      </Card>

      {/* Patient Profile Details */}
      {isPatient && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <HeartPulse className="h-4 w-4 text-primary" /> {t("settings.medicalProfile")}
            </CardTitle>
            <CardDescription>{t("settings.medicalProfileDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="dob">{t("settings.dob")}</Label>
                <Input
                  id="dob"
                  type="date"
                  value={form.dateOfBirth ?? ""}
                  onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender">{t("settings.gender")}</Label>
                <Select
                  value={form.gender || "_none"}
                  onValueChange={(v) => setForm({ ...form, gender: v === "_none" ? "" : v })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder={t("settings.genderSelect")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">{t("settings.notSpecified")}</SelectItem>
                    <SelectItem value="MALE">{t("settings.genderMale")}</SelectItem>
                    <SelectItem value="FEMALE">{t("settings.genderFemale")}</SelectItem>
                    <SelectItem value="OTHER">{t("settings.genderOther")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="blood">{t("settings.bloodGroup")}</Label>
                <Select
                  value={form.bloodGroup || "_none"}
                  onValueChange={(v) => setForm({ ...form, bloodGroup: v === "_none" ? "" : v })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">{t("settings.unknown")}</SelectItem>
                    <SelectItem value="A+">A+</SelectItem>
                    <SelectItem value="A-">A-</SelectItem>
                    <SelectItem value="B+">B+</SelectItem>
                    <SelectItem value="B-">B-</SelectItem>
                    <SelectItem value="AB+">AB+</SelectItem>
                    <SelectItem value="AB-">AB-</SelectItem>
                    <SelectItem value="O+">O+</SelectItem>
                    <SelectItem value="O-">O-</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">{t("settings.phone")}</Label>
                <Input
                  id="phone"
                  placeholder="+91..."
                  value={form.phone ?? ""}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="rounded-xl"
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="address">{t("settings.address")}</Label>
              <Input
                id="address"
                placeholder="City, State, Pincode"
                value={form.address ?? ""}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="emergency">{t("settings.emergencyContact")}</Label>
              <Input
                id="emergency"
                placeholder="Contact Name & Mobile (+91)"
                value={form.emergencyContact ?? ""}
                onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })}
                className="rounded-xl"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Doctor Profile Details */}
      {isDoctor && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Stethoscope className="h-4 w-4 text-primary" /> {t("settings.profDetails")}
            </CardTitle>
            <CardDescription>{t("settings.profDetailsDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="reg">{t("settings.regNo")}</Label>
                <Input
                  id="reg"
                  value={form.registrationNo ?? ""}
                  onChange={(e) => setForm({ ...form, registrationNo: e.target.value })}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="spec">{t("settings.specialization")}</Label>
                <Input
                  id="spec"
                  placeholder="e.g. Cardiology, Internal Medicine"
                  value={form.specialization ?? ""}
                  onChange={(e) => setForm({ ...form, specialization: e.target.value })}
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="hosp">{t("settings.hospital")}</Label>
              <Input
                id="hosp"
                value={form.hospital ?? ""}
                onChange={(e) => setForm({ ...form, hospital: e.target.value })}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">{t("settings.phone")}</Label>
              <Input
                id="phone"
                value={form.phone ?? ""}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="rounded-xl"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pharmacist Details */}
      {isPharmacist && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Pill className="h-4 w-4 text-primary" /> Pharmacy Practice Details
            </CardTitle>
            <CardDescription>Your registered pharmacy outlet and license info</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pharmacyName">Pharmacy Name</Label>
                <Input
                  id="pharmacyName"
                  value={form.pharmacyName ?? ""}
                  onChange={(e) => setForm({ ...form, pharmacyName: e.target.value })}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="regNo">Drug License / Registration No.</Label>
                <Input
                  id="regNo"
                  value={form.registrationNo ?? ""}
                  onChange={(e) => setForm({ ...form, registrationNo: e.target.value })}
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">{t("settings.phone")}</Label>
              <Input
                id="phone"
                value={form.phone ?? ""}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="rounded-xl"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lab Technician Details */}
      {isLabTech && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <FlaskConical className="h-4 w-4 text-primary" /> Diagnostic Lab Details
            </CardTitle>
            <CardDescription>Your pathology / diagnostic center credentials</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="labName">Diagnostic Center / Laboratory Name</Label>
                <Input
                  id="labName"
                  value={form.labName ?? ""}
                  onChange={(e) => setForm({ ...form, labName: e.target.value })}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="regNo">NABL / Clinical Registration No.</Label>
                <Input
                  id="regNo"
                  value={form.registrationNo ?? ""}
                  onChange={(e) => setForm({ ...form, registrationNo: e.target.value })}
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">{t("settings.phone")}</Label>
              <Input
                id="phone"
                value={form.phone ?? ""}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="rounded-xl"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save Action Banner */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-card border shadow-sm">
        <div className="text-xs text-muted-foreground">
          {lastSaved ? (
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Last saved at {lastSaved.toLocaleTimeString()}
            </span>
          ) : (
            <span>Make sure to save after updating your preferences.</span>
          )}
        </div>
        <Button onClick={handleSave} disabled={saving} className="rounded-xl shadow-sm gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? t("settings.saving") : t("settings.saveChanges")}
        </Button>
      </div>

      {/* Danger Zone */}
      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-destructive font-semibold">
            <ShieldAlert className="h-4 w-4" /> {t("settings.dangerZone")}
          </CardTitle>
          <CardDescription>{t("settings.dangerDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">{t("settings.deleteAccount")}</p>
              <p className="text-xs text-muted-foreground max-w-md">
                {t("settings.deleteDesc")}
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="shrink-0 rounded-xl">
                  <Trash2 className="h-4 w-4 mr-1.5" /> {t("settings.deleteAccount")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete your account and remove all your medical
                    vault data, documents, and timelines. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
                    onClick={async () => {
                      try {
                        const res = await fetch("/api/profile", { method: "DELETE" })
                        if (res.ok) {
                          toast.success("Account deleted")
                          signOut({ callbackUrl: "/" })
                        }
                      } catch {
                        toast.error("Failed to delete account")
                      }
                    }}
                  >
                    Yes, delete my account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
