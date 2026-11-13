# CareLoop Responsible AI & Clinical Ethics Framework

## 1. Principles of Responsible Health AI

CareLoop incorporates Artificial Intelligence (AI) and automated assistive technologies strictly to augment—never replace—human clinical decision-making. In compliance with the Department of Health (DoH) Abu Dhabi AI ethics guidance, WHO health AI principles, and international clinical safety standards, CareLoop enforces non-negotiable architectural boundaries.

---

## 2. The Five Responsible AI Invariants

```
               [ AI Assistance Layer ]
                         │
         ┌───────────────┴───────────────┐
         │                               │
         ▼                               ▼
  [ Plain-Language                [ Explainable Drop-Off
   Communication Drafts ]          Risk Scoring Engine ]
         │                               │
         ▼                               ▼
  ┌──────────────────────────────────────────────┐
  │   MANDATORY HUMAN-IN-THE-LOOP APPROVAL       │
  │  (Clinician or Navigator must verify, edit,  │
  │   or reject before any patient dispatch)     │
  └──────────────────────┬───────────────────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
         ▼                               ▼
   [ APPROVED ]                    [ REJECTED ]
   Logged to SHA-256             Halted; reason
   immutable audit chain         stamped in audit
```

### Invariant 1: Mandatory Human-in-the-Loop Review
- No AI-generated communication, notification, or reminder draft is ever dispatched directly to a patient without prior human sign-off.
- Every generated draft enters the **AI Approval Queue** (`src/components/AiApprovalsView.tsx`).
- Reviewers are presented with a side-by-side comparison between the source clinical facts and the drafted text.
- Reviewers can:
  1. **Approve As-Is**: Acknowledges clinical fidelity.
  2. **Edit & Approve**: Modifies phrasing, reassuring language, or dialect nuances before dispatch.
  3. **Reject**: Documents an explicit clinical rationale, permanently halting dispatch.
- Every approval, edit, or rejection records the human reviewer ID, professional role, and timestamp in the immutable SHA-256 audit ledger.

### Invariant 2: AI Can NEVER Close a Case
- State machine closure transitions (`CLOSED`) require verifiable diagnostic evidence (such as a pathology report) or signed authorization from a licensed clinician.
- Under no circumstances can an AI model, background cron, or automated rule transition a case to `CLOSED` or discharge a patient from active clinical follow-through.

### Invariant 3: Explainable, Deterministic Risk Scoring
- Drop-off risk prediction does not rely on opaque "black-box" models.
- CareLoop implements a transparent, weighted rule-based risk score (0 to 100) based on observable clinical and engagement milestones:
  - Unacknowledged $> 48\text{h}$ or overdue: $+20$ to $+30$ points.
  - Documented health literacy or communication barrier: $+25$ points.
  - Logistical / transport / insurance impediment: $+20$ points.
  - Specialty facility referral rejection: $+35$ points.
  - High clinical urgency unattended: $+20$ points.
- Every score output returns the **Top Contributing Factors** and a **Recommended Clinical Intervention**, providing clinicians with clear reasoning for prioritized outreach.

### Invariant 4: Privacy & Small-Cell Suppression
- To prevent accidental re-identification of patients in minority demographic subgroups or rural catchment areas, all analytical cascade funnels enforce **Small-Cell Suppression**:
  - Any demographic stratum (language, nationality subgroup, age band) with $< 10$ cases is automatically masked in public dashboards and CSV exports with the notice:
    > `Suppressed: sample size < 10 cases (privacy protection standard)`

### Invariant 5: Local, Deterministic AI Execution
- Phase 1, Phase 2, and Phase 3 CareLoop prototypes execute all mock AI inference locally and deterministically.
- **Zero outbound calls** are made to third-party public LLM APIs (e.g. OpenAI, Anthropic, or external cloud endpoints), guaranteeing that patient data remains completely self-contained within the platform boundary.

