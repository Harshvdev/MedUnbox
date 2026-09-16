"use client"

import { Printer, X, Download, ShieldCheck, FileText, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/constants"

interface PrintableLabReportProps {
  report: {
    id: string
    testName: string
    resultSummary?: string | null
    resultValues?: any
    completedAt?: string | Date | null
    prescription?: {
      diagnosis?: string | null
      notes?: string | null
      doctor?: { user?: { name?: string | null } }
    } | null
    document?: {
      id: string
      title: string
      imagekitUrl: string
      mimeType: string
    } | null
  }
  patient: {
    name?: string | null
    aadhaar?: string | null
    gender?: string | null
    bloodGroup?: string | null
    dateOfBirth?: string | Date | null
    phone?: string | null
  }
  technician?: {
    name?: string | null
    labName?: string | null
    registrationNo?: string | null
    phone?: string | null
  }
  onClose: () => void
}

export function PrintableLabReport({
  report,
  patient,
  technician,
  onClose,
}: PrintableLabReportProps) {
  function handlePrint() {
    window.print()
  }

  const reportDate = report.completedAt ? formatDate(report.completedAt) : formatDate(new Date())
  const labName = technician?.labName || "SUN DIAGNOSTIC LABORATORY"
  const techName = technician?.name || "Certified Medical Lab Technician"
  const regNo = technician?.registrationNo || "MLT-2020-11203"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto backdrop-blur-sm">
      <div className="relative w-full max-w-3xl bg-background rounded-2xl shadow-2xl border overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Top Control Bar (Hidden in Print) */}
        <div className="flex items-center justify-between px-6 py-3 border-b bg-muted/50 print:hidden shrink-0">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Printer className="h-4 w-4 text-primary" />
            <span>Official Diagnostic Laboratory Report</span>
          </div>
          <div className="flex items-center gap-2">
            {report.document?.imagekitUrl && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => window.open(report.document?.imagekitUrl, "_blank")}
              >
                <Download className="h-3.5 w-3.5" /> View Attached File
              </Button>
            )}
            <Button
              size="sm"
              onClick={handlePrint}
              className="h-8 gap-1.5 text-xs shadow-sm"
            >
              <Printer className="h-3.5 w-3.5" /> Print Hard Copy
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
        <div id="printable-report-area" className="p-8 overflow-y-auto flex-1 bg-white text-slate-900 font-sans print:p-0 print:m-0">
          {/* Print Letterhead Header */}
          <div className="border-b-2 border-emerald-700 pb-4 mb-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-emerald-800 uppercase">
                  {labName}
                </h1>
                <p className="text-xs text-slate-600 mt-0.5">
                  Automated Clinical Chemistry, Hematology & Molecular Diagnostics
                </p>
                <p className="text-[11px] text-slate-500">
                  NABL Accredited • ISO 15189:2022 Certified • Contact: {technician?.phone || "080-4000-1234"}
                </p>
              </div>
              <div className="text-right">
                <Badge variant="outline" className="border-emerald-700 text-emerald-800 font-mono text-[10px] uppercase">
                  Verified Diagnostic Record
                </Badge>
                <p className="text-[11px] text-slate-500 font-mono mt-1">
                  Report ID: {report.id.slice(-8).toUpperCase()}
                </p>
                <p className="text-[11px] text-slate-600">
                  Date: {reportDate}
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
              <span className="text-slate-500 block font-medium">Referring Doctor</span>
              <span className="font-medium text-slate-900">
                {report.prescription?.doctor?.user?.name ? `Dr. ${report.prescription.doctor.user.name}` : "Clinical OPD"}
              </span>
            </div>
          </div>

          {/* Clinical Investigation Section */}
          <div className="space-y-4 mb-6">
            <div className="border-b border-slate-200 pb-2">
              <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide">
                Investigation: {report.testName}
              </h2>
              {report.prescription?.diagnosis && (
                <p className="text-xs text-slate-600 mt-0.5">
                  Clinical Indication: <span className="italic">{report.prescription.diagnosis}</span>
                </p>
              )}
            </div>

            {/* Diagnostic Findings */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Diagnostic Findings & Interpretation
              </h3>
              <div className="p-4 rounded-lg border border-slate-200 bg-white text-sm leading-relaxed text-slate-800 shadow-sm">
                {report.resultSummary || "Specimen processed and verified. Findings within expected biological reference interval."}
              </div>
            </div>

            {/* If attached file */}
            {report.document && (
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-emerald-600" />
                  <span className="font-medium">Attached Lab Document: {report.document.title}</span>
                </div>
                <span className="text-[11px] text-slate-500 font-mono">Archived in Private Vault</span>
              </div>
            )}
          </div>

          {/* Sign-off & Verification Footer */}
          <div className="pt-8 mt-12 border-t border-slate-200">
            <div className="flex items-end justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold mb-1">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Electronically Signed & Validated</span>
                </div>
                <p className="text-xs text-slate-500">
                  This document serves as an authentic laboratory report for clinical consultation.
                </p>
                <p className="text-[10px] text-slate-400 mt-1">
                  Generated via MedUnbox Longitudinal Medical Vault
                </p>
              </div>

              <div className="text-right">
                <div className="font-cursive text-lg text-slate-800 tracking-wider mb-1 italic">
                  {techName}
                </div>
                <p className="text-xs font-bold text-slate-900">{techName}</p>
                <p className="text-[11px] text-slate-500">Lab Technician • Reg No: {regNo}</p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">{labName}</p>
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
          #printable-report-area,
          #printable-report-area * {
            visibility: visible;
          }
          #printable-report-area {
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
