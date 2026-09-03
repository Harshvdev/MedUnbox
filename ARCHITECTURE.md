# MedUnbox — System Architecture

## 1. What is MedUnbox?

**MedUnbox is a patient-controlled longitudinal medical-record platform.**

It is a full-stack web application where patients can keep their medical records in one private medical vault instead of having their information scattered across individual reports, prescriptions, scans, and hospital documents.

Patients can upload:

* Medical reports
* Prescriptions
* Scans and imaging documents
* Discharge summaries
* Photographs of documents
* Scanned documents
* Multipage reports
* Handwritten prescriptions
* Old, blurry, or tilted documents
* Regional-language documents

MedUnbox processes these documents, extracts structured medical information, organizes it into a longitudinal history, detects trends, duplicate reports, and conflicting information, and provides AI-powered analysis grounded in the patient's actual records.

Patients also control which records doctors can access and for how long.

---

# 2. High-Level Architecture

```text
                         ┌──────────────────────────┐
                         │        MedUnbox          │
                         │       Web Application    │
                         └────────────┬─────────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    │                                   │
              Patient Interface                   Doctor Interface
                    │                                   │
                    └─────────────────┬─────────────────┘
                                      │
                              Next.js + TypeScript
                              Tailwind CSS + shadcn/ui
                                      │
                         ┌────────────┴────────────┐
                         │                         │
                    Authentication            Application Logic
                         │                         │
                    Neon Auth              Next.js server-side
                         │                         │
                         └────────────┬────────────┘
                                      │
                 ┌────────────────────┼────────────────────┐
                 │                    │                    │
                 ▼                    ▼                    ▼
          Neon PostgreSQL          ImageKit           AI / Processing
             + pgvector          Private Files           Layer
                 │                    │                    │
                 │                    │           ┌────────┴────────┐
                 │                    │           │                 │
                 │                    │        Python           Gemini API
                 │                    │           │
                 │                    │    ┌──────┴───────┐
                 │                    │    │              │
                 │                    │ PyMuPDF      PaddleOCR
                 │                    │                 │
                 │                    │              OpenCV
                 │                    │
                 │                    │
                 │                    └──────────────┐
                 │                                   │
                 │                             Extracted Data
                 │                                   │
                 └───────────────────────────────────┘
```

---

# 3. Website Structure

The same website is used by both patients and doctors.

The interface shown after login depends on the user's role.

```text
                         MedUnbox Website
                                │
                         ┌──────┴──────┐
                         │             │
                       Patient       Doctor
                         │             │
                  Patient Dashboard  Doctor Dashboard
                         │             │
              Medical Records       Shared Records
              Medical Timeline      Quick View
              Trends                Deep View
              Sharing               Ask My Records
              AI Analysis           Evidence
```

## Patient Side

The patient is the owner of the medical records.

The patient can:

* Upload medical documents
* View their medical vault
* View extracted medical information
* View their longitudinal medical history
* View detected trends
* Inspect duplicate reports
* Inspect conflicting information
* View AI analysis
* Control doctor access
* Select which records/categories to share
* Set access duration
* Revoke access

## Doctor Side

Doctors only see records that have been actively shared with them by the patient.

The doctor receives:

### Quick View

A concise overview containing the important parts of the patient's medical history.

### Deep View

A detailed view containing:

* Longitudinal medical timeline
* Important findings
* Trends
* Medications
* Diagnoses
* Original reports
* Extracted values
* AI analysis
* Evidence supporting AI-generated claims

### Ask My Records

Doctors can ask natural-language questions about the patient's history.

Example:

```text
Doctor:
"When was the patient's Hb first below 10?"
```

MedUnbox searches the patient's medical records and returns:

```text
The first recorded Hb below 10 g/dL was
9.7 g/dL in March 2026.
```

The answer is accompanied by evidence showing:

```text
Report name
Report date
Page number
Relevant extracted value/text
```

The doctor can open the original report.

---

# 4. End-to-End System Flow

## Step 1 — User Authentication

The user accesses the MedUnbox website and authenticates using **Neon Auth**.

The authenticated account is associated with either:

```text
Patient
   or
Doctor
```

Authorization is enforced server-side.

---

# 5. Patient Medical Document Flow

When a patient uploads a document:

```text
Patient
   │
   ▼
Next.js Web Application
   │
   ▼
Secure Upload
   │
   ▼
ImageKit
   │
   │ Original private document
   ▼
Document Processing
   │
   ▼
OCR
   │
   ├── PDF → PyMuPDF
   │
   ├── Scanned/Image → PaddleOCR
   │
   └── Image preprocessing → OpenCV
   │
   ▼
Extracted Text
   │
   ▼
Medical Entity Extraction
   │
   ▼
Structured Medical Information
   │
   ├── Medical values
   ├── Medications
   ├── Diagnoses
   └── Timeline events
   │
   ▼
Neon PostgreSQL
   │
   ▼
Longitudinal Medical History
```

