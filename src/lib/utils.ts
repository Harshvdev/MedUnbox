import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Display name for a doctor, prefixed with "Dr." only when the stored name
 * doesn't already carry the title (some accounts register as "Dr. Jane Smith").
 */
export function doctorDisplayName(name?: string | null): string {
  if (!name) return "Unknown doctor"
  return /^dr\.?\s+/i.test(name) ? name : `Dr. ${name}`
}
