import type { NextRequest } from "next/server"

/**
 * Simple in-memory sliding-window rate limiter.
 *
 * MedUnbox runs as a single Node process (standalone output), so an
 * in-process map is correct here. If the app is ever horizontally scaled,
 * replace the store with Redis — the call sites stay identical.
 *
 * All limits FAIL OPEN: a limiter bug must never take down a feature,
 * especially the public emergency view.
 */

interface Bucket {
  hits: number[]
  expiresAt: number
}

const buckets = new Map<string, Bucket>()

// Periodically drop stale buckets so memory stays bounded.
let lastSweep = Date.now()
function sweep(now: number) {
  if (now - lastSweep < 60_000) return
  lastSweep = now
  for (const [key, bucket] of buckets) {
    if (bucket.expiresAt <= now) buckets.delete(key)
  }
}

export interface RateLimitResult {
  ok: boolean
  /** Seconds until the caller may retry (0 when ok). */
  retryAfter: number
  remaining: number
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  try {
    const now = Date.now()
    sweep(now)

    const bucket = buckets.get(key)
    if (!bucket || bucket.expiresAt <= now) {
      buckets.set(key, { hits: [now], expiresAt: now + windowMs })
      return { ok: true, retryAfter: 0, remaining: limit - 1 }
    }

    bucket.hits = bucket.hits.filter((t) => t > now - windowMs)
    if (bucket.hits.length >= limit) {
      const retryAfter = Math.ceil((bucket.hits[0] + windowMs - now) / 1000)
      return { ok: false, retryAfter, remaining: 0 }
    }

    bucket.hits.push(now)
    return { ok: true, retryAfter: 0, remaining: limit - bucket.hits.length }
  } catch {
    return { ok: true, retryAfter: 0, remaining: 0 }
  }
}

/** Best-effort client IP for rate-limit keys (behind a proxy, x-forwarded-for wins). */
export function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for")
  if (fwd) return fwd.split(",")[0].trim()
  return req.headers.get("x-real-ip") ?? "unknown"
}

/** Standard 429 response with Retry-After. */
export function tooManyRequests(retryAfter: number): Response {
  return new Response(
    JSON.stringify({ error: "Too many requests. Please slow down and try again shortly." }),
    {
      status: 429,
      headers: {
        "content-type": "application/json",
        ...(retryAfter > 0 ? { "retry-after": String(retryAfter) } : {}),
      },
    }
  )
}
