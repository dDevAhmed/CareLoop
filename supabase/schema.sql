-- =============================================================================
-- CareLoop Database Schema for Supabase (PostgreSQL 15+)
-- Future Health Digital Innovation Challenge
-- Closed-loop screening-to-care platform
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. JURISDICTION PACKS & PATHWAYS (Config data)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS jurisdiction_packs (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  version VARCHAR(32) NOT NULL,
  jurisdiction VARCHAR(128) NOT NULL,
  regulatory_status VARCHAR(64) NOT NULL,
  default_locale VARCHAR(16) NOT NULL DEFAULT 'en',
  supported_locales JSONB NOT NULL DEFAULT '["en", "ar"]'::jsonb,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  verified_by VARCHAR(255),
  verified_at TIMESTAMPTZ,
  clinical_governance JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pathways (
  id VARCHAR(64) PRIMARY KEY,
  pack_id VARCHAR(64) NOT NULL REFERENCES jurisdiction_packs(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  cancer_type VARCHAR(64) NOT NULL,
  target_population JSONB NOT NULL DEFAULT '{}'::jsonb,
  screening_modality VARCHAR(64) NOT NULL,
  positive_criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
  sla_targets JSONB NOT NULL DEFAULT '{}'::jsonb,
  escalation_ladder JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 2. PATIENTS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patients (
  id VARCHAR(64) PRIMARY KEY,
  external_patient_id VARCHAR(128) NOT NULL,
  synthetic BOOLEAN NOT NULL DEFAULT true,
  full_name VARCHAR(255) NOT NULL,
  full_name_arabic VARCHAR(255),
  date_of_birth DATE NOT NULL,
  gender VARCHAR(32) NOT NULL,
  language VARCHAR(16) NOT NULL DEFAULT 'en',
  phone VARCHAR(64) NOT NULL,
  email VARCHAR(255),
  emirates_id VARCHAR(32),
  insurance_id VARCHAR(64),
  insurance_tier VARCHAR(64),
  nationality_group VARCHAR(64),
  residency_status VARCHAR(64),
  preferred_channel VARCHAR(32) NOT NULL DEFAULT 'SMS',
  consent_sms BOOLEAN NOT NULL DEFAULT true,
  consent_whatsapp BOOLEAN NOT NULL DEFAULT true,
  consent_call BOOLEAN NOT NULL DEFAULT true,
  consent_navigator BOOLEAN NOT NULL DEFAULT true,
  consent_data_sharing BOOLEAN NOT NULL DEFAULT true,
  consent_last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patients_language ON patients(language);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);

-- -----------------------------------------------------------------------------
-- 3. CASES TABLE (Core state machine entity)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cases (
  id VARCHAR(64) PRIMARY KEY,
  case_number VARCHAR(64) UNIQUE NOT NULL,
  patient_id VARCHAR(64) NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  pathway_id VARCHAR(64) NOT NULL REFERENCES pathways(id) ON DELETE RESTRICT,
  pack_id VARCHAR(64) NOT NULL REFERENCES jurisdiction_packs(id) ON DELETE RESTRICT,
  current_state VARCHAR(64) NOT NULL DEFAULT 'RESULT_ISSUED',
  urgency VARCHAR(32) NOT NULL DEFAULT 'ROUTINE',
  is_overdue BOOLEAN NOT NULL DEFAULT false,
  screening_result_id VARCHAR(128) NOT NULL,
  screening_test_date TIMESTAMPTZ NOT NULL,
  screening_test_type VARCHAR(64) NOT NULL,
  quantitative_result NUMERIC,
  quantitative_unit VARCHAR(32),
  qualitative_result VARCHAR(64) NOT NULL,
  clinical_deadline TIMESTAMPTZ NOT NULL,
  sla_working_days_remaining INTEGER,
  primary_owner_id VARCHAR(64),
  primary_owner_role VARCHAR(64),
  case_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Milestones (embedded for quick querying)
  result_issued_at TIMESTAMPTZ,
  patient_notified_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  understanding_confirmed_at TIMESTAMPTZ,
  referral_created_at TIMESTAMPTZ,
  referral_accepted_at TIMESTAMPTZ,
  appointment_scheduled_for TIMESTAMPTZ,
  appointment_attended_at TIMESTAMPTZ,
  diagnostic_disposition_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  
  -- Closure info
  closure_type VARCHAR(64),
  closure_reason VARCHAR(64),
  closure_by_user_id VARCHAR(64),
  closure_by_role VARCHAR(64),
  closure_notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cases_current_state ON cases(current_state);
CREATE INDEX IF NOT EXISTS idx_cases_urgency ON cases(urgency);
CREATE INDEX IF NOT EXISTS idx_cases_is_overdue ON cases(is_overdue);
CREATE INDEX IF NOT EXISTS idx_cases_pathway_id ON cases(pathway_id);
CREATE INDEX IF NOT EXISTS idx_cases_pack_id ON cases(pack_id);
CREATE INDEX IF NOT EXISTS idx_cases_clinical_deadline ON cases(clinical_deadline);
CREATE INDEX IF NOT EXISTS idx_cases_patient_id ON cases(patient_id);

-- -----------------------------------------------------------------------------
-- 4. CASE EVENTS (Audit trail of state transitions)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS case_events (
  id VARCHAR(64) PRIMARY KEY,
  case_id VARCHAR(64) NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  from_state VARCHAR(64) NOT NULL,
  to_state VARCHAR(64) NOT NULL,
  trigger VARCHAR(128) NOT NULL,
  actor_id VARCHAR(64) NOT NULL,
  actor_role VARCHAR(64) NOT NULL,
  barrier_reason VARCHAR(64),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_case_events_case_id ON case_events(case_id);
CREATE INDEX IF NOT EXISTS idx_case_events_occurred_at ON case_events(occurred_at);

-- -----------------------------------------------------------------------------
-- 5. OUTREACH ATTEMPTS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS outreach_attempts (
  id VARCHAR(64) PRIMARY KEY,
  case_id VARCHAR(64) NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  channel VARCHAR(32) NOT NULL,
  outcome VARCHAR(64) NOT NULL,
  by_role VARCHAR(64) NOT NULL,
  by_user_id VARCHAR(64) NOT NULL,
  barrier_reason VARCHAR(64),
  notes TEXT,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outreach_case_id ON outreach_attempts(case_id);
CREATE INDEX IF NOT EXISTS idx_outreach_attempted_at ON outreach_attempts(attempted_at);

-- -----------------------------------------------------------------------------
-- 6. SPECIALIST REFERRALS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS referrals (
  id VARCHAR(64) PRIMARY KEY,
  case_id VARCHAR(64) NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  synthetic BOOLEAN NOT NULL DEFAULT true,
  referring_provider_id VARCHAR(64) NOT NULL,
  referring_provider_name VARCHAR(255) NOT NULL,
  receiving_facility_id VARCHAR(64) NOT NULL,
  receiving_facility_name VARCHAR(255) NOT NULL,
  specialty VARCHAR(128) NOT NULL,
  urgency VARCHAR(32) NOT NULL DEFAULT 'ROUTINE',
  status VARCHAR(64) NOT NULL DEFAULT 'SENT',
  rejection_reason VARCHAR(128),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referrals_case_id ON referrals(case_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);

-- -----------------------------------------------------------------------------
-- 7. APPOINTMENTS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS appointments (
  id VARCHAR(64) PRIMARY KEY,
  case_id VARCHAR(64) NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  facility_id VARCHAR(64) NOT NULL,
  facility_name VARCHAR(255) NOT NULL,
  scheduled_time TIMESTAMPTZ NOT NULL,
  procedure_type VARCHAR(128) NOT NULL,
  prep_kit_delivered BOOLEAN NOT NULL DEFAULT false,
  status VARCHAR(64) NOT NULL DEFAULT 'SCHEDULED',
  attended_at TIMESTAMPTZ,
  cancellation_reason VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_case_id ON appointments(case_id);

-- -----------------------------------------------------------------------------
-- 8. CRYPTOGRAPHIC AUDIT LOG (SHA-256 Hash Chained)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(64) PRIMARY KEY,
  sequence_number BIGINT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  real_timestamp TIMESTAMPTZ DEFAULT NOW(),
  actor_id VARCHAR(64) NOT NULL,
  actor_role VARCHAR(64) NOT NULL,
  action VARCHAR(128) NOT NULL,
  resource_type VARCHAR(64) NOT NULL,
  resource_id VARCHAR(64) NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  previous_hash VARCHAR(128) NOT NULL,
  entry_hash VARCHAR(128) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_audit_logs_seq ON audit_logs(sequence_number);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- -----------------------------------------------------------------------------
-- 9. RESPONSIBLE AI APPROVAL QUEUE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_approval_queue (
  id VARCHAR(64) PRIMARY KEY,
  case_id VARCHAR(64) NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  action_type VARCHAR(64) NOT NULL,
  model_id VARCHAR(64) NOT NULL,
  generated_draft TEXT NOT NULL,
  source_facts JSONB NOT NULL DEFAULT '[]'::jsonb,
  status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  reviewed_by VARCHAR(64),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  modified_content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_approval_status ON ai_approval_queue(status);

-- -----------------------------------------------------------------------------
-- 10. MULTIDISCIPLINARY CONSULT MESSAGES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS consult_messages (
  id VARCHAR(64) PRIMARY KEY,
  case_id VARCHAR(64) NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  sender_id VARCHAR(64) NOT NULL,
  sender_role VARCHAR(64) NOT NULL,
  sender_name VARCHAR(255) NOT NULL,
  recipient_role VARCHAR(64) NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consult_case_id ON consult_messages(case_id);

-- -----------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- -----------------------------------------------------------------------------
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_approval_queue ENABLE ROW LEVEL SECURITY;

-- Allow anonymous and authenticated read/write for demo/application runtime
CREATE POLICY "Allow public read access for demo" ON patients FOR SELECT USING (true);
CREATE POLICY "Allow public write access for demo" ON patients FOR ALL USING (true);

CREATE POLICY "Allow public read access for demo" ON cases FOR SELECT USING (true);
CREATE POLICY "Allow public write access for demo" ON cases FOR ALL USING (true);

CREATE POLICY "Allow public read access for demo" ON outreach_attempts FOR SELECT USING (true);
CREATE POLICY "Allow public write access for demo" ON outreach_attempts FOR ALL USING (true);

CREATE POLICY "Allow public read access for demo" ON referrals FOR SELECT USING (true);
CREATE POLICY "Allow public write access for demo" ON referrals FOR ALL USING (true);

CREATE POLICY "Allow public read access for demo" ON appointments FOR SELECT USING (true);
CREATE POLICY "Allow public write access for demo" ON appointments FOR ALL USING (true);

CREATE POLICY "Allow public read access for demo" ON audit_logs FOR SELECT USING (true);
CREATE POLICY "Allow append-only access for demo" ON audit_logs FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read access for demo" ON ai_approval_queue FOR SELECT USING (true);
CREATE POLICY "Allow public write access for demo" ON ai_approval_queue FOR ALL USING (true);
