# CareLoop: Closed-Loop Screening-to-Care Platform
**Future Health Digital Innovation Challenge (Abu Dhabi)**

> **CRITICAL ETHICAL & REGULATORY NOTICE**:
> - **100% Synthetic Patient Data**: All patient records, clinical timelines, and screening findings in CareLoop are synthetic, generated deterministically by an internal seed script using a fixed random seed (`seed = 42`). CareLoop contains zero real personal health information (PHI).
> - **No Regulatory Claim**: CareLoop is a prototype platform for research and innovation demonstration. It has not been approved or cleared by the UAE Ministry of Health and Prevention (MOHAP), Department of Health – Abu Dhabi (DoH), US FDA, or any medical regulatory authority.
> - **Human-in-the-Loop AI**: No outbound calls to external AI services exist in Phase 1. An internal deterministic mock AI provider generates bilingual notifications, and all outputs are held in a mandatory human approval queue prior to clinical action.

---

## 1. Clinical Rationale & Core Architectural Tenets

The design of CareLoop reflects empirical lessons from clinical trials and screening audits:
1. **Delivery $\neq$ Acknowledgement $\neq$ Understanding**: Sending an SMS does not mean the patient received it, read it, or comprehended its urgency.
2. **Booked $\neq$ Attended $\neq$ Resolved**: Booking an appointment does not guarantee attendance. Attending an appointment does not resolve the screening loop without documented diagnostic disposition and histopathology.
3. **Reminders Alone Do Not Improve Follow-Up**: Standalone text messages achieve negligible follow-up improvement (~24%). Active multi-tier escalation, named case ownership, and human navigation (addressing fear, transport, and scheduling barriers) are essential to close the care loop.

---

## 2. Phase 1 Architecture & Deliverables

### A. State Machine & Closed-Loop Invariants (`src/engine/stateMachine.ts`)
Cases progress through strict, audited states:
$$\text{RESULT\_ISSUED} \to \text{PATIENT\_NOTIFIED} \to \text{ACKNOWLEDGED} \to \text{CONFIRMATORY\_TEST} \to \text{REFERRAL\_SENT} \to \text{REFERRAL\_ACCEPTED} \to \text{APPOINTMENT\_BOOKED} \to \text{ATTENDED} \to \text{DIAGNOSTIC\_DISPOSITION\_DOCUMENTED} \to \text{TREATMENT\_OR\_SURVEILLANCE} \to \text{CLOSED}$$
Plus `REJECTED` and `ESCALATED` states.

**Key Invariants**:
- **Owner & Audit Requirement**: Every state transition requires a named actor and role (`CLINICIAN`, `NAVIGATOR`, `PROGRAMME_ANALYST`, `PATIENT`) and creates an append-only `CaseEvent`.
- **Strict Closure Rules**: A Case can reach `CLOSED` **only** via:
  1. `CLINICAL_RESOLUTION`: Requires a documented diagnostic disposition (`diagnosticDispositionDocumentedAt`) and clinical evidence reference (e.g., pathology report ID).
  2. `AUTHORISED_ALTERNATIVE`: Requires a named human authoriser, reason code (`INFORMED_REFUSAL`, `TRANSFERRED_CARE`, `DECEASED`, `UNREACHABLE_AFTER_CONFIGURED_ATTEMPTS`, `OTHER`), and an explanatory note.
- **Never Close Prematurely**: A case can never be closed on notification, referral creation, or booking alone.

### B. SLA Engine & UAE Working Day Calendar (`src/engine/slaEngine.ts`)
- Computes due dates skipping weekends (Saturday and Sunday).
- Separates clinical deadlines (e.g., 31 working days for positive FIT, 15 working days for breast result communication) from platform SLAs (ingest $\le 24$h, acknowledgement $\le 72$h, referral acceptance $\le 2$ working days).
- **Urgency Class `CRITICAL`**: Bypasses routine SLAs and immediately escalates to attending clinicians within 4 hours.
- Computes attention scores and flags overdue, unassigned, rejected, and escalated cases.

