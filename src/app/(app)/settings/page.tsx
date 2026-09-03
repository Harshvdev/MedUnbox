"use client"

import { useState, useEffect } from "react"
import {
  User,
  Globe,
  HeartPulse,
  Stethoscope,
  AlertCircle,
  Loader2,
  Save,
  Trash2,
  ShieldAlert,
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
import { SUPPORTED_LANGUAGES } from "@/lib/constants"
import { useSession } from "next-auth/react"

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
}

export default function SettingsPage() {
  const { data: session, update: updateSession } = useSession()
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
          locale: d.user?.locale ?? "en",
          dateOfBirth: d.patient?.dateOfBirth ? d.patient.dateOfBirth.slice(0, 10) : "",
          gender: d.patient?.gender ?? "",
          bloodGroup: d.patient?.bloodGroup ?? "",
          phone: d.patient?.phone ?? d.doctor?.phone ?? "",
          address: d.patient?.address ?? "",
          emergencyContact: d.patient?.emergencyContact ?? "",
          specialization: d.doctor?.specialization ?? "",
          hospital: d.doctor?.hospital ?? "",
          registrationNo: d.doctor?.registrationNo ?? "",
        })
        setLoading(false)
      })
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error("Failed")
      toast.success("Profile updated")
      setLastSaved(new Date())
      await updateSession({ name: form.name })
    } catch {
      toast.error("Failed to update profile")
    } finally {
      setSaving(false)
    }
  }

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const isPatient = data.user.role === "PATIENT"

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your profile and preferences</p>
      </div>

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" /> Account
          </CardTitle>
          <CardDescription>Your basic account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={data.user.email}
              disabled
              readOnly
              className="cursor-not-allowed bg-muted/50 opacity-60"
            />
            <p className="text-xs text-muted-foreground">Email cannot be changed</p>
          </div>
        </CardContent>
      </Card>

      {/* Language */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4" /> Language
          </CardTitle>
          <CardDescription>
            Patient-facing summaries will be shown in this language. Medical terminology stays in English for doctors.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={form.locale} onValueChange={(v) => setForm({ ...form, locale: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_LANGUAGES.map((l) => (
                <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Patient profile */}
      {isPatient && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <HeartPulse className="h-4 w-4" /> Medical Profile
            </CardTitle>
            <CardDescription>Optional demographic info (helps doctors)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="dob">Date of birth</Label>
                <Input id="dob" type="date" value={form.dateOfBirth ?? ""} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select value={form.gender || "_none"} onValueChange={(v) => setForm({ ...form, gender: v === "_none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Not specified</SelectItem>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="blood">Blood group</Label>
                <Select value={form.bloodGroup || "_none"} onValueChange={(v) => setForm({ ...form, bloodGroup: v === "_none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Unknown</SelectItem>
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
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" placeholder="+91..." value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" placeholder="City, State" value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergency">Emergency contact</Label>
              <Input id="emergency" placeholder="Name + phone" value={form.emergencyContact ?? ""} onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Doctor profile */}
      {!isPatient && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Stethoscope className="h-4 w-4" /> Professional Details
            </CardTitle>
            <CardDescription>Your professional registration and practice details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reg">Registration number</Label>
              <Input id="reg" value={form.registrationNo ?? ""} onChange={(e) => setForm({ ...form, registrationNo: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="spec">Specialization</Label>
              <Input id="spec" placeholder="e.g. Cardiology" value={form.specialization ?? ""} onChange={(e) => setForm({ ...form, specialization: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hosp">Hospital / Clinic</Label>
              <Input id="hosp" value={form.hospital ?? ""} onChange={(e) => setForm({ ...form, hospital: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dphone">Phone</Label>
              <Input id="dphone" value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Danger zone */}
      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <ShieldAlert className="h-4 w-4" /> Danger Zone
          </CardTitle>
          <CardDescription>Irreversible and destructive account actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Delete account</p>
              <p className="text-xs text-muted-foreground">
                Permanently remove your account and all associated medical records. This action cannot be undone.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="shrink-0">
                  <Trash2 className="h-4 w-4" /> Delete account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This feature is not yet available. Account deletion will be implemented
                    in a future release. Please contact support if you need assistance.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Close</AlertDialogCancel>
                  <AlertDialogAction>Got it</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="flex items-start gap-2 p-4 text-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <p className="font-medium text-amber-700 dark:text-amber-500">Medical disclaimer</p>
            <p className="text-muted-foreground">
              MedUnbox assists with organizing and understanding your records. It does not replace
              clinical decision-making. Always consult a qualified healthcare professional.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Sticky bottom action bar */}
      <div className="sticky bottom-0 z-10 -mx-4 border-t bg-background/80 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-end gap-3">
          {lastSaved && (
            <span className="hidden text-xs text-muted-foreground sm:inline">
              Last updated {lastSaved.toLocaleTimeString()}
            </span>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save changes
          </Button>
        </div>
      </div>
    </div>
  )
}
