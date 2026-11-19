-- =============================================================================
-- CareLoop Static Jurisdiction Packs & Pathways Seed Data for Supabase
-- =============================================================================

INSERT INTO jurisdiction_packs (id, name, version, jurisdiction, regulatory_status, default_locale, supported_locales, is_verified, verified_by, verified_at, clinical_governance)
VALUES 
(
  'abu-dhabi',
  'Abu Dhabi Health Authority Screening Governance Pack',
  '1.2.0',
  'Abu Dhabi, UAE',
  'PRODUCTION_VERIFIED',
  'ar',
  '["ar", "en"]'::jsonb,
  true,
  'DoH Oncology Screening Technical Committee',
  '2026-06-15T08:00:00Z',
  '{"oversightBody": "Department of Health - Abu Dhabi", "standardRef": "DoH/CAN-SCR-2025/REV2"}'::jsonb
),
(
  'who-reference',
  'WHO Global Cancer Early Diagnosis Guidelines Reference Pack',
  '1.0.0',
  'International Reference',
  'GUIDELINE_REFERENCE',
  'en',
  '["en", "ar", "fr", "es"]'::jsonb,
  true,
  'WHO NCD Management Unit',
  '2025-11-01T10:00:00Z',
  '{"oversightBody": "World Health Organization", "standardRef": "WHO-NCD-CP-2024.1"}'::jsonb
),
(
  'low-resource',
  'Low-Resource Health System Scaled Community Navigation Pack',
  '0.9.1',
  'Universal Low-Resource / LMIC Adaptation',
  'ADAPTIVE_OPERATIONAL',
  'en',
  '["en", "ar", "hi", "ur"]'::jsonb,
  true,
  'Global Health Delivery Project Advisory',
  '2026-01-10T12:00:00Z',
  '{"oversightBody": "Community Health System Alliance", "standardRef": "LMIC-COMM-NAV-V1"}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  version = EXCLUDED.version,
  updated_at = NOW();

-- Pathways Seed
INSERT INTO pathways (id, pack_id, name, cancer_type, target_population, screening_modality, positive_criteria, sla_targets, escalation_ladder)
VALUES
(
  'colorectal-uae',
  'abu-dhabi',
  'Colorectal Cancer Screening Pathway',
  'COLORECTAL',
  '{"minAge": 40, "maxAge": 75, "targetSex": "ALL"}'::jsonb,
  'FIT',
  '{"threshold": 100, "unit": "ng/mL", "interpretation": "POSITIVE_HAEMOGLOBIN"}'::jsonb,
  '{"patientNotificationWorkingDays": 3, "patientAcknowledgementWorkingDays": 3, "diagnosticReferralWorkingDays": 7, "colonoscopyPerformanceWorkingDays": 30, "clinicalResolutionTotalWorkingDays": 45}'::jsonb,
  '[
    {"step": 1, "channel": "SMS", "triggerHours": 24, "assignedRole": "NAVIGATOR"},
    {"step": 2, "channel": "CALL", "triggerHours": 72, "assignedRole": "NAVIGATOR"},
    {"step": 3, "channel": "NAVIGATOR_VISIT", "triggerHours": 144, "assignedRole": "NAVIGATOR"},
    {"step": 4, "channel": "CLINICIAN_ESCALATION", "triggerHours": 216, "assignedRole": "CLINICIAN"}
  ]'::jsonb
),
(
  'breast-abudhabi',
  'abu-dhabi',
  'Breast Cancer Screening Pathway',
  'BREAST',
  '{"minAge": 40, "maxAge": 69, "targetSex": "FEMALE"}'::jsonb,
  'MAMMOGRAPHY',
  '{"biradsCategory": [4, 5], "interpretation": "SUSPICIOUS_MALIGNANCY"}'::jsonb,
  '{"patientNotificationWorkingDays": 2, "patientAcknowledgementWorkingDays": 2, "diagnosticReferralWorkingDays": 5, "biopsyPerformanceWorkingDays": 14, "clinicalResolutionTotalWorkingDays": 28}'::jsonb,
  '[
    {"step": 1, "channel": "SMS", "triggerHours": 12, "assignedRole": "NAVIGATOR"},
    {"step": 2, "channel": "CALL", "triggerHours": 48, "assignedRole": "NAVIGATOR"},
    {"step": 3, "channel": "CLINICIAN_ESCALATION", "triggerHours": 96, "assignedRole": "CLINICIAN"}
  ]'::jsonb
),
(
  'who-crc',
  'who-reference',
  'WHO Reference Colorectal Early Diagnosis Pathway',
  'COLORECTAL',
  '{"minAge": 50, "maxAge": 74, "targetSex": "ALL"}'::jsonb,
  'FIT',
  '{"threshold": 100, "unit": "ng/mL"}'::jsonb,
  '{"patientNotificationWorkingDays": 5, "patientAcknowledgementWorkingDays": 5, "diagnosticReferralWorkingDays": 14, "colonoscopyPerformanceWorkingDays": 60, "clinicalResolutionTotalWorkingDays": 90}'::jsonb,
  '[
    {"step": 1, "channel": "SMS", "triggerHours": 48, "assignedRole": "NAVIGATOR"},
    {"step": 2, "channel": "CALL", "triggerHours": 120, "assignedRole": "NAVIGATOR"}
  ]'::jsonb
),
(
  'low-resource-crc',
  'low-resource',
  'Community-Led Colorectal Navigation Track',
  'COLORECTAL',
  '{"minAge": 45, "maxAge": 75, "targetSex": "ALL"}'::jsonb,
  'FIT',
  '{"threshold": 150, "unit": "ng/mL"}'::jsonb,
  '{"patientNotificationWorkingDays": 7, "patientAcknowledgementWorkingDays": 7, "diagnosticReferralWorkingDays": 21, "colonoscopyPerformanceWorkingDays": 90, "clinicalResolutionTotalWorkingDays": 120}'::jsonb,
  '[
    {"step": 1, "channel": "CALL", "triggerHours": 72, "assignedRole": "NAVIGATOR"},
    {"step": 2, "channel": "NAVIGATOR_VISIT", "triggerHours": 168, "assignedRole": "NAVIGATOR"}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  cancer_type = EXCLUDED.cancer_type,
  updated_at = NOW();