### C. Outreach Ladder & Barrier Tracking (`src/engine/outreachEngine.ts`)
- Multi-tier escalation ladder: Day 0 SMS $\to$ Day 3 Phone Call $\to$ Day 7 Clinic Navigation Visit $\to$ Clinician Peer Escalation.
- Tracks `BarrierReason`: `COST_INSURANCE`, `TRANSPORT`, `FEAR_ANXIETY`, `LOW_HEALTH_LITERACY`, `COMMUNICATION_FAILURE`, `APPOINTMENT_UNAVAILABLE`, `WORKFORCE_CAPACITY`, `COMPETING_PRIORITIES`, `UNREACHABLE`, `OTHER`.
- Automatically assigns next required action and owner when an attempt goes unacknowledged.

### D. Cryptographic Hash-Chained Audit Trail (`src/engine/auditChain.ts`)
- Every system transaction generates a SHA-256 cryptographic hash chaining `prevHash` to the previous entry (rooted at `GENESIS_HASH`).
- Built-in verification engine detects payload tampering, broken links, or deleted records.

### E. Health Equity & Pure Metrics Engine (`src/engine/metricsEngine.ts`)
- Pure function computation of:
  - Notification rate, acknowledgement rate, referral completion, appointment attendance, clinical resolution rate.
  - Median and 90th percentile (P90) time to resolution.
  - Stage-by-stage attrition funnel.
  - Barrier counts and demographic completion gaps by language (`ar`, `en`), nationality group, and age band.
- **Privacy Standard**: Automatically suppresses groups with $<10$ cases to protect individual privacy and statistical validity.

### F. Interoperability & FHIR R4-Style Endpoints (`src/engine/fhirConverter.ts`)
- Exposes cases and referrals as FHIR R4 resources:
  - `Task`: Follow-up workflow tracking.
  - `ServiceRequest`: Diagnostic referral orders with LOINC (e.g., `14563-1`, `24604-5`) and SNOMED CT (`73761001`, `392011003`) placeholder fields.
  - `Appointment`: Scheduled/attended diagnostic encounters.
  - `Communication`: Outreach notification dispatches.

### G. Non-EHR Clinic CSV Batch Ingestion (`src/engine/csvImporter.ts`)
- Batch ingestion endpoint (`/api/import/csv`) for ambulatory clinics and mobile screening vans without EHR connectivity.
- In-batch and historical duplicate detection on `external_patient_id + result_id`.
- Complete validation audit report.

### H. Human-in-the-Loop AI Approval Queue (`src/engine/aiProvider.ts`)
- Local, deterministic `AiProvider` interface with zero external API calls.
- Culturally nuanced bilingual Arabic/English notifications held in an approval queue before patient dispatch.

### I. Deterministic Synthetic Case Generator (`src/scripts/seed.ts`)
- Generates synthetic patient records and cases per jurisdiction pack (2,000 cases for Abu Dhabi hero pack; 500 cases for reference/low-resource packs) with deterministic random seed `42`.
- Models realistic progression, delays, and drop-offs parameterized from published clinical literature.

### J. Jurisdiction-Agnostic Engine & Jurisdiction Packs (`src/packs/`)
- Zero jurisdiction-specific logic or country strings exist in `src/engine/` (enforced by automated AST/text linter tests).
- All regulatory deadlines, working-day calendars, language/RTL options, and health equity demographic strata are supplied at runtime by **Jurisdiction Packs**:
  1. **`abu-dhabi` (Hero Pack)**: Colorectal (31 working days) and Breast (15 working days); Arabic & English; Emirati vs Expatriate demographic groupings; Saturday & Sunday weekend.
  2. **`who-reference` (International Benchmark)**: WHO Cervical (30 working days), WHO Breast (42 working days / 60 calendar days), Ontario FIT-Positive Colonoscopy (40 working days / 8 weeks); English; Residency / immigrant class demographic grouping; Saturday & Sunday weekend.
  3. **`low-resource` (Community Clinic Setting)**: Community FOBT (45 working days), Community Women's Health (30 working days); English; Clinic District and Phone Accessibility demographic grouping; Sunday-only weekend (`[0]`).
- **Rule Verification Status Protocol**: Every rule carries a `verified: boolean` field. Rules are flagged `verified: false` by default until verified against official primary legal documentation. The Ontario pathway (`colorectal-ontario`) is marked `verified: true` based on published Cancer Care Ontario guidance.
- **Dynamic Pack Switcher UI**: Clinicians and analysts can hot-swap packs from the top navigation. The platform instantly reloads pathways, deadlines, calendar maths, and health equity matrices without redeployment, displaying a prominent banner with the verification status of all active rules.

