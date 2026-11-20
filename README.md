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
- **17 test files passed (17/17)**
- **100 tests passed (100/100)**
- Clean execution across all domain engines, safety invariants, and synthetic seeds.

Key Test Suites:
1. `src/tests/safety.test.ts` (13 tests): AI approve/reject security, role fail-closed (401), admin demo-clock restriction, dual-authorized alternative closure (`requesterId !== authoriserId`), small-cell suppression ($<10$), audit tampering detection, premature closure prohibition.
2. `src/scripts/seed.test.ts` (3 tests): Deterministic generation with seed 42 anchored to `2026-11-19T09:00:00Z`; byte-identical reproducibility test; realistic state mix across 2,000 cases; gender/nationality name consistency.
3. `src/scripts/resetStore.test.ts` (1 test): Deterministic local database baseline reset (`npm run demo:reset`).
4. `src/tests/phase3.test.ts` (14 tests): Population analytics, simulation engine with honest evidence parameterization (+8.5% default lift, +19.5% optimistic lift, 90% guideline benchmark), pitch mode, and explainable drop-off risk score.
5. `src/tests/phase2.test.ts` (12 tests): Happy path closed-loop, understanding check, low-bandwidth mode, referral rejection handling, governance consent blocking, demo clock advancement, RBAC patient isolation, AST jurisdiction linting.
6. `src/packs/jurisdictionPacks.test.ts` (5 tests): Zod schema verification across Abu Dhabi, WHO Reference, and Low-Resource packs.
7. `src/engine/stateMachine.test.ts` (6 tests): Valid state transitions, role authorizations, strict closure preconditions.
8. `src/engine/slaEngine.test.ts` (7 tests): Working day calendar math, clinical deadlines, critical urgency fast-tracks.
9. `src/engine/auditChain.test.ts` (4 tests): SHA-256 hash chaining, genesis anchor, payload tamper detection.
10. `src/engine/metricsEngine.test.ts` (6 tests): 7 core indicators, funnel attrition, small-cell suppression.
11. `src/engine/aiProvider.test.ts` (3 tests): Local mock provider, human approval queue, supervisor rejection.
12. `src/engine/fhirConverter.test.ts` (4 tests): FHIR R4 Task, ServiceRequest, Appointment, Communication resources.
13. `src/tests/designTokens.test.ts` (3 tests): WCAG AA contrast compliance and design token enforcement.
14. `src/scripts/runSeed.test.ts` (3 tests): Synthetic dataset file generation into isolated temp directories.

---

## 5. Getting Started & Deterministic Reset

### Prerequisites
- Node.js $\ge$ 20.x (see `.nvmrc`)
- npm $\ge$ 10.x

### Install Dependencies
```bash
npm ci
```

### Deterministic Seed Reset
To return the local database store to its clean baseline state at any time:
```bash
npm run demo:reset
```

### Run Full Test Suite
```bash
npm test
```

### Typecheck & Production Build
```bash
npx tsc --noEmit
npm run build
```

### Launch Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser. Toggle between **English (LTR)** and **العربية (RTL)** to inspect bilingual layout support.

---

## 6. Documentation Directory Index

Comprehensive design, safety, and evidence documents are located in `/docs`:
- [`docs/CASE_STATE_MODEL.md`](file:///c:/Users/a-mahmud/Documents/Personal/Hacks/Hack2Skill/CareLoop/docs/CASE_STATE_MODEL.md): Complete 13-state specification, transition matrix, role permissions, and closure rules.
- [`docs/DATA_AND_ASSUMPTIONS_DECLARATION.md`](file:///c:/Users/a-mahmud/Documents/Personal/Hacks/Hack2Skill/CareLoop/docs/DATA_AND_ASSUMPTIONS_DECLARATION.md): Complete declaration of synthetic data hygiene, literature parameters, effect lifts, and limitations.
- [`docs/PILOT_PATH.md`](file:///c:/Users/a-mahmud/Documents/Personal/Hacks/Hack2Skill/CareLoop/docs/PILOT_PATH.md): 4-phase clinical adoption roadmap for health authorities and hospital networks.
- [`docs/DEMO_SCRIPT.md`](file:///c:/Users/a-mahmud/Documents/Personal/Hacks/Hack2Skill/CareLoop/docs/DEMO_SCRIPT.md): Step-by-step walkthrough for evaluators, presenters, and clinical auditors.
- [`docs/SUBMISSION_CHECKLIST.md`](file:///c:/Users/a-mahmud/Documents/Personal/Hacks/Hack2Skill/CareLoop/docs/SUBMISSION_CHECKLIST.md): Official competition verification matrix and compliance audit.
- [`docs/SIMULATION_REPORT.md`](file:///c:/Users/a-mahmud/Documents/Personal/Hacks/Hack2Skill/CareLoop/docs/SIMULATION_REPORT.md): Population simulation methodology, baseline comparisons, and honesty notices.
- [`docs/SAFETY_AND_ESCALATION.md`](file:///c:/Users/a-mahmud/Documents/Personal/Hacks/Hack2Skill/CareLoop/docs/SAFETY_AND_ESCALATION.md): Clinical escalation protocols, SLA countdowns, and dual authorization.
- [`docs/ARCHITECTURE.md`](file:///c:/Users/a-mahmud/Documents/Personal/Hacks/Hack2Skill/CareLoop/docs/ARCHITECTURE.md): System architecture, Mermaid data-flow diagram, and FHIR R4 mapping.
- [`docs/LIMITATIONS.md`](file:///c:/Users/a-mahmud/Documents/Personal/Hacks/Hack2Skill/CareLoop/docs/LIMITATIONS.md): Operational boundaries, prototype scope, and identity simulation notices.

