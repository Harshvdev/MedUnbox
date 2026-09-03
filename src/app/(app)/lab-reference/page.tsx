import Link from "next/link"
import {
  BookOpen,
  Search,
  TestTube,
  Droplet,
  Heart,
  Bone,
  Wind,
  Wine,
  Pyramid,
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { LabReferenceSearch } from "@/components/lab-reference-search"
import { getCurrentPatient } from "@/lib/session"
import { db } from "@/lib/db"
import { formatDate, VALUE_STATUS_META } from "@/lib/constants"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

// Lab reference ranges dictionary
// Based on standard adult reference ranges. These are general guidelines only —
// actual ranges vary by lab, age, sex, and method. Always consult a doctor.
const LAB_RANGES = [
  // CBC
  { category: "Complete Blood Count (CBC)", test: "Hemoglobin (Hb)", range: "13.0-17.0", unit: "g/dL", male: "13.5-17.5", female: "12.0-15.5", notes: "Low values may indicate anemia" },
  { category: "Complete Blood Count (CBC)", test: "Hematocrit (Hct)", range: "40-50", unit: "%", male: "41-53", female: "36-46", notes: "Percentage of blood volume that is red blood cells" },
  { category: "Complete Blood Count (CBC)", test: "RBC Count", range: "4.5-5.5", unit: "x10^6/μL", male: "4.5-5.9", female: "4.0-5.2", notes: "Red blood cell count" },
  { category: "Complete Blood Count (CBC)", test: "WBC Count", range: "4.0-11.0", unit: "x10^3/μL", male: "4.0-11.0", female: "4.0-11.0", notes: "White blood cells — immune function" },
  { category: "Complete Blood Count (CBC)", test: "Platelet Count", range: "150-450", unit: "x10^3/μL", male: "150-450", female: "150-450", notes: "Clotting cells" },
  { category: "Complete Blood Count (CBC)", test: "MCV", range: "80-100", unit: "fL", male: "80-100", female: "80-100", notes: "Mean corpuscular volume — RBC size" },
  { category: "Complete Blood Count (CBC)", test: "MCH", range: "27-33", unit: "pg", male: "27-33", female: "27-33", notes: "Mean corpuscular hemoglobin" },

  // Blood Glucose
  { category: "Blood Glucose", test: "Fasting Blood Sugar", range: "70-100", unit: "mg/dL", male: "70-100", female: "70-100", notes: "100-125 = prediabetes, ≥126 = diabetes" },
  { category: "Blood Glucose", test: "Postprandial Sugar (PPBS)", range: "<140", unit: "mg/dL", male: "<140", female: "<140", notes: "2 hours after eating" },
  { category: "Blood Glucose", test: "HbA1c", range: "<5.7", unit: "%", male: "<5.7", female: "<5.7", notes: "5.7-6.4 = prediabetes, ≥6.5 = diabetes" },
  { category: "Blood Glucose", test: "Random Blood Sugar", range: "<200", unit: "mg/dL", male: "<200", female: "<200", notes: "Any time of day" },

  // Lipid Profile
  { category: "Lipid Profile", test: "Total Cholesterol", range: "<200", unit: "mg/dL", male: "<200", female: "<200", notes: "200-239 = borderline, ≥240 = high" },
  { category: "Lipid Profile", test: "LDL Cholesterol", range: "<100", unit: "mg/dL", male: "<100", female: "<100", notes: "Bad cholesterol — lower is better" },
  { category: "Lipid Profile", test: "HDL Cholesterol", range: ">40", unit: "mg/dL", male: ">40", female: ">50", notes: "Good cholesterol — higher is better" },
  { category: "Lipid Profile", test: "Triglycerides", range: "<150", unit: "mg/dL", male: "<150", female: "<150", notes: "150-199 = borderline, ≥200 = high" },
  { category: "Lipid Profile", test: "VLDL Cholesterol", range: "<30", unit: "mg/dL", male: "<30", female: "<30", notes: "Very low density lipoprotein" },

  // Kidney Function
  { category: "Kidney Function", test: "Serum Creatinine", range: "0.6-1.2", unit: "mg/dL", male: "0.7-1.3", female: "0.6-1.1", notes: "Kidney filtration marker" },
  { category: "Kidney Function", test: "Blood Urea Nitrogen (BUN)", range: "7-20", unit: "mg/dL", male: "7-20", female: "7-20", notes: "Waste product filtered by kidneys" },
  { category: "Kidney Function", test: "Uric Acid", range: "3.4-7.0", unit: "mg/dL", male: "3.4-7.0", female: "2.4-6.0", notes: "High values may cause gout" },
  { category: "Kidney Function", test: "eGFR", range: ">90", unit: "mL/min/1.73m²", male: ">90", female: ">90", notes: "Estimated glomerular filtration rate" },

  // Liver Function
  { category: "Liver Function", test: "ALT (SGPT)", range: "7-56", unit: "U/L", male: "7-56", female: "7-45", notes: "Liver enzyme — elevated in liver damage" },
  { category: "Liver Function", test: "AST (SGOT)", range: "10-40", unit: "U/L", male: "10-40", female: "10-35", notes: "Liver enzyme" },
  { category: "Liver Function", test: "Alkaline Phosphatase (ALP)", range: "44-147", unit: "U/L", male: "44-147", female: "44-147", notes: "Liver and bone enzyme" },
  { category: "Liver Function", test: "Bilirubin (Total)", range: "0.1-1.2", unit: "mg/dL", male: "0.1-1.2", female: "0.1-1.2", notes: "High values may indicate jaundice" },
  { category: "Liver Function", test: "Total Protein", range: "6.0-8.3", unit: "g/dL", male: "6.0-8.3", female: "6.0-8.3", notes: "Albumin + globulin" },

  // Thyroid
  { category: "Thyroid Function", test: "TSH", range: "0.4-4.0", unit: "mIU/L", male: "0.4-4.0", female: "0.4-4.0", notes: "High = hypothyroid, Low = hyperthyroid" },
  { category: "Thyroid Function", test: "Free T3 (FT3)", range: "2.3-4.2", unit: "pg/mL", male: "2.3-4.2", female: "2.3-4.2", notes: "Active thyroid hormone" },
  { category: "Thyroid Function", test: "Free T4 (FT4)", range: "0.8-1.8", unit: "ng/dL", male: "0.8-1.8", female: "0.8-1.8", notes: "Thyroid hormone precursor" },

  // Electrolytes
  { category: "Electrolytes", test: "Sodium (Na)", range: "135-145", unit: "mmol/L", male: "135-145", female: "135-145", notes: "Fluid balance" },
  { category: "Electrolytes", test: "Potassium (K)", range: "3.5-5.0", unit: "mmol/L", male: "3.5-5.0", female: "3.5-5.0", notes: "Heart and muscle function" },
  { category: "Electrolytes", test: "Chloride (Cl)", range: "96-106", unit: "mmol/L", male: "96-106", female: "96-106", notes: "Fluid balance" },
  { category: "Electrolytes", test: "Calcium (Ca)", range: "8.6-10.3", unit: "mg/dL", male: "8.6-10.3", female: "8.6-10.3", notes: "Bone health, nerve function" },

  // Vitamins
  { category: "Vitamins & Minerals", test: "Vitamin D (25-OH)", range: "30-100", unit: "ng/mL", male: "30-100", female: "30-100", notes: "<30 = deficient, common in limited sun exposure" },
  { category: "Vitamins & Minerals", test: "Vitamin B12", range: "200-900", unit: "pg/mL", male: "200-900", female: "200-900", notes: "Nerve and blood cell health" },
  { category: "Vitamins & Minerals", test: "Folate (Folic Acid)", range: ">3", unit: "ng/mL", male: ">3", female: ">3", notes: "Cell growth and DNA synthesis" },
  { category: "Vitamins & Minerals", test: "Iron", range: "60-170", unit: "μg/dL", male: "65-176", female: "50-170", notes: "Oxygen transport" },
  { category: "Vitamins & Minerals", test: "Ferritin", range: "30-400", unit: "ng/mL", male: "30-400", female: "15-150", notes: "Iron storage protein" },

  // Cardiac Markers
  { category: "Cardiac Markers", test: "Troponin I", range: "<0.04", unit: "ng/mL", male: "<0.04", female: "<0.04", notes: "Heart muscle damage marker" },
  { category: "Cardiac Markers", test: "CK-MB", range: "0-25", unit: "U/L", male: "0-25", female: "0-25", notes: "Heart enzyme" },
  { category: "Cardiac Markers", test: "BNP", range: "<100", unit: "pg/mL", male: "<100", female: "<100", notes: "Heart failure marker" },

  // Inflammatory Markers
  { category: "Inflammatory Markers", test: "ESR", range: "0-20", unit: "mm/hr", male: "0-15", female: "0-20", notes: "Erythrocyte sedimentation rate" },
  { category: "Inflammatory Markers", test: "CRP", range: "<10", unit: "mg/L", male: "<10", female: "<10", notes: "C-reactive protein — inflammation" },

  // Coagulation
  { category: "Coagulation", test: "PT (Prothrombin Time)", range: "11-13.5", unit: "sec", male: "11-13.5", female: "11-13.5", notes: "Blood clotting time" },
  { category: "Coagulation", test: "INR", range: "0.8-1.2", unit: "", male: "0.8-1.2", female: "0.8-1.2", notes: "Standardized PT — 2-3 for warfarin patients" },
]

const CATEGORY_ICONS: Record<string, any> = {
  "Complete Blood Count (CBC)": TestTube,
  "Blood Glucose": Droplet,
  "Lipid Profile": Heart,
  "Kidney Function": Wine,
  "Liver Function": Activity,
  "Thyroid Function": Pyramid,
  "Electrolytes": Droplet,
  "Vitamins & Minerals": Bone,
  "Cardiac Markers": Heart,
  "Inflammatory Markers": Wind,
  "Coagulation": Droplet,
}

const CATEGORY_COLORS: Record<string, string> = {
  "Complete Blood Count (CBC)": "bg-emerald-500/10 text-emerald-600",
  "Blood Glucose": "bg-rose-500/10 text-rose-600",
  "Lipid Profile": "bg-red-500/10 text-red-600",
  "Kidney Function": "bg-amber-500/10 text-amber-600",
  "Liver Function": "bg-orange-500/10 text-orange-600",
  "Thyroid Function": "bg-violet-500/10 text-violet-600",
  "Electrolytes": "bg-cyan-500/10 text-cyan-600",
  "Vitamins & Minerals": "bg-teal-500/10 text-teal-600",
  "Cardiac Markers": "bg-pink-500/10 text-pink-600",
  "Inflammatory Markers": "bg-teal-500/10 text-teal-600",
  "Coagulation": "bg-rose-500/10 text-rose-600",
}

// Status badge classes — emerald (normal), amber (abnormal), rose (critical)
const STATUS_BADGE: Record<string, string> = {
  NORMAL: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
  ABNORMAL_LOW: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
  ABNORMAL_HIGH: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
  CRITICAL: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
  UNKNOWN: "bg-muted text-muted-foreground",
}

interface PatientValueLite {
  value: string
  unit: string | null
  status: string
  recordedAt: string | null
  documentId: string
  entity: string
  label: string
}

/** Strip a lab test name into candidate alpha-only keys for entity matching. */
function candidateKeys(testName: string): string[] {
  // Strip parentheticals first (e.g., "Hemoglobin (Hb)" → "Hemoglobin")
  const stripped = testName.replace(/\s*\([^)]*\)\s*/g, "").trim().toUpperCase()
  const strippedAlpha = stripped.replace(/[^A-Z0-9]/g, "")
  const parenAlphas: string[] = []
  for (const m of testName.matchAll(/\(([^)]+)\)/g)) {
    const a = m[1].trim().toUpperCase().replace(/[^A-Z0-9]/g, "")
    if (a.length >= 2) parenAlphas.push(a)
  }
  return [strippedAlpha, ...parenAlphas].filter((k) => k.length >= 2)
}

