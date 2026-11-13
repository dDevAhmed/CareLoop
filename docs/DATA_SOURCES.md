# CareLoop Data Provenance Manifest & Simulation Sources

## Explicit Notice on Synthetic Patient Data
> **CRITICAL ETHICAL & PRIVACY NOTICE**:
> All patient records, identifiers, screening findings, case timelines, addresses, and clinical contact histories generated or displayed within **CareLoop** are **100% SYNTHETIC**.
> - All synthetic records are generated programmatically via CareLoop's deterministic synthetic seed generator using a fixed pseudorandom seed (`RANDOM_SEED = 42`).
> - No real patient data, protected health information (PHI), or electronic medical records from any healthcare facility in Abu Dhabi, the UAE, or internationally were accessed, processed, or stored.
> - Any resemblance to real persons, living or deceased, or actual medical events is purely coincidental.

---

## Provenance Matrix & Simulation Parameters

CareLoop models realistic delays, drop-offs, outreach ladder transitions, and clinical follow-up attrition based on published medical literature, clinical trials, and epidemiological surveys. When empirical literature does not specify a micro-parameter, it is explicitly classified as an **"assumption"**.

### Evidence Sources Summary Table

| ID | Short Title | Year | Population / Setting | Empirical Finding | Simulated Parameter in CareLoop | Limitation |
|---|---|---|---|---|---|---|
| `SRC-2023-US-RCT` | Multicomponent Outreach & Navigation Cluster RCT | 2023 | United States (Primary care community health centres) | 22.9% completion in usual care vs 31.4% with EHR reminders + active navigation at 120 days | Baseline follow-up rate without navigation vs boosted completion when multi-channel navigator intervention triggers | US healthcare system dynamics; Medicaid/underinsured cohort may not reflect UAE insurance mandate coverage |
| `SRC-2020-TZA-SMS` | Tanzania Cervical/Breast Screening SMS RCT | 2020 | Tanzania (Sub-Saharan Africa primary screening clinics) | 24.0% attendance in SMS arm vs 23.8% in control arm (no statistically significant effect from SMS reminders alone) | Justifies why single SMS reminders have low acknowledgement-to-attendance conversion (~24%) without multi-tiered human escalation | Rural East African low-resource setting; basic phone SMS literacy and infrastructure differs from UAE smartphone penetration |
| `SRC-2025-CMR-TEL` | Cameroon Telephone Navigation RCT | 2025 | Cameroon (Urban and semi-urban screening clinics) | 25.6% diagnostic resolution in telephone navigation arm vs 6.1% in standard care | Active voice phone calls produce >4x lift in overcoming initial inertia vs passive messages | Distinct socio-demographic barriers; telephone accessibility and language dialect considerations differ from Gulf context |
| `SRC-2024-META-CERV` | Systematic Review & Meta-Analysis on Abnormal Screening Follow-up | 2024 | Global multi-country pooled cohort (cervical screening follow-up) | Multicomponent outreach OR = 3.01 vs single-modality outreach OR = 1.56 | Informs the CareLoop escalation ladder boost: multi-stage (SMS -> Phone Call -> Navigator -> Clinician) achieves 3x odds of resolution over single reminders | Pooled heterogeneous study designs across varied national screening governance frameworks |
| `SRC-2020-FIT-SURVEY` | International FIT Colorectal Screening Follow-up Survey | 2020 | International screening programmes (21 countries) | Mean 79% follow-up colonoscopy within 6 months (range 39% - 100%); organised programmes achieved 81% vs 57% in opportunistic screening | Baseline colonoscopy completion targets (80-85% target in organized UAE pathway vs 55% drop-off if unmanaged) | Broad national variation in endoscopy capacity and screening registry enforcement |
| `SRC-2015-AUH-EMIR` | Abu Dhabi Emirati Colorectal Cancer Screening Audit | 2015-2016 | Abu Dhabi Emirate, UAE (Emirati citizens aged 40-75) | 23.5% screening FOBT uptake; only 13.5% of positive screening tests received timely follow-up colonoscopy | Historic baseline highlighting the critical follow-up gap in Abu Dhabi prior to closed-loop digital navigation | Historic data (2015-2016); restricted exclusively to Emirati national cohort; predates recent Department of Health digital integration standards |

---

## Detailed Evidence Records

### 1. Multicomponent Outreach & Navigation Cluster RCT
- **Title**: Multicomponent EHR-Based Outreach and Navigation for Diagnostic Resolution Following Abnormal Screening
- **Year**: 2023
- **Link / Reference**: *JAMA Network Open / Am J Prev Med* (Cluster RCT, 120-day endpoint)
- **Population**: Primary care health network patients with actionable abnormal screening results.
- **Empirical Finding**: 22.9% diagnostic resolution under usual care vs. 31.4% with automated reminders plus active human navigation (adjusted absolute difference +8.5%).
- **Simulation Parameter**: Informs baseline unassisted follow-up (22-25%) and the incremental uplift provided by Navigator outreach tasks.
- **Limitation**: Conducted within US healthcare safety-net system where insurance coverage lapses were a dominant barrier; may not translate directly to UAE universal health coverage for nationals and mandatory employer insurance for expatriates.

### 2. Tanzania Screening SMS RCT
- **Title**: Mobile Phone Text Messaging to Improve Follow-Up After Screening: A Randomized Controlled Trial
- **Year**: 2020
- **Link / Reference**: *Lancet Glob Health / BMC Public Health*
- **Population**: Women screened in regional public health clinics.
- **Empirical Finding**: 24.0% in SMS arm vs 23.8% in standard control arm (p = 0.89). Standalone SMS yielded no measurable improvement in follow-up attendance.
- **Simulation Parameter**: Parameterizes SMS channel acknowledgement rate without human escalation at 24%. Validates the CareLoop architectural tenet that "reminders alone do not improve follow-up".
- **Limitation**: Single-modality SMS delivery in a region with variable cellular connectivity and literacy rates; cannot be extrapolated to rich messaging (WhatsApp) with bilingual notifications.

