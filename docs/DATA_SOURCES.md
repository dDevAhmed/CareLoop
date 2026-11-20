# CareLoop Data Provenance Manifest & Simulation Sources

## Explicit Notice on Synthetic Patient Data
> **CRITICAL ETHICAL & PRIVACY NOTICE**:
> All patient records, identifiers, screening findings, case timelines, addresses, and clinical contact histories generated or displayed within **CareLoop** are **100% SYNTHETIC**.
> - All synthetic records are generated programmatically via CareLoop's deterministic synthetic seed generator using a fixed pseudorandom seed (`RANDOM_SEED = 42`).
> - No real patient data, protected health information (PHI), or electronic medical records from any healthcare facility in Abu Dhabi, the UAE, or internationally were accessed, processed, or stored.
> - Any resemblance to real persons, living or deceased, or actual medical events is purely coincidental.

---

## Provenance Matrix & Simulation Parameters

CareLoop models delays, drop-offs, outreach ladder transitions, and clinical follow-up attrition based on published medical literature, clinical trials, and epidemiological surveys. When empirical literature does not specify a micro-parameter, it is explicitly classified as an **"assumption"**.

### Evidence Sources Summary Table

| ID | Short Title | Year | Population / Setting | Empirical Finding | Simulated Parameter in CareLoop | Limitation |
|---|---|---|---|---|---|---|
| `SRC-2023-US-RCT` | US cluster RCT | 2023 | 44 practices, 11,980 patients, 120-day follow-up | 22.9% usual care, 22.7% EHR reminders, 31.4% reminders+outreach+navigation | Baseline follow-up rate without navigation vs boosted completion when multi-channel navigator intervention triggers (+8.5% lift) | US healthcare system dynamics; Medicaid/underinsured cohort; primary endpoint at 120 days differs from closed-loop resolution |
| `SRC-2020-TZA-SMS` | Tanzania RCT | 2020 | Tanzania cervical/breast screening clinics | 24.0% vs 23.8%, RR 1.02, no p-value claimed | Justifies why single SMS reminders alone have ~24% acknowledgement rate and produce no statistically meaningful lift (0.0% lift) without active multi-tiered escalation | Rural East African low-resource setting; text messaging alone without human navigator escalation |
| `SRC-2025-CMR-TEL` | Cameroon RCT | 2025 | Cameroon screening clinics | 25.6% vs 6.1%, aOR 3.97 (95% CI 1.29-12.17) | Calibrates optimistic upper-bound telephone navigation lift (+19.5% lift) in high-barrier settings | Conducted in low-resource setting where baseline standard of care follow-up was 6.1% |
| `SRC-2024-META-CERV` | Meta-analysis, PLOS ONE | 2024 | 28 studies (11 RCTs, 17 observational), cervical abnormal-screen follow-up | Multicomponent OR 3.01 (95% CI 2.03-4.46) vs single 1.56 (95% CI 1.14-2.14) | Parameterizes the multi-tier escalation ladder efficacy multiplier in CareLoop simulation engine | Heterogeneity in study designs and intervention components across pooled international studies |
| `SRC-2020-FIT-SURVEY` | International FIT survey | 2020 | 35 programmes surveyed | Mean 79% colonoscopy within 6 months, range 39-100%; organised 81% vs opportunistic 57% | Establishes empirical baselines: opportunistic (57.0%) and organized registry (79.0%) | Endoscopy facility availability and clinical waiting lists vary widely between jurisdictions |
| `SRC-2015-AUH-EMIR` | Abu Dhabi 2015-16 | 2021 | Adult Emiratis in ambulatory healthcare centres | 23.5% FOBT uptake, 13.5% follow-up colonoscopy among FOBT-positive | Historical unmanaged baseline (13.5%) highlighting follow-up drop-off in the absence of active digital closed-loop tracking | Cited second-hand from Almansoori et al., BMC Cancer 2021; historical audit; predates modern Malaffi HIE integration |

---

## Detailed Evidence Records

### 1. US cluster RCT
- **Title**: Multicomponent EHR-Based Outreach and Navigation for Diagnostic Resolution Following Abnormal Screening
- **Citation**: JAMA 2023 (PubMed 37815566)
- **Setting & Scope**: 44 practices, 11,980 patients, 120-day follow-up.
- **Empirical Finding**: 22.9% usual care, 22.7% EHR reminders, 31.4% reminders+outreach+navigation.
- **Simulation Parameter**: Informs baseline unassisted follow-up and provides the default active navigation lift (+8.5% absolute lift, 31.4% vs 22.9%).
- **Limitation**: Primary care clinic setting within US safety-net system; endpoint measured at 120 days.

