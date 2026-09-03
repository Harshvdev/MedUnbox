"use client"

import { useState, useRef, useEffect, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  Brain,
  Send,
  Loader2,
  FileText,
  Sparkles,
  AlertCircle,
  ExternalLink,
  Users,
  ChevronDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { useQuery } from "@tanstack/react-query"

interface PatientOption {
  shareId: string
  patientId: string
  name: string
  email: string
  expiresAtLabel: string
}

interface Message {
  role: "user" | "assistant"
  content: string
  patientId?: string
  evidence?: Array<{
    documentId: string
    documentTitle: string
    pageNumber: number
    snippet: string
    entity: string | null
    value: string | null
  }>
  grounded?: boolean
  error?: boolean
}

const SUGGESTED_QUESTIONS = [
  "Summarize this patient's key findings",
  "List all current medications and dosages",
  "What are the latest abnormal lab values?",
  "When was the patient's Hb first below 10?",
  "Are there any conflicting values across reports?",
]

function DoctorAskInner() {
  const sp = useSearchParams()
  const initialPatientId = sp.get("patientId") ?? ""

  const { data: patientsData, isLoading: patientsLoading } = useQuery<{ patients: PatientOption[] }>({
    queryKey: ["doctor-patients"],
    queryFn: () => fetch("/api/doctor/patients").then((r) => r.json()),
  })

  const patients = patientsData?.patients ?? []
  const [selectedPatientId, setSelectedPatientId] = useState(initialPatientId)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Default-select the first patient once when the list loads if none pre-selected
  useEffect(() => {
    if (!selectedPatientId && patients.length > 0) {
      setSelectedPatientId(patients[0].patientId)
    }
  }, [patients, selectedPatientId])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading])

  const selectedPatient = patients.find((p) => p.patientId === selectedPatientId)

  async function ask(question: string) {
    if (!question.trim() || loading) return
    if (!selectedPatientId) {
      toast.error("Please select a patient first")
      return
    }
    setInput("")
    setMessages((prev) => [
      ...prev,
      { role: "user", content: question, patientId: selectedPatientId },
    ])
    setLoading(true)

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          patientId: selectedPatientId,
          shareId: selectedPatient?.shareId,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed")

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer,
          patientId: selectedPatientId,
          evidence: data.evidence,
          grounded: data.grounded,
        },
      ])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            err instanceof Error
              ? err.message
              : "Something went wrong",
          error: true,
          patientId: selectedPatientId,
        },
      ])
      toast.error("Failed to get an answer")
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    ask(input)
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
            <Brain className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Ask My Records</h1>
            <p className="text-sm text-muted-foreground">
              Ask questions about a patient&apos;s records — every answer cites its source
            </p>
          </div>
        </div>

        {/* Patient selector */}
        <Card className="mb-4">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Patient
                </p>
                {patientsLoading ? (
                  <p className="text-sm">Loading patients…</p>
                ) : patients.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No active patient shares. Ask a patient to share their records.
                  </p>
                ) : (
                  <Select
                    value={selectedPatientId}
                    onValueChange={(v) => {
                      setSelectedPatientId(v)
                      setMessages([])
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a patient" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map((p) => (
                        <SelectItem key={p.patientId} value={p.patientId}>
                          <div className="flex flex-col">
                            <span className="font-medium">{p.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {p.email} · expires {p.expiresAtLabel}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
            {selectedPatient && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/doctor/patients/${selectedPatient.patientId}`}>
                  View patient <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="flex h-[calc(100vh-380px)] min-h-[400px] flex-col">
          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 scroll-thin">
            {!selectedPatient ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                  <Users className="h-7 w-7 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Select a patient to begin</p>
                  <p className="text-sm text-muted-foreground">
                    Choose a patient with an active share to ask questions about their records
                  </p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <Sparkles className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Ask anything about this patient&apos;s records</p>
                  <p className="text-sm text-muted-foreground">
                    Answers are grounded in the patient&apos;s uploaded documents
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {SUGGESTED_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => ask(q)}
                      disabled={loading}
                      className="rounded-full border bg-card px-3 py-1.5 text-xs transition-colors hover:border-primary hover:bg-accent disabled:opacity-50"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg, i) => (
                  <MessageBubble key={i} message={msg} />
                ))}
                {loading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching records and generating answer…
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t p-3">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  selectedPatient
                    ? `Ask about ${selectedPatient.name}'s records…`
                    : "Select a patient first…"
                }
                disabled={loading || !selectedPatient}
              />
              <Button
                type="submit"
                size="icon"
                disabled={loading || !input.trim() || !selectedPatient}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user"
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-2`}>
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm ${
            isUser
              ? "bg-primary text-primary-foreground"
              : message.error
              ? "bg-destructive/10 text-destructive"
              : "bg-muted"
          }`}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
          {message.grounded === false && !message.error && (
            <div className="mt-2 flex items-center gap-1 border-t border-primary-foreground/20 pt-2 text-xs opacity-90">
              <AlertCircle className="h-3 w-3" /> Not grounded in records
            </div>
          )}
        </div>

        {/* Evidence */}
        {message.evidence && message.evidence.length > 0 && message.patientId && (
          <div className="w-full space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Supporting evidence
            </p>
            {message.evidence.map((ev, i) => (
              <Link
                key={i}
                href={`/doctor/patients/${message.patientId}/documents/${ev.documentId}`}
                className="block rounded-lg border p-2.5 transition-colors hover:border-primary hover:bg-accent"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-xs font-medium">
                    <FileText className="h-3 w-3 text-primary" />
                    {ev.documentTitle}
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    Page {ev.pageNumber}
                  </Badge>
                </div>
                {ev.entity && (
                  <p className="mt-1 text-xs text-primary">
                    {ev.entity}: {ev.value}
                  </p>
                )}
                <p className="mt-1 line-clamp-2 font-mono text-xs text-muted-foreground">
                  &ldquo;{ev.snippet}&rdquo;
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function DoctorAskPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        </div>
      }
    >
      <DoctorAskInner />
    </Suspense>
  )
}
