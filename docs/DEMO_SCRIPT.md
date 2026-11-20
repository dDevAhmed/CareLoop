# CareLoop Evaluator & Presenter Demonstration Script

> **DEMO OVERVIEW**:
> This script provides an end-to-end, deterministic narrative walkthrough of CareLoop for challenge judges, clinical evaluators, and system auditors.
> All data is 100% synthetic. Running `npm run demo:reset` returns the platform to its clean baseline state at any time.

---

## Act 1: The Triage Cockpit & Daily Briefing (Today View)

1. **Navigate to Today View**:
   - URL: `http://localhost:3000/` (defaults to Today View).
   - Point out the greeting: *"Good morning, Navigator Layla"*.
   - Emphasize the core operational metrics: **Needs Action Today**, **Overdue Cases**, **Acknowledged $\le$ 72h**, and **Clinical Resolution**.
2. **Review Queue Tabs**:
   - Click the queue pills: **Critical** (urgency bypass), **Overdue**, **Due This Week**, and **On Track**.
   - Note that case rows display patient name, pathway, current stage, and SLA status without exposing raw internal database enums.
3. **Select Case Drawer**:
   - Click on any case row (e.g. `CL-COL-00222` or `CL-BRE-01572`).
   - The preview drawer slides open on the right, showing the patient's language preference, clinical deadline, next best action, and explainable **Drop-Off Risk Score** with top weighted contributing factors.

---

## Act 2: Navigator Worklist & Active Barrier Logging

1. **Switch to Navigator Worklist Tab**:
   - Click **Worklist** in the navy sidebar.
   - Show the 3 task tabs: **Due now**, **Later today**, and **Done**.
2. **Simulate a Phone Outreach Encounter**:
   - Select the first task (e.g. `Call · attempt 2` for a patient unacknowledged after SMS).
   - In the right-hand **Log outcome** panel, inspect the contact preferences (*Prefers calls after 4 pm · Arabic*).
   - Click the call button, then select outcome: **Declined** or **No answer**.
   - If declined, choose a concrete barrier reason: **Fear or worry**, **Transport**, or **Cost/insurance**.
   - Enter a brief note: *"Patient expressed anxiety regarding prep kit; provided reassurance."*
   - Click **Save and next**. Notice the task immediately moves to the Done queue and advances to the next highest-risk patient.
3. **Escalate to Clinician**:
   - If a patient has severe comorbidities or repeated failed contacts, demonstrate the **Escalate to clinician** action.

---

## Act 3: Multilingual Patient Experience (Arabic RTL & English)

1. **Launch Patient PWA**:
   - Click the **Open Patient PWA** pill in the sidebar (or navigate to `/patient`).
2. **Demonstrate Bilingual RTL Support**:
   - Toggle to **العربية (Arabic)** in the top bar. Observe how the layout smoothly mirrors to right-to-left (RTL) with culturally nuanced typography and natural phrasing.
3. **Health Literacy Comprehension Check**:
   - Show the interactive 3-question understanding check.
   - If the patient passes, the case milestone `understandingConfirmedAt` is recorded immediately.
   - If the patient fails or indicates confusion, CareLoop intercepts the barrier and queues a direct navigator phone call task with the flag `LOW_HEALTH_LITERACY`.
4. **Low-Bandwidth Mode**:
   - Demonstrate the low-bandwidth text-only view for patients with limited data plans or older devices.

---

## Act 4: Diagnostic Transfer Management (Referrals)

1. **Switch to Referrals Tab**:
   - Click **Referrals** in the sidebar.
   - Point out the active capacity alert: *"43 Referrals Require Immediate Reassignment!"*.
2. **Intercept Drop-Offs**:
   - Show how CareLoop monitors receiving endoscopy pavilions. When a diagnostic facility rejects a transfer due to scheduling backlogs, the case is never lost—it is immediately surfaced for reassignment to an alternative accredited hospital.
   - Click **Reassign Facility** to route the patient to another network provider with open capacity.

---

## Act 5: Responsible AI Approvals Queue

1. **Switch to AI Approvals Tab**:
   - Click **AI Approvals** in the sidebar.
   - Point out the mandatory safety policy: **AI can never communicate with a patient or close a case without human clinician or navigator approval.**
2. **Compare Draft vs Source Facts**:
   - Inspect a pending item: review the raw clinical source facts on the left vs the AI-generated draft text on the right.
3. **Human Review, Modification, and Audit**:
   - Demonstrate human editing of the draft text before sign-off.
   - Click **Approve & Dispatch**. Show that the item transitions to `APPROVED` and records the reviewer's named ID (`NAV-01`) and timestamp.
   - For an inappropriate draft, enter a rejection reason and click **Reject**. Show that automated dispatch is halted permanently.

---

## Act 6: Cryptographic Audit Trail & Evidence Provenance

1. **Switch to Audit Trail Tab**:
   - Click **Audit Trail** in the sidebar.
   - Point out the append-only, SHA-256 hash-chained immutable ledger.
   - Note the sequence numbers, actor IDs, actions, and hash pointers chaining back to the genesis block.
2. **Cryptographic Verification**:
   - Click **Re-verify Chain**. Show the green checkmark confirming zero tampering, zero missing links, and complete mathematical integrity across thousands of transactions.

---

## Act 7: Population Simulation Replay & Evidence Lifts

1. **Switch to Simulation Tab**:
   - Click **Simulation** in the sidebar.
2. **Inspect the Three Empirical Baselines**:
   - **Low (13.5%)**: Historical Abu Dhabi 2015-16 unmanaged screening audit.
   - **Medium (57.0%)**: International opportunistic screening networks.
   - **High (79.0%)**: Organized screening registries with formal invitations.
3. **Evidence-Based Parameterization**:
   - Show the **Default Model** (+8.5% lift from US cluster RCT) and **Optimistic Model** (+19.5% lift from Cameroon telephone RCT).
   - Point out the **90% Target Benchmark** displayed separately as a public health target, never claimed as a prediction.
   - Point out the prominent disclaimer on every chart and table: *"simulation under stated assumptions, not clinical effect"*.

---

## Act 8: Population Analytics & Health Equity

1. **Switch to Analytics Tab**:
   - Click **Analytics** in the sidebar.
   - Inspect the **Cascade Funnel**: Ingestion $\to$ Notification $\to$ Acknowledged $\to$ Referral $\to$ Booked $\to$ Attended $\to$ Resolved.
   - Review the **Seven Core Indicators** matching direct database calculations.
   - Inspect the **Health Equity & Disparity Analysis**: show completion rates across demographic groups. Point out that subgroups with $<10$ cases are automatically masked with `[Suppressed: n < 10]` to protect synthetic individual privacy.
   - Click **Export Analytics CSV** to download the clean summary report.

---

## Act 9: Jurisdiction Pack Swapping

1. **Open Pack Switcher Dropdown**:
   - In the sidebar Demo Controls, open the **Jurisdiction Pack** dropdown.
2. **Select `WHO Reference Benchmark`**:
   - Observe how the platform instantly reloads with WHO Cervical (30d) and Ontario FIT-Positive (40d) pathways.
   - Note how SLA countdowns and overdue counts recalculate dynamically without code redeployment.
3. **Select `Low-Resource Setting`**:
   - Observe the calendar change to Sunday-only weekends and community FOBT timelines.
