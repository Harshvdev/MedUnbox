/**
 * MedUnbox WebMCP tool catalog
 *
 * Single source of truth for the tools MedUnbox exposes to AI agents:
 *  - `WebMcpProvider` registers these on `document.modelContext` (W3C WebMCP)
 *    so in-browser agents can call them with the user's own session.
 *  - `POST /api/mcp` (MCP JSON-RPC) serves the same catalog to non-browser
 *    agents, executing each call against the app's own API routes with the
 *    caller's session cookie.
 *
 * SECURITY: tools never receive more access than the logged-in user has.
 * Every mapping points at the same endpoints the website UI uses, so all
 * server-side role checks, ownership checks, and validation apply unchanged.
 * This module is CLIENT-SAFE: no db or server-only imports.
 */

export type McpRole = "PATIENT" | "DOCTOR"

export interface McpHttpMapping {
  method: "GET" | "POST" | "PATCH" | "DELETE"
  /** Path template with `:name` placeholders filled from the tool args. */
  path: string
  /** Which arg keys become the JSON body (rest are path/query only). */
  bodyKeys?: string[]
  /** Arg keys forwarded as URL query params instead of the body. */
  queryKeys?: string[]
}

export interface McpToolDef {
  name: string
  description: string
  inputSchema: {
    type: "object"
    properties: Record<string, { type: string; description: string; enum?: string[] }>
    required?: string[]
  }
  roles: McpRole[]
  http: McpHttpMapping
}

const str = (description: string) => ({ type: "string", description })

