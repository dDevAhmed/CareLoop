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
| `SRC-2015-AUH-EMIR` | Abu Dhabi 2015-16 | **13.5%** follow-up colonoscopy among FOBT-positive (23.5% FOBT uptake) | Almansoori et al., BMC Cancer 2021 | Adult Emiratis in ambulatory healthcare centres (cited second-hand). Historical audit; predates modern Malaffi HIE integration. | Used as `low` simulation baseline (historical unmanaged benchmark). |
| `SRC-2020-FIT-SURVEY` | International FIT survey (Opportunistic) | **57.0%** colonoscopy completion rate | J Med Screen 2020 (doi: 10.1177/0969141320904977) | 35 programmes surveyed. Uncoordinated ambulatory networks without centralized navigation registries. | Used as `medium` simulation baseline (opportunistic baseline). |
| `SRC-2020-FIT-SURVEY` | International FIT survey (Organized) | **79.0%** colonoscopy completion rate | J Med Screen 2020 (doi: 10.1177/0969141320904977) | 35 programmes surveyed. Cohort data from structured screening registries. | Used as `high` simulation baseline (organized registry benchmark). |
| `SRC-2023-US-RCT` | US cluster RCT | **+8.5%** absolute lift (31.4% vs 22.9% within 120 days) | JAMA 2023 (PubMed 37815566) | 44 practices, 11,980 patients, 120-day follow-up. 22.9% usual care, 22.7% EHR reminders, 31.4% reminders+outreach+navigation. | Used as CareLoop **Default Projection Model** (`baseline + 0.085`). |
| `SRC-2020-TZA-SMS` | Tanzania RCT | **0.0%** statistically significant lift (24.0% vs 23.8%, RR 1.02, no p-value claimed) | JMIR 2020 (jmir.org/2020/4/e15863) | Tanzania cervical/breast screening clinics. Demonstrating that automated text messaging alone without human navigation produces zero meaningful follow-up improvement. | Informs architectural tenet: "SMS alone is not sufficient; navigation is mandatory." |
| `SRC-2025-CMR-TEL` | Cameroon RCT | **+19.5%** absolute lift (25.6% vs 6.1%, aOR 3.97 [95% CI 1.29-12.17]) | Gynecologic Oncology Reports 2025 (doi: 10.1016/j.gore.2025.101745) | Cameroon screening clinics. Dedicated telephone navigation in high-barrier settings. | Used as CareLoop **Optimistic Projection Model** (`baseline + 0.195`; not applied to 79.0% organized baseline). |
| `SRC-2024-META-CERV` | Meta-analysis, PLOS ONE | **OR = 3.01** (95% CI: 2.03 – 4.46) vs single 1.56 (95% CI: 1.14 – 2.14) | PLOS ONE 2024 (doi: 10.1371/journal.pone.0291931) | 28 studies (11 RCTs, 17 observational), cervical abnormal-screen follow-up. | Parameterized in multi-tier escalation ladder and drop-off scoring weights. |
| `GUIDELINE-TARGET` | Benchmark Target | **90.0%** guideline completion target | International & Regional Screening Guidelines | Stated public health guideline target for closing the loop on abnormal cancer screens. | Displayed strictly as a **target benchmark**, never as a simulated prediction. |

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
3. **Velocity Note**: All managed median velocities and time savings represent an illustrative assumption, not evidence.
4. **Simulation Notice**: All simulation views and tables carry the mandatory label: `"simulation under stated assumptions, not clinical effect"`.
