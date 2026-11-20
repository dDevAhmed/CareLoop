# CareLoop Population Simulation Replay Report

> **STRICT DISCLAIMER**:
> **simulation under stated assumptions, not clinical effect.**
> Model outputs represent mathematical arithmetic estimations synthesized from published cluster-randomized trials (`SRC-2023-US-RCT`, `SRC-2025-CMR-TEL`) and screening audits (`SRC-2015-AUH-EMIR`, `SRC-2020-FIT-SURVEY`). Trial outcomes differ from our closed-loop resolution endpoint (e.g. 120-day colonoscopy completion vs 45-day closed-loop clinical resolution). These outputs do not constitute certified clinical effect or individual patient prognosis.

---

## 1. Executive Summary & Model Overview

CareLoop incorporates a deterministic population replay engine (`src/services/simulationEngine.ts`) to illustrate the arithmetic impact of active navigation versus passive unmanaged screening across a cohort of **2,000 synthetic patients**.

Rather than utilizing hardcoded managed rates, CareLoop models managed follow-through as:
$$\text{Managed Rate} = \text{Baseline Rate} + \text{Evidence-Based Lift}$$

Two evidence-grounded models are computed alongside an independent policy target:
1. **Default Model (+8.5% lift)**: Based on the US cluster RCT (`SRC-2023-US-RCT`) evaluating EHR reminders with active navigation within 120 days.
2. **Optimistic Model (+19.5% lift)**: Based on the Cameroon telephone navigation RCT (`SRC-2025-CMR-TEL`).
3. **Guideline Target (90.0%)**: Policy benchmark for organized registries; displayed strictly as a benchmark, **never as a prediction**.

---

## 2. Baseline Epidemiological Scenarios

| Scenario ID | Baseline Name | Empirical Source Reference | Baseline Follow-Up Rate | Baseline 95% Range | Median Days (Baseline) | P90 Days (Baseline) |
|---|---|---|---|---|---|---|
| **`low`** | Historical Abu Dhabi Baseline (2015-2016) | `SRC-2015-AUH-EMIR` | **13.5%** | [11.0%, 16.0%] | 112 days | 240 days |
| **`medium`** | International Opportunistic Screening | `SRC-2020-FIT-SURVEY` | **57.0%** | [52.0%, 62.0%] | 74 days | 145 days |
| **`high`** | International Organized Screening Registry | `SRC-2020-FIT-SURVEY` | **79.0%** | [75.0%, 83.0%] | 46 days | 82 days |

---

## 3. Parameterized Trial Effect Sizes

1. **Default Active Navigation Lift (`SRC-2023-US-RCT`)**:
   - Primary Endpoint: 120-day diagnostic resolution.
   - Usual Care: $22.9\%$ vs Navigation: $31.4\%$.
   - **Absolute Uplift Applied**: $+8.5\%$ (Default model).
2. **Optimistic Telephone Voice Navigation (`SRC-2025-CMR-TEL`)**:
   - Primary Endpoint: Confirmatory diagnostic follow-up.
   - Routine Notification: $6.1\%$ vs Phone Navigation: $25.6\%$.
   - **Absolute Uplift Applied**: $+19.5\%$ (Optimistic model).
3. **Standalone Text Messaging (`SRC-2020-TZA-SMS`)**:
   - Primary Endpoint: Screening follow-up attendance.
   - SMS: $24.0\%$ vs Control: $23.8\%$.
   - **Effect Size Applied**: $0.0\%$ (Standalone SMS provides no statistically measurable lift without human escalation).
4. **Multicomponent Escalation Ladder (`SRC-2024-META-CERV`)**:
   - **Citation**: PLOS ONE 2024 meta-analysis on multicomponent abnormal screening follow-up.
   - Single-modality reminder: $\text{OR} = 1.56$.
   - Multicomponent escalation (SMS + Phone + Navigator + Clinician): **$\text{OR} = 3.01$** ($95\%\text{ CI } 2.45 - 3.70$).
   - Used qualitatively to substantiate the four-tier outreach ladder.

---

## 4. Head-to-Head Comparative Outcomes (Cohort = 2,000 Cases)

*Label: simulation under stated assumptions, not clinical effect.*

### Scenario A: Historical Baseline (`low` — Abu Dhabi 2015-2016)
- **Baseline (Unmanaged, 13.5%)**:
  - Resolved: **270 cases** ($13.5\%$)
  - Lost to follow-up: **1,730 cases** ($86.5\%$)
  - Median days to resolution: **112 working days**
- **Default Model (Baseline + 8.5% lift)**:
  - Resolved: **440 cases** ($22.0\%$) | Range: $19.5\% - 24.5\%$
  - Additional resolved: **+170 cases**
  - Median days to resolution: **28 working days**
- **Optimistic Model (Baseline + 19.5% lift)**:
  - Resolved: **660 cases** ($33.0\%$) | Range: $30.5\% - 35.5\%$
  - Additional resolved: **+390 cases**
- **Guideline Benchmark (Target Only, Not Prediction)**: **1,800 cases** ($90.0\%$).

### Scenario B: International Opportunistic Screening (`medium` — 57.0%)
- **Baseline (Unmanaged, 57.0%)**:
  - Resolved: **1,140 cases** ($57.0\%$)
  - Lost to follow-up: **860 cases** ($43.0\%$)
- **Default Model (Baseline + 8.5% lift)**:
  - Resolved: **1,310 cases** ($65.5\%$) | Range: $60.5\% - 70.5\%$
  - Additional resolved: **+170 cases**
- **Optimistic Model (Baseline + 19.5% lift)**:
  - Resolved: **1,530 cases** ($76.5\%$) | Range: $71.5\% - 81.5\%$
  - Additional resolved: **+390 cases**
- **Guideline Benchmark (Target Only, Not Prediction)**: **1,800 cases** ($90.0\%$).

### Scenario C: International Organized Registry (`high` — 79.0%)
- **Baseline (Unmanaged, 79.0%)**:
  - Resolved: **1,580 cases** ($79.0\%$)
  - Lost to follow-up: **420 cases** ($21.0\%$)
- **Default Model (Baseline + 8.5% lift)**:
  - Resolved: **1,750 cases** ($87.5\%$) | Range: $83.5\% - 91.5\%$
  - Additional resolved: **+170 cases**
- **Optimistic Model (Baseline + 19.5% lift)**:
  - Resolved: **1,970 cases** ($98.5\%$) | Range: $94.5\% - 100.0\%$
  - Additional resolved: **+390 cases**
- **Guideline Benchmark (Target Only, Not Prediction)**: **1,800 cases** ($90.0\%$).

---

## 5. Methodological Limits & Endpoint Alignment

- **Endpoint Disparity**: The cited RCTs measured varying intermediate milestones: `SRC-2023-US-RCT` evaluated colonoscopy completion within 120 calendar days; `SRC-2025-CMR-TEL` measured attendance at initial referral clinics. CareLoop's operational endpoint is **closed-loop clinical resolution** within configured SLA working days (e.g. 45 working days).
- **Population Transferability**: Parameters originate in health systems outside the UAE (US community health centers, Cameroon clinics). UAE-specific factors (e.g. Thiqa/Enaya coverage, high mobile penetration) may alter baseline inertia and response rates.
