# CareLoop Clinical Safety & Escalation Governance

## 1. Safety Principles & System Mandates

CareLoop is designed around a zero-loss-to-follow-up philosophy for preventive healthcare. In traditional screening programmes, abnormal screening findings fail to result in clinical evaluation due to silent administrative drop-offs, patient apprehension, or unread provider faxes. CareLoop establishes explicit digital safeguards to guarantee clinical follow-through.

---

## 2. The Four Safety Pillars

### A. Automatic SLA Breach & Escalation Ladder
1. **Clock Tracking**: From the moment an actionable abnormal finding is ingested (`RESULT_ISSUED`), the system initiates a jurisdiction-calibrated countdown based on working days (skipping recognized weekends and national holidays).
2. **72-Hour Patient Acknowledgment Window**:
   - If a notification remains unread or unacknowledged after 72 hours, the case automatically transitions to the Navigator Priority Worklist.
   - If the patient repeatedly fails the 3-question understanding check, CareLoop halts unassisted digital self-scheduling and immediately books a telephone call task with a certified health navigator.
3. **Clinical SLA Deadline Breach**:
   - When remaining working days reach $\le 0$ without a booked diagnostic procedure, the case is flagged with an immutable `isOverdue: true` status.
   - The case is promoted to the Clinician Supervisor Escalation Queue.

### B. Facility Rejection Interception
In standard electronic health exchanges, a specialist diagnostic facility may decline a referral due to clinical capacity limits or lack of specialised equipment. In typical workflows, this rejection sits buried in an unmonitored inbox.
- CareLoop requires explicit facility coordination (`ACCEPT` or `REJECT` with mandatory reason code `CLINICAL_CAPACITY_EXCEEDED`, `OUT_OF_SCOPE`, or `DUPLICATE`).
- Upon `REJECT`, CareLoop intercepts the rejection immediately, transitions the case to the `REJECTED` worklist tab, and prompts the navigator with an urgent 1-click reassignment workflow to an accredited secondary center.

### C. Clinical Closure Dual-Control (Four-Eyes Principle)
- **Clinical Resolution Closure**: Requires documented procedure findings, histology specimen ID, and diagnostic disposition.
- **Authorised Alternative Closure**: If a patient elects not to proceed (`INFORMED_REFUSAL`) or transfers care (`TRANSFERRED_CARE`):
  - A Navigator cannot close the case unilaterally.
  - The Navigator files an *Alternative Closure Request*.
  - A licensed Clinician must review the documentation, verify that the patient has received adequate counseling, and independently authorize the closure.

### D. Emergency Safety Disclosures & Hotline Guidance
- The CareLoop Patient Companion PWA and Clinician Workspace display static emergency medical notices.
- If a patient accesses "Ask a Clinician", the interface clearly states:
  > *"In an acute medical emergency, severe abdominal pain, or acute hemorrhage, call your local emergency service (e.g. 999 in Abu Dhabi) immediately. Do not rely on digital messages for emergency triage."*
- Automated AI draft generators are restricted from providing free-form symptom diagnosis.

---

## 3. Urgency Classes & Clinical Triage Matrix

| Urgency Class | Trigger Criteria | Outreach Protocol | SLA Window | Escalation Policy |
|---|---|---|---|---|
| **CRITICAL** | Massive occult bleeding, BI-RADS 5 suspicious lesion, high-grade cervical lesion | Bypasses routine waiting windows; immediate same-day direct Clinician/Navigator telephone contact within 4 business hours | Accelerated clinical deadline | Highlighted with coral priority shield icon across all worklists |
| **URGENT** | BI-RADS 4 suspicious lesion, high-titer positive FIT, borderline clinical history | Prioritized outreach within 24 business hours via WhatsApp & Telephone | Standard pathway deadline | Pinned to top of navigator shift queue |
| **ROUTINE** | Standard positive screening result meeting guideline threshold | Automated bilingual SMS notification with 72h acknowledgment tracker | Standard pathway deadline (e.g. 31 working days) | Escalates through ladder steps if unacknowledged |
