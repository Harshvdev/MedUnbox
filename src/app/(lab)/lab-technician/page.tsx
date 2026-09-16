"use client"

import { useState, useEffect, useRef } from "react"
import {
  FlaskConical,
  Search,
  CreditCard,
  KeyRound,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  ShieldCheck,
  FileCheck2,
  TrendingUp,
  FileText,
  Activity,
  Upload,
  Printer,
  Plus,
  Paperclip,
  Download,
  X,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { toast } from "sonner"
import { formatDate } from "@/lib/constants"
import { PrintableLabReport } from "@/components/lab/printable-lab-report"

export default function LabTechnicianDashboardPage() {
  const [prescriptions, setPrescriptions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Aadhaar search states
  const [aadhaarInput, setAadhaarInput] = useState("")
  const [searchingAadhaar, setSearchingAadhaar] = useState(false)
  const [activePatient, setActivePatient] = useState<any>(null)

  // Past reports for active patient
  const [pastReports, setPastReports] = useState<any[]>([])
  const [loadingPastReports, setLoadingPastReports] = useState(false)
  const [technicianProfile, setTechnicianProfile] = useState<any>(null)

  // Consent modal states
  const [consentOpen, setConsentOpen] = useState(false)
  const [consentPatient, setConsentPatient] = useState<any>(null)
  const [consentOtp, setConsentOtp] = useState("123456")
  const [verifyingConsent, setVerifyingConsent] = useState(false)

  // Test Report modal states (Order Fulfillment)
  const [reportOpen, setReportOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [resultSummary, setResultSummary] = useState("")
  const [attachedFile, setAttachedFile] = useState<File | null>(null)
  const [submittingReport, setSubmittingReport] = useState(false)

  // Standalone Document Upload modal states
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [uploadTitle, setUploadTitle] = useState("")
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadNotes, setUploadNotes] = useState("")
  const [uploadingDoc, setUploadingDoc] = useState(false)

  // Printable Report modal state
  const [printableReport, setPrintableReport] = useState<any | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const standaloneFileInputRef = useRef<HTMLInputElement>(null)

  // Fetch all prescriptions with lab orders
  async function fetchPrescriptions() {
    setLoading(true)
    try {
      const res = await fetch("/api/prescriptions")
      const data = await res.json()
      if (res.ok && data.prescriptions) {
        setPrescriptions(data.prescriptions)
      }
    } catch {
      toast.error("Failed to load lab orders")
    } finally {
      setLoading(false)
    }
  }

  // Fetch past reports sent by this technician to the patient
  async function fetchPastReports(patientId: string) {
    setLoadingPastReports(true)
    try {
      const res = await fetch(`/api/lab-technician/past-reports?patientId=${patientId}`)
      const data = await res.json()
      if (res.ok) {
        setPastReports(data.completedOrders || [])
        if (data.technician) setTechnicianProfile(data.technician)
      }
    } catch {
      console.error("Failed to fetch past reports")
    } finally {
      setLoadingPastReports(false)
    }
  }

  useEffect(() => {
    fetchPrescriptions()
  }, [])

  // Aadhaar input format
  function handleAadhaarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 12)
    const formatted = raw.replace(/(\d{4})(?=\d)/g, "$1 ")
    setAadhaarInput(formatted)
  }

  // Lookup Patient by Aadhaar
  async function handleAadhaarLookup(overrideAadhaar?: string) {
    const raw = (overrideAadhaar || aadhaarInput).replace(/\s+/g, "")
    if (raw.length !== 12) {
      toast.error("Please enter a valid 12-digit Aadhaar number")
      return
    }

    setSearchingAadhaar(true)
    try {
      const res = await fetch(`/api/hcp/patient-lookup?aadhaar=${raw}`)
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "Patient not found")
        setSearchingAadhaar(false)
        return
      }

      if (data.requiresConsent) {
        setConsentPatient(data.patient)
        setConsentOpen(true)
        setSearchingAadhaar(false)
        return
      }

      setActivePatient(data.patient)
      if (data.prescriptions) {
        setPrescriptions(data.prescriptions)
      }
      toast.success(`Loaded profile for ${data.patient.name}`)

      // Fetch past reports sent to this patient
      await fetchPastReports(data.patient.id)
    } catch {
      toast.error("Lookup failed")
    } finally {
      setSearchingAadhaar(false)
    }
  }

  // Verify Consent OTP
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
      toast.success("Consent verified! Access granted.")
      await handleAadhaarLookup(consentPatient?.aadhaar)
    } catch {
      toast.error("Verification error")
    } finally {
      setVerifyingConsent(false)
    }
  }

  // Open Test Report Dialog
  function openReportDialog(order: any, rx: any) {
    setSelectedOrder({
      ...order,
      patientId: rx.patientId || rx.patient?.id || activePatient?.id,
      patientName: rx.patient?.user?.name || rx.patient?.name || activePatient?.name || "Patient",
      doctorName: rx.doctor?.user?.name || "Doctor",
      diagnosis: rx.diagnosis,
    })
    setResultSummary(`Specimen verified and analyzed. Test parameter values within normal range. No acute pathology observed.`)
    setAttachedFile(null)
    setReportOpen(true)
  }

  // Submit Test Report (with optional file upload)
  async function handleSubmitReport() {
    if (!selectedOrder) return
    if (!resultSummary.trim()) {
      toast.error("Please enter findings or interpretation summary")
      return
    }

    setSubmittingReport(true)
    try {
      if (attachedFile) {
        // Upload with file attachment
        const formData = new FormData()
        formData.append("file", attachedFile)
        formData.append("title", `${selectedOrder.testName} Report`)
        formData.append("patientId", selectedOrder.patientId)
        formData.append("testOrderId", selectedOrder.id)
        formData.append("resultSummary", resultSummary)

        const uploadRes = await fetch("/api/lab-technician/upload", {
          method: "POST",
          body: formData,
        })
        const uploadData = await uploadRes.json()
        if (!uploadRes.ok) {
          toast.error(uploadData.error || "Failed to upload file")
          setSubmittingReport(false)
          return
        }
      } else {
        // Submit text findings
        const res = await fetch("/api/lab-technician/results", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: selectedOrder.id,
            resultSummary,
          }),
        })
        const data = await res.json()
        if (!res.ok) {
          toast.error(data.error || "Failed to submit report")
          setSubmittingReport(false)
          return
        }
      }

      toast.success(`Report published for ${selectedOrder.testName}`)
      setReportOpen(false)
      fetchPrescriptions()
      if (activePatient) fetchPastReports(activePatient.id)
    } catch {
      toast.error("Submission failed")
    } finally {
      setSubmittingReport(false)
    }
  }

  // Handle Standalone Document Upload for Patient
  async function handleStandaloneUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!activePatient) {
      toast.error("Please search and select a patient first")
      return
    }
    if (!uploadFile) {
      toast.error("Please select a file to upload")
      return
    }

    setUploadingDoc(true)
    try {
      const formData = new FormData()
      formData.append("file", uploadFile)
      formData.append("title", uploadTitle || uploadFile.name.replace(/\.[^/.]+$/, ""))
      formData.append("patientId", activePatient.id)
      formData.append("resultSummary", uploadNotes)

      const res = await fetch("/api/lab-technician/upload", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "Upload failed")
        setUploadingDoc(false)
        return
      }

      toast.success("Lab report document uploaded and processed!")
      setUploadModalOpen(false)
      setUploadTitle("")
      setUploadFile(null)
      setUploadNotes("")
      fetchPrescriptions()
      fetchPastReports(activePatient.id)
    } catch {
      toast.error("Failed to upload report document")
    } finally {
      setUploadingDoc(false)
    }
  }

  // Calculate pending vs completed lab orders
  const pendingOrdersCount = prescriptions.reduce((acc, rx) => {
    return acc + (rx.labOrders?.filter((lo: any) => lo.status === "PENDING").length || 0)
  }, 0)

  const completedOrdersCount = prescriptions.reduce((acc, rx) => {
    return acc + (rx.labOrders?.filter((lo: any) => lo.status === "COMPLETED").length || 0)
  }, 0)

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Lab Technician Workstation</h1>
              <p className="text-sm text-muted-foreground">
                View ordered diagnostic tests, upload report scans, and print hard copies for patients
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activePatient && (
            <Button
              onClick={() => {
                setUploadTitle("")
                setUploadFile(null)
                setUploadNotes("")
                setUploadModalOpen(true)
              }}
              className="gap-1.5 shadow-sm text-xs h-8"
            >
              <Upload className="h-3.5 w-3.5" /> Upload Lab Report
            </Button>
          )}
          <Badge variant="outline" className="px-3 py-1 font-mono text-xs">
            Role: Lab Technician
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Tests Pending Analysis</p>
              <p className="text-2xl font-bold mt-1 text-amber-600">{pendingOrdersCount}</p>
            </div>
            <Clock className="h-7 w-7 text-amber-600/70" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Reports Published</p>
              <p className="text-2xl font-bold mt-1 text-emerald-600">{completedOrdersCount}</p>
            </div>
            <FileCheck2 className="h-7 w-7 text-emerald-600/70" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Past Reports on File</p>
              <p className="text-2xl font-bold mt-1 text-primary">
                {activePatient ? pastReports.length : completedOrdersCount}
              </p>
            </div>
            <Printer className="h-7 w-7 text-primary/70" />
          </CardContent>
        </Card>
      </div>

      {/* Aadhaar Search Bar */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-transparent to-transparent shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                Access Patient with Aadhaar Number
              </CardTitle>
              <CardDescription>
                Enter the patient&apos;s 12-digit Aadhaar to access past sent reports, fulfill orders, and print hard copies
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Test Aadhaar:</span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs font-mono"
                onClick={() => {
                  setAadhaarInput("1234 5678 9012")
                  handleAadhaarLookup("123456789012")
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
                placeholder="1234 5678 9012"
                value={aadhaarInput}
                onChange={handleAadhaarChange}
                maxLength={14}
                className="pl-9 font-mono tracking-wider text-base"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAadhaarLookup()
                }}
              />
            </div>
            <Button onClick={() => handleAadhaarLookup()} disabled={searchingAadhaar} className="gap-2 shrink-0">
              {searchingAadhaar ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Looking up...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" /> Access Patient
                </>
              )}
            </Button>
            {activePatient && (
              <Button
                variant="outline"
                onClick={() => {
                  setActivePatient(null)
                  setAadhaarInput("")
                  setPastReports([])
                  fetchPrescriptions()
                }}
              >
                Clear
              </Button>
            )}
          </div>

          {activePatient && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-primary/10 text-primary border border-primary/20 text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>
                  Active Patient: <span className="font-bold text-foreground text-sm">{activePatient.name}</span>{" "}
                  (Aadhaar: <span className="font-mono">{activePatient.aadhaar}</span>)
                </span>
              </div>
              <Button
                size="sm"
                variant="secondary"
                className="h-7 text-xs gap-1"
                onClick={() => setUploadModalOpen(true)}
              >
                <Upload className="h-3 w-3" /> Upload Report Document
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Workstation Tabs: Pending Orders vs Past Sent Reports */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="pending" className="gap-2">
            <FlaskConical className="h-4 w-4" />
            <span>Pending Test Orders ({pendingOrdersCount})</span>
          </TabsTrigger>
          <TabsTrigger value="past-reports" className="gap-2">
            <Printer className="h-4 w-4" />
            <span>Past Reports Sent to Patient ({activePatient ? pastReports.length : "Select Patient"})</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: PENDING ORDERS */}
        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FlaskConical className="h-5 w-5 text-primary" />
                Diagnostic Lab Orders Queue
              </CardTitle>
              <CardDescription>
                Lab tests ordered by doctors awaiting specimen testing, report upload, and findings publication
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-12 flex justify-center items-center text-muted-foreground text-sm gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" /> Loading lab orders...
                </div>
              ) : prescriptions.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  No lab test orders found. When a doctor orders lab tests, they will appear here.
                </div>
              ) : (
                <div className="space-y-6">
                  {prescriptions
                    .filter((rx) => rx.labOrders && rx.labOrders.length > 0)
                    .map((rx) => (
                      <div key={rx.id} className="rounded-xl border p-4 bg-muted/20 space-y-4">
                        {/* Prescription Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-base">
                                {rx.patient?.user?.name || rx.patient?.name || "Unnamed Patient"}
                              </span>
                              {(rx.patient?.aadhaar || activePatient?.aadhaar) && (
                                <span className="font-mono text-xs text-muted-foreground">
                                  (Aadhaar: {rx.patient?.aadhaar || activePatient?.aadhaar})
                                </span>
                              )}
                              <Badge
                                className={
                                  rx.status === "COMPLETED"
                                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                    : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                }
                              >
                                {rx.status}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Ordered by Dr. {rx.doctor?.user?.name || "Doctor"} • {formatDate(rx.createdAt)}
                            </p>
                          </div>

                          {rx.diagnosis && (
                            <div className="text-xs bg-background p-1.5 px-3 rounded-lg border">
                              <span className="text-muted-foreground">Diagnosis:</span>{" "}
                              <span className="font-semibold">{rx.diagnosis}</span>
                            </div>
                          )}
                        </div>

                        {/* Tests Grid */}
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Ordered Diagnostic Tests
                          </p>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {rx.labOrders.map((order: any) => (
                              <div
                                key={order.id}
                                className="p-3.5 rounded-lg border bg-card flex flex-col justify-between gap-3 shadow-sm"
                              >
                                <div>
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <FlaskConical className="h-4 w-4 text-primary shrink-0" />
                                      <h4 className="font-bold text-sm">{order.testName}</h4>
                                    </div>
                                    <Badge
                                      variant="outline"
                                      className={
                                        order.status === "COMPLETED"
                                          ? "text-emerald-600 border-emerald-500/30 bg-emerald-500/5 text-xs"
                                          : "text-amber-600 border-amber-500/30 bg-amber-500/5 text-xs"
                                      }
                                    >
                                      {order.status}
                                    </Badge>
                                  </div>

                                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                                    {order.instructions && (
                                      <p>
                                        <span className="font-medium text-foreground">Doctor Note:</span>{" "}
                                        {order.instructions}
                                      </p>
                                    )}
                                    {order.resultSummary && (
                                      <div className="p-2 rounded bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 mt-2">
                                        <p className="font-semibold">Findings:</p>
                                        <p className="mt-0.5">{order.resultSummary}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {order.status === "PENDING" ? (
                                  <Button
                                    size="sm"
                                    onClick={() => openReportDialog(order, rx)}
                                    className="w-full gap-1.5 h-8 text-xs"
                                  >
                                    <FileCheck2 className="h-3.5 w-3.5" /> Submit Test Report & Upload
                                  </Button>
                                ) : (
                                  <div className="flex items-center justify-between pt-1 border-t">
                                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                      Completed {order.completedAt ? formatDate(order.completedAt) : ""}
                                    </span>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-xs gap-1"
                                      onClick={() =>
                                        setPrintableReport({
                                          report: order,
                                          patient: rx.patient?.user || activePatient,
                                          technician: technicianProfile,
                                        })
                                      }
                                    >
                                      <Printer className="h-3 w-3" /> Print
                                    </Button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: PAST REPORTS SENT TO PATIENT (WITH PRINT OPTION) */}
        <TabsContent value="past-reports">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Printer className="h-5 w-5 text-primary" />
                    Past Reports Sent to Patient
                  </CardTitle>
                  <CardDescription>
                    Access historical reports created and sent by your laboratory with instant hard copy printing
                  </CardDescription>
                </div>
                {activePatient && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1.5"
                    onClick={() => fetchPastReports(activePatient.id)}
                  >
                    Refresh List
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!activePatient ? (
                <div className="py-12 text-center space-y-2">
                  <CreditCard className="h-8 w-8 text-muted-foreground mx-auto" />
                  <p className="text-base font-semibold">Enter Patient Aadhaar to View Past Reports</p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Search a patient&apos;s 12-digit Aadhaar number using the search bar above to pull up all official reports issued to them.
                  </p>
                </div>
              ) : loadingPastReports ? (
                <div className="py-12 flex justify-center items-center text-muted-foreground text-sm gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" /> Fetching patient report archive...
                </div>
              ) : pastReports.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm space-y-2">
                  <FileText className="h-8 w-8 text-muted-foreground mx-auto" />
                  <p>No completed lab reports found for {activePatient.name}.</p>
                  <p className="text-xs">Once you submit a report or upload a document for this patient, it will appear here for printing.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pastReports.map((report) => (
                    <div
                      key={report.id}
                      className="p-4 rounded-xl border bg-card hover:border-primary/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-base text-foreground">{report.testName}</span>
                          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
                            Completed & Sent
                          </Badge>
                        </div>

                        <p className="text-xs text-muted-foreground">
                          Patient: <span className="font-medium text-foreground">{activePatient.name}</span> • Aadhaar:{" "}
                          <span className="font-mono">{activePatient.aadhaar}</span> • Date:{" "}
                          <span className="font-medium">{formatDate(report.completedAt || new Date())}</span>
                        </p>

                        {report.resultSummary && (
                          <div className="text-xs p-2 rounded bg-muted/40 max-w-xl text-slate-700 dark:text-slate-300">
                            <span className="font-semibold">Findings:</span> {report.resultSummary}
                          </div>
                        )}

                        {report.document && (
                          <div className="flex items-center gap-1.5 text-xs text-primary pt-1">
                            <Paperclip className="h-3.5 w-3.5" />
                            <span>Attached File: {report.document.title}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {report.document?.imagekitUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs gap-1.5"
                            onClick={() => window.open(report.document.imagekitUrl, "_blank")}
                          >
                            <Download className="h-3.5 w-3.5" /> File
                          </Button>
                        )}
                        <Button
                          size="sm"
                          className="h-8 text-xs gap-1.5 shadow-sm"
                          onClick={() =>
                            setPrintableReport({
                              report,
                              patient: activePatient,
                              technician: technicianProfile,
                            })
                          }
                        >
                          <Printer className="h-3.5 w-3.5" /> Print Hard Copy
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* SUBMIT TEST REPORT DIALOG (Order Fulfillment + File Upload) */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-primary" />
              Submit Diagnostic Test Report
            </DialogTitle>
            <DialogDescription>
              Record laboratory findings and attach digital report files for{" "}
              <span className="font-semibold text-foreground">{selectedOrder?.testName}</span> (Patient:{" "}
              <span className="font-semibold text-foreground">{selectedOrder?.patientName}</span>)
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4 py-2">
              <div className="p-3 rounded-lg border bg-muted/40 text-xs space-y-1">
                <p className="font-bold text-sm">{selectedOrder.testName}</p>
                {selectedOrder.instructions && (
                  <p className="text-muted-foreground">Doctor Note: {selectedOrder.instructions}</p>
                )}
                {selectedOrder.diagnosis && (
                  <p className="text-muted-foreground">Diagnosis: {selectedOrder.diagnosis}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="result-summary">Findings Summary & Diagnostic Interpretation</Label>
                <Textarea
                  id="result-summary"
                  rows={4}
                  value={resultSummary}
                  onChange={(e) => setResultSummary(e.target.value)}
                  placeholder="e.g. HbA1c measured at 6.8%. Liver function enzymes within standard biological limits."
                />
              </div>

              {/* File Attachment Input */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Upload className="h-3.5 w-3.5 text-primary" />
                  <span>Attach Diagnostic Report File (PDF / Scan / Photo)</span>
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    ref={fileInputRef}
                    accept=".pdf,image/png,image/jpeg,image/webp"
                    className="cursor-pointer text-xs"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setAttachedFile(e.target.files[0])
                      }
                    }}
                  />
                  {attachedFile && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive shrink-0"
                      onClick={() => {
                        setAttachedFile(null)
                        if (fileInputRef.current) fileInputRef.current.value = ""
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Optional: Attach the raw PDF or scanned report. It will be stored in the patient&apos;s private vault.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setReportOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitReport} disabled={submittingReport} className="gap-2">
              {submittingReport ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Submitting...
                </>
              ) : (
                <>
                  <FileCheck2 className="h-4 w-4" /> Publish Test Report
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* STANDALONE LAB REPORT UPLOAD DIALOG */}
      <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Upload Lab Report Document
            </DialogTitle>
            <DialogDescription>
              Upload a diagnostic report directly into the medical vault of{" "}
              <span className="font-semibold text-foreground">{activePatient?.name}</span> (Aadhaar:{" "}
              <span className="font-mono">{activePatient?.aadhaar}</span>)
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleStandaloneUpload} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="upload-title">Report Title</Label>
              <Input
                id="upload-title"
                placeholder="e.g. Complete Blood Count (CBC) — June 2026"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="upload-file">Select Document (PDF / Scan / Image)</Label>
              <Input
                id="upload-file"
                type="file"
                ref={standaloneFileInputRef}
                accept=".pdf,image/png,image/jpeg,image/webp"
                className="cursor-pointer text-xs"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setUploadFile(e.target.files[0])
                    if (!uploadTitle) {
                      setUploadTitle(e.target.files[0].name.replace(/\.[^/.]+$/, ""))
                    }
                  }
                }}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="upload-notes">Summary Findings / Technician Notes</Label>
              <Textarea
                id="upload-notes"
                rows={3}
                placeholder="e.g. Routine hematology panel. Specimen hemolyzed check passed."
                value={uploadNotes}
                onChange={(e) => setUploadNotes(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setUploadModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={uploadingDoc} className="gap-2">
                {uploadingDoc ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" /> Upload & Process
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* PRINTABLE REPORT MODAL */}
      {printableReport && (
        <PrintableLabReport
          report={printableReport.report}
          patient={printableReport.patient}
          technician={printableReport.technician}
          onClose={() => setPrintableReport(null)}
        />
      )}

      {/* CONSENT OTP DIALOG */}
      <Dialog open={consentOpen} onOpenChange={setConsentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Patient Consent Verification
            </DialogTitle>
            <DialogDescription>
              Patient <span className="font-semibold text-foreground">{consentPatient?.name}</span> (Aadhaar:{" "}
              <span className="font-mono">{consentPatient?.aadhaar}</span>) requires consent verification to access their diagnostic test orders and reports.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
              A 6-digit consent OTP has been simulated for this patient. Enter any 6-digit OTP (e.g.{" "}
              <span className="font-mono font-medium text-primary">123456</span>) to verify and unlock access.
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
    </div>
  )
}
