# CareLoop Population Simulation Replay Report

> **STRICT DISCLAIMER**:
> **simulation under stated assumptions, not clinical effect.**
> Model outputs represent mathematical arithmetic estimations synthesized from published cluster-randomized trials (`SRC-2023-US-RCT`, `SRC-2025-CMR-TEL`) and screening audits (`SRC-2015-AUH-EMIR`, `SRC-2020-FIT-SURVEY`). Trial outcomes differ from our closed-loop resolution endpoint (e.g. 120-day colonoscopy completion vs closed-loop clinical resolution). These outputs do not constitute certified clinical effect or individual patient prognosis. All projected velocities and median durations are an **illustrative assumption, not evidence**.

---

## 1. Executive Summary & Model Overview

CareLoop incorporates a deterministic population replay engine (`src/services/simulationEngine.ts`) to illustrate the arithmetic impact of active navigation versus passive unmanaged screening across a cohort of **2,000 synthetic patients**.

Rather than utilizing hardcoded managed rates, CareLoop models managed follow-through as:
$$\text{Managed Rate} = \text{Baseline Rate} + \text{Evidence-Based Lift}$$

Two evidence-grounded models are evaluated alongside an independent policy target:
1. **Default Model (+8.5% lift)**: Based on the US cluster RCT (`SRC-2023-US-RCT`) evaluating EHR reminders with active navigation within 120 days.
2. **Optimistic Model (+19.5% lift)**: Based on the Cameroon telephone navigation RCT (`SRC-2025-CMR-TEL`). For the organized registry baseline (79.0%), the optimistic lift is **not applied**.
3. **Guideline Target (90.0%)**: Policy benchmark for organized registries; displayed strictly as a benchmark, **never as a prediction**.

---

## 2. Baseline Epidemiological Scenarios

| Scenario ID | Baseline Name | Empirical Source Reference | Baseline Follow-Up Rate | Baseline 95% Range | Median Days (Baseline)* | P90 Days (Baseline)* |
|---|---|---|---|---|---|---|
| **`low`** | Abu Dhabi 2015-16 | `SRC-2015-AUH-EMIR` (Almansoori et al., BMC Cancer 2021) | **13.5%** | [11.0%, 16.0%] | 112 days | 240 days |
| **`medium`** | International Opportunistic Screening | `SRC-2020-FIT-SURVEY` (J Med Screen 2020) | **57.0%** | [52.0%, 62.0%] | 74 days | 145 days |
| **`high`** | International Organized Registry | `SRC-2020-FIT-SURVEY` (J Med Screen 2020) | **79.0%** | [75.0%, 83.0%] | 46 days | 82 days |

*\*Note: Baseline and managed median days to resolution are an illustrative assumption, not evidence.*

---

## 3. Parameterized Trial Effect Sizes

1. **US cluster RCT (`SRC-2023-US-RCT`)**:
   - Citation: JAMA 2023 (PubMed 37815566).
   - Setting & Scope: 44 practices, 11,980 patients, 120-day follow-up.
   - Empirical Finding: 22.9% usual care, 22.7% EHR reminders, 31.4% reminders+outreach+navigation.
   - **Absolute Uplift Applied**: $+8.5\%$ (Default model: 31.4% vs 22.9%).
2. **Cameroon RCT (`SRC-2025-CMR-TEL`)**:
   - Citation: Gynecologic Oncology Reports 2025 (doi: 10.1016/j.gore.2025.101745).
   - Setting & Scope: Cameroon screening clinics.
   - Empirical Finding: 25.6% vs 6.1%, aOR 3.97 (95% CI 1.29-12.17).
   - **Absolute Uplift Applied**: $+19.5\%$ (Optimistic model; not applied to 79.0% organized baseline).
3. **Tanzania RCT (`SRC-2020-TZA-SMS`)**:
   - Citation: JMIR 2020 (jmir.org/2020/4/e15863).
   - Setting & Scope: Tanzania cervical/breast screening clinics.
   - Empirical Finding: 24.0% vs 23.8%, RR 1.02, no p-value claimed.
   - **Effect Size Applied**: $0.0\%$ (Standalone text reminders alone produce no statistically measurable lift without multi-tiered human escalation).
4. **Meta-analysis, PLOS ONE (`SRC-2024-META-CERV`)**:
   - Citation: PLOS ONE 2024 (journals.plos.org/plosone/article?id=10.1371/journal.pone.0291931).
   - Setting & Scope: 28 studies (11 RCTs, 17 observational), cervical abnormal-screen follow-up.
   - Empirical Finding: multicomponent OR 3.01 (95% CI 2.03-4.46) vs single 1.56 (95% CI 1.14-2.14).
   - Substantiates the CareLoop four-tier escalation ladder.