/**
 * Match a lab reference test to one of the patient's recent medical values by
 * comparing the test name (alpha-only, parenthetical abbreviations included)
 * against the patient's normalized `entity` field (e.g. HEMOGLOBIN, HBA1C).
 *
 * Strategy:
 *  1. Exact match (alpha-only comparison).
 *  2. Substring match — pick the smallest containing pair (longest smaller side).
 *     Requires the smaller side to be at least length 4 and ≥ 40 % of the larger
 *     side to avoid silly matches like "BUN" matching "BUNNY".
 */
function matchPatientValue(
  testName: string,
  byEntity: Map<string, PatientValueLite>
): PatientValueLite | null {
  const keys = candidateKeys(testName)
  if (keys.length === 0) return null

  // Pre-compute alpha-only form of each entity for fast comparison
  const entityAlphas: Array<{ alpha: string; val: PatientValueLite }> = []
  for (const [entity, val] of byEntity.entries()) {
    const a = entity.toUpperCase().replace(/[^A-Z0-9]/g, "")
    if (a.length >= 2) entityAlphas.push({ alpha: a, val })
  }

  // Pass 1: exact alpha-only match
  for (const k of keys) {
    const found = entityAlphas.find((e) => e.alpha === k)
    if (found) return found.val
  }

  // Pass 2: substring match with a confidence score
  let bestMatch: PatientValueLite | null = null
  let bestScore = 0
  for (const { alpha, val } of entityAlphas) {
    for (const k of keys) {
      if (k.length < 4) continue
      const smaller = Math.min(alpha.length, k.length)
      const larger = Math.max(alpha.length, k.length)
      if (smaller < 4) continue
      if (smaller * 100 < larger * 40) continue // smaller side must be ≥ 40 % of larger
      const contained = alpha.includes(k) || k.includes(alpha)
      if (!contained) continue
      if (smaller > bestScore) {
        bestMatch = val
        bestScore = smaller
      }
    }
  }
  return bestMatch
}

