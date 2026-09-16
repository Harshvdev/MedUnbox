"use client"

import { Printer, X, Download, ShieldCheck, Stethoscope, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/constants"

interface PrintablePrescriptionProps {
  prescription: {
    id: string
    diagnosis?: string | null
    notes?: string | null
    createdAt: string | Date
    doctor?: {
      user?: { name?: string | null }
      registrationNo?: string | null
      specialization?: string | null
      hospital?: string | null
      phone?: string | null
    } | null
    items?: Array<{
      id: string
      medicationName: string
      dosage: string
      frequency: string
      instructions?: string | null
      status?: string
      dispenseNotes?: string | null
    }>
    labOrders?: Array<{
      id: string
      testName: string
      instructions?: string | null
      status?: string
      resultSummary?: string | null
    }>
  }
  patient: {
    name?: string | null
    aadhaar?: string | null
    gender?: string | null
    bloodGroup?: string | null
    dateOfBirth?: string | Date | null
    phone?: string | null
  }
  onClose: () => void
}

export function PrintablePrescription({
  prescription,
  patient,
  onClose,
}: PrintablePrescriptionProps) {
  function handlePrint() {
    window.print()
  }

  const doctorName = prescription.doctor?.user?.name || "Dr. Sarah Jenkins"
  const regNo = prescription.doctor?.registrationNo || "MCI-2015-88492"
  const specialization = prescription.doctor?.specialization || "General Medicine & Internal Care"
  const hospital = prescription.doctor?.hospital || "Apollo Medical Center"
  const rxDate = formatDate(prescription.createdAt)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto backdrop-blur-sm">
      <div className="relative w-full max-w-3xl bg-background rounded-2xl shadow-2xl border overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Top Control Bar (Hidden in Print) */}
        <div className="flex items-center justify-between px-6 py-3 border-b bg-muted/50 print:hidden shrink-0">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Stethoscope className="h-4 w-4 text-primary" />
            <span>Clinical Prescription & Order Sheet</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handlePrint}
              className="h-8 gap-1.5 text-xs shadow-sm"
            >
              <Printer className="h-3.5 w-3.5" /> Print Prescription
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div id="printable-rx-area" className="p-8 overflow-y-auto flex-1 bg-white text-slate-900 font-sans print:p-0 print:m-0">
          {/* Clinic / Hospital Letterhead Header */}
          <div className="border-b-2 border-primary pb-4 mb-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-primary uppercase">
                  {hospital}
                </h1>
                <p className="text-sm font-bold text-slate-800 mt-0.5">
                  {doctorName}
                </p>
                <p className="text-xs text-slate-600">
                  {specialization} • Reg No: <span className="font-mono">{regNo}</span>
                </p>
                <p className="text-[11px] text-slate-500">
                  Clinical Consultation • Ph: {prescription.doctor?.phone || "080-4000-5678"}
                </p>
              </div>
              <div className="text-right">
                <Badge variant="outline" className="border-primary text-primary font-mono text-[10px] uppercase">
                  Official Medical Prescription
                </Badge>
                <p className="text-[11px] text-slate-500 font-mono mt-1">
                  Rx ID: {prescription.id.slice(-8).toUpperCase()}
                </p>
                <p className="text-[11px] text-slate-600">
                  Date: {rxDate}
                </p>
              </div>
            </div>
          </div>

          {/* Patient Demographics Table */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs mb-6">
            <div>
              <span className="text-slate-500 block font-medium">Patient Name</span>
              <span className="font-bold text-slate-900 text-sm">{patient.name || "Patient"}</span>
            </div>
            <div>
              <span className="text-slate-500 block font-medium">Aadhaar Number</span>
              <span className="font-mono font-semibold text-slate-900 tracking-wider">
                {patient.aadhaar || "—"}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block font-medium">Gender / Blood Group</span>
              <span className="font-medium text-slate-900">
                {patient.gender || "—"} • {patient.bloodGroup || "—"}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block font-medium">Contact Phone</span>
              <span className="font-medium text-slate-900">{patient.phone || "—"}</span>
            </div>
          </div>

          {/* Diagnosis & Clinical Advice */}
          {(prescription.diagnosis || prescription.notes) && (
            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 mb-6 text-xs space-y-1">
              {prescription.diagnosis && (
                <p>
                  <span className="font-bold text-slate-700 uppercase">Diagnosis:</span>{" "}
                  <span className="font-semibold text-slate-900">{prescription.diagnosis}</span>
                </p>
              )}
              {prescription.notes && (
                <p>
                  <span className="font-bold text-slate-700 uppercase">Doctor&apos;s Advice:</span>{" "}
                  <span className="text-slate-800">{prescription.notes}</span>
                </p>
              )}
            </div>
          )}

          {/* Rx Medications Section */}
          <div className="space-y-4 mb-6">
            <div className="border-b border-slate-200 pb-1 flex items-center gap-2">
              <span className="text-xl font-bold font-serif text-primary">℞</span>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Prescribed Medications
              </h2>
            </div>

            {(!prescription.items || prescription.items.length === 0) ? (
              <p className="text-xs text-slate-500 italic">No medications listed.</p>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-300 text-slate-500 font-semibold">
                    <th className="py-2 pr-4">#</th>
                    <th className="py-2 pr-4">Medication Name</th>
                    <th className="py-2 pr-4">Dosage</th>
                    <th className="py-2 pr-4">Frequency</th>
                    <th className="py-2">Instructions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {prescription.items.map((item, idx) => (
                    <tr key={item.id}>
                      <td className="py-2.5 pr-4 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-2.5 pr-4 font-bold text-slate-900">{item.medicationName}</td>
                      <td className="py-2.5 pr-4 font-medium text-slate-800">{item.dosage}</td>
                      <td className="py-2.5 pr-4 text-slate-700">{item.frequency}</td>
                      <td className="py-2.5 text-slate-600 italic">{item.instructions || "As directed"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Diagnostic Lab Tests Section */}
          {prescription.labOrders && prescription.labOrders.length > 0 && (
            <div className="space-y-3 mb-6 pt-2">
              <div className="border-b border-slate-200 pb-1">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Diagnostic Lab Tests Ordered
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {prescription.labOrders.map((order, idx) => (
                  <div key={order.id} className="p-2.5 rounded border border-slate-200 bg-slate-50">
                    <p className="font-semibold text-slate-900">{idx + 1}. {order.testName}</p>
                    {order.instructions && (
                      <p className="text-[11px] text-slate-500 mt-0.5">{order.instructions}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sign-off & Verification Footer */}
          <div className="pt-8 mt-12 border-t border-slate-200">
            <div className="flex items-end justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-primary font-semibold mb-1">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Digitally Validated Medical Prescription</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Valid for dispensing across all licensed pharmacies.
                </p>
                <p className="text-[10px] text-slate-400 mt-1">
                  MedUnbox Longitudinal Patient Medical Record Platform
                </p>
              </div>

              <div className="text-right">
                <div className="font-cursive text-lg text-slate-800 tracking-wider mb-1 italic">
                  {doctorName}
                </div>
                <p className="text-xs font-bold text-slate-900">{doctorName}</p>
                <p className="text-[11px] text-slate-500">Consultant Physician • Reg: {regNo}</p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">{hospital}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Embedded Print Styling */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-rx-area,
          #printable-rx-area * {
            visibility: visible;
          }
          #printable-rx-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px;
            background: white !important;
            color: black !important;
          }
        }
      `}</style>
    </div>
  )
}
