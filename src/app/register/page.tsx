"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import {
  ShieldCheck,
  Mail,
  Lock,
  User,
  ArrowRight,
  Loader2,
  Stethoscope,
  HeartPulse,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { toast } from "sonner"
import { ThemeToggle } from "@/components/theme-toggle"
import { cn } from "@/lib/utils"

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<"PATIENT" | "DOCTOR">("PATIENT")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Failed to create account")
        setLoading(false)
        return
      }
      // Auto sign-in
      await signIn("credentials", { email, password, redirect: false })
      toast.success("Account created!")
      if (role === "DOCTOR") router.push("/doctor")
      else router.push("/dashboard")
      router.refresh()
    } catch {
      toast.error("Something went wrong")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <span className="font-bold">MedUnbox</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Create your account</CardTitle>
            <CardDescription>
              Join MedUnbox to build your private medical vault
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Role selector */}
            <div className="mb-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole("PATIENT")}
                className={cn(
                  "rounded-lg border p-3 text-left transition-all hover:border-primary/50",
                  role === "PATIENT" && "border-primary bg-primary/5 ring-1 ring-primary"
                )}
              >
                <HeartPulse className={cn("h-5 w-5", role === "PATIENT" ? "text-primary" : "text-muted-foreground")} />
                <p className="mt-1.5 text-sm font-medium">I&apos;m a Patient</p>
                <p className="text-xs text-muted-foreground">Manage my medical records</p>
              </button>
              <button
                type="button"
                onClick={() => setRole("DOCTOR")}
                className={cn(
                  "rounded-lg border p-3 text-left transition-all hover:border-primary/50",
                  role === "DOCTOR" && "border-primary bg-primary/5 ring-1 ring-primary"
                )}
              >
                <Stethoscope className={cn("h-5 w-5", role === "DOCTOR" ? "text-primary" : "text-muted-foreground")} />
                <p className="mt-1.5 text-sm font-medium">I&apos;m a Doctor</p>
                <p className="text-xs text-muted-foreground">Access shared records</p>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="name"
                    placeholder="Dr. Jane Smith"
                    className="pl-9"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    className="pl-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="At least 8 characters"
                    className="pl-9"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating account...
                  </>
                ) : (
                  <>
                    Create account <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