export default async function LabReferencePage() {
  const patient = await getCurrentPatient()

  // Fetch patient's recent medical values (latest per entity)
  const byEntity = new Map<string, PatientValueLite>()
  if (patient) {
    const patientValues = await db.medicalValue.findMany({
      where: { patientId: patient.id },
      orderBy: { recordedAt: "desc" },
      take: 50,
      include: { document: { select: { id: true, title: true } } },
    })

    // patientValues are ordered by recordedAt desc — keep the first one per entity
    for (const v of patientValues) {
      const entity = v.entity?.toUpperCase().trim()
      if (!entity) continue
      if (byEntity.has(entity)) continue
      byEntity.set(entity, {
        value: v.value,
        unit: v.unit,
        status: v.status,
        recordedAt: v.recordedAt ? v.recordedAt.toISOString() : null,
        documentId: v.documentId,
        entity,
        label: v.label,
      })
    }
  }

  // Enrich each lab range with its matching patient value (if any)
  const rangesWithStatus = LAB_RANGES.map((r) => ({
    ...r,
    patientStatus: patient ? matchPatientValue(r.test, byEntity) : null,
  }))

  // Summary counts for the banner
  const matched = rangesWithStatus.filter((r) => r.patientStatus !== null)
  const abnormalCount = matched.filter(
    (r) =>
      r.patientStatus!.status === "ABNORMAL_LOW" ||
      r.patientStatus!.status === "ABNORMAL_HIGH" ||
      r.patientStatus!.status === "CRITICAL"
  ).length
  const criticalCount = matched.filter(
    (r) => r.patientStatus!.status === "CRITICAL"
  ).length

  const categories = Array.from(new Set(LAB_RANGES.map((r) => r.category)))

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="space-y-1">
        <p className="flex items-center gap-1.5 text-sm font-medium text-primary">
          <BookOpen className="h-4 w-4" /> Reference Guide
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Lab Reference Ranges</h1>
        <p className="text-sm text-muted-foreground">
          Standard reference ranges for common lab tests — understand what your results mean
        </p>
      </div>

      {/* Summary banner — only shown when patient has at least one matched value */}
      {patient && matched.length > 0 && (
        <Card
          className={cn(
            "border",
            criticalCount > 0
              ? "border-rose-500/40 bg-rose-500/5"
              : abnormalCount > 0
              ? "border-amber-500/40 bg-amber-500/5"
              : "border-emerald-500/40 bg-emerald-500/5"
          )}
        >
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                  criticalCount > 0
                    ? "bg-rose-500/10 text-rose-600"
                    : abnormalCount > 0
                    ? "bg-amber-500/10 text-amber-600"
                    : "bg-emerald-500/10 text-emerald-600"
                )}
              >
                {abnormalCount > 0 ? (
                  <AlertTriangle className="h-5 w-5" />
                ) : (
                  <CheckCircle2 className="h-5 w-5" />
                )}
              </div>
              <div>
                {abnormalCount > 0 ? (
                  <>
                    <p className="font-medium">
                      {abnormalCount} of your recent test{abnormalCount === 1 ? "" : "s"}{" "}
                      {abnormalCount === 1 ? "is" : "are"} abnormal
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {criticalCount > 0 ? `${criticalCount} critical · ` : ""}
                      {matched.length - abnormalCount} normal · {matched.length} matched your records
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-medium">All your recent tests look normal</p>
                    <p className="text-sm text-muted-foreground">
                      {matched.length} test{matched.length === 1 ? "" : "s"} matched your records, all within range
                    </p>
                  </>
                )}
              </div>
            </div>
            <Button asChild variant="default" size="sm" className="shrink-0">
              <Link href="/trends">
                <TrendingUp className="mr-2 h-4 w-4" /> View trends
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <LabReferenceSearch ranges={LAB_RANGES} />

      {/* Categories overview */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {categories.map((cat) => {
          const Icon = CATEGORY_ICONS[cat] ?? TestTube
          const color = CATEGORY_COLORS[cat] ?? "bg-primary/10 text-primary"
          const count = LAB_RANGES.filter((r) => r.category === cat).length
          const matchedInCat = rangesWithStatus.filter(
            (r) => r.category === cat && r.patientStatus !== null
          ).length
          // Per-category worst patient-value status — drives the corner status dot
          const catStatuses = rangesWithStatus
            .filter((r) => r.category === cat && r.patientStatus !== null)
            .map((r) => r.patientStatus!.status)
          const hasCritical = catStatuses.includes("CRITICAL")
          const hasAbnormal =
            catStatuses.includes("ABNORMAL_LOW") || catStatuses.includes("ABNORMAL_HIGH")
          const allNormal =
            catStatuses.length > 0 && catStatuses.every((s) => s === "NORMAL")
          const dotClass = hasCritical
            ? "bg-rose-500"
            : hasAbnormal
            ? "bg-amber-500"
            : allNormal
            ? "bg-emerald-500"
            : null
          const dotTitle = hasCritical
            ? "Critical value in your records"
            : hasAbnormal
            ? "Abnormal value in your records"
            : allNormal
            ? "All matched values normal"
            : ""
          return (
            <Card key={cat} className="relative border-border/60">
              {dotClass && (
                <span
                  title={dotTitle}
                  aria-label={dotTitle}
                  className={`absolute right-3 top-3 inline-block h-2.5 w-2.5 rounded-full ring-2 ring-background ${dotClass}`}
                />
              )}
              <CardContent className="p-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="mt-2 text-sm font-medium leading-tight">{cat}</p>
                <p className="text-xs text-muted-foreground">
                  {count} test{count === 1 ? "" : "s"}
                  {matchedInCat > 0 && (
                    <span className="text-primary"> · {matchedInCat} in your records</span>
                  )}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* All ranges by category */}
      <div className="space-y-4">
        {categories.map((cat) => {
          const ranges = rangesWithStatus.filter((r) => r.category === cat)
          const Icon = CATEGORY_ICONS[cat] ?? TestTube
          const color = CATEGORY_COLORS[cat] ?? "bg-primary/10 text-primary"
          return (
            <Card key={cat} id={cat.toLowerCase().replace(/[^a-z0-9]+/g, "-")} className="border-border/60 scroll-mt-20">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{cat}</CardTitle>
                    <CardDescription className="text-xs">{ranges.length} test{ranges.length === 1 ? "" : "s"}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-xs text-muted-foreground">
                      <tr className="border-b">
                        <th className="py-2 pr-3 text-left font-medium">Test</th>
                        <th className="py-2 px-3 text-left font-medium">Range</th>
                        <th className="py-2 px-3 text-left font-medium">Unit</th>
                        <th className="hidden py-2 px-3 text-left font-medium sm:table-cell">Male</th>
                        <th className="hidden py-2 px-3 text-left font-medium sm:table-cell">Female</th>
                        <th className="py-2 px-3 text-left font-medium">Your Result</th>
                        <th className="hidden py-2 pl-3 text-left font-medium md:table-cell">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ranges.map((r) => {
                        const pv = r.patientStatus
                        return (
                          <tr key={r.test} className="border-b border-border/40 last:border-0">
                            <td className="py-2.5 pr-3 font-medium">{r.test}</td>
                            <td className="py-2.5 px-3">
                              <Badge variant="outline" className="font-mono text-xs">{r.range}</Badge>
                            </td>
                            <td className="py-2.5 px-3 text-muted-foreground">{r.unit || "—"}</td>
                            <td className="hidden py-2.5 px-3 text-muted-foreground sm:table-cell">{r.male}</td>
                            <td className="hidden py-2.5 px-3 text-muted-foreground sm:table-cell">{r.female}</td>
                            <td className="py-2.5 px-3">
                              {pv ? (
                                <div className="flex flex-col gap-1">
                                  <Link
                                    href={`/documents/${pv.documentId}`}
                                    className="group inline-flex items-baseline gap-1"
                                    title={`From ${pv.label}`}
                                  >
                                    <span className="font-mono text-sm font-medium text-foreground group-hover:text-primary">
                                      {pv.value}
                                    </span>
                                    {pv.unit && (
                                      <span className="text-[10px] text-muted-foreground">{pv.unit}</span>
                                    )}
                                  </Link>
                                  <div className="flex items-center gap-1.5">
                                    <Badge
                                      className={cn("px-1.5 py-0 text-[10px]", STATUS_BADGE[pv.status] ?? STATUS_BADGE.UNKNOWN)}
                                    >
                                      {VALUE_STATUS_META[pv.status]?.label ?? pv.status}
                                    </Badge>
                                    <span className="text-[10px] text-muted-foreground">
                                      {formatDate(pv.recordedAt)}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground/60">—</span>
                              )}
                            </td>
                            <td className="hidden py-2.5 pl-3 text-xs text-muted-foreground md:table-cell">{r.notes}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Disclaimer */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="flex items-start gap-2 p-4 text-sm">
          <Search className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <p className="font-medium text-amber-700 dark:text-amber-500">Reference ranges vary</p>
            <p className="text-muted-foreground">
              These are general adult reference ranges. Actual ranges vary by laboratory, age, sex, and testing method.
              Always interpret your results with your doctor using the reference ranges provided on your specific lab report.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
