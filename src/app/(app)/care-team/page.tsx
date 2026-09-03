import { redirect } from "next/navigation"
import { getCurrentPatient } from "@/lib/session"
import { db } from "@/lib/db"
import { CareTeam } from "@/components/care-team"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Care Team · MedUnbox",
}

export default async function CareTeamPage() {
  const patient = await getCurrentPatient()
  if (!patient) {
    redirect("/login")
    return
  }

  // All shares for this patient (active, expired, and revoked) with doctor info
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
    },
  })

  // Map to a plain serializable shape (Date → ISO string, enums → strings)
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
  }))

  return <CareTeam initialShares={initialShares} />
}
