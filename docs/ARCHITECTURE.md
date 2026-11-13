# CareLoop System Architecture & Technical Specification

## 1. Executive Architecture Summary

**CareLoop** is an open-standard, closed-loop screening-to-care tracking and navigation platform developed for the Future Health Digital Innovation Challenge (Abu Dhabi). It transforms opportunistic and unmonitored cancer screening programmes into deterministic, proactive, closed-loop care journeys where every actionable abnormal result is actively shepherded to completed diagnostic resolution.

```
       +-------------------------------------------------------------+
       |               Screening Result Ingestion                    |
       |     (Batch CSV Import / Lab Feed / FHIR ServiceRequest)     |
       +------------------------------+------------------------------+
                                      |
                                      v
       +-------------------------------------------------------------+
       |             Jurisdiction Pack & SLA Engine                  |
       |  (Working Day Calendar, Clinical Deadline, Urgency Matrix)  |
       +------------------------------+------------------------------+
                                      |
                     +----------------+----------------+
                     |                                 |
                     v                                 v
       +-----------------------------+   +-----------------------------+
       |   Automated Outreach Ladder |   | Multidisciplinary Workspace |
       | (Bilingual SMS / WhatsApp)  |   |   (Clinician & Navigator)   |
       +--------------+--------------+   +--------------+--------------+
                      |                                 |
                      +---------------+-----------------+
                                      |
                                      v
       +-------------------------------------------------------------+
       |              State Machine & Milestone Tracker              |
       |  - Result Issued          - Acknowledged                    |
       |  - Understanding Confirmed - Referral Accepted              |
       |  - Appointment Booked     - Appointment Attended            |
       |  - Disposition Filed      - Clinical Resolution (Closed)    |
       +------------------------------+------------------------------+
                                      |
                     +----------------+----------------+
                     |                                 |
                     v                                 v
       +-----------------------------+   +-----------------------------+
       |  Cryptographic Audit Chain  |   |    Analytics Cascade &      |
       |    (Immutable SHA-256)      |   |   Simulation Replay Engine  |
       +-----------------------------+   +-----------------------------+
```

---

## 2. Core Architectural Pillars

### A. Jurisdiction-Agnostic Core (`src/engine/` & `src/packs/`)
- All core engines (`slaEngine`, `stateMachine`, `metricsEngine`, `auditChain`, `aiProvider`) contain **zero hardcoded country names, nationalities, or regional calendars**.
- Jurisdiction-specific standards are dynamically injected at runtime via `JurisdictionPack` JSON specifications:
  - `abu-dhabi.json`: 31-working-day colorectal colonoscopy SLA, 15-working-day breast resolution SLA, Mon-Fri working calendar, Arabic RTL.
  - `who-reference.json`: WHO 60-day breast diagnostic resolution, Ontario 8-week FIT target, Mon-Fri calendar.
  - `low-resource.json`: Sunday-only working day calendar, SMS + Navigator Call primary channels, minimal bandwidth footprint.

### B. Pure State Machine with Explicit Transition Invariants
- Cases advance through an append-only milestone sequence:
  1. `RESULT_ISSUED`
  2. `PATIENT_NOTIFIED`
  3. `ACKNOWLEDGED`
  4. `CONFIRMATORY_TEST`
  5. `REFERRAL_SENT`
  6. `REFERRAL_ACCEPTED`
  7. `APPOINTMENT_BOOKED`
  8. `ATTENDED`
  9. `DIAGNOSTIC_DISPOSITION_DOCUMENTED`
  10. `TREATMENT_OR_SURVEILLANCE`
  11. `CLOSED`
- **Closure Invariants**:
  - `CLINICAL_RESOLUTION`: Requires verified diagnostic report evidence ID and cannot be closed without procedural disposition.
  - `AUTHORISED_ALTERNATIVE`: Cannot be performed by the requester alone; requires clinician role sign-off with documented clinical reason (`INFORMED_REFUSAL`, `TRANSFERRED_CARE`, `DECEASED`, `OTHER`).
  - **AI Invariant**: AI models or automated agents are strictly prohibited from closing any case or altering diagnostic findings.

### C. Cryptographic Append-Only Audit Chain (`src/engine/auditChain.ts`)
- Every transition, outreach attempt, role authorization, and AI approval is hashed into an immutable SHA-256 block chain:
  $$\text{Hash}_n = \text{SHA-256}(\text{Hash}_{n-1} + \text{action} + \text{entityId} + \text{actorId} + \text{timestamp} + \text{payload})$$
