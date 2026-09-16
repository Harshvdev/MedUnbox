import { cache } from "react"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import type { Role } from "@prisma/client"

export interface SessionUser {
  id: string
  email: string
  name?: string | null
  role: string
}

/**
 * Returns the authenticated user, or null if not signed in.
 * The JWT is validated against the database so a session for a deleted
 * user (e.g. after a DB reset/reseed) is treated as signed out instead of
 * producing ghost sessions that render empty pages.
 *
 * Wrapped in React cache() to deduplicate DB queries within a single request.
 * If the DB connection pool times out, gracefully falls back to verified JWT claims.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null
  const id = (session.user as { id: string }).id

  try {
    const user = await db.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, role: true },
    })
    if (!user) return null
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    }
  } catch (err) {
    // If the database connection pool times out or Neon is waking up,
    // fallback to the verified JWT session claims to avoid crashing the page with a 500 error.
    console.warn("DB lookup timed out in getCurrentUser, using verified JWT claims:", (err as any)?.message ?? err)
    const sessionUser = session.user as { id: string; email?: string | null; name?: string | null; role?: string }
    return {
      id: sessionUser.id,
      email: sessionUser.email ?? "",
      name: sessionUser.name,
      role: sessionUser.role ?? "PATIENT",
    }
  }
})

/**
 * Requires authentication; throws a redirect-friendly error if not signed in.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error("UNAUTHORIZED")
  }
  return user
}

/**
 * Requires a specific role.
 */
export async function requireRole(role: Role): Promise<SessionUser> {
  const user = await requireUser()
  if (user.role !== role) {
    throw new Error("FORBIDDEN")
  }
  return user
}

/**
 * Get the patient profile for the current user (if they are a patient).
 */
export const getCurrentPatient = cache(async () => {
  const user = await getCurrentUser()
  if (!user || user.role !== "PATIENT") return null
  try {
    return await db.patient.findUnique({
      where: { userId: user.id },
    })
  } catch (err) {
    console.error("getCurrentPatient error:", err)
    return null
  }
})

/**
 * Get the doctor profile for the current user (if they are a doctor).
 */
export const getCurrentDoctor = cache(async () => {
  const user = await getCurrentUser()
  if (!user || user.role !== "DOCTOR") return null
  try {
    return await db.doctor.findUnique({
      where: { userId: user.id },
    })
  } catch (err) {
    console.error("getCurrentDoctor error:", err)
    return null
  }
})

/**
 * Get the pharmacist profile for the current user (if they are a pharmacist).
 */
export const getCurrentPharmacist = cache(async () => {
  const user = await getCurrentUser()
  if (!user || user.role !== "PHARMACIST") return null
  try {
    return await db.pharmacist.findUnique({
      where: { userId: user.id },
    })
  } catch (err) {
    console.error("getCurrentPharmacist error:", err)
    return null
  }
})

/**
 * Get the lab technician profile for the current user (if they are a lab technician).
 */
export const getCurrentLabTechnician = cache(async () => {
  const user = await getCurrentUser()
  if (!user || user.role !== "LAB_TECHNICIAN") return null
  try {
    return await db.labTechnician.findUnique({
      where: { userId: user.id },
    })
  } catch (err) {
    console.error("getCurrentLabTechnician error:", err)
    return null
  }
})
