"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { Brain, Send, Loader2, FileText, Sparkles, AlertCircle, RotateCcw, BookOpen, Clock, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import ReactMarkdown from "react-markdown"
import { motion, AnimatePresence } from "framer-motion"
import { timeAgo } from "@/lib/constants"

interface RecentQuery {
  id: string
  question: string
  createdAt: string
}

interface Message {
  role: "user" | "assistant"
  content: string
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
  "When was my Hb last checked and what was the value?",
  "What medications am I currently taking?",
  "Are there any abnormal lab values in my recent reports?",
  "What is my latest blood sugar / HbA1c trend?",
  "Have any conflicting values been detected across my reports?",
]

export default function AskPage() {
  const { data: session } = useSession()
  const isDoctor = session?.user?.role === "DOCTOR"
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState(false)
  const [recentQueries, setRecentQueries] = useState<RecentQuery[]>([])
  const [dismissedRecent, setDismissedRecent] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading])

  // Fetch recent questions when chat is empty
  useEffect(() => {
    if (messages.length === 0 && !dismissedRecent) {
      fetch("/api/ask")
        .then((r) => r.json())
        .then((data) => {
          if (data.queries) {
            setRecentQueries(data.queries.slice(0, 5))
          }
        })
        .catch(() => {})
    }
  }, [messages.length, dismissedRecent])

  async function ask(question: string) {
    if (!question.trim() || loading) return
    setInput("")
    setMessages((prev) => [...prev, { role: "user", content: question }])
    setLoading(true)

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed")

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer,
          evidence: data.evidence,
          grounded: data.grounded,
        },
      ])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: err instanceof Error ? err.message : "Something went wrong",
          error: true,
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

  function newChat() {
    setMessages([])
    setInput("")
    inputRef.current?.focus()
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mx-auto max-w-3xl">
        {/* Header with New Chat */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Ask My Records</h1>
              <p className="text-sm text-muted-foreground">
                {isDoctor
                  ? "Ask about this patient — answers cite their actual records"
                  : "Ask about your medical records — every answer cites its source"}
              </p>
            </div>
          </div>
          {messages.length > 0 && (
            <Button variant="outline" size="sm" onClick={newChat} className="shrink-0">
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> New Chat
            </Button>
          )}
        </div>

        <Card className="flex h-[calc(100vh-280px)] min-h-[400px] flex-col border-border/60">
          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 scroll-thin">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10"
                >
                  <Sparkles className="h-7 w-7 text-primary" />
                </motion.div>
                <div>
                  <p className="font-medium">Ask anything about your records</p>
                  <p className="text-sm text-muted-foreground">
                    I&apos;ll find the answer in your uploaded documents
                  </p>
                </div>

                {/* Recent Questions */}
                {recentQueries.length > 0 && (
                  <div className="w-full max-w-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <Clock className="h-3 w-3" /> Recent Questions
                      </p>
                      <button
                        onClick={() => setDismissedRecent(true)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      {recentQueries.map((q, i) => (
                        <motion.button
                          key={q.id}
                          onClick={() => ask(q.question)}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="flex w-full items-center gap-3 rounded-lg border border-border/50 bg-card px-3 py-2 text-left transition-colors hover:border-primary hover:bg-accent"
                        >
                          <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="min-w-0 flex-1 truncate text-sm">{q.question}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(q.createdAt)}</span>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap justify-center gap-2">
                  {SUGGESTED_QUESTIONS.map((q, i) => (
                    <motion.button
                      key={q}
                      onClick={() => ask(q)}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + i * 0.05 }}
                      className="flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs transition-colors hover:border-primary hover:bg-accent"
                    >
                      <BookOpen className="h-3 w-3 text-primary" />
                      {q}
                    </motion.button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <AnimatePresence initial={false}>
                  {messages.map((msg, i) => (
                    <MessageBubble key={i} message={msg} isDoctor={isDoctor} />
                  ))}
                </AnimatePresence>
                {loading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <div className="flex gap-1">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:0ms]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:150ms]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:300ms]" />
                    </div>
                    Searching records and generating answer...
                  </motion.div>
                )}
              </div>
            )}
          </div>

          {/* Input with focus glow */}
          <div className="border-t p-3">
            <form onSubmit={handleSubmit}>
              <div
                className={`flex items-center gap-2 rounded-xl border-2 transition-all ${
                  focused ? "border-primary ring-2 ring-primary/20" : "border-border"
                }`}
              >
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder="Ask about your medical records..."
                  disabled={loading}
                  className="border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={loading || !input.trim()}
                  className="mr-1 shrink-0"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
              <p className="mt-1.5 px-1 text-center text-[10px] text-muted-foreground/60">
                Press <kbd className="rounded border bg-muted px-1 py-0.5 text-[9px] font-mono">Enter</kbd> to send · Answers are grounded in your records
              </p>
            </form>
          </div>
        </Card>
      </div>
    </div>
  )
}

function MessageBubble({ message, isDoctor }: { message: Message; isDoctor: boolean }) {
  const isUser = message.role === "user"
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div className={`max-w-[85%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-2`}>
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm ${
            isUser
              ? "bg-primary text-primary-foreground rounded-br-md"
              : message.error
              ? "bg-destructive/10 text-destructive rounded-bl-md"
              : "bg-muted rounded-bl-md"
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-p:leading-relaxed">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
          {message.grounded === false && !message.error && (
            <div className="mt-2 flex items-center gap-1 border-t border-primary-foreground/20 pt-2 text-xs opacity-90">
              <AlertCircle className="h-3 w-3" /> Not grounded in records
            </div>
          )}
        </div>

        {/* Evidence */}
        {message.evidence && message.evidence.length > 0 && (
          <div className="w-full space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Supporting evidence
            </p>
            {message.evidence.map((ev, i) => (
              <Link
                key={i}
                href={isDoctor ? `/doctor/patients/${ev.documentId}` : `/documents/${ev.documentId}`}
                className="block rounded-lg border border-border/60 bg-card p-2.5 transition-all hover:border-primary hover:bg-accent hover:shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-xs font-medium">
                    <FileText className="h-3 w-3 text-primary" />
                    {ev.documentTitle}
                  </span>
                  <Badge variant="outline" className="text-[10px]">Page {ev.pageNumber}</Badge>
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
    </motion.div>
  )
}
