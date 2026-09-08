/**
 * WebMCP support for MedUnbox
 *
 * Registers MedUnbox tools on the page's Model Context (the W3C WebMCP
 * proposal API, `document.modelContext`) so AI agents running in the browser
 * (Chrome's early preview, extension bridges, in-page assistants) can discover
 * and execute site capabilities directly, with the user's own session.
 *
 * When the browser does not implement the API yet, we install a small,
 * spec-shaped fallback provider on `document.modelContext` so the exact same
 * surface (`registerTool`, `getTools`, `executeTool`, `toolchange`) is always
 * available to page-context agents and automation.
 */

"use client"

import { useEffect } from "react"
import { buildToolRequest, toolsForRole, type McpToolDef } from "@/lib/webmcp/catalog"

interface ModelContextToolHandle {
  unregister: () => void
}

interface ModelContextLike {
  registerTool: (
    tool: {
      name: string
      description: string
      inputSchema: McpToolDef["inputSchema"]
      execute: (args: Record<string, unknown>) => Promise<unknown>
    },
    options?: { signal?: AbortSignal }
  ) => ModelContextToolHandle | void
  getTools?: () => Array<{ name: string; description: string; inputSchema: unknown }>
  executeTool?: (name: string, args: Record<string, unknown>) => Promise<unknown>
  clear?: () => void
}

function getModelContext(): ModelContextLike | null {
  if (typeof document === "undefined") return null
  const doc = document as Document & { modelContext?: ModelContextLike }
  const nav = navigator as Navigator & { modelContext?: ModelContextLike }
  return doc.modelContext ?? nav.modelContext ?? null
}

// ------------------------------------------------------------------
// Fallback provider (used when the browser has no native WebMCP yet)
// ------------------------------------------------------------------

interface FallbackRegistry {
  tools: Map<string, { name: string; description: string; inputSchema: unknown; execute: (args: Record<string, unknown>) => Promise<unknown> }>
  listeners: Set<() => void>
}

declare global {
  interface Window {
    __medunboxModelContext?: FallbackRegistry
  }
}

function fallbackRegistry(): FallbackRegistry {
  if (!window.__medunboxModelContext) {
    window.__medunboxModelContext = { tools: new Map(), listeners: new Set() }
  }
  return window.__medunboxModelContext
}

function installFallback(): ModelContextLike {
  const doc = document as Document & { modelContext?: ModelContextLike }
  if (doc.modelContext) return doc.modelContext
  const reg = fallbackRegistry()
  const notify = () => reg.listeners.forEach((fn) => fn())

  doc.modelContext = {
    registerTool(tool, options) {
      reg.tools.set(tool.name, tool)
      notify()
      if (options?.signal) {
        options.signal.addEventListener("abort", () => {
          reg.tools.delete(tool.name)
          notify()
        })
      }
      return { unregister: () => { reg.tools.delete(tool.name); notify() } }
    },
    getTools() {
      return Array.from(reg.tools.values()).map(({ execute, ...meta }) => meta)
    },
    async executeTool(name, args) {
      const tool = reg.tools.get(name)
      if (!tool) throw new Error(`Unknown tool: ${name}`)
      return tool.execute(args ?? {})
    },
  }
  return doc.modelContext
}

function isFallback(ctx: ModelContextLike): boolean {
  return typeof window !== "undefined" && window.__medunboxModelContext !== undefined && ctx === (document as Document & { modelContext?: ModelContextLike }).modelContext
}

// ------------------------------------------------------------------

async function executeToolOverHttp(tool: McpToolDef, args: Record<string, unknown>): Promise<unknown> {
  const { url, init } = buildToolRequest(tool, args, window.location.origin)
  const res = await fetch(url, init)
  const text = await res.text()
  let parsed: unknown = null
  try {
    parsed = JSON.parse(text)
  } catch {
    parsed = text
  }
  if (!res.ok) {
    const message =
      (parsed && typeof parsed === "object" && "error" in parsed && typeof (parsed as { error: unknown }).error === "string"
        ? (parsed as { error: string }).error
        : null) ?? `Request failed with ${res.status}`
    throw new Error(`${tool.name} failed: ${message}`)
  }
  return parsed
}

export function WebMcpProvider() {
  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    const registered: ModelContextToolHandle[] = []

    async function register() {
      // Resolve the session role first — tools are role-scoped.
      let role: string | undefined
      try {
        const res = await fetch("/api/auth/session", { signal: controller.signal })
        const session = await res.json()
        role = session?.user?.role
      } catch {
        return
      }
      if (cancelled) return

      const ctx = getModelContext() ?? installFallback()
      const tools = toolsForRole(role)
      for (const tool of tools) {
        if (cancelled) return
        const handle = ctx.registerTool(
          {
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
            execute: (args) => executeToolOverHttp(tool, args ?? {}),
          },
          { signal: controller.signal }
        )
        if (handle) registered.push(handle)
      }

      // Spec: agents may listen for `toolchange` to (re)discover tools.
      if (isFallback(ctx)) {
        document.dispatchEvent(new CustomEvent("toolchange"))
      }
    }

    register()

    return () => {
      cancelled = true
      controller.abort()
      for (const handle of registered) {
        try {
          handle.unregister()
        } catch {
          // native implementations may invalidate handles; ignore
        }
      }
      const ctx = getModelContext()
      if (ctx && isFallback(ctx)) {
        document.dispatchEvent(new CustomEvent("toolchange"))
      }
    }
  }, [])

  return null
}
