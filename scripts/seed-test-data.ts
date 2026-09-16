/**
 * Seeds a test account with fake medical records for trying the Ask My
 * Records feature without uploading real documents.
 *
 * Run: bun scripts/seed-test-data.ts
 * Login: seedtest@medunbox.test / Test@1234
 */
import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
import sharp from 'sharp'
import ImageKit from 'imagekit'
import { detectTrends } from '../src/lib/analysis'
import { uploadDocumentToImageKit } from '../src/lib/imagekit'

const db = new PrismaClient()

const EMAIL = 'seedtest@medunbox.test'
const PASSWORD = 'Test@1234'

/** Render a lab-report SVG into a PNG buffer. */
function renderReportPng(svg: string): Promise<Buffer> {
  return sharp(Buffer.from(svg)).png().toBuffer()
}

/**
 * Upload a seed report image to ImageKit (folder "seed"), reusing an existing
 * file with the same name so repeated seed runs don't accumulate copies.
 * Returns null when ImageKit isn't configured or the upload fails, letting the
 * seed fall back to placeholder URLs.
 */
interface SeedImage {
  fileId: string
  url: string
  thumbnailUrl: string | null
  size: number
}

async function ensureSeedImage(fileName: string, svg: string): Promise<SeedImage | null> {
  const { IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, IMAGEKIT_URL_ENDPOINT } = process.env
  if (!IMAGEKIT_PUBLIC_KEY || !IMAGEKIT_PRIVATE_KEY || !IMAGEKIT_URL_ENDPOINT) return null
  const ik = new ImageKit({ publicKey: IMAGEKIT_PUBLIC_KEY, privateKey: IMAGEKIT_PRIVATE_KEY, urlEndpoint: IMAGEKIT_URL_ENDPOINT })
  try {
    const folder = '/medunbox-documents/seed'
    const existing = await ik.listFiles({ path: folder, limit: 100 })
    const match = (existing ?? []).find((f) => f.name === fileName && 'fileId' in f)
    if (match && 'fileId' in match) {
      return { fileId: match.fileId, url: match.url, thumbnailUrl: match.thumbnail ?? null, size: match.size ?? 0 }
    }
    const png = await renderReportPng(svg)
    // Fixed file name + overwrite: repeated seed runs update one canonical
    // copy instead of accumulating uniquely-named duplicates.
    const uploaded = await uploadDocumentToImageKit(png, fileName, 'seed', 'image/png', { uniqueFileName: false })
    return { fileId: uploaded.fileId, url: uploaded.url, thumbnailUrl: uploaded.thumbnailUrl, size: uploaded.size }
  } catch (err) {
    console.warn(`Seed image ${fileName}: falling back to placeholder URL (${(err as Error).message})`)
    return null
  }
}

