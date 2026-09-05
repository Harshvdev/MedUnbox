# AGENTS.md — Using MedUnbox as an AI Agent

MedUnbox is a patient-controlled medical-record platform (Next.js + Prisma/PostgreSQL).
Patients manage a vault of medical documents with AI-extracted values; doctors access
records explicitly shared with them. The site exposes its capabilities to AI agents in
two ways:

1. **WebMCP (in-browser)** — pages register tools on `document.modelContext` (W3C WebMCP
   proposal). Tools execute with the logged-in user's session.
2. **MCP over HTTP** — `POST /api/mcp` speaks MCP JSON-RPC (Streamable HTTP style) so
   CLI agents and MCP clients can drive the site with a session cookie.

Both transports share one tool catalog (`src/lib/webmcp/catalog.ts`), are role-scoped
(PATIENT vs DOCTOR), and every tool call runs through the same API routes the UI uses —
so all authorization, ownership, and validation rules apply unchanged.

---

## Transport B: MCP over HTTP (recommended for CLI agents)

### 1. Log in and keep the session cookie

```bash
BASE=http://localhost:3000
JAR=/tmp/medunbox-cookies.txt

CSRF=$(curl -s -c $JAR $BASE/api/auth/csrf | python3 -c "import sys,json;print(json.load(sys.stdin)['csrfToken'])")
curl -s -b $JAR -c $JAR -X POST $BASE/api/auth/callback/credentials \
  -d "csrfToken=$CSRF&email=seedtest@medunbox.test&password=Test@1234"
```

Test accounts (see "Test data" below): patient `seedtest@medunbox.test` / `Test@1234`,
doctor `qa.doctor@medunbox.test` / `Test@1234`.

### 2. Speak JSON-RPC to `/api/mcp`

```bash
# initialize
curl -s -b $JAR -X POST $BASE/api/mcp -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"my-agent","version":"1.0"}}}'

# list tools (role-scoped: 22 for a patient, 4 for a doctor)
curl -s -b $JAR -X POST $BASE/api/mcp -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'

# call a tool
curl -s -b $JAR -X POST $BASE/api/mcp -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get_goals","arguments":{}}}'
```

Tool results come back as MCP content blocks:
`{ "result": { "content": [ { "type": "text", "text": "<JSON payload>" } ], "isError": false } }`.
Application-level failures (validation, not-found, AI quota) set `isError: true` with the
error payload inside; protocol problems are JSON-RPC errors.

Supported methods: `initialize`, `notifications/initialized`, `tools/list`, `tools/call`,
`ping`. `GET /api/mcp` returns 405 (no server→client stream).

### 3. MCP client configuration

Any MCP client that supports Streamable HTTP can connect by proxying JSON-RPC to the
endpoint, e.g. with `mcp-remote`:

```json
{
  "mcpServers": {
    "medunbox": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "http://localhost:3000/api/mcp"]
    }
  }
}
```

---

## Transport A: WebMCP in the browser

When any authenticated MedUnbox page loads, a provider component registers the user's
tools on the page Model Context:

- `document.modelContext.getTools()` — list tool descriptors (name, description, inputSchema)
- `document.modelContext.executeTool(name, args)` — execute; resolves with the API's JSON
- `document.modelContext.registerTool(...)` / `toolchange` events — spec-shaped

Browsers with the native Chrome WebMCP preview use the native implementation; elsewhere
MedUnbox installs a spec-shaped fallback so page-context agents, extension bridges, and
automation scripts get the identical surface. Tools execute same-origin with the user's
session cookie, inheriting all server-side permissions.

---

## Tool inventory

### Patient role (22 tools)

| Tool | What it does |
| --- | --- |
| `list_documents` | List vault documents (status, category, extracted-value counts) |
| `get_document` | Document detail: extracted values, reference ranges, provenance |
| `search_records` | Full-text search across records |
| `get_health_summary` | AI health summary (`lang`: en, hi, mr, …) |
| `ask_records` | Grounded Q&A over the records, with cited evidence |
| `get_health_score` | 0–100 score with contributing factors |
| `get_notifications` | Conflicts, abnormal values, expiring shares |
| `get_medications` / `add_medication` / `update_medication` | Medication CRUD |
| `get_goals` / `add_goal` / `update_goal` | Health-goal CRUD |
| `get_profile` / `update_profile` | Profile read/update (validated enums for gender/blood group) |
| `add_immunization` | Register a vaccination (timeline + immunization entry) |
| `get_shares` / `share_with_doctor` / `revoke_share` | Manage doctor access (scope + duration) |
| `list_emergency_contacts` / `add_emergency_contact` / `delete_emergency_contact` | Emergency access codes |

### Doctor role (4 tools)

| Tool | What it does |
| --- | --- |
| `list_patients` | Patients with an active share |
| `ask_patient_records` | Grounded Q&A over a shared patient's records |
| `add_patient_note` / `list_patient_notes` | Private clinical notes |

Notes:
- `share_with_doctor.categories` is a comma-separated list (`"LAB_REPORT,PRESCRIPTION"`)
  or `"ALL"`; `duration` is one of `ONE_HOUR`, `TWENTY_FOUR_HOURS`, `SEVEN_DAYS`,
  `THIRTY_DAYS`, `UNTIL_REVOKED`. The doctor must already be registered on MedUnbox.
- AI tools (`ask_records`, `ask_patient_records`, `get_health_summary`) call Gemini and
  can fail with a quota/rate-limit error (`isError: true`, HTTP 429); retry after a pause.
- Sensitive endpoints are rate-limited (login, register, upload, ask, summary, shares,
  emergency contacts, the public emergency view). HTTP 429 responses include a
  `Retry-After` header — respect it instead of retrying immediately. Doctor Ask
  answers only ever cite records inside the share's scope (a PARTIAL share cannot
  retrieve values from unshared categories).

---

## Test data

`bun scripts/seed-test-data.ts` seeds a patient account with synthetic lab reports:

- Patient: `seedtest@medunbox.test` / `Test@1234` (4 documents, timeline, trends, meds)
- Doctor: `qa.doctor@medunbox.test` / `Test@1234` (already has an active full-access share)
- Second patient (for cross-account checks): `qa.patient2@medunbox.test` / `Test@1234`

The dev server runs on port 3000 (`bun run dev`). Regenerate the Prisma client with
`bun run db:generate` after schema changes.
