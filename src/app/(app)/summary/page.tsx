"use client"

import { useState, useEffect } from "react"
import { Sparkles, Loader2, RefreshCw, Globe, FileText, Pill, Stethoscope, TrendingUp, AlertTriangle, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EmptyState } from "@/components/empty-state"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import Link from "next/link"
import ReactMarkdown from "react-markdown"

const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी (Hindi)" },
  { code: "mr", label: "मराठी (Marathi)" },
  { code: "ta", label: "தமிழ் (Tamil)" },
  { code: "te", label: "తెలుగు (Telugu)" },
  { code: "bn", label: "বাংলা (Bengali)" },
  { code: "gu", label: "ગુજરાતી (Gujarati)" },
  { code: "kn", label: "ಕನ್ನಡ (Kannada)" },
]

interface SummaryResponse {
  summary: string | null
  message?: string
  language: string
  generatedAt?: string
  stats?: {
    diagnoses: number
    medications: number
    values: number
    trends: number
    conflicts: number
    documents: number
  }
}

export default function SummaryPage() {
  const { data: session } = useSession()
  const defaultLang = (session?.user as any)?.locale ?? "en"
  const [language, setLanguage] = useState(defaultLang)
  const [data, setData] = useState<SummaryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function fetchSummary(lang: string, refresh = false) {
    setLoading(true)
    try {
      const res = await fetch(`/api/summary?lang=${lang}${refresh ? "&refresh=true" : ""}`)
      const d = await res.json()
      setData(d)
    } catch {
      toast.error("Failed to generate summary")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSummary(language)
  }, [language])

  async function handleRefresh() {
    setRefreshing(true)
    await fetchSummary(language, true)
    setRefreshing(false)
    toast.success("Summary refreshed")
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="flex items-center gap-1.5 text-sm font-medium text-primary">
            <Sparkles className="h-4 w-4" /> AI-Powered
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">My Health Summary</h1>
          <p className="text-sm text-muted-foreground">
            A personalized, easy-to-understand summary of your medical records in your language
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="h-9 w-44">
              <Globe className="mr-1.5 h-4 w-4 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_LANGUAGES.map((l) => (
                <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing || loading} className="h-9">
            <RefreshCw className={`mr-1.5 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      {data?.stats && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          <StatPill icon={FileText} label="Documents" value={data.stats.documents} />
          <StatPill icon={Stethoscope} label="Conditions" value={data.stats.diagnoses} />
          <StatPill icon={Pill} label="Medications" value={data.stats.medications} />
          <StatPill icon={TrendingUp} label="Trends" value={data.stats.trends} />
          <StatPill icon={AlertTriangle} label="Conflicts" value={data.stats.conflicts} tone={data.stats.conflicts > 0 ? "amber" : "default"} />
          <StatPill icon={FileText} label="Lab Values" value={data.stats.values} />
        </div>
      )}

      {/* Summary card */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Your Personalized Summary</CardTitle>
                <CardDescription className="text-xs">
                  {data?.generatedAt
                    ? `Generated just now in ${SUPPORTED_LANGUAGES.find((l) => l.code === language)?.label}`
                    : "Generating..."}
                </CardDescription>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs gap-1">
              <Globe className="h-3 w-3" /> {language.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-5 py-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>Analyzing your records…</span>
                <span className="text-xs text-muted-foreground/70">This usually takes ~15-20 seconds</span>
              </div>

              {/* Skeleton preview — represents the structure of the generated summary */}
              <div className="space-y-3 animate-pulse" aria-hidden>
                {/* Heading */}
                <div className="h-5 w-1/2 rounded bg-muted" />
                {/* Bullet points */}
                <div className="space-y-2 pl-1">
                  <div className="h-3 w-full rounded bg-muted" />
                  <div className="h-3 w-11/12 rounded bg-muted" />
                  <div className="h-3 w-10/12 rounded bg-muted" />
                  <div className="h-3 w-9/12 rounded bg-muted" />
                </div>
                {/* Another heading */}
                <div className="h-5 w-2/5 rounded bg-muted" />
                {/* Two lines */}
                <div className="space-y-2 pl-1">
                  <div className="h-3 w-full rounded bg-muted" />
                  <div className="h-3 w-8/12 rounded bg-muted" />
                </div>
              </div>
            </div>
          ) : !data?.summary ? (
            <EmptyState
              icon={FileText}
              title="No records to summarize yet"
              description={data?.message ?? "Upload medical documents to get a personalized summary"}
              action={
                <Button asChild>
                  <Link href="/documents">Upload documents <ChevronRight className="ml-1 h-4 w-4" /></Link>
                </Button>
              }
            />
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-semibold prose-headings:text-foreground prose-h2:mt-4 prose-h2:mb-2 prose-h2:text-base prose-p:leading-relaxed prose-li:my-1 prose-ul:my-2">
              <ReactMarkdown>{data.summary}</ReactMarkdown>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="flex items-start gap-2 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <p className="font-medium text-amber-700 dark:text-amber-500">This summary is for your understanding only</p>
            <p className="text-muted-foreground">
              MedUnbox AI organizes and explains your records but does not replace medical advice.
              Always consult a qualified healthcare professional for diagnosis and treatment decisions.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StatPill({ icon: Icon, label, value, tone = "default" }: { icon: any; label: string; value: number; tone?: "default" | "amber" }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card p-2.5">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tone === "amber" && value > 0 ? "bg-amber-500/10" : "bg-primary/10"}`}>
        <Icon className={`h-4 w-4 ${tone === "amber" && value > 0 ? "text-amber-600" : "text-primary"}`} />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-bold tabular-nums leading-none">{value}</p>
        <p className="truncate text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}
