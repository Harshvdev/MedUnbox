"use client"

import { useState } from "react"
import {
  Search,
  CreditCard,
  KeyRound,
  FileText,
  Activity,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  Stethoscope,
  Pill,
  FlaskConical,
  ShieldCheck,
  TrendingUp,
  Printer,
} from "lucide-react"
import { PrintablePrescription } from "@/components/doctor/printable-prescription"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { toast } from "sonner"
import { formatDate } from "@/lib/constants"

interface MedicationRow {
  medicationName: string
  dosage: string
  frequency: string
  instructions: string
}

interface LabOrderRow {
  testName: string
  instructions: string
}

export function DoctorAadhaarPortal() {
  const [aadhaarInput, setAadhaarInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [patientData, setPatientData] = useState<any>(null)

  // Consent modal states
  const [consentOpen, setConsentOpen] = useState(false)
  const [consentPatient, setConsentPatient] = useState<any>(null)
  const [consentOtp, setConsentOtp] = useState("123456")
  const [verifyingConsent, setVerifyingConsent] = useState(false)

  // Prescription Form states
  const [diagnosis, setDiagnosis] = useState("")
  const [clinicalNotes, setClinicalNotes] = useState("")
  const [medications, setMedications] = useState<MedicationRow[]>([
    { medicationName: "", dosage: "500 mg", frequency: "Twice daily after meals", instructions: "Take with water" },
  ])
  const [labOrders, setLabOrders] = useState<LabOrderRow[]>([
    { testName: "", instructions: "Fasting sample preferred" },
  ])
  const [submittingRx, setSubmittingRx] = useState(false)
  const [printableRx, setPrintableRx] = useState<any | null>(null)

  // Aadhaar input formatter
  function handleAadhaarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 12)
    const formatted = raw.replace(/(\d{4})(?=\d)/g, "$1 ")
    setAadhaarInput(formatted)
  }

  // Lookup Patient by Aadhaar
  async function handleLookup(aadhaarOverride?: string) {
    const raw = (aadhaarOverride || aadhaarInput).replace(/\s+/g, "")
    if (raw.length !== 12) {
      toast.error("Please enter a valid 12-digit Aadhaar number")
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/hcp/patient-lookup?aadhaar=${raw}`)
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "Failed to look up patient")
        setLoading(false)
        return
      }

      if (data.requiresConsent) {
        // Patient found but needs consent authorization
        setConsentPatient(data.patient)
        setConsentOpen(true)
        setLoading(false)
        return
      }

      setPatientData(data)
      toast.success(`Loaded records for ${data.patient.name}`)
    } catch {
      toast.error("Lookup failed. Please check network connection.")
    } finally {
      setLoading(false)
    }
  }

  // Verify Dummy Consent OTP
  async function handleVerifyConsent() {
    if (!consentOtp || consentOtp.length !== 6) {
      toast.error("Please enter a 6-digit OTP")
      return
    }

    setVerifyingConsent(true)
    try {
      const res = await fetch("/api/hcp/consent-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aadhaar: consentPatient?.aadhaar,
          otp: consentOtp,
          action: "verify",
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Consent verification failed")
        setVerifyingConsent(false)
        return
      }

      setConsentOpen(false)
      toast.success("Consent verified! 24-hour access granted.")
      // Re-fetch patient data with access unlocked
      await handleLookup(consentPatient?.aadhaar)
    } catch {
      toast.error("Verification error")
    } finally {
      setVerifyingConsent(false)
    }
  }

  // Medication Row handlers
  function addMedicationRow() {
    setMedications((prev) => [
      ...prev,
      { medicationName: "", dosage: "", frequency: "Once daily", instructions: "" },
    ])
  }

  function removeMedicationRow(index: number) {
    setMedications((prev) => prev.filter((_, i) => i !== index))
  }

  function updateMedication(index: number, field: keyof MedicationRow, value: string) {
    setMedications((prev) => {
      const updated = [...prev]
      updated[index][field] = value
      return updated
    })
  }

  // Lab Order Row handlers
  function addLabOrderRow() {
    setLabOrders((prev) => [...prev, { testName: "", instructions: "" }])
  }

  function removeLabOrderRow(index: number) {
    setLabOrders((prev) => prev.filter((_, i) => i !== index))
  }

  function updateLabOrder(index: number, field: keyof LabOrderRow, value: string) {
    setLabOrders((prev) => {
      const updated = [...prev]
      updated[index][field] = value
      return updated
    })
  }

  // Submit Prescription Form
  async function handleSubmitPrescription(e: React.FormEvent) {
    e.preventDefault()
    if (!patientData?.patient?.id) return

    const validMeds = medications.filter((m) => m.medicationName.trim() !== "")
    const validLabs = labOrders.filter((l) => l.testName.trim() !== "")

    if (validMeds.length === 0 && validLabs.length === 0) {
      toast.error("Please add at least one medication or lab test to prescribe.")
      return
    }

    setSubmittingRx(true)
    try {
      const res = await fetch("/api/prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: patientData.patient.id,
          diagnosis,
          notes: clinicalNotes,
          items: validMeds,
          labOrders: validLabs,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Failed to submit prescription")
        setSubmittingRx(false)
        return
      }

      toast.success("Prescription submitted! Ready for Pharmacist & Lab Tech.")
      setDiagnosis("")
      setClinicalNotes("")
      setMedications([{ medicationName: "", dosage: "500 mg", frequency: "Twice daily after meals", instructions: "Take with water" }])
      setLabOrders([{ testName: "", instructions: "Fasting sample preferred" }])

      // Refresh records
      await handleLookup(patientData.patient.aadhaar)
    } catch {
      toast.error("Prescription submission failed")
    } finally {
      setSubmittingRx(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Search Bar */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-transparent to-transparent shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Access Patient Profile by Aadhaar
              </CardTitle>
              <CardDescription>
                Enter the patient&apos;s 12-digit Aadhaar number to view clinical history and write prescriptions
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground hidden sm:inline">Quick Test:</span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs font-mono"
                onClick={() => {
                  setAadhaarInput("1234 5678 9012")
                  handleLookup("123456789012")
                }}
              >
                1234 5678 9012
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2 max-w-xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Enter 12-digit Aadhaar (e.g. 1234 5678 9012)"
                value={aadhaarInput}
                onChange={handleAadhaarChange}
                maxLength={14}
                className="pl-9 font-mono tracking-wider text-base"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleLookup()
                }}
              />
            </div>
            <Button onClick={() => handleLookup()} disabled={loading} className="gap-2 shrink-0">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Fetching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" /> Access Patient
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Patient Active Profile View */}
      {patientData && (
        <div className="space-y-6">
          {/* Patient Header Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border bg-card shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-lg">
                {patientData.patient.name ? patientData.patient.name.charAt(0).toUpperCase() : "P"}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">{patientData.patient.name || "Unnamed Patient"}</h2>
                  <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                    Active Access
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
                  <span>Aadhaar: <span className="font-mono font-medium text-foreground">{patientData.patient.aadhaar}</span></span>
                  {patientData.patient.bloodGroup && (
                    <span>Blood Group: <span className="font-semibold text-foreground">{patientData.patient.bloodGroup}</span></span>
                  )}
                  {patientData.patient.gender && (
                    <span>Gender: <span className="capitalize">{patientData.patient.gender.toLowerCase()}</span></span>
                  )}
                  {patientData.patient.dateOfBirth && (
                    <span>DOB: {formatDate(patientData.patient.dateOfBirth)}</span>
                  )}
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setPatientData(null)}
              className="text-xs text-muted-foreground shrink-0"
            >
              Close Patient
            </Button>
          </div>

          {/* Clinical Workstation Tabs */}
          <Tabs defaultValue="prescription" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="prescription" className="gap-2">
                <Stethoscope className="h-4 w-4" />
                <span>Write Prescription</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                <Activity className="h-4 w-4" />
                <span>Clinical History & Graphs</span>
              </TabsTrigger>
              <TabsTrigger value="documents" className="gap-2">
                <FileText className="h-4 w-4" />
                <span>Documents & Reports</span>
              </TabsTrigger>
              <TabsTrigger value="orders" className="gap-2">
                <Clock className="h-4 w-4" />
                <span>Prescription Orders ({patientData.prescriptions?.length || 0})</span>
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: WRITE PRESCRIPTION */}
            <TabsContent value="prescription">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Stethoscope className="h-5 w-5 text-primary" />
                    New Clinical Prescription
                  </CardTitle>
                  <CardDescription>
                    Prescribe medications (fulfilled by Pharmacist) and order diagnostic lab tests (performed by Lab Technician)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmitPrescription} className="space-y-6">
                    {/* Diagnosis & Clinical Notes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="diagnosis">Diagnosis / Clinical Impression</Label>
                        <Input
                          id="diagnosis"
                          placeholder="e.g. Type 2 Diabetes Mellitus, Essential Hypertension"
                          value={diagnosis}
                          onChange={(e) => setDiagnosis(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="notes">Doctor&apos;s Advice & Notes</Label>
                        <Input
                          id="notes"
                          placeholder="e.g. Low sodium diet, 30 min daily brisk walk, review in 4 weeks"
                          value={clinicalNotes}
                          onChange={(e) => setClinicalNotes(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Medications Section */}
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Pill className="h-4 w-4 text-primary" />
                          <h3 className="font-semibold text-sm">Medications (Rx)</h3>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addMedicationRow}
                          className="h-8 gap-1 text-xs"
                        >
                          <Plus className="h-3.5 w-3.5" /> Add Medication
                        </Button>
                      </div>

                      <div className="space-y-2">
                        {medications.map((row, idx) => (
                          <div
                            key={idx}
                            className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-2.5 rounded-lg border bg-muted/20 items-end"
                          >
                            <div className="sm:col-span-4 space-y-1">
                              <Label className="text-xs text-muted-foreground">Medicine Name</Label>
                              <Input
                                placeholder="e.g. Metformin, Amlodipine"
                                value={row.medicationName}
                                onChange={(e) => updateMedication(idx, "medicationName", e.target.value)}
                              />
                            </div>
                            <div className="sm:col-span-2 space-y-1">
                              <Label className="text-xs text-muted-foreground">Dosage</Label>
                              <Input
                                placeholder="e.g. 500 mg"
                                value={row.dosage}
                                onChange={(e) => updateMedication(idx, "dosage", e.target.value)}
                              />
                            </div>
                            <div className="sm:col-span-3 space-y-1">
                              <Label className="text-xs text-muted-foreground">Frequency</Label>
                              <Input
                                placeholder="e.g. 1-0-1 after food"
                                value={row.frequency}
                                onChange={(e) => updateMedication(idx, "frequency", e.target.value)}
                              />
                            </div>
                            <div className="sm:col-span-2 space-y-1">
                              <Label className="text-xs text-muted-foreground">Instructions</Label>
                              <Input
                                placeholder="e.g. With water"
                                value={row.instructions}
                                onChange={(e) => updateMedication(idx, "instructions", e.target.value)}
                              />
                            </div>
                            <div className="sm:col-span-1 flex justify-end">
                              {medications.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-9 text-destructive"
                                  onClick={() => removeMedicationRow(idx)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Lab Test Orders Section */}
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FlaskConical className="h-4 w-4 text-emerald-600" />
                          <h3 className="font-semibold text-sm">Lab Test Orders</h3>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addLabOrderRow}
                          className="h-8 gap-1 text-xs"
                        >
                          <Plus className="h-3.5 w-3.5" /> Order Lab Test
                        </Button>
                      </div>

                      <div className="space-y-2">
                        {labOrders.map((row, idx) => (
                          <div
                            key={idx}
                            className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-2.5 rounded-lg border bg-muted/20 items-end"
                          >
                            <div className="sm:col-span-5 space-y-1">
                              <Label className="text-xs text-muted-foreground">Test Name</Label>
                              <Input
                                placeholder="e.g. HbA1c, Complete Blood Count, Lipid Profile"
                                value={row.testName}
                                onChange={(e) => updateLabOrder(idx, "testName", e.target.value)}
                              />
                            </div>
                            <div className="sm:col-span-6 space-y-1">
                              <Label className="text-xs text-muted-foreground">Clinical Instructions for Lab</Label>
                              <Input
                                placeholder="e.g. 12-hour fasting required, repeat serum creatinine"
                                value={row.instructions}
                                onChange={(e) => updateLabOrder(idx, "instructions", e.target.value)}
                              />
                            </div>
                            <div className="sm:col-span-1 flex justify-end">
                              {labOrders.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-9 text-destructive"
                                  onClick={() => removeLabOrderRow(idx)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <Button type="submit" disabled={submittingRx} className="gap-2">
                        {submittingRx ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" /> Submitting...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4" /> Issue Prescription & Orders
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 2: CLINICAL HISTORY & ANALYTICAL GRAPHS */}
            <TabsContent value="history" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Lab Values & Analytical Snapshot */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      Extracted Laboratory Parameters
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {(!patientData.medicalValues || patientData.medicalValues.length === 0) ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        No laboratory values recorded yet.
                      </p>
                    ) : (
                      <div className="divide-y max-h-80 overflow-y-auto pr-1">
                        {patientData.medicalValues.map((val: any) => (
                          <div key={val.id} className="py-2 flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm">{val.label}</p>
                              <p className="text-xs text-muted-foreground">
                                {val.recordedAt ? formatDate(val.recordedAt) : "Recent"}
                                {val.referenceRange && ` • Range: ${val.referenceRange}`}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="font-mono font-semibold text-sm">
                                {val.value} {val.unit}
                              </span>
                              <div>
                                <Badge
                                  variant="outline"
                                  className={
                                    val.status === "NORMAL"
                                      ? "text-[10px] text-emerald-600 bg-emerald-500/10"
                                      : "text-[10px] text-rose-600 bg-rose-500/10"
                                  }
                                >
                                  {val.status}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Longitudinal Timeline */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Activity className="h-4 w-4 text-primary" />
                      Longitudinal Clinical Events
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {(!patientData.timeline || patientData.timeline.length === 0) ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        No timeline events recorded yet.
                      </p>
                    ) : (
                      <div className="divide-y max-h-80 overflow-y-auto pr-1">
                        {patientData.timeline.map((event: any) => (
                          <div key={event.id} className="py-2">
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-sm">{event.title}</p>
                              <span className="text-xs text-muted-foreground">{formatDate(event.date)}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>
                            <Badge variant="secondary" className="mt-1 text-[10px]">
                              {event.category}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* TAB 3: DOCUMENTS */}
            <TabsContent value="documents">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Clinical Reports & Documents
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(!patientData.documents || patientData.documents.length === 0) ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No documents found in this patient&apos;s vault.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {patientData.documents.map((doc: any) => (
                        <div key={doc.id} className="p-3 rounded-lg border bg-card flex items-start gap-3">
                          <FileText className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{doc.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {doc.category} • Uploaded {formatDate(doc.uploadedAt)}
                            </p>
                            <Badge variant="outline" className="mt-1.5 text-[10px]">
                              {doc.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 4: PRESCRIPTION ORDERS PIPELINE */}
            <TabsContent value="orders">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    Prescription & Lab Fulfillment Pipeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(!patientData.prescriptions || patientData.prescriptions.length === 0) ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No prescriptions written for this patient yet.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {patientData.prescriptions.map((rx: any) => (
                        <div key={rx.id} className="p-4 rounded-xl border bg-muted/20 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                            <div>
                              <p className="font-semibold text-sm">
                                {rx.diagnosis ? `Diagnosis: ${rx.diagnosis}` : "Clinical Prescription"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Issued by {rx.doctor?.user?.name || "Doctor"} on {formatDate(rx.createdAt)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                className={
                                  rx.status === "COMPLETED"
                                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                    : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                }
                              >
                                {rx.status}
                              </Badge>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1"
                                onClick={() =>
                                  setPrintableRx({
                                    prescription: rx,
                                    patient: patientData.patient,
                                  })
                                }
                              >
                                <Printer className="h-3 w-3" /> Print Rx
                              </Button>
                            </div>
                          </div>

                          {/* Meds status */}
                          {rx.items && rx.items.length > 0 && (
                            <div className="space-y-1.5">
                              <p className="text-xs font-semibold uppercase text-muted-foreground">
                                Medications (Pharmacist Fulfillment)
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {rx.items.map((it: any) => (
                                  <div key={it.id} className="p-2 rounded border bg-card text-xs flex justify-between items-center">
                                    <div>
                                      <p className="font-medium">{it.medicationName} ({it.dosage})</p>
                                      <p className="text-muted-foreground text-[11px]">{it.frequency}</p>
                                    </div>
                                    <Badge
                                      variant="outline"
                                      className={
                                        it.status === "DISPENSED"
                                          ? "text-emerald-600 border-emerald-500/30"
                                          : "text-amber-600 border-amber-500/30"
                                      }
                                    >
                                      {it.status}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Lab tests status */}
                          {rx.labOrders && rx.labOrders.length > 0 && (
                            <div className="space-y-1.5">
                              <p className="text-xs font-semibold uppercase text-muted-foreground">
                                Lab Tests (Lab Technician Fulfillment)
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {rx.labOrders.map((lo: any) => (
                                  <div key={lo.id} className="p-2 rounded border bg-card text-xs flex justify-between items-center">
                                    <div>
                                      <p className="font-medium">{lo.testName}</p>
                                      {lo.resultSummary && (
                                        <p className="text-emerald-600 text-[11px]">Result: {lo.resultSummary}</p>
                                      )}
                                    </div>
                                    <Badge
                                      variant="outline"
                                      className={
                                        lo.status === "COMPLETED"
                                          ? "text-emerald-600 border-emerald-500/30"
                                          : "text-amber-600 border-amber-500/30"
                                      }
                                    >
                                      {lo.status}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Consent OTP Dialog */}
      <Dialog open={consentOpen} onOpenChange={setConsentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Patient Consent Verification
            </DialogTitle>
            <DialogDescription>
              Patient <span className="font-semibold text-foreground">{consentPatient?.name}</span> (Aadhaar: <span className="font-mono">{consentPatient?.aadhaar}</span>) has not yet granted direct access to your account.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
              A 6-digit consent OTP has been simulated for this patient. Enter any 6-digit OTP (e.g. <span className="font-mono font-medium text-primary">123456</span>) to verify and unlock 24-hour clinical access.
            </div>

            <div className="space-y-2">
              <Label htmlFor="consent-otp">6-Digit Consent OTP</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="consent-otp"
                  placeholder="123456"
                  className="pl-9 font-mono tracking-widest text-center text-lg"
                  value={consentOtp}
                  onChange={(e) => setConsentOtp(e.target.value.slice(0, 6))}
                  maxLength={6}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConsentOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleVerifyConsent} disabled={verifyingConsent}>
              {verifyingConsent ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...
                </>
              ) : (
                <>
                  Verify & Grant Access
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Printable Prescription Modal */}
      {printableRx && (
        <PrintablePrescription
          prescription={printableRx.prescription}
          patient={printableRx.patient}
          onClose={() => setPrintableRx(null)}
        />
      )}
    </div>
  )
}
