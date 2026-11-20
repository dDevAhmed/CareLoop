# CareLoop Data & Assumptions Declaration

> **DECLARATION ON SYNTHETIC DATA & EVIDENCE BASE**:
> 1. **Zero Real Patient Data**: All 2,000 patient records, screening dates, diagnostic reports, and contact details within this repository are **100% SYNTHETIC**, generated deterministically with seed `42` anchored to reference date `2026-11-19T09:00:00Z`.
> 2. **No Clinical or Regulatory Claims**: CareLoop is an innovation demonstrator. Simulation projections model stated trial assumptions and do not represent verified prospective clinical outcomes.
> 3. **Endpoint Disclaimers**: Published trial outcomes (e.g. 120-day diagnostic evaluation) differ from CareLoop's closed-loop resolution endpoint (which requires verified histopathology disposition or dual-authorized closure).

---

## 1. Evidence Parameterization Table

Every numerical parameter and projection in the CareLoop platform is parameterized directly from published peer-reviewed medical literature and official public health audits:

| Parameter ID | Parameter Name | Literature Value / Assumption | Source Citation & Year | Methodological Scope & Limitations | CareLoop Implementation Context |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `SRC-2015-AUH-EMIR` | Historical Low Baseline | **13.5%** follow-up rate (95% CI: 11.0% – 16.0%) | Abu Dhabi Screening Audit (2015–2016) | Observational retrospective audit of opportunistic screening in Abu Dhabi ambulatory centers. High loss-to-follow-up due to passive self-referral. | Used as `low` simulation baseline (historical unmanaged benchmark). |
| `SRC-2020-FIT-SURVEY` | Opportunistic Screening Baseline | **57.0%** colonoscopy completion rate | International FIT Survey (2020) | Multi-national cross-sectional analysis of uncoordinated ambulatory networks without centralized navigation registries. | Used as `medium` simulation baseline (opportunistic baseline). |
| `SRC-2020-FIT-SURVEY` | Organized Screening Registry Baseline | **79.0%** colonoscopy completion rate | International FIT Survey (2020) | Cohort data from structured European screening registries with formal invitations and tracking. | Used as `high` simulation baseline (organized registry benchmark). |
| `SRC-2023-US-RCT` | Active Navigation Lift (Default) | **+8.5%** absolute lift (31.4% vs 22.9% within 120 days) | US Cluster RCT (2023) | Cluster randomized trial evaluating EHR prompts plus active phone navigation. Primary endpoint: 120-day diagnostic evaluation. | Used as CareLoop **Default Projection Model** (`baseline + 0.085`). |
| `SRC-2020-TZA-SMS` | Standalone SMS Lift | **0.0%** statistically significant lift (24.0% vs 23.8%, $p = 0.94$) | Tanzania SMS RCT (2020) | Randomized trial demonstrating that automated SMS alone without human navigation produces zero meaningful follow-up improvement. | Informs architecturalTenet: "SMS alone is not sufficient; navigation is mandatory." |
| `SRC-2025-CMR-TEL` | Telephone Navigation Lift (Optimistic) | **+19.5%** absolute lift (25.6% vs 6.1%) | Cameroon Telephone RCT (2025) | Prospective trial of dedicated telephone navigation in high-barrier settings. Represents high-touch optimistic upper bound. | Used as CareLoop **Optimistic Projection Model** (`baseline + 0.195`). |
| `SRC-2024-META-CERV` | Multicomponent Navigation Odds Ratio | **OR = 3.01** (95% CI: 2.45 – 3.70) | PLOS ONE Meta-Analysis (2024) | Systematic review and meta-analysis of multicomponent navigation interventions vs single reminders (single reminder OR = 1.56). | Parameterized in simulation sensitivity bounds and drop-off scoring weights. |
| `GUIDELINE-TARGET` | Benchmark Target | **90.0%** guideline completion target | Abu Dhabi DoH & International Cancer Screening Guidelines | Stated public health guideline target for closing the loop on abnormal cancer screens. | Displayed strictly as a **target benchmark**, never as a simulated prediction. |

---

## 2. Deterministic Seeder Specification

To ensure total reproducibility across demo environments and automated test runners, the CareLoop seeder implements strict deterministic controls:

1. **Fixed Reference Clock**: All calendar math, SLA countdowns, and event logs are anchored to `2026-11-19T09:00:00.000Z`. Zero reliance on the runtime host clock.
2. **Deterministic Pseudorandom Generator (Mulberry32)**: Seeded with fixed seed `42`. Generating two cohorts produces byte-identical outputs (`seed.test.ts`).
3. **Realistic State Mix (2,000 Cases)**:
   - **50% Closed** (1,000 cases): 85% clinical resolution with evidence, 15% dual-authorized alternative.
   - **25% In-Flight on Track** (500 cases): Distributed across notified, acknowledged, referral sent, referral accepted, booked (`isOverdue: false`, $>7$ working days remaining).
   - **8% Due Within 7 Days** (160 cases): Approaching clinical deadline ($1 \le \text{remaining} \le 7$ working days).
   - **7% Overdue or Escalated** (140 cases): Clinical SLA breaches or navigator escalated for barriers.
   - **5% Critical Urgency** (100 cases): Expedited triage bypassing routine delays.
   - **5% Rejected / Ineligible** (100 cases): Duplicate screening, invalid specimen, or criteria mismatch.
4. **Demographic & Linguistic Consistency**:
   - Patient first and last names strictly match gender and nationality group (Arabic male/female name pools for Emirati/Arab expats, South Asian, East Asian, Western pools).
   - Distinct residency status values (`CITIZEN`, `RESIDENT_VISA`, `EMPLOYMENT_VISA`, `GOLDEN_VISA`, `DEPENDENT_VISA`) avoiding column duplication.
   - All synthetic phone numbers strictly follow RFC-safe `+1555XXXXXXX` patterns.
   - All synthetic emails strictly use `@synthetic-health.example.com` (RFC 2606 reserved TLD).

---

## 3. Methodological Limitations & Known Assumptions

1. **Endpoint Difference**: Trials typically measure completion of *any* confirmatory diagnostic test within 60, 90, or 120 days. CareLoop measures *closed-loop clinical disposition*, requiring documented histopathology or dual clinician sign-off.
2. **Behavioral Transferability**: Lifts observed in US and international RCTs reflect specific clinical settings and patient populations. Real-world adoption in the UAE healthcare ecosystem will depend on local health literacy, transportation availability, and health insurance authorization workflows.
3. **Simulation Notice**: All simulation views and tables carry the mandatory label: `"simulation under stated assumptions, not clinical effect"`.