The original medical document remains stored privately in **ImageKit**.

PostgreSQL stores the structured medical information and provenance, rather than the original PDF/image files.

---

# 6. Document Processing Pipeline

The document-processing architecture is:

```text
Medical Document
      │
      ▼
Document Upload
      │
      ▼
ImageKit Private Storage
      │
      ▼
Document Processing
      │
      ▼
Validation
      │
      ▼
OCR
      │
      ├── PyMuPDF
      ├── PaddleOCR
      └── OpenCV
      │
      ▼
Extracted Text
      │
      ▼
Medical Entity Extraction
      │
      ▼
Structured Medical Information
      │
      ├── Medical Values
      ├── Medications
      ├── Diagnoses
      └── Timeline Events
      │
      ▼
Duplicate Detection
      │
      ▼
Conflict Detection
      │
      ▼
Trend Detection
      │
      ▼
Stored Medical History
```

### OCR

The OCR layer must handle:

* Normal PDFs
* Scanned documents
* Photographs
* Old documents
* Blurry documents
* Tilted documents
* Handwritten prescriptions
* Regional-language documents

**OpenCV** is used for document/image processing, while **PaddleOCR** performs OCR.

**PyMuPDF** is used for PDF processing.

---

# 7. Structured Medical Information

Extracted information is stored in structured form rather than existing only as raw text.

The system extracts and organizes information such as:

```text
Medical Values
Medications
Diagnoses
Timeline Events
```

Every extracted medical value retains provenance.

For example:

```text
Medical Value
 ├── Value
 ├── Document ID
 ├── Page Number
 ├── Source Text / Location
 └── Extraction Metadata
```

This provenance is important because MedUnbox must be able to trace information back to the original report.

---

# 8. Longitudinal Medical History

The extracted information is organized into a longitudinal history.

```text
Medical Documents
       │
       ▼
Structured Information
       │
       ▼
Timeline Events
       │
       ▼
Longitudinal Medical Timeline
```

The timeline can contain:

* Important medical events
* Tests
* Medications
* Diagnoses
* Procedures
* Hospitalizations
* Other extracted medical information

The goal is to convert disconnected medical documents into a chronological patient history.

---

# 9. Trend Detection

Medical values from different reports can be analyzed across time.

Example:

```text
Hb

12.1 → 12.8 → 13.4
```

```text
HbA1c

5.8 → 6.1 → 6.5
```

```text
Creatinine

0.9 → 0.9 → 0.8
```

The system identifies trends such as:

```text
Improving
Worsening
Stable
Newly Abnormal
```

Numerical analysis is performed using:

```text
Python + pandas
```

---

# 10. Duplicate Detection

A patient may accidentally upload the same medical report multiple times.

The system detects duplicate documents.

```text
Document A
     │
     ├─────────────┐
     │             │
     ▼             ▼
Document B     Same Report
     │
     ▼
Duplicate Detection
```

Duplicates are **not silently deleted**.

Instead, the patient can:

```text
Keep
   or
Merge
```

the duplicate records.

---

# 11. Conflict Detection

The system also compares extracted information across different reports.

Example:

```text
Report A
Blood Group = B+

Report B
Blood Group = O+
```

The system identifies:

```text
CONFLICT DETECTED
```

It does **not** automatically determine which report is correct.

Instead, the user can inspect the conflicting information and open the original reports.

```text
Report A
   │
   ▼
B+

          ┌── Conflict ──┐

Report B
   │
   ▼
O+
```

This preserves the original medical evidence instead of making an unsupported medical decision.

---

# 12. AI / RAG Architecture

The AI layer is designed around the requirement that AI-generated answers must be grounded in the patient's records.

```text
Doctor Question
      │
      ▼
"Ask My Records"
      │
      ▼
Patient's Medical Data
      │
      ├── Structured medical information
      ├── Extracted text
      └── Relevant record representations
      │
      ▼
pgvector Search
      │
      ▼
Relevant Patient Records
      │
      ▼
Gemini API
      │
      ▼
AI Answer
      │
      ▼
Evidence
      │
      ├── Report name
      ├── Report date
      ├── Page number
      └── Relevant extracted value/text
      │
      ▼
Doctor
```

Embeddings use:

```text
BGE multilingual embeddings
```

Vector data is stored using:

```text
PostgreSQL + pgvector
```

There is no separate vector database.

---

# 13. Evidence-First AI

AI answers must be traceable to the patient's actual documents.

For every important AI-generated claim:

```text
AI Claim
   │
   ▼
Supporting Evidence
   │
   ├── Source Document
   ├── Report Date
   ├── Page Number
   └── Relevant Text / Extracted Value
```

