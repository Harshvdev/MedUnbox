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
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null
  const id = (session.user as { id: string }).id
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
}

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
export async function getCurrentPatient() {
  const user = await getCurrentUser()
  if (!user || user.role !== "PATIENT") return null
  return db.patient.findUnique({
    where: { userId: user.id },
  })
}

/**
 * Get the doctor profile for the current user (if they are a doctor).
 */
export async function getCurrentDoctor() {
  const user = await getCurrentUser()
  if (!user || user.role !== "DOCTOR") return null
  return db.doctor.findUnique({
    where: { userId: user.id },
  })
}