- Starts from an immutable Genesis Hash anchor.
- Any out-of-order modification, deletion, or retrofitting of historical records breaks the hash verification chain immediately.

### D. Design System & Brand Alignment (`src/design-tokens.ts`)
- Modern, accessible UI built with custom design tokens:
  - **Teal `#087F83`**: Primary brand accent, action focus.
  - **Deep Teal `#0F5E63`**: High-contrast body text and dark action fills (7.1:1 contrast).
  - **Midnight Navy `#142747`**: Ink surfaces, 232px sidebar, brand anchors.
  - **Soft Coral `#E98278`**: Highlighting critical status, urgent priority badges (fills only, never light text on white).
  - **Pale Mist `#EAF4F3`**: Card surfaces, active pill backgrounds.
  - **Border `#DCE7E6`** & **Page BG `#F2F8F7`**: Calm negative space.
  - **Typography**: Manrope (500, 600, 700, 800) with minimum body text 14px for full WCAG AA compliance.

---

## 3. Directory Layout & Module Responsibilities

```
CareLoop/
├── src/
│   ├── app/                    # Next.js App Router (Dashboard, Patient PWA, REST APIs)
│   │   ├── api/                # FHIR R4, Cases, Outreach, Audit, Metrics, Demo Clock
│   │   ├── patient/            # Patient Mobile Companion PWA
│   │   ├── globals.css         # CSS Variables & Manrope Webfont
│   │   ├── layout.tsx          # Root Layout & PWA Service Worker Hook
│   │   └── page.tsx            # Clinician/Navigator Master Dashboard
│   ├── components/             # Brand-Aligned UI Components
│   │   ├── Sidebar.tsx         # 232px Navy Sidebar with Demo Controls & Counters
│   │   ├── TopBar.tsx          # Cmd-K Search, Demo Pill, Language Toggle
│   │   ├── TodayView.tsx       # Default Route: 4 KPIs, Queue Tabs, Master-Detail Drawer
│   │   ├── WorklistView.tsx    # Navigator Outreach & Priority Triage Worklist
│   │   ├── ReferralsView.tsx   # Specialist Referral Transfer & Rejection Interceptor
│   │   ├── OutreachView.tsx    # Escalation Ladder & Outreach Log
│   │   ├── AnalyticsView.tsx   # Pathway Cascade Funnel & 7 Core Indicators
│   │   ├── AiApprovalsView.tsx # Human-in-the-Loop AI Draft Review Queue
│   │   ├── SimulationView.tsx  # 2,000 Cases Population Replay & Sensitivity Analysis
│   │   ├── PitchModeView.tsx   # Deterministic 9-Step Evaluator Script Walkthrough
│   │   ├── CsvImportView.tsx   # Batch Laboratory Roster Ingestion
│   │   ├── AuditTrailView.tsx  # SHA-256 Cryptographic Chain Inspector
│   │   └── CaseDetailModal.tsx # Full Modal with Actions, Consult, & Timeline
│   ├── engine/                 # Pure Jurisdiction-Agnostic Algorithms
│   │   ├── stateMachine.ts     # Pure state transitions & validation rules
│   │   ├── slaEngine.ts        # Working-day calendar & deadline calculations
│   │   ├── metricsEngine.ts    # Funnel attrition, 7 core indicators, disparity analysis
│   │   ├── auditChain.ts       # Hash-chained immutable cryptographic ledger
│   │   ├── aiProvider.ts       # Explainable drop-off risk score & templates
│   │   ├── fhirConverter.ts    # FHIR R4 resource mapper
│   │   ├── csvImporter.ts      # Delimited roster parser & schema validator
│   │   ├── outreachEngine.ts   # Multi-channel ladder calculation
│   │   └── understandingEngine.ts # Health literacy & comprehension evaluation
│   ├── packs/                  # Jurisdiction Packs (JSON + Zod Schemas)
│   ├── services/               # In-Memory Repository, Simulation Engine, Demo Clock
│   ├── tests/                  # Vitest Automated Test Suites (77 Passing Tests)
│   └── design-tokens.ts        # Single Source of Truth for Brand Design Tokens
└── docs/                       # Architecture, Governance, Literature, & Safety
```