5. **International FIT survey (`SRC-2020-FIT-SURVEY`)**:
   - Citation: J Med Screen 2020 (doi: 10.1177/0969141320904977).
   - Setting & Scope: 35 programmes surveyed.
   - Empirical Finding: Mean 79% colonoscopy within 6 months, range 39-100%; organised 81% vs opportunistic 57%.
6. **Abu Dhabi 2015-16 (`SRC-2015-AUH-EMIR`)**:
   - Citation: Almansoori et al., BMC Cancer 2021 (cited second-hand).
   - Setting & Scope: Adult Emiratis in ambulatory healthcare centres.
   - Empirical Finding: 23.5% FOBT uptake, 13.5% follow-up colonoscopy among FOBT-positive.

---

## 4. Head-to-Head Comparative Outcomes (Cohort = 2,000 Cases)

*Label: simulation under stated assumptions, not clinical effect.*
*Managed velocities: illustrative assumption, not evidence.*

### Scenario A: Historical Baseline (`low` — Abu Dhabi 2015-16)
- **Baseline (Unmanaged, 13.5%)**:
  - Resolved: **270 cases** ($13.5\%$)
  - Lost to follow-up: **1,730 cases** ($86.5\%$)
  - Median days to resolution: **112 working days** *(illustrative assumption, not evidence)*
- **Default Model (Baseline + 8.5% lift)**:
  - Resolved: **440 cases** ($22.0\%$) | Range: $19.5\% - 24.5\%$
  - Additional resolved: **+170 cases**
  - Median days to resolution: **28 working days** *(illustrative assumption, not evidence)*
- **Optimistic Model (Baseline + 19.5% lift)**:
  - Resolved: **660 cases** ($33.0\%$) | Range: $30.5\% - 35.5\%$
  - Additional resolved: **+390 cases**
  - Median days to resolution: **24 working days** *(illustrative assumption, not evidence)*
- **Guideline Benchmark (Target Only, Not Prediction)**: **1,800 cases** ($90.0\%$).

### Scenario B: International Opportunistic Screening (`medium` — 57.0%)
- **Baseline (Unmanaged, 57.0%)**:
  - Resolved: **1,140 cases** ($57.0\%$)
  - Lost to follow-up: **860 cases** ($43.0\%$)
  - Median days to resolution: **74 working days** *(illustrative assumption, not evidence)*
- **Default Model (Baseline + 8.5% lift)**:
  - Resolved: **1,310 cases** ($65.5\%$) | Range: $60.5\% - 70.5\%$
  - Additional resolved: **+170 cases**
  - Median days to resolution: **25 working days** *(illustrative assumption, not evidence)*
- **Optimistic Model (Baseline + 19.5% lift)**:
  - Resolved: **1,530 cases** ($76.5\%$) | Range: $71.5\% - 81.5\%$
  - Additional resolved: **+390 cases**
  - Median days to resolution: **21 working days** *(illustrative assumption, not evidence)*
- **Guideline Benchmark (Target Only, Not Prediction)**: **1,800 cases** ($90.0\%$).

### Scenario C: International Organized Registry (`high` — 79.0%)
- **Baseline (Unmanaged, 79.0%)**:
  - Resolved: **1,580 cases** ($79.0\%$)
  - Lost to follow-up: **420 cases** ($21.0\%$)
  - Median days to resolution: **46 working days** *(illustrative assumption, not evidence)*
- **Default Model (Baseline + 8.5% lift)**:
  - Resolved: **1,750 cases** ($87.5\%$) | Range: $83.5\% - 91.5\%$
  - Additional resolved: **+170 cases**
  - Median days to resolution: **21 working days** *(illustrative assumption, not evidence)*
- **Optimistic Model (+19.5% lift)**:
  - **not applied** (not applied to 79.0% organized screening baseline)
- **Guideline Benchmark (Target Only, Not Prediction)**: **1,800 cases** ($90.0\%$).

---

## 5. Methodological Limits & Endpoint Alignment

- **Endpoint Disparity**: The cited RCTs measured varying intermediate milestones: `SRC-2023-US-RCT` evaluated colonoscopy completion within 120 calendar days; `SRC-2025-CMR-TEL` measured attendance at initial referral clinics. CareLoop's operational endpoint is **closed-loop clinical resolution** within configured SLA working days (e.g. 31 or 45 working days).
- **Population Transferability**: Parameters originate in health systems outside the UAE (US community health centers, Cameroon clinics). UAE-specific factors (e.g. Thiqa/Enaya coverage, high mobile penetration) may alter baseline inertia and response rates.
- **Velocity Note**: All managed median velocities and time savings represent an illustrative assumption, not evidence.