---

## 3. Evidence Sources & Documentation

- **Data Sources Manifest**: [`docs/DATA_SOURCES.md`](file:///c:/Users/a-mahmud/Documents/Personal/Hacks/Hack2Skill\CareLoop\docs\DATA_SOURCES.md) and machine-readable [`docs/data_sources.json`](file:///c:/Users/a-mahmud/Documents/Personal/Hacks/Hack2Skill\CareLoop\docs\data_sources.json).
  - 2023 US cluster RCT (EHR reminders + navigation: 22.9% vs 31.4%, 120 days).
  - 2020 Tanzania SMS RCT (24.0% vs 23.8%).
  - 2025 Cameroon telephone RCT (25.6% vs 6.1%).
  - 2024 meta-analysis on abnormal screening follow-up (multicomponent OR 3.01 vs single 1.56).
  - 2020 international FIT survey (mean 79% colonoscopy at 6 months; organized 81% vs opportunistic 57%).
  - Abu Dhabi 2015-16 Emirati screening records (23.5% FOBT uptake, 13.5% follow-up colonoscopy).
- **Third-Party Licences**: [`LICENSES.md`](file:///c:/Users/a-mahmud/Documents/Personal/Hacks/Hack2Skill\CareLoop\LICENSES.md) (listing Next.js, React, Vitest, Prisma, Tailwind, plus SNOMED CT and LOINC copyright notices).

---

## 4. Verification & Test Suite Results

The entire platform is covered by Vitest unit tests:
```bash
npm test
```
**Results**:
- **11 test files passed (11/11)**
- **48 tests passed (48/48)**
- Execution time: ~3.5s

Test Suites:
1. `src/packs/jurisdictionPacks.test.ts` (5 tests):
   - AST/text linting enforcing zero occurrences of `"UAE"`, `"Abu Dhabi"`, or `"Emirati"` inside `src/engine/`.
   - Zod schema validation across all 3 jurisdiction packs (`abu-dhabi`, `who-reference`, `low-resource`).
   - Cross-pack due date and overdue status divergence under different clinical deadlines.
   - Working day calendar variations (e.g. Sunday-only vs Saturday/Sunday weekends).
   - Dynamic health equity disparity analysis adapting to each pack's `patientGroupFields`.
2. `src/engine/stateMachine.test.ts` (6 tests): Valid transitions, role permissions, strict closure invariants, premature closure prevention, authorized alternatives, escalation/rejection.
3. `src/engine/slaEngine.test.ts` (7 tests): Weekend calculation, working day additions, date differences, pathway deadlines, critical urgency fast-tracks, health assessment scoring.
4. `src/engine/outreachEngine.test.ts` (5 tests): Step-by-step ladder progression, barrier linking, call decline escalation, wrong number handling, acknowledgement completion.
5. `src/engine/metricsEngine.test.ts` (6 tests): Age band calculation, metric summary, median/P90 resolution days, funnel attrition, barrier frequency, $<10$ case suppression.
6. `src/engine/auditChain.test.ts` (4 tests): Genesis hash, hash continuity, payload tamper detection, broken link detection.
7. `src/engine/csvImporter.test.ts` (3 tests): CSV parsing, row validation, duplicate rejection on composite key, import audit reporting.
8. `src/engine/fhirConverter.test.ts` (4 tests): FHIR R4 Task, ServiceRequest, Appointment, Communication resources and licensing notice.
9. `src/engine/aiProvider.test.ts` (3 tests): Bilingual mock generation, human approval queue enforcement, supervisor rejection.
10. `src/scripts/seed.test.ts` (2 tests): Deterministic generation of 2,000 synthetic cases for hero pack (1,200 colorectal, 800 breast) and sample generation for WHO and low-resource packs.
11. `src/scripts/runSeed.test.ts` (3 tests): Verification of persisted synthetic dataset files for all three packs (`abu-dhabi`, `who-reference`, `low-resource`).

---

## 5. Getting Started

### Prerequisites
- Node.js $\ge$ 18.x
- npm $\ge$ 9.x

### Run Tests
```bash
npm test
```

### Build Production Bundle
```bash
npm run build
```

### Launch Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser. Toggle between **English (LTR)** and **العربية (RTL)** to inspect bilingual layout support.

