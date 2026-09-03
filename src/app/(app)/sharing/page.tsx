import { getCurrentPatient } from "@/lib/session"
import { db } from "@/lib/db"
import { SharingList } from "@/components/sharing-list"

export const dynamic = "force-dynamic"

export default async function SharingPage() {
  const patient = await getCurrentPatient()
  if (!patient) return null

  const shares = await db.share.findMany({
    where: { patientId: patient.id },
    orderBy: { createdAt: "desc" },
    include: {
      doctor: {
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
      },
      permissions: true,
      _count: { select: { aiQueries: true } },
    },
  })

  const initialShares = shares.map((s) => ({
    id: s.id,
    accessCode: s.accessCode,
    scope: s.scope,
    duration: s.duration,
    categories: s.categories,
    documentIds: s.documentIds,
    isActive: s.isActive,
    expiresAt: s.expiresAt.toISOString(),
    revokedAt: s.revokedAt ? s.revokedAt.toISOString() : null,
    createdAt: s.createdAt.toISOString(),
    doctor: s.doctor
      ? {
          id: s.doctor.id,
          name: s.doctor.user.name,
          email: s.doctor.user.email,
          image: s.doctor.user.image,
          specialization: s.doctor.specialization,
          hospital: s.doctor.hospital,
        }
      : null,
    _count: s._count,
  }))

  return <SharingList initialShares={initialShares} />
}
