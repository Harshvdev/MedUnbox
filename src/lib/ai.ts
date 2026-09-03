/**
 * MedUnbox AI Service
 *
 * Calls Gemini's OpenAI-compatible endpoint directly for document
 * understanding (VLM), medical entity extraction, and grounded Q&A.
 *
 * SECURITY: This module is server-side only. Never import it in client code.
 */

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai'
const GEMINI_MODEL = 'gemini-3.6-flash'

type ChatMessage = {
  role: string
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>
}

type ChatResponseBody = {
  choices?: Array<{ message?: { content?: string } }>
}

export async function chatCompletion(body: {
  messages: ChatMessage[]
  temperature?: number
  max_tokens?: number
}): Promise<ChatResponseBody> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured')

  const response = await fetch(`${GEMINI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model: GEMINI_MODEL, ...body }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Gemini API request failed (${response.status}): ${errorBody.slice(0, 300)}`)
  }

  return response.json()
}

// ============================================================
// VISION: Document OCR + Medical Entity Extraction
// ============================================================

export interface ExtractedDocument {
  rawText: string
  cleanedText: string
  language: string
  confidence: number
  reportDate: string | null
  reportTitle: string | null
  labName: string | null
  values: ExtractedMedicalValue[]
  medications: ExtractedMedication[]
  diagnoses: ExtractedDiagnosis[]
  procedures: string[]
  vitals: ExtractedVital[]
  allergies: ExtractedAllergy[]
  immunizations: ExtractedImmunization[]
}

export interface ExtractedAllergy {
  name: string          // allergen name e.g. "Penicillin", "Peanuts", "Dust"
  severity: string | null  // MILD, MODERATE, SEVERE
  reaction: string | null  // "rash", "anaphylaxis", etc.
}

export interface ExtractedImmunization {
  vaccine: string       // vaccine name e.g. "COVID-19", "Influenza", "Hepatitis B"
  doseNumber: number | null  // dose number (1, 2, 3, booster)
  dateAdministered: string | null  // YYYY-MM-DD or null
  nextDueDate: string | null  // YYYY-MM-DD or null
  manufacturer: string | null
  lotNumber: string | null
  administeredBy: string | null  // doctor/clinic name
}

export interface ExtractedMedicalValue {
  entity: string        // normalized key e.g. HEMOGLOBIN
  label: string         // Hemoglobin
  value: string         // "12.5"
  numericValue: number | null
  unit: string | null   // "g/dL"
  referenceRange: string | null
  status: 'NORMAL' | 'ABNORMAL_LOW' | 'ABNORMAL_HIGH' | 'CRITICAL' | 'UNKNOWN'
  sourceText: string
  pageNumber: number
}

export interface ExtractedMedication {
  name: string
  dosage: string | null
  frequency: string | null
  route: string | null
  startDate: string | null
  endDate: string | null
}

export interface ExtractedDiagnosis {
  name: string
  icdCode: string | null
  severity: string | null
  diagnosedAt: string | null
}

export interface ExtractedVital {
  name: string
  value: string
  unit: string | null
}

/**
 * Process a single document page image with the vision model.
 * Extracts raw text + structured medical entities with provenance.
 *
 * Accepts either a URL or a base64 data URL for the image.
 */
