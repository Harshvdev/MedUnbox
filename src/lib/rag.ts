import { db } from "@/lib/db"
import { answerWithEvidence, type RagContext } from "@/lib/ai"

/**
 * MedUnbox RAG retrieval (evidence-first)
 *
 * Retrieves relevant context from the patient's records using keyword matching
 * across extracted text, medical values, and timeline events. The LLM then
 * generates a grounded answer with [N] citations.
 *
 * pgvector is provisioned in the schema for future BGE-embedding semantic
 * search. For the MVP we use keyword + value lookup, which works well for
 * medical records with specific terminology.
 */

export async function askMyRecords(
  question: string,
  patientId: string,
  userId: string,
  shareId?: string
): Promise<{
  answer: string
  evidence: Array<{
    documentId: string
    documentTitle: string
    pageNumber: number
    snippet: string
    entity: string | null
    value: string | null
    relevance: number
  }>
  confidence: number
  grounded: boolean
}> {
  const keywords = extractKeywords(question)

  // 1. Search medical values — match any keyword against entity/label/sourceText
  const matchingValues = keywords.length
    ? await db.medicalValue.findMany({
        where: {
          patientId,
          OR: keywords.flatMap((k) => [
            { entity: { contains: k, mode: "insensitive" } },
            { label: { contains: k, mode: "insensitive" } },
            { sourceText: { contains: k, mode: "insensitive" } },
            { value: { contains: k, mode: "insensitive" } },
          ]),
        },
        include: { document: true },
        orderBy: { recordedAt: "desc" },
        take: 25,
      })
    : await db.medicalValue.findMany({
        where: { patientId },
        include: { document: true },
        orderBy: { recordedAt: "desc" },
        take: 25,
      })

  // 2. Search extracted text
  const matchingText = keywords.length
    ? await db.extractedText.findMany({
        where: {
          document: { patientId },
          OR: keywords.map((k) => ({
            cleanedText: { contains: k, mode: "insensitive" as const },
          })),
        },
        include: { document: true },
        take: 15,
      })
    : []

  // 3. Search timeline events
  const matchingEvents = keywords.length
    ? await db.timelineEvent.findMany({
        where: {
          patientId,
          OR: keywords.flatMap((k) => [
            { title: { contains: k, mode: "insensitive" } },
            { description: { contains: k, mode: "insensitive" } },
          ]),
        },
        include: { document: true },
        take: 10,
      })
    : []

  // 4. Build deduplicated context
  const contextMap = new Map<string, RagContext>()

  for (const v of matchingValues) {
    const key = `${v.documentId}-${v.pageNumber}-${v.entity}`
    if (!contextMap.has(key)) {
      contextMap.set(key, {
        documentId: v.documentId,
        documentTitle: v.document.title,
        pageNumber: v.pageNumber,
        snippet: v.sourceText.slice(0, 300),
        entity: v.entity,
        value: `${v.value}${v.unit ? " " + v.unit : ""}`,
      })
    }
  }

  for (const t of matchingText) {
    const key = `${t.documentId}-${t.pageNumber}-text`
    if (!contextMap.has(key)) {
      const snippet = findRelevantSnippet(t.cleanedText, keywords)
      contextMap.set(key, {
        documentId: t.documentId,
        documentTitle: t.document.title,
        pageNumber: t.pageNumber,
        snippet: snippet.slice(0, 400),
        entity: null,
        value: null,
      })
    }
  }

  for (const e of matchingEvents) {
    if (e.sourceDocId) {
      const key = `${e.sourceDocId}-1-event`
      if (!contextMap.has(key)) {
        contextMap.set(key, {
          documentId: e.sourceDocId,
          documentTitle: e.document?.title ?? "Timeline event",
          pageNumber: 1,
          snippet: `${e.title}: ${e.description}`.slice(0, 400),
          entity: null,
          value: null,
        })
      }
    }
  }

  // 3b. Always include the medication list — the list is short, and
  // "what medications..." questions have no keyword to match drug names.
  const medications = await db.medication.findMany({
    where: { patientId },
    orderBy: { createdAt: "desc" },
    take: 10,
  })

  for (const m of medications) {
    if (!m.sourceDocId) continue // evidence rows require a real document FK
    const key = `${m.sourceDocId}-1-med-${m.id}`
    if (!contextMap.has(key)) {
      contextMap.set(key, {
        documentId: m.sourceDocId,
        documentTitle: "Medication list",
        pageNumber: 1,
        snippet:
          `Medication: ${m.name}${m.dosage ? " " + m.dosage : ""}` +
          `${m.frequency ? ", " + m.frequency : ""}` +
          `${m.startDate ? ", started " + m.startDate.toISOString().slice(0, 10) : ""}` +
          ` (status: ${m.status})`,
        entity: "MEDICATION",
        value: m.name,
      })
    }
  }

  let context = Array.from(contextMap.values()).slice(0, 15)

  // Fallback: if no context, pull latest values so the AI can still respond
  if (context.length === 0) {
    const latestValues = await db.medicalValue.findMany({
      where: { patientId },
      include: { document: true },
      orderBy: { recordedAt: "desc" },
      take: 10,
    })
    context = latestValues.map((v) => ({
      documentId: v.documentId,
      documentTitle: v.document.title,
      pageNumber: v.pageNumber,
      snippet: v.sourceText.slice(0, 300),
      entity: v.entity,
      value: `${v.value}${v.unit ? " " + v.unit : ""}`,
    }))
  }

  // 5. Generate grounded answer
  const result = await answerWithEvidence(question, context)

  // 6. Persist query + answer + evidence
  const query = await db.aiQuery.create({
    data: {
      patientId,
      shareId: shareId ?? null,
      userId,
      question,
      context: { contextCount: context.length, keywords } as any,
    },
  })

  const answerRecord = await db.aiAnswer.create({
    data: {
      queryId: query.id,
      answer: result.answer,
      confidence: result.confidence,
      grounded: result.grounded,
    },
  })

  if (result.evidence.length > 0) {
    await db.evidence.createMany({
      data: result.evidence.map((e) => ({
        answerId: answerRecord.id,
        documentId: e.documentId,
        pageNumber: e.pageNumber,
        snippet: e.snippet,
        relevance: e.relevance,
        entity: e.entity,
        value: e.value,
      })),
    })
  }

  return result
}

function extractKeywords(question: string): string[] {
  const stopWords = new Set([
    "the", "a", "an", "is", "was", "were", "are", "when", "what", "which", "how",
    "why", "who", "where", "did", "do", "does", "has", "have", "had", "been",
    "to", "of", "in", "on", "at", "for", "with", "and", "or", "not", "no",
    "patient", "s", "first", "last", "below", "above", "than", "this", "that",
    "my", "his", "her", "their", "i", "me", "you", "your", "show", "tell",
  ])
  return question
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w))
    .slice(0, 10)
}

function findRelevantSnippet(text: string, keywords: string[]): string {
  if (!text) return ""
  const lower = text.toLowerCase()
  for (const kw of keywords) {
    const idx = lower.indexOf(kw.toLowerCase())
    if (idx >= 0) {
      const start = Math.max(0, idx - 100)
      const end = Math.min(text.length, idx + 200)
      return (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "")
    }
  }
  return text.slice(0, 300)
}

async function getAskUserId(shareId?: string): Promise<string | null> {
  if (!shareId) return null
  const share = await db.share.findUnique({
    where: { id: shareId },
    include: { doctor: { include: { user: true } } },
  })
  return share?.doctor?.user?.id ?? null
}
