import {
  Activity,
  Brain,
  Calendar,
  ClipboardList,
  Droplet,
  FileText,
  FlaskConical,
  HeartPulse,
  Pill,
  Slice,
  Stethoscope,
  Syringe,
  TrendingDown,
  TrendingUp,
  ShieldAlert,
  Microscope,
  Radiation,
  Scan,
  BedDouble,
  Hospital,
  UserRound,
} from "lucide-react"
import type { LucideProps } from "lucide-react"

/**
 * Stable icon components used across the doctor experience. Declared at module
 * scope so they aren't re-created during render (react-hooks/static-components).
 */

export function TimelineEventIcon({ category, ...props }: { category: string } & LucideProps) {
  switch (category) {
    case "LAB_TEST":
      return <FlaskConical {...props} />
    case "DIAGNOSIS":
      return <Stethoscope {...props} />
    case "MEDICATION_START":
    case "MEDICATION_STOP":
      return <Pill {...props} />
    case "PROCEDURE":
      return <ClipboardList {...props} />
    case "HOSPITALIZATION":
      return <Hospital {...props} />
    case "VACCINATION":
      return <Syringe {...props} />
    case "VISIT":
      return <UserRound {...props} />
    case "IMAGING":
      return <Scan {...props} />
    case "SURGERY":
      return <Slice {...props} />
    case "ALLERGY":
      return <ShieldAlert {...props} />
    default:
      return <Activity {...props} />
  }
}

export function TrendDirectionIcon({ direction, ...props }: { direction: string } & LucideProps) {
  switch (direction) {
    case "IMPROVING":
      return <TrendingUp {...props} />
    case "WORSENING":
      return <TrendingDown {...props} />
    case "STABLE":
    case "FLUCTUATING":
    default:
      return <Activity {...props} />
  }
}

export function CategoryIcon({ category, ...props }: { category: string } & LucideProps) {
  switch (category) {
    case "LAB_REPORT":
      return <FlaskConical {...props} />
    case "PRESCRIPTION":
      return <Pill {...props} />
    case "IMAGING":
      return <Scan {...props} />
    case "DISCHARGE_SUMMARY":
      return <BedDouble {...props} />
    case "PATHOLOGY":
      return <Microscope {...props} />
    case "RADIOLOGY":
      return <Radiation {...props} />
    case "CARDIOLOGY":
      return <HeartPulse {...props} />
    case "OPD_CONSULTATION":
      return <Stethoscope {...props} />
    case "VACCINATION":
      return <Syringe {...props} />
    case "INSURANCE":
      return <ShieldAlert {...props} />
    default:
      return <FileText {...props} />
  }
}

export function computeAge(dob: Date | null): number | null {
  if (!dob) return null
  const now = new Date()
  let age = now.getFullYear() - dob.getFullYear()
  const m = now.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--
  if (isNaN(age) || age < 0 || age > 130) return null
  return age
}

export function genderLabel(g: string | null): string | null {
  if (!g) return null
  const v = g.toLowerCase()
  if (v === "m" || v === "male") return "Male"
  if (v === "f" || v === "female") return "Female"
  if (v === "o" || v === "other") return "Other"
  return g
}

// re-exports so existing imports keep working
export { Brain, Calendar, Droplet }