export async function processDocumentPage(
  imageUrl: string,
  pageNumber: number,
  documentCategory: string
): Promise<ExtractedDocument> {

  const prompt = `You are a medical document analysis AI for the MedUnbox platform.
Analyze this medical document page (category: ${documentCategory}, page ${pageNumber}).

Extract ALL information and return ONLY valid JSON (no markdown, no code fences) with this exact structure:
{
  "rawText": "verbatim OCR text of the entire page, preserving line breaks",
  "cleanedText": "cleaned readable text",
  "language": "detected language code (en, hi, mr, ta, te, bn, gu, kn, etc.)",
  "confidence": 0.0-1.0 OCR confidence,
  "reportDate": "YYYY-MM-DD or null",
  "reportTitle": "title of the report or null",
  "labName": "lab/hospital name or null",
  "values": [
    {
      "entity": "UPPER_SNAKE_CASE normalized name e.g. HEMOGLOBIN, HBA1C, CREATININE, TOTAL_CHOLESTEROL, TSH, ESR, PLATELET_COUNT",
      "label": "Human readable label e.g. Hemoglobin",
      "value": "original value string e.g. 12.5",
      "numericValue": 12.5 or null,
      "unit": "g/dL or null",
      "referenceRange": "12.0-16.0 or null",
      "status": "NORMAL|ABNORMAL_LOW|ABNORMAL_HIGH|CRITICAL|UNKNOWN",
      "sourceText": "exact line of text where this value appears"
    }
  ],
  "medications": [
    {"name":"Medication name","dosage":"500mg","frequency":"BD","route":"PO","startDate":null,"endDate":null}
  ],
  "diagnoses": [
    {"name":"Diagnosis","icdCode":null,"severity":"MILD|MODERATE|SEVERE|null","diagnosedAt":"YYYY-MM-DD or null"}
  ],
  "procedures": ["list of procedures mentioned"],
  "vitals": [
    {"name":"Blood Pressure","value":"120/80","unit":"mmHg"}
  ],
  "allergies": [
    {"name":"allergen","severity":"MILD|MODERATE|SEVERE|null","reaction":"reaction description or null"}
  ],
  "immunizations": [
    {"vaccine":"Vaccine name (e.g. COVID-19, Influenza, Hepatitis B)","doseNumber":1,"dateAdministered":"YYYY-MM-DD or null","nextDueDate":"YYYY-MM-DD or null","manufacturer":"manufacturer or null","lotNumber":"lot number or null","administeredBy":"doctor/clinic or null"}
  ]
}

Rules:
- Return ONLY the JSON object.
- Extract every lab value visible, even if outside reference range.
- Normalize entity names to UPPER_SNAKE_CASE.
- If a value is abnormal, set status based on the reference range shown.
- If no reference range is shown, set status to UNKNOWN.
- Preserve exact source text for provenance.
- For allergies: extract drug, food, and environmental allergies. Severity is MILD, MODERATE, SEVERE, or null if unspecified. Reaction is the symptom (e.g. rash, anaphylaxis, swelling) or null if not stated.
- For immunizations/vaccinations: extract vaccine name, dose number (1, 2, 3, or 0 for booster), date administered, next due date if mentioned, manufacturer, lot number, and administering doctor/clinic. Use null for unknown fields.`

  const response = await chatCompletion({
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      },
    ],
  })

  const content = response.choices?.[0]?.message?.content ?? ''
  return parseDocumentResponse(content, pageNumber)
}

function parseDocumentResponse(content: string, pageNumber: number): ExtractedDocument {
  // Strip markdown code fences if present
  let cleaned = content.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  }

  try {
    const parsed = JSON.parse(cleaned)
    return {
      rawText: parsed.rawText ?? '',
      cleanedText: parsed.cleanedText ?? parsed.rawText ?? '',
      language: parsed.language ?? 'en',
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.8,
      reportDate: parsed.reportDate ?? null,
      reportTitle: parsed.reportTitle ?? null,
      labName: parsed.labName ?? null,
      values: (parsed.values ?? []).map((v: ExtractedMedicalValue) => ({
        ...v,
        pageNumber,
      })),
      medications: parsed.medications ?? [],
      diagnoses: parsed.diagnoses ?? [],
      procedures: parsed.procedures ?? [],
      vitals: parsed.vitals ?? [],
      allergies: (parsed.allergies ?? []).map((a: ExtractedAllergy) => ({
        name: a.name ?? "Unknown allergen",
        severity: a.severity ?? null,
        reaction: a.reaction ?? null,
      })),
      immunizations: (parsed.immunizations ?? []).map((i: ExtractedImmunization) => ({
        vaccine: i.vaccine ?? "Unknown vaccine",
        doseNumber: typeof i.doseNumber === "number" ? i.doseNumber : null,
        dateAdministered: i.dateAdministered ?? null,
        nextDueDate: i.nextDueDate ?? null,
        manufacturer: i.manufacturer ?? null,
        lotNumber: i.lotNumber ?? null,
        administeredBy: i.administeredBy ?? null,
      })),
    }
  } catch {
    // If JSON parse fails, treat the raw content as text
    return {
      rawText: content,
      cleanedText: content,
      language: 'en',
      confidence: 0.5,
      reportDate: null,
      reportTitle: null,
      labName: null,
      values: [],
      medications: [],
      diagnoses: [],
      procedures: [],
      vitals: [],
      allergies: [],
      immunizations: [],
    }
  }
}

// ============================================================
// CHAT: Grounded Q&A (Ask My Records)
// ============================================================

export interface GroundedAnswer {
  answer: string
  evidence: EvidenceItem[]
  confidence: number
  grounded: boolean
}

export interface EvidenceItem {
  documentId: string
  documentTitle: string
  pageNumber: number
  snippet: string
  entity: string | null
  value: string | null
  relevance: number
}