export const TOOL_CATALOG: McpToolDef[] = [
  // ------------------------------------------------------------- records --
  {
    name: "list_documents",
    description:
      "List the patient's medical documents in the vault (title, category, upload status, extracted-value count).",
    inputSchema: { type: "object", properties: {} },
    roles: ["PATIENT"],
    http: { method: "GET", path: "/api/documents" },
  },
  {
    name: "get_document",
    description:
      "Get one medical document's details: processing status, extracted lab values with reference ranges, source text, and provenance.",
    inputSchema: {
      type: "object",
      properties: { documentId: str("The document id (from list_documents)") },
      required: ["documentId"],
    },
    roles: ["PATIENT"],
    http: { method: "GET", path: "/api/documents/:documentId" },
  },
  {
    name: "search_records",
    description:
      "Full-text search across the patient's medical records (documents, extracted values, medications, timeline).",
    inputSchema: {
      type: "object",
      properties: { query: str("Search text, e.g. 'hemoglobin' or 'Metformin'") },
      required: ["query"],
    },
    roles: ["PATIENT"],
    http: { method: "GET", path: "/api/search", queryKeys: ["q"] },
  },
  {
    name: "get_health_summary",
    description:
      "Get (or generate) the AI health summary of the patient's records in the requested language.",
    inputSchema: {
      type: "object",
      properties: {
        lang: { type: "string", description: "Language code, e.g. en, hi, mr (default en)" },
      },
    },
    roles: ["PATIENT"],
    http: { method: "GET", path: "/api/summary", queryKeys: ["lang"] },
  },
  {
    name: "ask_records",
    description:
      "Ask a natural-language question about the patient's medical records. Returns a grounded answer with cited evidence (document, page, exact source text).",
    inputSchema: {
      type: "object",
      properties: { question: str("Question, e.g. 'What is my latest HbA1c and is it improving?'") },
      required: ["question"],
    },
    roles: ["PATIENT"],
    http: { method: "POST", path: "/api/ask", bodyKeys: ["question"] },
  },
  {
    name: "get_health_score",
    description:
      "Get the patient's computed health score (0-100) with contributing factors (lab values, trends, conditions, medications).",
    inputSchema: { type: "object", properties: {} },
    roles: ["PATIENT"],
    http: { method: "GET", path: "/api/health-score" },
  },
  {
    name: "get_notifications",
    description: "List the patient's current notifications (unresolved conflicts, abnormal values, expiring shares).",
    inputSchema: { type: "object", properties: {} },
    roles: ["PATIENT"],
    http: { method: "GET", path: "/api/notifications" },
  },

  // --------------------------------------------------------- medications --
  {
    name: "get_medications",
    description: "List the patient's medications (name, dosage, frequency, status).",
    inputSchema: { type: "object", properties: {} },
    roles: ["PATIENT"],
    http: { method: "GET", path: "/api/medications" },
  },
  {
    name: "add_medication",
    description: "Add a medication to the patient's schedule.",
    inputSchema: {
      type: "object",
      properties: {
        name: str("Medication name, e.g. Metformin"),
        dosage: str("Dosage, e.g. 500mg"),
        frequency: str("Frequency, e.g. Twice daily"),
        status: { type: "string", description: "ACTIVE (default), COMPLETED, or DISCONTINUED", enum: ["ACTIVE", "DISCONTINUED", "COMPLETED"] },
      },
      required: ["name"],
    },
    roles: ["PATIENT"],
    http: { method: "POST", path: "/api/medications", bodyKeys: ["name", "dosage", "frequency", "status"] },
  },
  {
    name: "update_medication",
    description: "Update a medication (e.g. mark it DISCONTINUED or change dosage).",
    inputSchema: {
      type: "object",
      properties: {
        medicationId: str("Medication id (from get_medications)"),
        dosage: str("New dosage"),
        frequency: str("New frequency"),
        status: { type: "string", description: "New status", enum: ["ACTIVE", "DISCONTINUED", "COMPLETED"] },
      },
      required: ["medicationId"],
    },
    roles: ["PATIENT"],
    http: { method: "PATCH", path: "/api/medications/:medicationId", bodyKeys: ["dosage", "frequency", "status"] },
  },

  // --------------------------------------------------------------- goals --
  {
    name: "get_goals",
    description: "List the patient's health goals with status and progress.",
    inputSchema: { type: "object", properties: {} },
    roles: ["PATIENT"],
    http: { method: "GET", path: "/api/goals" },
  },
  {
    name: "add_goal",
    description: "Create a health goal (lab target, lifestyle change, appointment reminder…).",
    inputSchema: {
      type: "object",
      properties: {
        title: str("Goal title, e.g. 'Lower HbA1c below 6.0'"),
        type: { type: "string", enum: ["MEDICATION_ADHERENCE", "LAB_TARGET", "LIFESTYLE", "APPOINTMENT", "CUSTOM"], description: "Goal type" },
        targetValue: str("Target, e.g. 'HbA1c < 6.0'"),
        currentValue: str("Current value, e.g. '6.4'"),
        dueDate: str("Due date as YYYY-MM-DD"),
      },
      required: ["title", "type"],
    },
    roles: ["PATIENT"],
    http: {
      method: "POST",
      path: "/api/goals",
      bodyKeys: ["title", "type", "targetValue", "currentValue", "dueDate", "description"],
    },
  },
  {
    name: "update_goal",
    description: "Update a health goal's status (mark COMPLETED, PAUSED, resume, …).",
    inputSchema: {
      type: "object",
      properties: {
        goalId: str("Goal id (from get_goals)"),
        status: { type: "string", description: "New status", enum: ["ACTIVE", "COMPLETED", "PAUSED", "MISSED"] },
      },
      required: ["goalId", "status"],
    },
    roles: ["PATIENT"],
    http: { method: "PATCH", path: "/api/goals/:goalId", bodyKeys: ["status"] },
  },

  // -------------------------------------------------------------- profile --
  {
    name: "get_profile",
    description: "Get the patient's profile (name, date of birth, gender, blood group, contact info).",
    inputSchema: { type: "object", properties: {} },
    roles: ["PATIENT"],
    http: { method: "GET", path: "/api/profile" },
  },
  {
    name: "update_profile",
    description: "Update the patient's profile fields (only pass the fields to change).",
    inputSchema: {
      type: "object",
      properties: {
        name: str("Full name"),
        dateOfBirth: str("YYYY-MM-DD"),
        gender: { type: "string", description: "Gender", enum: ["MALE", "FEMALE", "OTHER"] },
        bloodGroup: { type: "string", description: "Blood group", enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] },
        phone: str("Phone number"),
        address: str("Address"),
        emergencyContact: str("Emergency contact line, e.g. 'Wife +91…'"),
      },
    },
    roles: ["PATIENT"],
    http: {
      method: "PATCH",
      path: "/api/profile",
      bodyKeys: ["name", "dateOfBirth", "gender", "bloodGroup", "phone", "address", "emergencyContact"],
    },
  },
  {
    name: "add_immunization",
    description: "Register a vaccination record (creates the timeline event and immunization entry).",
    inputSchema: {
      type: "object",
      properties: {
        vaccine: str("Vaccine name, e.g. Tdap"),
        doseNumber: { type: "number", description: "Dose number (1, 2, 3…)" },
        dateAdministered: str("YYYY-MM-DD"),
        administeredBy: str("Doctor/clinic name"),
        notes: str("Extra notes"),
      },
      required: ["vaccine"],
    },
    roles: ["PATIENT"],
    http: {
      method: "POST",
      path: "/api/immunizations",
      bodyKeys: ["vaccine", "doseNumber", "dateAdministered", "administeredBy", "notes"],
    },
  },

  // -------------------------------------------------------------- sharing --
  {
    name: "get_shares",
    description: "List the patient's doctor shares (who has access, scope, expiry, status).",
    inputSchema: { type: "object", properties: {} },
    roles: ["PATIENT"],
    http: { method: "GET", path: "/api/share" },
  },
  {
    name: "share_with_doctor",
    description:
      "Share the patient's records with a registered doctor. Scope by categories ('ALL' for full access) and duration.",
    inputSchema: {
      type: "object",
      properties: {
        doctorEmail: str("The doctor's MedUnbox email"),
        categories: {
          type: "string",
          description: "Comma-separated categories (LAB_REPORT, PRESCRIPTION, IMAGING, …) or 'ALL' for full access",
        },
        duration: {
          type: "string",
          enum: ["ONE_HOUR", "TWENTY_FOUR_HOURS", "SEVEN_DAYS", "THIRTY_DAYS", "UNTIL_REVOKED"],
          description: "How long access lasts",
        },
      },
      required: ["doctorEmail", "duration"],
    },
    roles: ["PATIENT"],
    http: {
      method: "POST",
      path: "/api/share",
      bodyKeys: ["doctorEmail", "duration", "categoriesRaw"],
      queryKeys: [],
    },
  },
  {
    name: "revoke_share",
    description: "Revoke a doctor's access share immediately.",
    inputSchema: {
      type: "object",
      properties: { shareId: str("Share id (from get_shares)") },
      required: ["shareId"],
    },
    roles: ["PATIENT"],
    http: { method: "DELETE", path: "/api/share/:shareId" },
  },

  // ----------------------------------------------------------- emergency --
  {
    name: "list_emergency_contacts",
    description: "List the patient's emergency-access contacts and their active access codes.",
    inputSchema: { type: "object", properties: {} },
    roles: ["PATIENT"],
    http: { method: "GET", path: "/api/emergency-access" },
  },
  {
    name: "add_emergency_contact",
    description: "Add an emergency-access contact (gets a code that exposes only critical info: blood group, allergies, conditions, active meds).",
    inputSchema: {
      type: "object",
      properties: {
        contactName: str("Contact's name"),
        contactRelation: str("Relationship, e.g. Sister"),
        contactPhone: str("Phone number"),
        contactEmail: str("Email address"),
      },
      required: ["contactName", "contactRelation"],
    },
    roles: ["PATIENT"],
    http: {
      method: "POST",
      path: "/api/emergency-access",
      bodyKeys: ["contactName", "contactRelation", "contactPhone", "contactEmail"],
    },
  },
  {
    name: "delete_emergency_contact",
    description: "Delete an emergency-access contact (its access code stops working).",
    inputSchema: {
      type: "object",
      properties: { contactId: str("Contact id (from list_emergency_contacts)") },
      required: ["contactId"],
    },
    roles: ["PATIENT"],
    http: { method: "DELETE", path: "/api/emergency-access/:contactId" },
  },

  // --------------------------------------------------------------- doctor --
  {
    name: "list_patients",
    description: "List the patients who have actively shared their records with this doctor.",
    inputSchema: { type: "object", properties: {} },
    roles: ["DOCTOR"],
    http: { method: "GET", path: "/api/doctor/patients" },
  },
  {
    name: "ask_patient_records",
    description:
      "As a doctor, ask a natural-language question about a shared patient's records. Returns a grounded answer with cited evidence.",
    inputSchema: {
      type: "object",
      properties: {
        patientId: str("Patient id (from list_patients)"),
        question: str("Clinical question, e.g. 'When was the patient's Hb first below 10?'"),
      },
      required: ["patientId", "question"],
    },
    roles: ["DOCTOR"],
    http: { method: "POST", path: "/api/ask", bodyKeys: ["patientId", "question"] },
  },
  {
    name: "add_patient_note",
    description: "Add a private clinical note about a shared patient.",
    inputSchema: {
      type: "object",
      properties: {
        patientId: str("Patient id (from list_patients)"),
        note: str("Note content"),
        category: { type: "string", enum: ["general", "follow_up", "referral", "alert"], description: "Default general" },
        isPinned: { type: "boolean", description: "Pin the note" },
      },
      required: ["patientId", "note"],
    },
    roles: ["DOCTOR"],
    http: {
      method: "POST",
      path: "/api/doctor/notes",
      bodyKeys: ["patientId", "note", "category", "isPinned"],
    },
  },
  {
    name: "list_patient_notes",
    description: "List this doctor's private clinical notes for a shared patient.",
    inputSchema: {
      type: "object",
      properties: { patientId: str("Patient id (from list_patients)") },
      required: ["patientId"],
    },
    roles: ["DOCTOR"],
    http: { method: "GET", path: "/api/doctor/notes", queryKeys: ["patientId"] },
  },
]