The doctor can then open the original report stored in private ImageKit storage.

This creates the chain:

```text
Original Report
      ↓
Extracted Information
      ↓
Retrieved Evidence
      ↓
AI Claim
      ↓
Doctor Verification
```

The AI does not use generic medical knowledge as the basis for answering questions about the patient's history.

---

# 14. Sharing Architecture

Patients control access to their records.

```text
Patient
   │
   ▼
Select Records / Categories
   │
   ├── Complete History
   ├── Lab Reports
   ├── Prescriptions
   ├── Imaging
   └── Other Supported Categories
   │
   ▼
Select Access Duration
   │
   ├── 1 hour
   ├── 24 hours
   ├── 7 days
   ├── 30 days
   └── Until Revoked
   │
   ▼
Share Permission
   │
   ▼
Doctor
```

Doctors cannot access patient records unless active permission exists.

Access must therefore satisfy:

```text
Doctor Access
      =
Authenticated Doctor
      +
Patient Permission
      +
Permission Not Expired
      +
Permission Not Revoked
```

---

# 15. Authorization Model

The authorization boundary is enforced server-side.

```text
Doctor Request
      │
      ▼
Authenticated Identity
      │
      ▼
Check Active Share
      │
      ├── No → Access Denied
      │
      └── Yes
            │
            ▼
       Check Shared Scope
            │
            ▼
     Return Authorized Data
```

A doctor receives only the records covered by the patient's active sharing permission.

---

# 16. Database Architecture

The core relational PostgreSQL schema is:

```text
users
  │
  ├── patients
  │
  └── doctors


patients
  │
  └── documents
         │
         ├── document_pages
         │
         ├── extracted_text
         │
         ├── medical_entities
         │
         └── medical_values


patients
  │
  ├── medications
  ├── diagnoses
  ├── timeline_events
  ├── trends
  └── conflicts


patients
  │
  └── shares
         │
         └── share_permissions


ai_queries
   │
   ▼
ai_answers
   │
   ▼
evidence
```

## Core Tables

### `users`

Stores the application user identity.

### `patients`

Stores patient-specific information.

### `doctors`

Stores doctor-specific information.

### `documents`

Represents uploaded medical documents and their storage information.

The original document itself is stored privately in ImageKit.

### `document_pages`

Represents individual pages of multipage documents.

### `extracted_text`

Stores text extracted from medical documents.

### `medical_entities`

Stores extracted medical entities.

### `medical_values`

Stores extracted medical measurements and values along with provenance.

### `medications`

Stores extracted medication information.

### `diagnoses`

Stores extracted diagnoses.

### `timeline_events`

Stores events used to construct the longitudinal medical timeline.

### `trends`

Stores detected medical trends.

### `conflicts`

Stores detected contradictions between medical records.

### `shares`

Represents patient-to-doctor sharing.

### `share_permissions`

Defines what records/categories the doctor can access and the access duration.

### `ai_queries`

Stores doctor questions asked through "Ask My Records."

### `ai_answers`

Stores the generated answers.

### `evidence`

Connects AI answers to the supporting patient records.

---

# 17. Data and Storage Architecture

MedUnbox uses two main storage systems for different purposes.

```text
                   MedUnbox Data
                         │
              ┌──────────┴──────────┐
              │                     │
              ▼                     ▼
       ImageKit Private        Neon PostgreSQL
           Storage                + pgvector
              │                     │
              │                     ├── Users
              │                     ├── Patients
              │                     ├── Doctors
              │                     ├── Documents metadata
              │                     ├── Extracted text
              │                     ├── Medical entities
              │                     ├── Medical values
              │                     ├── Medications
              │                     ├── Diagnoses
              │                     ├── Timeline
              │                     ├── Trends
              │                     ├── Conflicts
              │                     ├── Sharing
              │                     ├── AI queries
              │                     ├── AI answers
              │                     └── Evidence
              │
              └── Original medical
                  PDFs/images
```

Original medical documents are **not stored inside PostgreSQL**.

---

# 18. Frontend Architecture

The frontend is built with:

```text
Next.js
TypeScript
Tailwind CSS
shadcn/ui
```

The website contains role-specific interfaces.

```text
                     Next.js
                        │
            ┌───────────┴───────────┐
            │                       │
      Patient Interface       Doctor Interface
            │                       │
            │                       ├── Quick View
            │                       ├── Deep View
            │                       ├── Timeline
            │                       ├── Findings
            │                       ├── Trends
            │                       ├── Medications
            │                       ├── Diagnoses
            │                       ├── Documents
            │                       ├── AI Analysis
            │                       └── Ask My Records
            │
            ├── Medical Vault
            ├── Upload
            ├── Medical History
            ├── Timeline
            ├── Trends
            ├── Conflicts
            ├── Duplicates
            ├── AI Analysis
            └── Sharing
```

