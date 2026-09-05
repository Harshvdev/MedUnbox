import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/session"
import { buildToolRequest, toolsForRole, type McpToolDef } from "@/lib/webmcp/catalog"

/**
 * MedUnbox MCP endpoint (Model Context Protocol, Streamable HTTP transport)
 *
 * Lets non-browser AI agents (CLI agents, Claude Desktop, MCP clients) drive
 * the website through the exact same API routes the UI uses. Auth is the
 * caller's NextAuth session cookie — log in via /api/auth/callback/credentials
 * first (see AGENTS.md) and send the cookie with every request.
 *
 * JSON-RPC methods: initialize, notifications/initialized, tools/list,
 * tools/call, ping. GET returns 405 (no server->client stream; permitted by
 * the MCP spec for servers without server-initiated messages).
 *
 * SECURITY: every tools/call executes with the caller's own session, so all
 * role checks and ownership checks on the underlying API routes apply.
 */

const SUPPORTED_PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"]
const SERVER_PROTOCOL_VERSION = "2025-06-18"
const SERVER_INFO = { name: "medunbox", title: "MedUnbox Medical Vault", version: "0.2.1" }

const JSONRPC_ERRORS = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL: -32603,
} as const

function jsonRpcResult(id: string | number | null, result: unknown) {
  return { jsonrpc: "2.0", id, result }
}
function jsonRpcError(id: string | number | null, code: number, message: string) {
  return { jsonrpc: "2.0", id, error: { code, message } }
}

interface JsonRpcMessage {
  jsonrpc?: string
  id?: string | number | null
  method?: string
  params?: Record<string, unknown>
}

/** Execute a tool by calling the app's own API route with the caller's cookies. */
async function executeTool(
  tool: McpToolDef,
  args: Record<string, unknown>,
  origin: string,
  cookie: string
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  try {
    const { url, init } = buildToolRequest(tool, args, origin)
    const res = await fetch(url, { ...init, headers: { ...init.headers, cookie } })
    const text = await res.text()
    let parsed: unknown = null
    try {
      parsed = JSON.parse(text)
    } catch {
      parsed = text
    }
    if (!res.ok) {
      const apiError =
        parsed && typeof parsed === "object" && "error" in parsed && typeof (parsed as { error: unknown }).error === "string"
          ? (parsed as { error: string }).error
          : null
      return {
        content: [{ type: "text", text: JSON.stringify({ status: res.status, error: apiError ?? "Request failed" }, null, 2) }],
        isError: true,
      }
    }
    return { content: [{ type: "text", text: JSON.stringify(parsed, null, 2) }] }
  } catch (err) {
    return {
      content: [{ type: "text", text: `Tool execution failed: ${err instanceof Error ? err.message : "Unknown error"}` }],
      isError: true,
    }
  }
}

async function handleMessage(
  message: JsonRpcMessage,
  role: string,
  req: NextRequest
): Promise<Record<string, unknown> | null> {
  const id = message.id ?? null
  const isNotification = message.id === undefined || message.id === null
  const method = message.method ?? ""
  const params = message.params ?? {}

  switch (method) {
    case "initialize": {
      const requested = typeof params.protocolVersion === "string" ? params.protocolVersion : SERVER_PROTOCOL_VERSION
      const version = SUPPORTED_PROTOCOL_VERSIONS.includes(requested) ? requested : SERVER_PROTOCOL_VERSION
      return jsonRpcResult(id, {
        protocolVersion: version,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions:
          "MedUnbox is a patient-controlled medical-record platform. Tools are role-scoped: patients manage their vault (documents, medications, goals, sharing, AI summaries); doctors work with shared patients. AI tools (ask/summary) return answers grounded in the actual records with citations.",
      })
    }
    case "notifications/initialized":
      return null
    case "ping":
      return isNotification ? null : jsonRpcResult(id, {})
    case "tools/list": {
      const tools = toolsForRole(role).map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
      }))
      return jsonRpcResult(id, { tools })
    }
    case "tools/call": {
      const name = typeof params.name === "string" ? params.name : ""
      const tool = toolsForRole(role).find((t) => t.name === name)
      if (!tool) {
        return isNotification
          ? null
          : jsonRpcError(id, JSONRPC_ERRORS.INVALID_PARAMS, `Unknown tool: ${name || "(missing)"}`)
      }
      const args = (params.arguments && typeof params.arguments === "object" ? params.arguments : {}) as Record<string, unknown>
      const result = await executeTool(tool, args, req.nextUrl.origin, req.headers.get("cookie") ?? "")
      return isNotification ? null : jsonRpcResult(id, result)
    }
    default:
      return isNotification
        ? null
        : jsonRpcError(id, JSONRPC_ERRORS.METHOD_NOT_FOUND, `Method not supported: ${method}`)
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json(
      jsonRpcError(null, JSONRPC_ERRORS.INTERNAL, "Unauthorized: log in first (see AGENTS.md)"),
      { status: 401 }
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(jsonRpcError(null, JSONRPC_ERRORS.PARSE_ERROR, "Invalid JSON"), { status: 400 })
  }

  const isArray = Array.isArray(body)
  const list: unknown[] = isArray ? (body as unknown[]) : [body]
  const messages: JsonRpcMessage[] = list.filter(
    (m): m is JsonRpcMessage => !!m && typeof m === "object"
  )

  const responses: Array<Record<string, unknown>> = []
  for (const message of messages) {
    const response = await handleMessage(message, user.role, req)
    if (response) responses.push(response)
  }

  if (responses.length === 0) {
    // Only notifications — no response body required by JSON-RPC / MCP.
    return new NextResponse(null, { status: 202 })
  }
  return NextResponse.json(isArray ? responses : (responses[0] as Record<string, unknown>))
}

export async function GET() {
  return NextResponse.json(
    { error: "SSE streaming not supported. POST JSON-RPC requests to /api/mcp." },
    { status: 405, headers: { Allow: "POST" } }
  )
}
