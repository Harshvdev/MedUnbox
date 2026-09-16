"use client"

import { useState, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"
import {
  ShieldCheck,
  User,
  Phone,
  FileBadge,
  CreditCard,
  KeyRound,
  ArrowRight,
  Loader2,
  Stethoscope,
  Pill,
  FlaskConical,
  CheckCircle2,
  Info,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { toast } from "sonner"
import { ThemeToggle } from "@/components/theme-toggle"
import { cn } from "@/lib/utils"

type UserType = "patient" | "hcp"
type HcpCategory = "DOCTOR" | "PHARMACIST" | "LAB_TECHNICIAN"

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const callbackUrl = params.get("callbackUrl") || "/dashboard"
  const defaultTab = params.get("tab") === "register" ? "register" : "signin"

  // Mode toggles
  const [userType, setUserType] = useState<UserType>("patient")
  const [patientTab, setPatientTab] = useState<"signin" | "register">(defaultTab)
  const [hcpCategory, setHcpCategory] = useState<HcpCategory>("DOCTOR")

  // Patient states
  const [patientName, setPatientName] = useState("")
  const [patientAadhaar, setPatientAadhaar] = useState("")
  const [patientOtp, setPatientOtp] = useState("123456")

  // HCP states
  const [hcpName, setHcpName] = useState("")
  const [hcpPhone, setHcpPhone] = useState("")
  const [hcpRegNo, setHcpRegNo] = useState("")

  const [loading, setLoading] = useState(false)

  // Format Aadhaar with spaces (XXXX XXXX XXXX)
  function handleAadhaarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 12)
    const formatted = raw.replace(/(\d{4})(?=\d)/g, "$1 ")
    setPatientAadhaar(formatted)
  }

  // Handle Patient Sign In
  async function handlePatientSignIn(e: React.FormEvent) {
    e.preventDefault()
    const cleanAadhaar = patientAadhaar.replace(/\s+/g, "")
    if (cleanAadhaar.length !== 12) {
      toast.error("Please enter a valid 12-digit Aadhaar number")
      return
    }
    if (patientOtp.length !== 6) {
      toast.error("Please enter a 6-digit OTP")
      return
    }

    setLoading(true)
    try {
      const res = await signIn("credentials", {
        loginType: "patient",
        aadhaar: cleanAadhaar,
        otp: patientOtp,
        redirect: false,
      })

      if (res?.error) {
        toast.error(res.error === "CredentialsSignin" ? "Invalid Aadhaar number or account not found" : res.error)
        setLoading(false)
        return
      }

      toast.success("Welcome back!")
      router.push(callbackUrl)
      router.refresh()
    } catch {
      toast.error("Something went wrong. Please try again.")
      setLoading(false)
    }
  }

  // Handle Patient Registration
  async function handlePatientRegister(e: React.FormEvent) {
    e.preventDefault()
    const cleanAadhaar = patientAadhaar.replace(/\s+/g, "")
    if (!patientName.trim()) {
      toast.error("Please enter your full name")
      return
    }
    if (cleanAadhaar.length !== 12) {
      toast.error("Please enter a valid 12-digit Aadhaar number")
      return
    }
    if (patientOtp.length !== 6) {
      toast.error("Please enter a 6-digit OTP")
      return
    }

    setLoading(true)
    try {
      const regRes = await fetch("/api/auth/register-aadhaar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: patientName.trim(),
          aadhaar: cleanAadhaar,
          otp: patientOtp,
        }),
      })

      const data = await regRes.json()
      if (!regRes.ok) {
        toast.error(data.error || "Registration failed")
        setLoading(false)
        return
      }

      // Auto sign in after register
      const loginRes = await signIn("credentials", {
        loginType: "patient",
        aadhaar: cleanAadhaar,
        otp: patientOtp,
        redirect: false,
      })

      if (loginRes?.error) {
        toast.error("Account created, please sign in.")
        setPatientTab("signin")
        setLoading(false)
        return
      }

      toast.success("Account created successfully!")
      router.push(callbackUrl)
      router.refresh()
    } catch {
      toast.error("Registration failed. Please try again.")
      setLoading(false)
    }
  }

  // Handle Healthcare Professional Sign In / Auto-Register
  async function handleHcpSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!hcpName.trim()) {
      toast.error("Please enter your full name")
      return
    }
    if (!hcpPhone.trim()) {
      toast.error("Please enter your phone number")
      return
    }
    if (!hcpRegNo.trim()) {
      toast.error("Please enter your professional registration number")
      return
    }

    setLoading(true)
    try {
      const res = await signIn("credentials", {
        loginType: "hcp",
        category: hcpCategory,
        name: hcpName.trim(),
        phone: hcpPhone.trim(),
        registrationNo: hcpRegNo.trim(),
        redirect: false,
      })

      if (res?.error) {
        toast.error(res.error === "CredentialsSignin" ? "Invalid credentials or mismatch with registered details" : res.error)
        setLoading(false)
        return
      }

      // Fetch user session to route to the category dashboard
      const me = await fetch("/api/auth/me").then((x) => x.json())
      const role = me.role || me.user?.role

      toast.success(`Signed in as ${hcpCategory.replace("_", " ")}`)

      if (role === "DOCTOR") {
        router.push("/doctor")
      } else if (role === "PHARMACIST") {
        router.push("/pharmacist")
      } else if (role === "LAB_TECHNICIAN") {
        router.push("/lab-technician")
      } else {
        router.push("/dashboard")
      }
      router.refresh()
    } catch {
      toast.error("Authentication failed. Please try again.")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <span className="font-bold text-lg">MedUnbox</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-lg shadow-lg border-border/70">
          <CardHeader className="space-y-2 text-center pb-4">
            <CardTitle className="text-2xl font-bold tracking-tight">
              Sign in to MedUnbox
            </CardTitle>
            <CardDescription>
              Select your role to access your records or clinical portal
            </CardDescription>

            {/* Role Switcher: Patient vs Healthcare Professional */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-muted/60 rounded-xl mt-3">
              <button
                type="button"
                onClick={() => setUserType("patient")}
                className={cn(
                  "flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all",
                  userType === "patient"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <User className="h-4 w-4" />
                <span>Patient</span>
              </button>
              <button
                type="button"
                onClick={() => setUserType("hcp")}
                className={cn(
                  "flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all",
                  userType === "hcp"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Stethoscope className="h-4 w-4" />
                <span>Healthcare Professional</span>
              </button>
            </div>
          </CardHeader>

          <CardContent className="pt-2">
            {/* ============================================================ */}
            {/* PATIENT TAB: AADHAAR LOGIN / REGISTRATION                   */}
            {/* ============================================================ */}
            {userType === "patient" && (
              <div className="space-y-4">
                <Tabs value={patientTab} onValueChange={(v) => setPatientTab(v as any)} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="signin">Sign In</TabsTrigger>
                    <TabsTrigger value="register">Register</TabsTrigger>
                  </TabsList>

                  {/* Patient Sign In */}
                  <TabsContent value="signin" className="space-y-4">
                    <form onSubmit={handlePatientSignIn} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="aadhaar-signin">12-Digit Aadhaar Number</Label>
                        <div className="relative">
                          <CreditCard className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="aadhaar-signin"
                            placeholder="0000 0000 0000"
                            className="pl-9 font-mono tracking-wider text-base"
                            value={patientAadhaar}
                            onChange={handleAadhaarChange}
                            maxLength={14}
                            required
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Test patient Aadhaar: <span className="font-mono font-medium text-primary">1234 5678 9012</span>
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="otp-signin">6-Digit OTP</Label>
                        <div className="relative">
                          <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="otp-signin"
                            type="text"
                            placeholder="123456"
                            className="pl-9 font-mono tracking-widest text-base"
                            value={patientOtp}
                            onChange={(e) => setPatientOtp(e.target.value.slice(0, 6))}
                            maxLength={6}
                            required
                          />
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500 inline" />
                          Dummy OTP verification: enter any 6 digits (e.g. 123456).
                        </p>
                      </div>

                      <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying Aadhaar...
                          </>
                        ) : (
                          <>
                            Sign in with Aadhaar <ArrowRight className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </form>
                  </TabsContent>

                  {/* Patient Register */}
                  <TabsContent value="register" className="space-y-4">
                    <form onSubmit={handlePatientRegister} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="patient-name">Full Name</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="patient-name"
                            placeholder="John Doe"
                            className="pl-9"
                            value={patientName}
                            onChange={(e) => setPatientName(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="aadhaar-register">12-Digit Aadhaar Number</Label>
                        <div className="relative">
                          <CreditCard className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="aadhaar-register"
                            placeholder="0000 0000 0000"
                            className="pl-9 font-mono tracking-wider text-base"
                            value={patientAadhaar}
                            onChange={handleAadhaarChange}
                            maxLength={14}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="otp-register">6-Digit OTP</Label>
                        <div className="relative">
                          <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="otp-register"
                            type="text"
                            placeholder="123456"
                            className="pl-9 font-mono tracking-widest text-base"
                            value={patientOtp}
                            onChange={(e) => setPatientOtp(e.target.value.slice(0, 6))}
                            maxLength={6}
                            required
                          />
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500 inline" />
                          Dummy OTP verification: enter any 6 digits (e.g. 123456).
                        </p>
                      </div>

                      <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating Vault...
                          </>
                        ) : (
                          <>
                            Register with Aadhaar <ArrowRight className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {/* ============================================================ */}
            {/* HEALTHCARE PROFESSIONAL: 3 CATEGORIES                         */}
            {/* ============================================================ */}
            {userType === "hcp" && (
              <div className="space-y-4">
                {/* 3 Categories Selector */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                    Select Profession Category
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setHcpCategory("DOCTOR")}
                      className={cn(
                        "flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all",
                        hcpCategory === "DOCTOR"
                          ? "border-primary bg-primary/10 text-primary ring-1 ring-primary font-semibold"
                          : "border-border hover:border-primary/40 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Stethoscope className="h-5 w-5 mb-1" />
                      <span className="text-xs">Doctor</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setHcpCategory("PHARMACIST")}
                      className={cn(
                        "flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all",
                        hcpCategory === "PHARMACIST"
                          ? "border-primary bg-primary/10 text-primary ring-1 ring-primary font-semibold"
                          : "border-border hover:border-primary/40 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Pill className="h-5 w-5 mb-1" />
                      <span className="text-xs">Pharmacist</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setHcpCategory("LAB_TECHNICIAN")}
                      className={cn(
                        "flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all",
                        hcpCategory === "LAB_TECHNICIAN"
                          ? "border-primary bg-primary/10 text-primary ring-1 ring-primary font-semibold"
                          : "border-border hover:border-primary/40 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <FlaskConical className="h-5 w-5 mb-1" />
                      <span className="text-xs">Lab Tech</span>
                    </button>
                  </div>
                </div>

                <div className="rounded-lg bg-muted/40 p-2.5 text-xs text-muted-foreground flex items-start gap-2">
                  <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span>
                    First sign-in auto-registers your profile. Subsequent logins authenticate based on exact match of your registration number, name, and phone number.
                  </span>
                </div>

                <form onSubmit={handleHcpSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="hcp-name">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="hcp-name"
                        placeholder={
                          hcpCategory === "DOCTOR"
                            ? "Dr. Sarah Jenkins"
                            : hcpCategory === "PHARMACIST"
                            ? "Alex Reed, RPh"
                            : "Jordan Blake, MLT"
                        }
                        className="pl-9"
                        value={hcpName}
                        onChange={(e) => setHcpName(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hcp-phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="hcp-phone"
                        type="tel"
                        placeholder="9876543210"
                        className="pl-9"
                        value={hcpPhone}
                        onChange={(e) => setHcpPhone(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hcp-regno">
                      {hcpCategory === "DOCTOR"
                        ? "Medical Registration Number"
                        : hcpCategory === "PHARMACIST"
                        ? "Pharmacy Council Registration Number"
                        : "Lab Technician Registration Number"}
                    </Label>
                    <div className="relative">
                      <FileBadge className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="hcp-regno"
                        placeholder={
                          hcpCategory === "DOCTOR"
                            ? "MCI-2015-88492"
                            : hcpCategory === "PHARMACIST"
                            ? "PCI-2018-44910"
                            : "MLT-2020-11203"
                        }
                        className="pl-9 font-mono uppercase"
                        value={hcpRegNo}
                        onChange={(e) => setHcpRegNo(e.target.value)}
                        required
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Registration number is dummy and accepted without external verification.
                    </p>
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Authenticating...
                      </>
                    ) : (
                      <>
                        Sign in as {hcpCategory === "DOCTOR" ? "Doctor" : hcpCategory === "PHARMACIST" ? "Pharmacist" : "Lab Technician"}{" "}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