---

# 19. Backend Architecture

The application uses Next.js for the main web application and server-side application logic.

```text
Browser
   │
   ▼
Next.js
   │
   ├── Authentication → Neon Auth
   │
   ├── Authorization
   │
   ├── Patient/Doctor logic
   │
   ├── Document operations
   │
   ├── Sharing logic
   │
   ├── AI request handling
   │
   └── Database operations
   │
   ├───────────────┬────────────────┐
   ▼               ▼                ▼
Neon PostgreSQL  ImageKit       Gemini API
   + pgvector
```

Python is used where it provides a clear advantage:

```text
Python
 ├── Document processing
 ├── OCR processing
 └── Numerical analysis
```

---

# 20. Multilingual Architecture

The system supports multilingual patient-facing output according to the specified languages.

Medical terminology can remain in English where appropriate for doctors.

The document-processing layer also supports regional-language documents through the OCR and extraction pipeline.

```text
Regional-language Document
          │
          ▼
        OCR
          │
          ▼
Extracted Medical Information
          │
          ▼
Structured Medical Data
          │
          ├── Patient-facing multilingual output
          │
          └── Doctor-facing medical terminology
```

---

# 21. Security Architecture

Because MedUnbox handles medical records, security is enforced throughout the system.

```text
Browser
   │
   ▼
Next.js Server
   │
   ├── Authentication
   ├── Authorization
   ├── Permission checks
   └── Secure server-side API calls
            │
       ┌────┼─────┐
       ▼    ▼     ▼
     Neon ImageKit Gemini
```

Security requirements:

* API keys remain server-side.
* ImageKit private keys are never exposed to the browser.
* Gemini API keys are never exposed to the browser.
* Original medical documents remain private.
* Public document URLs are not used for medical records.
* Doctor access requires active patient permission.
* Sharing supports expiration and revocation.
* Authorization is enforced server-side.
* Medical information is not fabricated.

---

# 22. Environment Configuration

The application receives its credentials through environment variables:

```text
DATABASE_URL
GEMINI_API_KEY
IMAGEKIT_PUBLIC_KEY
IMAGEKIT_PRIVATE_KEY
IMAGEKIT_URL_ENDPOINT
```

These values are provided separately and are not hardcoded into the application.

---

# 23. Complete MedUnbox Architecture

```text
                                MEDUNBOX
                     Patient-Controlled Medical Vault
                                      │
             ┌────────────────────────┴────────────────────────┐
             │                                                 │
        PATIENT WEBSITE                                  DOCTOR WEBSITE
             │                                                 │
      ┌──────┴──────┐                                  ┌───────┴────────┐
      │             │                                  │                │
   Upload        Manage                              Quick View       Deep View
   Records       Sharing                              │                │
      │             │                                 │        ┌───────┼────────┐
      │             │                                 │        │       │        │
      │             │                                 │     Timeline Trends Findings
      │             │                                 │
      │             │                                 ├── Medications
      │             │                                 ├── Diagnoses
      │             │                                 ├── Original Reports
      │             │                                 ├── AI Analysis
      │             │                                 └── Ask My Records
      │             │
      ▼             ▼
     NEXT.JS APPLICATION
             │
             ├────────────── Neon Auth
             │
             ├────────────── Authorization
             │
             ├────────────── Application Logic
             │
             └────────────── AI / Data Operations
                              │
             ┌────────────────┼─────────────────┐
             │                │                 │
             ▼                ▼                 ▼
      IMAGEKIT PRIVATE   NEON POSTGRESQL      GEMINI API
         DOCUMENTS          + pgvector
                                │
                ┌───────────────┼────────────────┐
                │               │                │
                ▼               ▼                ▼
          Structured       Longitudinal       Vector
          Medical Data       History          Search
                │               │                │
                └───────────────┼────────────────┘
                                │
                          AI / RAG SYSTEM
                                │
                         Evidence-First AI
                                │
                     ┌──────────┴──────────┐
                     │                     │
                 AI Answer             Evidence
                     │                     │
                     └──────────┬──────────┘
                                │
                         Original Report
                                │
                           ImageKit
```

---

# 24. Core Principle of the Architecture

The entire system is built around one central relationship:

```text
Patient Document
      ↓
Extracted Medical Information
      ↓
Longitudinal Medical History
      ↓
Doctor Access
      ↓
AI Analysis
      ↓
Evidence
      ↓
Original Medical Document
```

The original patient records remain the source of truth.

MedUnbox organizes those records, makes their history easier to understand, allows patients to control access, and allows doctors to query the patient's history through evidence-grounded AI.