/** Escape text for interpolation into the SVG markup. */
function esc(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function labReportSvg(title: string, date: string, rows: Array<[string, string, string, string]>, impression: string) {
  const rowSvg = rows
    .map(([name, value, ref, flag], i) => {
      const y = 250 + i * 46
      const color = flag === 'Normal' ? '#16a34a' : '#dc2626'
      return `
        <rect x="60" y="${y - 30}" width="880" height="42" fill="${i % 2 === 0 ? '#f8fafc' : '#ffffff'}" />
        <text x="80" y="${y}" font-family="monospace" font-size="19" fill="#0f172a">${esc(name)}</text>
        <text x="560" y="${y}" font-family="monospace" font-size="19" font-weight="bold" fill="#0f172a">${esc(value)}</text>
        <text x="700" y="${y}" font-family="monospace" font-size="17" fill="#475569">${esc(ref)}</text>
        <text x="860" y="${y}" font-family="monospace" font-size="17" font-weight="bold" fill="${color}">${esc(flag)}</text>`
    })
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="700">
    <rect width="1000" height="700" fill="#ffffff" />
    <rect x="0" y="0" width="1000" height="90" fill="#0f766e" />
    <text x="60" y="42" font-family="Helvetica, Arial" font-size="28" font-weight="bold" fill="#ffffff">SUN DIAGNOSTIC LABORATORY</text>
    <text x="60" y="72" font-family="Helvetica, Arial" font-size="16" fill="#ccfbf1">123 Health Avenue, Bengaluru · Ph: 080-4000-1234</text>
    <text x="60" y="130" font-family="Helvetica, Arial" font-size="24" font-weight="bold" fill="#0f172a">${esc(title)}</text>
    <text x="60" y="160" font-family="Helvetica, Arial" font-size="16" fill="#475569">Patient: Test Patient (F, 36y) · Report Date: ${esc(date)}</text>
    <line x1="60" y1="185" x2="940" y2="185" stroke="#0f766e" stroke-width="2" />
    <text x="80" y="215" font-family="monospace" font-size="15" fill="#64748b">TEST</text>
    <text x="560" y="215" font-family="monospace" font-size="15" fill="#64748b">RESULT</text>
    <text x="700" y="215" font-family="monospace" font-size="15" fill="#64748b">REFERENCE</text>
    <text x="860" y="215" font-family="monospace" font-size="15" fill="#64748b">FLAG</text>
    ${rowSvg}
    <line x1="60" y1="${250 + rows.length * 46 + 12}" x2="940" y2="${250 + rows.length * 46 + 12}" stroke="#0f766e" stroke-width="2" />
    <text x="60" y="${250 + rows.length * 46 + 50}" font-family="Helvetica, Arial" font-size="16" font-weight="bold" fill="#0f172a">Impression: ${esc(impression)}</text>
    <text x="60" y="${660}" font-family="Helvetica, Arial" font-size="13" fill="#94a3b8">Verified by Dr. S. Rao, MD Pathology · This is seeded demo data, not a real report.</text>
  </svg>`
}

async function main() {
  // Idempotent: wipe any previous seed user (cascades to patient/docs)
  await db.user.deleteMany({ where: { email: EMAIL } })

  const user = await db.user.create({
    data: {
      email: EMAIL,
      passwordHash: await hash(PASSWORD, 10),
      name: 'Test Patient',
      role: 'PATIENT',
    },
  })

  const patient = await db.patient.create({
    data: {
      userId: user.id,
      aadhaar: '123456789012',
      phone: '9876543210',
      dateOfBirth: new Date('1990-05-14'),
      gender: 'FEMALE',
      bloodGroup: 'B+',
    },
  })

  const report1Text = `SUN DIAGNOSTIC LABORATORY
Complete Blood Count (CBC)
Patient: Test Patient    Report Date: 15 March 2026
----------------------------------------------
HEMOGLOBIN          9.7  g/dL    (Ref: 12.0 - 15.5)  LOW
WBC COUNT           11.2 x10^3/uL (Ref: 4.0 - 11.0)  HIGH
PLATELET COUNT      210  x10^3/uL (Ref: 150 - 450)  Normal
MCV                 74   fL       (Ref: 80 - 100)    LOW
----------------------------------------------
Impression: Microcytic anemia. Iron studies advised.`

  const report2Text = `SUN DIAGNOSTIC LABORATORY
CBC & Metabolic Panel
Patient: Test Patient    Report Date: 20 May 2026
----------------------------------------------
HEMOGLOBIN          11.2 g/dL   (Ref: 12.0 - 15.5)  Low-Normal
HbA1c               6.4  %      (Ref: 4.0 - 5.6)    HIGH
FASTING GLUCOSE     128  mg/dL  (Ref: 70 - 99)      HIGH
LDL CHOLESTEROL     145  mg/dL  (Ref: < 100)        HIGH
VITAMIN D (25-OH)   18   ng/mL  (Ref: 30 - 100)     LOW
----------------------------------------------
Impression: Glycemic control borderline; dyslipidemia; vitamin D deficiency.`

  // Real lab-report images so the vault, detail pages and thumbnails are
  // fully presentable; falls back to placeholder URLs without ImageKit.
  const [img1, img2] = await Promise.all([
    ensureSeedImage(
      'cbc-march-2026.png',
      labReportSvg(
        'Complete Blood Count (CBC)',
        '15 March 2026',
        [
          ['HEMOGLOBIN', '9.7 g/dL', '12.0 - 15.5', 'LOW'],
          ['WBC COUNT', '11.2 x10^3/uL', '4.0 - 11.0', 'HIGH'],
          ['PLATELET COUNT', '210 x10^3/uL', '150 - 450', 'Normal'],
          ['MCV', '74 fL', '80 - 100', 'LOW'],
        ],
        'Microcytic anemia. Iron studies advised.',
      ),
    ),
    ensureSeedImage(
      'cbc-may-2026.png',
      labReportSvg(
        'CBC & Metabolic Panel',
        '20 May 2026',
        [
          ['HEMOGLOBIN', '11.2 g/dL', '12.0 - 15.5', 'Low-Normal'],
          ['HbA1c', '6.4 %', '4.0 - 5.6', 'HIGH'],
          ['FASTING GLUCOSE', '128 mg/dL', '70 - 99', 'HIGH'],
          ['LDL CHOLESTEROL', '145 mg/dL', '< 100', 'HIGH'],
          ['VITAMIN D (25-OH)', '18 ng/mL', '30 - 100', 'LOW'],
        ],
        'Glycemic control borderline; dyslipidemia; vitamin D deficiency.',
      ),
    ),
  ])

  const report1 = await db.document.create({
    data: {
      patientId: patient.id,
      title: 'Complete Blood Count — Sun Labs — 15 Mar 2026',
      category: 'LAB_REPORT',
      mimeType: 'image/png',
      fileSize: img1?.size ?? 245760,
      fileHash: 'seed-hash-cbc-march-2026',
      pageCount: 1,
      imagekitFileId: img1?.fileId ?? 'seed-cbc-march-2026',
      imagekitUrl: img1?.url ?? 'https://ik.imagekit.io/Harshvdev/seed/cbc-march-2026.png',
      thumbnailUrl: img1?.thumbnailUrl ?? null,
      status: 'PROCESSED',
      uploadedAt: new Date('2026-03-15'),
      processedAt: new Date('2026-03-15'),
      pages: {
        create: { pageNumber: 1 },
      },
    },
  })

  const report2 = await db.document.create({
    data: {
      patientId: patient.id,
      title: 'CBC & Metabolic Panel — Sun Labs — 20 May 2026',
      category: 'LAB_REPORT',
      mimeType: 'image/png',
      fileSize: img2?.size ?? 258048,
      fileHash: 'seed-hash-cbc-may-2026',
      pageCount: 1,
      imagekitFileId: img2?.fileId ?? 'seed-cbc-may-2026',
      imagekitUrl: img2?.url ?? 'https://ik.imagekit.io/Harshvdev/seed/cbc-may-2026.png',
      thumbnailUrl: img2?.thumbnailUrl ?? null,
      status: 'PROCESSED',
      uploadedAt: new Date('2026-05-20'),
      processedAt: new Date('2026-05-20'),
      pages: {
        create: { pageNumber: 1 },
      },
    },
  })

  for (const [doc, text, date] of [
    [report1, report1Text, '2026-03-15'],
    [report2, report2Text, '2026-05-20'],
  ] as const) {
    const page = await db.documentPage.findFirstOrThrow({ where: { documentId: doc.id } })
    await db.extractedText.create({
      data: {
        documentId: doc.id,
        pageId: page.id,
        pageNumber: 1,
        rawText: text,
        cleanedText: text,
        confidence: 0.97,
      },
    })
    await db.document.update({ where: { id: doc.id }, data: { processedAt: new Date(date) } })
  }

  const values = [
    // Report 1 (15 Mar 2026)
    { doc: report1, entity: 'HEMOGLOBIN', label: 'Hemoglobin', value: '9.7', numericValue: 9.7, unit: 'g/dL', referenceRange: '12.0 - 15.5', status: 'ABNORMAL_LOW' as const, recordedAt: '2026-03-15', sourceText: 'HEMOGLOBIN 9.7 g/dL (Ref: 12.0 - 15.5) LOW' },
    { doc: report1, entity: 'WBC_COUNT', label: 'WBC Count', value: '11.2', numericValue: 11.2, unit: 'x10^3/uL', referenceRange: '4.0 - 11.0', status: 'ABNORMAL_HIGH' as const, recordedAt: '2026-03-15', sourceText: 'WBC COUNT 11.2 x10^3/uL (Ref: 4.0 - 11.0) HIGH' },
    { doc: report1, entity: 'PLATELET_COUNT', label: 'Platelet Count', value: '210', numericValue: 210, unit: 'x10^3/uL', referenceRange: '150 - 450', status: 'NORMAL' as const, recordedAt: '2026-03-15', sourceText: 'PLATELET COUNT 210 x10^3/uL (Ref: 150 - 450) Normal' },
    { doc: report1, entity: 'MCV', label: 'MCV', value: '74', numericValue: 74, unit: 'fL', referenceRange: '80 - 100', status: 'ABNORMAL_LOW' as const, recordedAt: '2026-03-15', sourceText: 'MCV 74 fL (Ref: 80 - 100) LOW' },
    // Report 2 (20 May 2026)
    { doc: report2, entity: 'HEMOGLOBIN', label: 'Hemoglobin', value: '11.2', numericValue: 11.2, unit: 'g/dL', referenceRange: '12.0 - 15.5', status: 'NORMAL' as const, recordedAt: '2026-05-20', sourceText: 'HEMOGLOBIN 11.2 g/dL (Ref: 12.0 - 15.5) Low-Normal' },
    { doc: report2, entity: 'HBA1C', label: 'HbA1c', value: '6.4', numericValue: 6.4, unit: '%', referenceRange: '4.0 - 5.6', status: 'ABNORMAL_HIGH' as const, recordedAt: '2026-05-20', sourceText: 'HbA1c 6.4 % (Ref: 4.0 - 5.6) HIGH' },
    { doc: report2, entity: 'GLUCOSE_FASTING', label: 'Fasting Glucose', value: '128', numericValue: 128, unit: 'mg/dL', referenceRange: '70 - 99', status: 'ABNORMAL_HIGH' as const, recordedAt: '2026-05-20', sourceText: 'FASTING GLUCOSE 128 mg/dL (Ref: 70 - 99) HIGH' },
    { doc: report2, entity: 'CHOLESTEROL_LDL', label: 'LDL Cholesterol', value: '145', numericValue: 145, unit: 'mg/dL', referenceRange: '< 100', status: 'ABNORMAL_HIGH' as const, recordedAt: '2026-05-20', sourceText: 'LDL CHOLESTEROL 145 mg/dL (Ref: < 100) HIGH' },
    { doc: report2, entity: 'VITAMIN_D', label: 'Vitamin D (25-OH)', value: '18', numericValue: 18, unit: 'ng/mL', referenceRange: '30 - 100', status: 'ABNORMAL_LOW' as const, recordedAt: '2026-05-20', sourceText: 'VITAMIN D (25-OH) 18 ng/mL (Ref: 30 - 100) LOW' },
  ]

  for (const v of values) {
    await db.medicalValue.create({
      data: {
        documentId: v.doc.id,
        patientId: patient.id,
        entity: v.entity,
        label: v.label,
        value: v.value,
        numericValue: v.numericValue,
        unit: v.unit,
        referenceRange: v.referenceRange,
        status: v.status,
        recordedAt: new Date(v.recordedAt),
        pageNumber: 1,
        sourceText: v.sourceText,
      },
    })
  }

  await db.diagnosis.createMany({
    data: [
      { patientId: patient.id, name: 'Iron-Deficiency Anemia', icdCode: 'D50.9', status: 'ACTIVE', diagnosedAt: new Date('2026-03-15'), sourceDocId: report1.id, notes: 'Microcytic anemia on CBC; iron studies advised.' },
      { patientId: patient.id, name: 'Prediabetes', icdCode: 'R73.03', status: 'ACTIVE', diagnosedAt: new Date('2026-05-20'), sourceDocId: report2.id, notes: 'HbA1c 6.4%.' },
    ],
  })

  await db.medication.createMany({
    data: [
      { patientId: patient.id, name: 'Ferrous Sulfate', dosage: '100 mg', frequency: 'Once daily', route: 'Oral', startDate: new Date('2026-03-16'), status: 'ACTIVE', sourceDocId: report1.id },
      { patientId: patient.id, name: 'Metformin', dosage: '500 mg', frequency: 'Twice daily', route: 'Oral', startDate: new Date('2026-05-21'), status: 'ACTIVE', sourceDocId: report2.id },
    ],
  })

  await db.timelineEvent.createMany({
    data: [
      { patientId: patient.id, date: new Date('2026-03-15'), title: 'Complete Blood Count', description: 'CBC at Sun Labs: Hemoglobin 9.7 g/dL (LOW), MCV 74 fL (LOW). Microcytic anemia.', category: 'LAB_TEST', sourceDocId: report1.id },
      { patientId: patient.id, date: new Date('2026-03-16'), title: 'Started Ferrous Sulfate', description: 'Iron supplementation 100 mg once daily started after anemia findings.', category: 'MEDICATION_START', sourceDocId: report1.id },
      { patientId: patient.id, date: new Date('2026-05-20'), title: 'CBC & Metabolic Panel', description: 'Hemoglobin improved to 11.2 g/dL. HbA1c 6.4% and fasting glucose 128 mg/dL — prediabetes range. LDL 145, Vitamin D 18.', category: 'LAB_TEST', sourceDocId: report2.id },
      { patientId: patient.id, date: new Date('2026-05-20'), title: 'Diagnosed with Prediabetes', description: 'HbA1c 6.4% on metabolic panel.', category: 'DIAGNOSIS', sourceDocId: report2.id },
      { patientId: patient.id, date: new Date('2026-05-21'), title: 'Started Metformin', description: 'Metformin 500 mg twice daily initiated for prediabetes.', category: 'MEDICATION_START', sourceDocId: report2.id },
    ],
  })

  // Compute trends (Hemoglobin has two data points) using the app's own logic
  await detectTrends(patient.id)
  const trendCount = await db.trend.count({ where: { patientId: patient.id } })

  // ============================================================
  // SEED HEALTHCARE PROFESSIONALS (DOCTOR, PHARMACIST, LAB TECH)
  // ============================================================

  // 1. Doctor: Dr. Sarah Jenkins
  await db.user.deleteMany({ where: { email: 'qa.doctor@medunbox.test' } })
  const doctorUser = await db.user.create({
    data: {
      email: 'qa.doctor@medunbox.test',
      passwordHash: await hash('Test@1234', 10),
      name: 'Dr. Sarah Jenkins',
      role: 'DOCTOR',
    },
  })
  const doctor = await db.doctor.create({
    data: {
      userId: doctorUser.id,
      registrationNo: 'MCI-2015-88492',
      specialization: 'Internal Medicine & Endocrinology',
      hospital: 'Apollo Medical Center',
      phone: '9876543210',
    },
  })

  // 2. Pharmacist: Alex Reed, RPh
  await db.user.deleteMany({ where: { email: 'qa.pharmacist@medunbox.test' } })
  const pharmacistUser = await db.user.create({
    data: {
      email: 'qa.pharmacist@medunbox.test',
      passwordHash: await hash('Test@1234', 10),
      name: 'Alex Reed, RPh',
      role: 'PHARMACIST',
    },
  })
  const pharmacist = await db.pharmacist.create({
    data: {
      userId: pharmacistUser.id,
      registrationNo: 'PCI-2018-44910',
      pharmacyName: 'MedLife Central Pharmacy',
      phone: '9876543211',
    },
  })

  // 3. Lab Technician: Jordan Blake, MLT
  await db.user.deleteMany({ where: { email: 'qa.lab@medunbox.test' } })
  const labUser = await db.user.create({
    data: {
      email: 'qa.lab@medunbox.test',
      passwordHash: await hash('Test@1234', 10),
      name: 'Jordan Blake, MLT',
      role: 'LAB_TECHNICIAN',
    },
  })
  const labTechnician = await db.labTechnician.create({
    data: {
      userId: labUser.id,
      registrationNo: 'MLT-2020-11203',
      labName: 'Sun Diagnostic Laboratory',
      phone: '9876543212',
    },
  })

  // 4. Grant 30-day Access to HCPs for the test patient
  const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  // Doctor share
  await db.share.create({
    data: {
      patientId: patient.id,
      doctorId: doctor.id,
      scope: 'FULL',
      duration: 'THIRTY_DAYS',
      expiresAt: thirtyDays,
      isActive: true,
      categories: ['ALL'],
    },
  })

  // HCP Access records
  await db.hcpPatientAccess.createMany({
    data: [
      { patientId: patient.id, hcpUserId: doctorUser.id, hcpRole: 'DOCTOR', expiresAt: thirtyDays },
      { patientId: patient.id, hcpUserId: pharmacistUser.id, hcpRole: 'PHARMACIST', expiresAt: thirtyDays },
      { patientId: patient.id, hcpUserId: labUser.id, hcpRole: 'LAB_TECHNICIAN', expiresAt: thirtyDays },
    ],
    skipDuplicates: true,
  })

  // 5. Seed sample prescription with items for Pharmacist and Lab Tech
  await db.prescription.create({
    data: {
      patientId: patient.id,
      doctorId: doctor.id,
      diagnosis: 'Prediabetes & Mild Microcytic Anemia',
      notes: 'Maintain low-GI diet, 30 min exercise daily. Hydration minimum 2.5L/day. Review lab reports in 4 weeks.',
      status: 'PENDING',
      items: {
        create: [
          {
            medicationName: 'Metformin Hydrochloride',
            dosage: '500 mg',
            frequency: 'Twice daily after meals',
            instructions: 'Take with food to prevent GI distress',
            status: 'PENDING',
          },
          {
            medicationName: 'Ferrous Ascorbate',
            dosage: '100 mg',
            frequency: 'Once daily at bedtime',
            instructions: 'Take with vitamin C or orange juice',
            status: 'DISPENSED',
            dispensedAt: new Date(),
            pharmacistId: pharmacist.id,
            dispenseNotes: 'Dispensed 30 tablets. Instructed patient on iron compliance.',
          },
        ],
      },
      labOrders: {
        create: [
          {
            testName: 'HbA1c Glycated Hemoglobin',
            instructions: 'Fasting specimen. Evaluate 3-month glycemic response.',
            status: 'PENDING',
          },
          {
            testName: 'Complete Blood Count (CBC) with Peripheral Smear',
            instructions: 'Check RBC indices and reticulocyte count.',
            status: 'COMPLETED',
            resultSummary: 'Hb 11.2 g/dL, MCV 74 fL. Microcytosis persisting but improved from baseline 9.7 g/dL.',
            completedAt: new Date(),
            labTechnicianId: labTechnician.id,
          },
        ],
      },
    },
  })

  console.log('Seeded test accounts:')
  console.log('  Patient:    Aadhaar: 123456789012 (OTP: any 6 digits e.g. 123456)')
  console.log('              Email:   ' + EMAIL + ' / ' + PASSWORD)
  console.log('  Doctor:     Name:    Dr. Sarah Jenkins')
  console.log('              Phone:   9876543210')
  console.log('              Reg No:  MCI-2015-88492')
  console.log('  Pharmacist: Name:    Alex Reed, RPh')
  console.log('              Phone:   9876543211')
  console.log('              Reg No:  PCI-2018-44910')
  console.log('  Lab Tech:   Name:    Jordan Blake, MLT')
  console.log('              Phone:   9876543212')
  console.log('              Reg No:  MLT-2020-11203')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
