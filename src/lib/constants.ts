// MedUnbox shared constants and labels

export const DOCUMENT_CATEGORIES = [
  { value: "LAB_REPORT", label: "Lab Report", icon: "test-tube" },
  { value: "PRESCRIPTION", label: "Prescription", icon: "pill" },
  { value: "IMAGING", label: "Imaging / Scan", icon: "scan" },
  { value: "DISCHARGE_SUMMARY", label: "Discharge Summary", icon: "file-text" },
  { value: "PATHOLOGY", label: "Pathology", icon: "microscope" },
  { value: "RADIOLOGY", label: "Radiology", icon: "radiation" },
  { value: "CARDIOLOGY", label: "Cardiology", icon: "heart-pulse" },
  { value: "OPD_CONSULTATION", label: "OPD Consultation", icon: "stethoscope" },
  { value: "VACCINATION", label: "Vaccination", icon: "syringe" },
  { value: "INSURANCE", label: "Insurance", icon: "shield" },
  { value: "OTHER", label: "Other", icon: "file" },
] as const

export const SHARE_DURATIONS = [
  { value: "ONE_HOUR", label: "1 hour", seconds: 3600 },
  { value: "TWENTY_FOUR_HOURS", label: "24 hours", seconds: 86400 },
  { value: "SEVEN_DAYS", label: "7 days", seconds: 604800 },
  { value: "THIRTY_DAYS", label: "30 days", seconds: 2592000 },
  { value: "UNTIL_REVOKED", label: "Until revoked", seconds: null },
] as const

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी (Hindi)" },
  { code: "mr", label: "मराठी (Marathi)" },
  { code: "ta", label: "தமிழ் (Tamil)" },
  { code: "te", label: "తెలుగు (Telugu)" },
  { code: "bn", label: "বাংলা (Bengali)" },
  { code: "gu", label: "ગુજરાતી (Gujarati)" },
  { code: "kn", label: "ಕನ್ನಡ (Kannada)" },
] as const

export const VALUE_STATUS_META: Record<string, { label: string; color: string }> = {
  NORMAL: { label: "Normal", color: "text-emerald-600" },
  ABNORMAL_LOW: { label: "Low", color: "text-amber-600" },
  ABNORMAL_HIGH: { label: "High", color: "text-amber-600" },
  CRITICAL: { label: "Critical", color: "text-red-600" },
  UNKNOWN: { label: "Unknown", color: "text-muted-foreground" },
}

export const TREND_DIRECTION_META: Record<string, { label: string; color: string; icon: string }> = {
  IMPROVING: { label: "Improving", color: "text-emerald-600", icon: "trending-up" },
  WORSENING: { label: "Worsening", color: "text-red-600", icon: "trending-down" },
  STABLE: { label: "Stable", color: "text-sky-600", icon: "minus" },
  FLUCTUATING: { label: "Fluctuating", color: "text-amber-600", icon: "activity" },
}

export function categoryLabel(value: string): string {
  return DOCUMENT_CATEGORIES.find((c) => c.value === value)?.label ?? value
}

export function shareDurationLabel(value: string): string {
  return SHARE_DURATIONS.find((d) => d.value === value)?.label ?? value
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—"
  const d = typeof date === "string" ? new Date(date) : date
  if (isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

/** Compact day + month only (e.g. "15 Mar"). Used for axis ticks / dense UI. */
export function formatDateShort(date: Date | string | null | undefined): string {
  if (!date) return "—"
  const d = typeof date === "string" ? new Date(date) : date
  if (isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—"
  const d = typeof date === "string" ? new Date(date) : date
  if (isNaN(d.getTime())) return "—"
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function timeAgo(date: Date | string | null | undefined): string {
  if (!date) return "—"
  const d = typeof date === "string" ? new Date(date) : date
  if (isNaN(d.getTime())) return "—"
  const diff = Date.now() - d.getTime()
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return "just now"
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const days = Math.floor(hr / 24)
  if (days < 30) return `${days}d ago`
  return formatDate(d)
}