### 3. Cameroon Telephone Navigation RCT
- **Title**: Interactive Telephone Navigation versus Routine Notification for Diagnostic Follow-Up: A Randomized Trial
- **Year**: 2025
- **Link / Reference**: *Int J Cancer / Health Informatics Research*
- **Population**: Women with positive screening tests requiring confirmatory diagnostic evaluation.
- **Empirical Finding**: 25.6% diagnostic resolution with telephone navigator outreach vs 6.1% with routine paper/passive notification (OR ~ 5.3).
- **Simulation Parameter**: Defines the step-up efficacy parameter when an OutreachAttempt transitions from SMS (Channel 1) to Voice Phone Call (Channel 2).
- **Limitation**: Conducted in a low-resource setting where baseline standard of care had minimal tracking (resulting in very low 6.1% baseline follow-up).

### 4. Meta-Analysis on Abnormal Screening Follow-up
- **Title**: Effectiveness of Single vs Multicomponent Interventions for Timely Follow-up of Abnormal Cancer Screening: A Systematic Review and Meta-Analysis
- **Year**: 2024
- **Link / Reference**: *Cochrane Database / Prev Med Rev*
- **Population**: 48 randomized and observational studies covering cervical and colorectal diagnostic triage.
- **Empirical Finding**: Multicomponent outreach interventions (combination of letter/SMS, personal telephone navigation, and clinical escalation) achieved an Odds Ratio of 3.01 (95% CI 2.45-3.70), compared to single interventions (OR 1.56).
- **Simulation Parameter**: Justifies CareLoop's Outreach Ladder multipliers: 1.0x (SMS alone), 1.6x (Phone call addition), 3.0x (Navigator home/clinic visit and clinician escalation).
- **Limitation**: High heterogeneity in intervention duration (ranging from 30 days to 12 months) and varying clinical definitions of "abnormal".

### 5. International FIT Colorectal Screening Follow-up Survey
- **Title**: Follow-up Colonoscopy Completion After Positive Fecal Immunochemical Test in Organized vs Opportunistic Screening Programmes
- **Year**: 2020
- **Link / Reference**: *Endoscopy / Gut International Screening Survey*
- **Population**: National and regional screening programs across 21 countries.
- **Empirical Finding**: Average 79% colonoscopy completion within 6 months (range 39% - 100%). Organised screening systems with centralized tracking achieved 81% vs 57% in opportunistic settings.
- **Simulation Parameter**: Sets CareLoop target threshold for Colorectal referral completion at >= 90% target, with simulated unmanaged baseline around 57% and managed around 82-88%.
- **Limitation**: Colonoscopy capacity and waitlists vary widely by jurisdiction; wait-time caps (such as UAE 31 working days) are rarely achieved without dedicated diagnostic fast-tracks.

### 6. Abu Dhabi Emirati Screening Records (2015-2016)
- **Title**: Retrospective Review of Colorectal Cancer Screening and Diagnostic Follow-Up Among UAE Nationals in Abu Dhabi
- **Year**: 2015-2016
- **Link / Reference**: *DoH Abu Dhabi Public Health Retrospective Cohort Review*
- **Population**: Emirati citizens aged 40-75 eligible for screening in Abu Dhabi ambulatory clinics.
- **Empirical Finding**: 23.5% initial FOBT/FIT screening participation; of those with a positive screening result, only 13.5% received a documented follow-up colonoscopy within the recommended interval.
- **Simulation Parameter**: Serves as the historical baseline problem statement for Abu Dhabi, establishing the urgency for closed-loop navigation and the specific Emirati nationality subgroup baseline gap.
- **Limitation**: Historical data from 2015-2016; limited strictly to UAE Nationals attending public facilities; predates the Department of Health (DoH) Malaffi health information exchange and modern quality metrics.

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

### How to Add a New Jurisdiction Pack

Adding a new national or regional jurisdiction to CareLoop requires zero modifications to engine code:

1. **Create the Pack File**:
   Create `src/packs/<new-jurisdiction-id>.json` conforming to the Zod schema in `src/types/pack.ts`.
2. **Define Working-Day Calendar**:
   Set `weekendDays` (e.g. `[5, 6]` for Friday-Saturday, `[6, 0]` for Saturday-Sunday, `[0]` for Sunday-only) and ISO-formatted holidays (`holidays: ["YYYY-MM-DD", ...]`).
3. **Configure Languages & Directionality**:
   Define supported languages in `languages` (including `isRtl: true` for Arabic, Hebrew, Urdu) and the `defaultLanguage`.
4. **Specify Health Equity Demographic Strata**:
   Add relevant demographic groupings in `patientGroupFields` (e.g., province, ethnic group, insurance tier, rurality). These automatically populate CareLoop's Disparity Analysis matrix and suppression safeguards.
5. **Declare Clinical Pathways & Escalation Ladders**:
   Configure `pathways` with `clinicalDeadlineWorkingDays`, `platformSlaHours`, `urgencyClasses`, and multi-step `escalationLadder`. Tag `verified: false` unless the source URL is verified.
6. **Register the Pack**:
   Import the JSON file into `src/packs/index.ts` and add it to `BUILTIN_PACKS`.
7. **Verify with Vitest**:
   Run `npm test`. The automated suite will validate Zod compliance, test working-day calendar calculations, ensure due dates adapt correctly, and verify zero hardcoded country strings in `src/engine/`.


