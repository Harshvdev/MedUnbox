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
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null
  return {
    id: (session.user as { id: string }).id,
    email: session.user.email!,
    name: session.user.name,
    role: (session.user as { role: string }).role,
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