### 2. Tanzania RCT
- **Title**: Mobile Phone Text Messaging to Improve Follow-Up After Screening: A Randomized Controlled Trial
- **Citation**: JMIR 2020 (jmir.org/2020/4/e15863)
- **Setting & Scope**: Tanzania cervical/breast screening clinics.
- **Empirical Finding**: 24.0% vs 23.8%, RR 1.02, no p-value claimed. Standalone SMS reminders produced no statistically significant improvement over control.
- **Simulation Parameter**: Parameterizes SMS channel acknowledgement rate without human escalation at ~24% and sets standalone SMS lift to 0.0%. Validates that reminders alone do not close the loop without multi-tiered escalation.
- **Limitation**: Low-resource rural setting evaluating automated SMS in isolation without human navigator contact.

### 3. Cameroon RCT
- **Title**: Interactive Telephone Navigation versus Routine Notification for Diagnostic Follow-Up: A Randomized Trial
- **Citation**: Gynecologic Oncology Reports 2025 (doi: 10.1016/j.gore.2025.101745)
- **Setting & Scope**: Cameroon screening clinics.
- **Empirical Finding**: 25.6% vs 6.1%, aOR 3.97 (95% CI 1.29-12.17).
- **Simulation Parameter**: Defines the optimistic upper-bound telephone navigation lift (+19.5% absolute lift, 25.6% vs 6.1%).
- **Limitation**: Low-resource setting where routine standard of care had minimal active tracking (resulting in a 6.1% control completion rate).

### 4. Meta-analysis, PLOS ONE
- **Title**: Effectiveness of Single vs Multicomponent Interventions for Timely Follow-up of Abnormal Cancer Screening: A Systematic Review and Meta-Analysis
- **Citation**: PLOS ONE 2024 (journals.plos.org/plosone/article?id=10.1371/journal.pone.0291931)
- **Setting & Scope**: 28 studies (11 RCTs, 17 observational), cervical abnormal-screen follow-up.
- **Empirical Finding**: Multicomponent outreach OR 3.01 (95% CI 2.03-4.46) vs single intervention OR 1.56 (95% CI 1.14-2.14).
- **Simulation Parameter**: Parameterizes the multi-tier escalation ladder efficacy multiplier: combined automated alerts, navigator outreach, and clinician escalation achieve ~3x odds of resolution over single reminders.
- **Limitation**: Meta-analytic pooling of heterogeneous intervention durations and definitions of abnormal screening results across international studies.

### 5. International FIT survey
- **Title**: Follow-up Colonoscopy Completion After Positive Fecal Immunochemical Test in Organized vs Opportunistic Screening Programmes
- **Citation**: J Med Screen 2020 (doi: 10.1177/0969141320904977)
- **Setting & Scope**: 35 programmes surveyed.
- **Empirical Finding**: Mean 79% colonoscopy within 6 months, range 39-100%; organised 81% vs opportunistic 57%.
- **Simulation Parameter**: Establishes empirical baseline scenarios: opportunistic screening (57.0%) and organized registry screening (79.0%).
- **Limitation**: Endoscopy capacity, waiting times, and registry enforcement vary widely across surveyed programmes.

### 6. Abu Dhabi 2015-16
- **Title**: Retrospective Review of Colorectal Cancer Screening and Diagnostic Follow-Up Among Adult Emiratis
- **Citation**: Almansoori et al., BMC Cancer 2021 (cited second-hand)
- **Setting & Scope**: Adult Emiratis in ambulatory healthcare centres.
- **Empirical Finding**: 23.5% FOBT uptake, 13.5% follow-up colonoscopy among FOBT-positive.
- **Simulation Parameter**: Parameterizes the historical unmanaged baseline (13.5% follow-up) for Abu Dhabi, establishing the urgency for closed-loop navigation.
- **Limitation**: Cited second-hand from Almansoori et al., BMC Cancer 2021; historical audit reflecting 2015-2016 practice; restricted to adult Emiratis in ambulatory healthcare centres; predates current digital health systems (e.g. Malaffi HIE).

---

## Modelled Simulation Assumptions

Where literature does not report discrete transition probabilities for each daily step, CareLoop applies the following explicitly tagged **assumptions**:

1. **`ASSUMPTION-LANG-BARRIER`**: Non-native language notifications have an initial acknowledgement rate 18% lower than native-language notifications unless addressed in the patient's primary preferred language (Arabic for Arabic speakers, English for Western/South Asian expatriates).
2. **`ASSUMPTION-RTL-UX`**: Arabic Right-to-Left (RTL) localized interfaces improve understanding confirmation rates by +15% among Arabic-preferring patients compared to English-only SMS.
3. **`ASSUMPTION-CRITICAL-BYPASS`**: High-risk findings (e.g. massive occult blood, palpable breast mass with BI-RADS 5) tagged with `Urgency = CRITICAL` bypass routine 72h patient acknowledgment waiting windows and trigger immediate direct Clinician/Navigator telephone contact within 4 business hours.
4. **`ASSUMPTION-BARRIER-DISTRIBUTION`**: In Abu Dhabi expatriate populations, common barrier distribution is estimated as: Fear/Anxiety (28%), Appointment Availability (24%), Competing Work Priorities (18%), Cost/Insurance (12%), Communication Failure (10%), Transport (8%).
5. **`ASSUMPTION-WEEKEND-WORKING-DAYS`**: UAE public and private sector standard working week is Monday through Friday (with Friday half-day or full working day counted as standard business days; Saturday and Sunday are treated as non-working weekend days for SLA calculations).

---

## Jurisdiction Packs & Verification Status

CareLoop is architected to be completely jurisdiction-agnostic. Clinical SLA engines, equity groupings, and working-day calendars are decoupled from platform binaries and driven by declarative **Jurisdiction Packs**.

### Available Jurisdiction Packs

1. **`abu-dhabi` (Hero Configuration)**:
   - **Pathways**:
     - *Colorectal Screening Follow-up (`colorectal-uae`)*: Clinical deadline = 31 working days after positive FIT; referral target >= 90%. Status: `verified = false` (pending official DoH public health circular number check).
     - *Breast Cancer Screening Follow-up (`breast-abudhabi`)*: Result communicated <= 15 working days; clinical deadline = 20 working days. Status: `verified = false` (pending circular confirmation).
   - **Calendar**: Weekend = Saturday & Sunday (`[6, 0]`), official UAE public holidays.
   - **Languages**: English (`en`, LTR) and Arabic (`ar`, RTL).
   - **Equity Stratification**: Nationality Group (`EMIRATI`, `ARAB_EXPAT`, `SOUTH_ASIAN_EXPAT`, `WESTERN_EXPAT`, `OTHER`).
   - **Channels**: SMS, WhatsApp, Phone Call, Navigator In-Person Visit, Clinician Escalation.

2. **`who-reference` (International Benchmark Configuration)**:
   - **Pathways**:
     - *WHO Cervical Cancer Early Diagnosis (`cervical-who`)*: 90% of women with identified cervical disease receive treatment within 30 working days. Status: `verified = false` (`referenceOnly = true`).
     - *WHO Global Breast Cancer Initiative (`breast-who`)*: Complete diagnostic resolution within 60 calendar days (42 working days). Status: `verified = false` (`referenceOnly = true`).
     - *Ontario FIT-Positive Colonoscopy Pathway (`colorectal-ontario`)*: Colonoscopy completed within 8 weeks (40 working days) of an abnormal FIT; referral target >= 85%. Status: `verified = true` (Manually verified against official Cancer Care Ontario guideline: `https://www.cancercareontario.ca/en/cancer-care-ontario/programs/screening-programs/colorectal-cancer-screening`).
   - **Calendar**: Weekend = Saturday & Sunday (`[6, 0]`).
   - **Languages**: English (`en`, LTR).
   - **Equity Stratification**: Residency / Immigration Status (`CITIZEN`, `PERMANENT_RESIDENT`, `TEMPORARY_WORKER`, `REFUGEE_PROTECTED`).

3. **`low-resource` (Community & Primary Outpost Configuration)**:
   - **Pathways**:
     - *Community Colorectal Screening Follow-up (`community-fobt`)*: Confirmatory evaluation within 45 working days. Status: `verified = false`.
     - *Community Cervical & Breast Follow-up (`community-womens-health`)*: Diagnostic evaluation within 30 working days. Status: `verified = false`.
   - **Calendar**: Sunday-Only Weekend (`[0]`) to reflect 6-day rural clinic operation schedules.
   - **Languages**: English (`en`, LTR).
   - **Equity Stratification**: Clinic District (`DISTRICT_NORTH`, `DISTRICT_SOUTH`, `RURAL_MOBILE`) and Contact Accessibility (`PERSONAL_PHONE`, `SHARED_HOUSEHOLD`, `CHW_LIAISON`).
   - **Channels**: SMS and Voice Call (Zero dependency on smartphone data or WhatsApp).

### Rule Verification Protocol

Every rule within a jurisdiction pack carries an explicit `verified: boolean` field:
- **`verified = false`**: Mandatory default for all rules until primary legal source documentation (such as an official Ministry or Department of Health circular) has been reviewed by a qualified healthcare compliance analyst.
- **`verified = true`**: Set only when the rule's statutory deadline, referral target, and urgency bypasses have been confirmed against a published, accessible authority URL (e.g., Cancer Care Ontario).