/** Tools available to a role, for client registration and server tools/list. */
export function toolsForRole(role: string | undefined): McpToolDef[] {
  if (role === "DOCTOR") return TOOL_CATALOG.filter((t) => t.roles.includes("DOCTOR"))
  if (role === "PATIENT") return TOOL_CATALOG.filter((t) => t.roles.includes("PATIENT"))
  return []
}

/**
 * Build the fetch request for a tool call.
 * - `:name` path placeholders come from args.
 * - `queryKeys` args become URLSearchParams (with special-cased mapping).
 * - `bodyKeys` args become the JSON body; missing keys are omitted.
 */
export function buildToolRequest(
  tool: McpToolDef,
  rawArgs: Record<string, unknown> | undefined,
  origin: string
): { url: string; init: RequestInit } {
  const args = rawArgs ?? {}
  let path = tool.http.path
  for (const [key, value] of Object.entries(args)) {
    if (path.includes(`:${key}`)) {
      path = path.replace(`:${key}`, encodeURIComponent(String(value)))
    }
  }

  const params = new URLSearchParams()
  const queryKeys = tool.http.queryKeys ?? []
  for (const qk of queryKeys) {
    // `search_records` exposes `query` but the API expects `q`
    const argKey = tool.name === "search_records" && qk === "q" ? "query" : qk
    if (args[argKey] !== undefined && args[argKey] !== null && args[argKey] !== "") {
      params.set(qk, String(args[argKey]))
    }
  }
  // summary: `lang` defaults handled server-side; nothing else needed

  let body: string | undefined
  if (tool.http.method !== "GET" && tool.http.bodyKeys?.length) {
    const payload: Record<string, unknown> = {}
    for (const bk of tool.http.bodyKeys) {
      const value = args[bk]
      if (value === undefined || value === null || value === "") continue
      // share_with_doctor: categories arrive as a comma-separated string,
      // the API expects an array.
      if (bk === "categoriesRaw") {
        const categories = String(value)
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean)
        if (categories.length) payload.categories = categories
        continue
      }
      if (bk === "isPinned") {
        payload.isPinned = Boolean(value)
        continue
      }
      if (bk === "doseNumber") {
        const n = Number(value)
        if (!Number.isNaN(n)) payload.doseNumber = n
        continue
      }
      payload[bk] = value
    }
    if (tool.name === "update_medication" && Object.keys(payload).length === 0) {
      throw new Error("update_medication needs at least one field to update (dosage, frequency, or status)")
    }
    body = JSON.stringify(payload)
  }

  const qs = params.toString()
  const url = `${origin}${path}${qs ? `?${qs}` : ""}`
  const headers: Record<string, string> = { "content-type": "application/json" }
  return {
    url,
    init: { method: tool.http.method, headers, ...(body ? { body } : {}) },
  }
}