export interface RagContext {
  documentId: string
  documentTitle: string
  pageNumber: number
  snippet: string
  entity: string | null
  value: string | null
}

/**
 * Generate a grounded answer to a doctor's question using retrieved context.
 * The answer MUST be based only on the provided patient records.
 */
export async function answerWithEvidence(
  question: string,
  context: RagContext[],
  patientSummary?: string
): Promise<GroundedAnswer> {

  if (context.length === 0) {
    return {
      answer: "I couldn't find any records in this patient's vault that relate to your question. Could you rephrase, or upload the relevant report?",
      evidence: [],
      confidence: 0,
      grounded: false,
    }
  }

  const contextBlock = context
    .map(
      (c, i) =>
        `[${i + 1}] Document: "${c.documentTitle}" | Page ${c.pageNumber}${c.entity ? ` | ${c.entity}: ${c.value ?? ''}` : ''}\n   Excerpt: "${c.snippet}"`
    )
    .join('\n\n')

  const prompt = `You are MedUnbox AI, a medical records assistant for doctors.
Answer the doctor's question using ONLY the patient's records provided below.
Every factual claim in your answer MUST cite the source using [N] notation matching the context entries.
If the records do not contain the answer, say so explicitly. Never use generic medical knowledge to fill gaps.
Keep the answer concise and clinically useful. Preserve exact values, dates, and units from the records.

${patientSummary ? `Patient summary: ${patientSummary}\n` : ''}
Patient records (evidence):
${contextBlock}

Doctor's question: ${question}

Answer (cite sources as [N]):`

  const response = await chatCompletion({
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
    max_tokens: 2000,
  })

  const answer = response.choices?.[0]?.message?.content ?? ''
  const evidence = extractCitedEvidence(answer, context)

  return {
    answer,
    evidence,
    confidence: evidence.length > 0 ? 0.9 : 0.4,
    grounded: evidence.length > 0,
  }
}

function extractCitedEvidence(answer: string, context: RagContext[]): EvidenceItem[] {
  const cited = new Set<number>()
  const regex = /\[(\d+(?:\s*,\s*\d+)*)\]/g
  let match
  while ((match = regex.exec(answer)) !== null) {
    for (const n of match[1].split(',')) {
      cited.add(parseInt(n.trim(), 10))
    }
  }
  const items: EvidenceItem[] = []
  cited.forEach((idx) => {
    const c = context[idx - 1]
    if (c) {
      items.push({
        documentId: c.documentId,
        documentTitle: c.documentTitle,
        pageNumber: c.pageNumber,
        snippet: c.snippet,
        entity: c.entity,
        value: c.value,
        relevance: 1 - (idx - 1) * 0.1,
      })
    }
  })
  return items
}

/**
 * Generate a patient-facing summary of findings in the requested language.
 * Medical test names and medication names stay in English (for clarity),
 * but explanations and context are in the patient's preferred language.
 *
 * This is the multilingual feature from the spec:
 * "Patient-facing summaries in your language, while doctors retain English medical terminology."
 */
export async function generatePatientSummary(
  findings: string,
  language: string
): Promise<string> {
  const langNames: Record<string, string> = {
    en: 'English',
    hi: 'Hindi',
    mr: 'Marathi',
    ta: 'Tamil',
    te: 'Telugu',
    bn: 'Bengali',
    gu: 'Gujarati',
    kn: 'Kannada',
  }
  const langName = langNames[language] ?? 'English'

  const response = await chatCompletion({
    messages: [
      {
        role: 'user',
        content: `You are a caring health assistant for the MedUnbox platform. Write a personalized health summary for a patient based on their records below.

Write in ${langName}. Keep medical test names (e.g. Hemoglobin, HbA1c, Cholesterol) and medication names in English, but explain everything else (context, what it means, recommendations) in ${langName}.

Structure the summary with these sections (use markdown headings ##):

## Your Health Overview
A warm 1-2 sentence greeting and overall assessment.

## Key Findings
3-5 bullet points of the most important findings from their records. Explain what each means in plain language.

## Trends
Mention any improving or worsening trends. Celebrate improvements gently and flag concerns kindly.

## What to Discuss with Your Doctor
2-3 specific questions they should ask their doctor based on the findings.

## Reminders
Any actionable reminders (e.g. "Your HbA1c has been trending up — consider lifestyle changes").

Be empathetic, not alarming. Never diagnose. Always encourage consulting their doctor.

Patient's records:
${findings}`,
      },
    ],
    temperature: 0.4,
    max_tokens: 900,
  })

  return response.choices?.[0]?.message?.content ?? findings
}
