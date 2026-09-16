"use client"

import { useState, useEffect } from "react"
import {
  Pill,
  Search,
  CreditCard,
  KeyRound,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  ShieldCheck,
  User,
  PackageCheck,
  FileText,
  Printer,
} from "lucide-react"
import { PrintablePrescription } from "@/components/doctor/printable-prescription"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { toast } from "sonner"
import { formatDate } from "@/lib/constants"

export default function PharmacistDashboardPage() {
  const [prescriptions, setPrescriptions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Aadhaar search states
  const [aadhaarInput, setAadhaarInput] = useState("")
  const [searchingAadhaar, setSearchingAadhaar] = useState(false)
  const [activePatient, setActivePatient] = useState<any>(null)

  // Consent modal states
  const [consentOpen, setConsentOpen] = useState(false)
  const [consentPatient, setConsentPatient] = useState<any>(null)
  const [consentOtp, setConsentOtp] = useState("123456")
  const [verifyingConsent, setVerifyingConsent] = useState(false)

  // Dispense modal states
  const [dispenseOpen, setDispenseOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [dispenseNotes, setDispenseNotes] = useState("")
  const [dispensing, setDispensing] = useState(false)
  const [printableRx, setPrintableRx] = useState<any | null>(null)

  // Fetch all prescriptions
  async function fetchPrescriptions() {
    setLoading(true)
    try {
      const res = await fetch("/api/prescriptions")
      const data = await res.json()
      if (res.ok && data.prescriptions) {
        setPrescriptions(data.prescriptions)
      }
    } catch {
      toast.error("Failed to load prescriptions")
    } finally {
      setLoading(false)
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

  // Open Dispense Dialog
  function openDispenseDialog(item: any, rx: any) {
    setSelectedItem({ ...item, patientName: rx.patient?.user?.name || "Patient" })
    setDispenseNotes(`Verified dosage: ${item.dosage}. Dispensed as instructed: ${item.frequency}.`)
    setDispenseOpen(true)
  }

  // Submit Dispensation
  async function handleConfirmDispense() {
    if (!selectedItem) return
    setDispensing(true)

    try {
      const res = await fetch("/api/pharmacist/dispense", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: selectedItem.id,
          status: "DISPENSED",
          dispenseNotes,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Dispensation failed")
        setDispensing(false)
        return
      }

      toast.success(`Dispensed ${selectedItem.medicationName}`)
      setDispenseOpen(false)
      fetchPrescriptions()
    } catch {
      toast.error("Failed to submit dispensation")
    } finally {
      setDispensing(false)
    }
  }

  // Calculate pending vs dispensed items
  const pendingItemsCount = prescriptions.reduce((acc, rx) => {
    return acc + (rx.items?.filter((it: any) => it.status === "PENDING").length || 0)
  }, 0)

  const dispensedItemsCount = prescriptions.reduce((acc, rx) => {
    return acc + (rx.items?.filter((it: any) => it.status === "DISPENSED").length || 0)
  }, 0)

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Pill className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Pharmacist Dispensation Workstation</h1>
              <p className="text-sm text-muted-foreground">
                Review prescribed medications, verify dosages, and record dispensation
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1 font-mono text-xs">
            Role: Pharmacist
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Pending Dispensation</p>
              <p className="text-2xl font-bold mt-1 text-amber-600">{pendingItemsCount}</p>
            </div>
            <Clock className="h-7 w-7 text-amber-600/70" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Dispensed Items</p>
              <p className="text-2xl font-bold mt-1 text-emerald-600">{dispensedItemsCount}</p>
            </div>
            <PackageCheck className="h-7 w-7 text-emerald-600/70" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Total Prescriptions</p>
              <p className="text-2xl font-bold mt-1 text-primary">{prescriptions.length}</p>
            </div>
            <FileText className="h-7 w-7 text-primary/70" />
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
                Access Patient by Aadhaar Number
              </CardTitle>
              <CardDescription>
                Search a patient to see all their active prescriptions and clinical dosage requirements
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
                  <Search className="h-4 w-4" /> Filter Patient
                </>
              )}
            </Button>
            {activePatient && (
              <Button
                variant="outline"
                onClick={() => {
                  setActivePatient(null)
                  setAadhaarInput("")
                  fetchPrescriptions()
                }}
              >
                Clear
              </Button>
            )}
          </div>

          {activePatient && (
            <div className="mt-3 flex items-center gap-2 p-2 rounded bg-primary/10 text-primary text-xs font-medium">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>
                Viewing prescriptions for <span className="font-bold">{activePatient.name}</span> (Aadhaar: {activePatient.aadhaar})
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prescriptions List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Pill className="h-5 w-5 text-primary" />
            Prescriptions Queue
          </CardTitle>
          <CardDescription>
            Medications ordered by doctors awaiting pharmaceutical verification and dispensation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 flex justify-center items-center text-muted-foreground text-sm gap-2">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading prescriptions...
            </div>
          ) : prescriptions.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              No prescriptions found. Once a Doctor submits a prescription, it will appear here for dispensation.
            </div>
          ) : (
            <div className="space-y-6">
              {prescriptions.map((rx) => (
                <div key={rx.id} className="rounded-xl border p-4 bg-muted/20 space-y-4">
                  {/* Rx Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base">
                          {rx.patient?.user?.name || "Unnamed Patient"}
                        </span>
                        {rx.patient?.aadhaar && (
                          <span className="font-mono text-xs text-muted-foreground">
                            (Aadhaar: {rx.patient.aadhaar})
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
                        Prescribed by Dr. {rx.doctor?.user?.name || "Doctor"} • {formatDate(rx.createdAt)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {rx.diagnosis && (
                        <div className="text-xs bg-background p-1.5 px-3 rounded-lg border">
                          <span className="text-muted-foreground">Diagnosis:</span>{" "}
                          <span className="font-semibold">{rx.diagnosis}</span>
                        </div>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs gap-1.5"
                        onClick={() =>
                          setPrintableRx({
                            prescription: rx,
                            patient: rx.patient?.user || activePatient || rx.patient,
                          })
                        }
                      >
                        <Printer className="h-3.5 w-3.5" /> Print Rx Slip
                      </Button>
                    </div>
                  </div>

                  {/* Medications Table */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Prescribed Drugs & Dosages
                    </p>

                    {(!rx.items || rx.items.length === 0) ? (
                      <p className="text-xs text-muted-foreground">No medication items in this prescription.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {rx.items.map((item: any) => (
                          <div
                            key={item.id}
                            className="p-3 rounded-lg border bg-card flex flex-col justify-between gap-3"
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <Pill className="h-4 w-4 text-primary shrink-0" />
                                  <h4 className="font-bold text-sm">{item.medicationName}</h4>
                                </div>
                                <Badge
                                  variant="outline"
                                  className={
                                    item.status === "DISPENSED"
                                      ? "text-emerald-600 border-emerald-500/30 bg-emerald-500/5 text-xs"
                                      : "text-amber-600 border-amber-500/30 bg-amber-500/5 text-xs"
                                  }
                                >
                                  {item.status}
                                </Badge>
                              </div>

                              <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                                <p>
                                  <span className="font-medium text-foreground">Dosage:</span> {item.dosage}
                                </p>
                                <p>
                                  <span className="font-medium text-foreground">Frequency:</span> {item.frequency}
                                </p>
                                {item.instructions && (
                                  <p>
                                    <span className="font-medium text-foreground">Instructions:</span>{" "}
                                    {item.instructions}
                                  </p>
                                )}
                                {item.dispenseNotes && (
                                  <p className="text-emerald-600 italic mt-1">
                                    Notes: {item.dispenseNotes}
                                  </p>
                                )}
                              </div>
                            </div>

                            {item.status === "PENDING" ? (
                              <Button
                                size="sm"
                                onClick={() => openDispenseDialog(item, rx)}
                                className="w-full gap-1.5 h-8 text-xs"
                              >
                                <PackageCheck className="h-3.5 w-3.5" /> Prepare & Dispense
                              </Button>
                            ) : (
                              <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                Dispensed {item.dispensedAt ? formatDate(item.dispensedAt) : ""}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dispense Medication Dialog */}
      <Dialog open={dispenseOpen} onOpenChange={setDispenseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pill className="h-5 w-5 text-primary" />
              Prepare & Dispense Drug
            </DialogTitle>
            <DialogDescription>
              Confirm dosage preparation and record dispensation for{" "}
              <span className="font-semibold text-foreground">{selectedItem?.patientName}</span>
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4 py-2">
              <div className="p-3 rounded-lg border bg-muted/40 text-sm space-y-1">
                <p className="font-bold text-base">{selectedItem.medicationName}</p>
                <p className="text-xs text-muted-foreground">Dosage: <span className="font-medium text-foreground">{selectedItem.dosage}</span></p>
                <p className="text-xs text-muted-foreground">Frequency: <span className="font-medium text-foreground">{selectedItem.frequency}</span></p>
                {selectedItem.instructions && (
                  <p className="text-xs text-muted-foreground">Doctor Advice: {selectedItem.instructions}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="dispense-notes">Dispensation Notes / Verification</Label>
                <Input
                  id="dispense-notes"
                  value={dispenseNotes}
                  onChange={(e) => setDispenseNotes(e.target.value)}
                  placeholder="e.g. Batch #4991. Dispensed 30 tablets. Advised on taking with food."
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDispenseOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmDispense} disabled={dispensing} className="gap-2">
              {dispensing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Recording...
                </>
              ) : (
                <>
                  <PackageCheck className="h-4 w-4" /> Confirm Dispensation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Consent OTP Dialog */}
      <Dialog open={consentOpen} onOpenChange={setConsentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Patient Consent Verification
            </DialogTitle>
            <DialogDescription>
              Patient <span className="font-semibold text-foreground">{consentPatient?.name}</span> (Aadhaar: <span className="font-mono">{consentPatient?.aadhaar}</span>) requires consent verification to access their prescriptions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
              A 6-digit consent OTP has been simulated for this patient. Enter any 6-digit OTP (e.g. <span className="font-mono font-medium text-primary">123456</span>) to verify and unlock access.
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
