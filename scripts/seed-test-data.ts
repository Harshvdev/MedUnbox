/**
 * Seeds a test account with fake medical records for trying the Ask My
 * Records feature without uploading real documents.
 *
 * Run: bun scripts/seed-test-data.ts
 * Login: seedtest@medunbox.test / Test@1234
 */
import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const db = new PrismaClient()

const EMAIL = 'seedtest@medunbox.test'
const PASSWORD = 'Test@1234'

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

  const report1 = await db.document.create({
    data: {
      patientId: patient.id,
      title: 'Complete Blood Count — Sun Labs — 15 Mar 2026',
      category: 'LAB_REPORT',
      mimeType: 'image/png',
      fileSize: 245760,
      fileHash: 'seed-hash-cbc-march-2026',
      pageCount: 1,
      imagekitFileId: 'seed-cbc-march-2026',
      imagekitUrl: 'https://ik.imagekit.io/Harshvdev/seed/cbc-march-2026.png',
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
      fileSize: 258048,
      fileHash: 'seed-hash-cbc-may-2026',
      pageCount: 1,
      imagekitFileId: 'seed-cbc-may-2026',
      imagekitUrl: 'https://ik.imagekit.io/Harshvdev/seed/cbc-may-2026.png',
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

  console.log('Seeded test account:')
  console.log('  email:    ' + EMAIL)
  console.log('  password: ' + PASSWORD)
  console.log('  documents: 2, medical values: ' + values.length + ', timeline events: 5')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
