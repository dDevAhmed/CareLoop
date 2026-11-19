const fs = require('fs');
const path = require('path');

function escapeSql(str) {
  if (str === null || str === undefined) return 'NULL';
  return `'${String(str).replace(/'/g, "''")}'`;
}

function escapeJson(obj) {
  if (obj === null || obj === undefined) return "'{}'::jsonb";
  return `'${JSON.stringify(obj).replace(/'/g, "''")}'::jsonb`;
}

function exportSupabaseSql() {
  const jsonPath = path.join(process.cwd(), 'data', 'synthetic_cases_2000.json');
  if (!fs.existsSync(jsonPath)) {
    console.error('Data file not found:', jsonPath);
    return;
  }

  const raw = fs.readFileSync(jsonPath, 'utf8');
  const data = JSON.parse(raw);

  const supabaseDir = path.join(process.cwd(), 'supabase');
  if (!fs.existsSync(supabaseDir)) {
    fs.mkdirSync(supabaseDir, { recursive: true });
  }

  // 1. Export Patients (chunked by 500 for easy SQL pasting in Supabase)
  console.log(`Exporting ${data.patients.length} patients to supabase/seed_patients.sql...`);
  const patientLines = [
    '-- CareLoop Synthetic Patients Seed for Supabase\n',
    'INSERT INTO patients (id, external_patient_id, synthetic, full_name, full_name_arabic, date_of_birth, gender, language, phone, preferred_channel, consent_sms, consent_whatsapp, consent_call, consent_navigator, consent_data_sharing, consent_last_updated, nationality_group, residency_status, created_at, updated_at) VALUES\n'
  ];

  const patientValues = data.patients.map((p) => {
    return `(${escapeSql(p.id)}, ${escapeSql(p.externalPatientId)}, ${p.synthetic ? 'true' : 'false'}, ${escapeSql(p.fullName)}, ${escapeSql(p.fullNameArabic)}, ${escapeSql(p.dateOfBirth)}, ${escapeSql(p.gender)}, ${escapeSql(p.language)}, ${escapeSql(p.phone)}, ${escapeSql(p.preferredChannel || 'SMS')}, ${p.consentFlags?.smsConsent ? 'true' : 'false'}, ${p.consentFlags?.whatsappConsent ? 'true' : 'false'}, ${p.consentFlags?.callConsent ? 'true' : 'false'}, ${p.consentFlags?.navigatorOutreachConsent ? 'true' : 'false'}, ${p.consentFlags?.dataSharingConsent ? 'true' : 'false'}, ${escapeSql(p.consentFlags?.lastUpdated || new Date().toISOString())}, ${escapeSql(p.nationalityGroup)}, ${escapeSql(p.residencyStatus)}, ${escapeSql(p.createdAt || new Date().toISOString())}, ${escapeSql(p.updatedAt || new Date().toISOString())})`;
  });

  fs.writeFileSync(
    path.join(supabaseDir, 'seed_patients.sql'),
    patientLines.join('') + patientValues.join(',\n') + '\nON CONFLICT (id) DO NOTHING;\n'
  );

  // 2. Export Cases
  console.log(`Exporting ${data.cases.length} cases to supabase/seed_cases.sql...`);
  const caseLines = [
    '-- CareLoop Synthetic Cases Seed for Supabase\n',
    'INSERT INTO cases (id, case_number, patient_id, pathway_id, pack_id, current_state, urgency, is_overdue, screening_result_id, screening_test_date, screening_test_type, quantitative_result, quantitative_unit, qualitative_result, clinical_deadline, sla_working_days_remaining, primary_owner_id, primary_owner_role, result_issued_at, patient_notified_at, acknowledged_at, referral_created_at, referral_accepted_at, appointment_attended_at, closed_at, closure_type, closure_reason, created_at, updated_at) VALUES\n'
  ];

  const caseValues = data.cases.map((c) => {
    return `(${escapeSql(c.id)}, ${escapeSql(c.caseNumber)}, ${escapeSql(c.patientId)}, ${escapeSql(c.pathwayId)}, ${escapeSql(c.packId || 'abu-dhabi')}, ${escapeSql(c.currentState)}, ${escapeSql(c.urgency)}, ${c.isOverdue ? 'true' : 'false'}, ${escapeSql(c.screeningResultId)}, ${escapeSql(c.screeningTestDate)}, ${escapeSql(c.screeningTestType)}, ${c.quantitativeResult !== undefined ? c.quantitativeResult : 'NULL'}, ${escapeSql(c.quantitativeUnit)}, ${escapeSql(c.qualitativeResult)}, ${escapeSql(c.clinicalDeadline)}, ${c.slaWorkingDaysRemaining !== undefined ? c.slaWorkingDaysRemaining : 'NULL'}, ${escapeSql(c.primaryOwnerId)}, ${escapeSql(c.primaryOwnerRole)}, ${escapeSql(c.milestones?.resultIssuedAt)}, ${escapeSql(c.milestones?.patientNotifiedAt)}, ${escapeSql(c.milestones?.acknowledgedAt)}, ${escapeSql(c.milestones?.referralCreatedAt)}, ${escapeSql(c.milestones?.referralAcceptedAt)}, ${escapeSql(c.milestones?.appointmentAttendedAt)}, ${escapeSql(c.milestones?.closedAt)}, ${escapeSql(c.closure?.closureType)}, ${escapeSql(c.closure?.reason)}, ${escapeSql(c.createdAt || new Date().toISOString())}, ${escapeSql(c.updatedAt || new Date().toISOString())})`;
  });

  fs.writeFileSync(
    path.join(supabaseDir, 'seed_cases.sql'),
    caseLines.join('') + caseValues.join(',\n') + '\nON CONFLICT (id) DO NOTHING;\n'
  );

  // 3. Export Outreach Attempts
  if (data.outreachAttempts && data.outreachAttempts.length > 0) {
    console.log(`Exporting ${data.outreachAttempts.length} outreach attempts to supabase/seed_outreach.sql...`);
    const outreachValues = data.outreachAttempts.map((o) => {
      return `(${escapeSql(o.id)}, ${escapeSql(o.caseId)}, ${escapeSql(o.channel)}, ${escapeSql(o.outcome)}, ${escapeSql(o.byRole)}, ${escapeSql(o.byUserId)}, ${escapeSql(o.barrierReason)}, ${escapeSql(o.notes)}, ${escapeSql(o.attemptedAt)})`;
    });

    fs.writeFileSync(
      path.join(supabaseDir, 'seed_outreach.sql'),
      '-- CareLoop Synthetic Outreach Attempts Seed\n' +
      'INSERT INTO outreach_attempts (id, case_id, channel, outcome, by_role, by_user_id, barrier_reason, notes, attempted_at) VALUES\n' +
      outreachValues.join(',\n') +
      '\nON CONFLICT (id) DO NOTHING;\n'
    );
  }

  // 4. Also generate seed_patients.csv and seed_cases.csv for Supabase CSV Uploader!
  console.log('Generating CSV files for Supabase Table Editor CSV Import...');
  const patientCsvHeader = 'id,external_patient_id,synthetic,full_name,full_name_arabic,date_of_birth,gender,language,phone,preferred_channel,nationality_group,residency_status\n';
  const patientCsvRows = data.patients.map((p) => {
    return `"${p.id}","${p.externalPatientId}",true,"${(p.fullName||'').replace(/"/g, '""')}","${(p.fullNameArabic||'').replace(/"/g, '""')}","${p.dateOfBirth}","${p.gender}","${p.language}","${p.phone}","${p.preferredChannel||'SMS'}","${p.nationalityGroup||''}","${p.residencyStatus||''}"`;
  });
  fs.writeFileSync(path.join(supabaseDir, 'seed_patients.csv'), patientCsvHeader + patientCsvRows.join('\n'));

  const caseCsvHeader = 'id,case_number,patient_id,pathway_id,pack_id,current_state,urgency,is_overdue,screening_result_id,screening_test_date,screening_test_type,quantitative_result,quantitative_unit,qualitative_result,clinical_deadline,sla_working_days_remaining\n';
  const caseCsvRows = data.cases.map((c) => {
    return `"${c.id}","${c.caseNumber}","${c.patientId}","${c.pathwayId}","${c.packId||'abu-dhabi'}","${c.currentState}","${c.urgency}",${c.isOverdue ? 'true':'false'},"${c.screeningResultId}","${c.screeningTestDate}","${c.screeningTestType}",${c.quantitativeResult !== undefined ? c.quantitativeResult : ''},"${c.quantitativeUnit||''}","${c.qualitativeResult}","${c.clinicalDeadline}",${c.slaWorkingDaysRemaining !== undefined ? c.slaWorkingDaysRemaining : ''}`;
  });
  fs.writeFileSync(path.join(supabaseDir, 'seed_cases.csv'), caseCsvHeader + caseCsvRows.join('\n'));

  console.log('SQL and CSV Seed files generated successfully in supabase/ folder!');
}

exportSupabaseSql();
