import { Case, Patient, Urgency, Language, WorkingDayCalendar } from '../types';
import { computeCaseSla, DEFAULT_CALENDAR } from './slaEngine';
import { getPathwayConfig } from '../config/pathways';

export interface CsvImportRow {
  external_patient_id: string;
  result_id: string;
  full_name: string;
  full_name_arabic?: string;
  date_of_birth: string;
  gender: string;
  language?: string;
  nationality_group?: string;
  residency_status?: string;
  region?: string;
  emirate?: string;
  phone: string;
  email?: string;
  screening_type: string;
  screening_date: string;
  pathway_id: string;
  urgency?: string;
  snomed_code?: string;
  loinc_code?: string;
}

export interface CsvImportReport {
  totalRows: number;
  successfulCount: number;
  duplicateCount: number;
  invalidCount: number;
  validRecords: Array<{
    patient: Patient;
    caseItem: Case;
  }>;
  duplicates: Array<{
    rowNumber: number;
    externalPatientId: string;
    resultId: string;
  }>;
  errors: Array<{
    rowNumber: number;
    externalPatientId?: string;
    resultId?: string;
    reason: string;
  }>;
}

/**
 * Parses simple CSV content with support for quotes and commas.
 */
export function parseCsvText(csvContent: string): string[][] {
  const lines = csvContent.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const rows: string[][] = [];

  for (const line of lines) {
    const row: string[] = [];
    let insideQuotes = false;
    let field = '';

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        row.push(field.trim());
        field = '';
      } else {
        field += char;
      }
    }
    row.push(field.trim());
    rows.push(row);
  }

  return rows;
}

/**
 * Validates and imports a batch of screening results from CSV formatted data.
 */
export function importScreeningResultsCsv(
  csvContent: string,
  existingPairsSet: Set<string> = new Set(),
  options?: {
    defaultPathwayId?: string;
    defaultRegion?: string;
    calendar?: WorkingDayCalendar;
  }
): CsvImportReport {
  const rows = parseCsvText(csvContent);
  if (rows.length === 0) {
    return {
      totalRows: 0,
      successfulCount: 0,
      duplicateCount: 0,
      invalidCount: 0,
      validRecords: [],
      duplicates: [],
      errors: [{ rowNumber: 0, reason: 'CSV file is empty' }],
    };
  }

  const header = rows[0].map((h) => h.toLowerCase().trim().replace(/[\s-]/g, '_'));
  const dataRows = rows.slice(1);

  const report: CsvImportReport = {
    totalRows: dataRows.length,
    successfulCount: 0,
    duplicateCount: 0,
    invalidCount: 0,
    validRecords: [],
    duplicates: [],
    errors: [],
  };

  const seenInBatch = new Set<string>();
  const calendar = options?.calendar || DEFAULT_CALENDAR;

  for (let i = 0; i < dataRows.length; i++) {
    const rowNumber = i + 2; // 1-based, accounting for header
    const row = dataRows[i];

    const record: Record<string, string> = {};
    for (let j = 0; j < header.length; j++) {
      record[header[j]] = row[j] || '';
    }

    // Required fields validation
    const externalPatientId = record.external_patient_id?.trim();
    const resultId = record.result_id?.trim();
    const fullName = record.full_name?.trim();
    const dateOfBirth = record.date_of_birth?.trim();
    const screeningType = record.screening_type?.trim();
    const screeningDate = record.screening_date?.trim();
    const pathwayId = record.pathway_id?.trim() || options?.defaultPathwayId || '';
    const phone = record.phone?.trim();

    if (!externalPatientId) {
      report.invalidCount++;
      report.errors.push({ rowNumber, reason: 'Missing required field: external_patient_id' });
      continue;
    }

    if (!resultId) {
      report.invalidCount++;
      report.errors.push({ rowNumber, externalPatientId, reason: 'Missing required field: result_id' });
      continue;
    }

    if (!fullName) {
      report.invalidCount++;
      report.errors.push({ rowNumber, externalPatientId, resultId, reason: 'Missing required field: full_name' });
      continue;
    }

    // Date validation
    if (!screeningDate || isNaN(Date.parse(screeningDate))) {
      report.invalidCount++;
      report.errors.push({
        rowNumber,
        externalPatientId,
        resultId,
        reason: `Invalid screening_date format: '${screeningDate}'. Expected YYYY-MM-DD.`,
      });
      continue;
    }

    if (!dateOfBirth || isNaN(Date.parse(dateOfBirth))) {
      report.invalidCount++;
      report.errors.push({
        rowNumber,
        externalPatientId,
        resultId,
        reason: `Invalid date_of_birth format: '${dateOfBirth}'. Expected YYYY-MM-DD.`,
      });
      continue;
    }

    // Pathway check
    const pathwayConfig = getPathwayConfig(pathwayId);
    if (!pathwayConfig) {
      report.invalidCount++;
      report.errors.push({
        rowNumber,
        externalPatientId,
        resultId,
        reason: `Unknown or unconfigured pathway_id: '${pathwayId}'.`,
      });
      continue;
    }

    // Duplicate detection on (external_patient_id + result_id)
    const compositeKey = `${externalPatientId}:${resultId}`;
    if (seenInBatch.has(compositeKey) || existingPairsSet.has(compositeKey)) {
      report.duplicateCount++;
      report.duplicates.push({ rowNumber, externalPatientId, resultId });
      continue;
    }
    seenInBatch.add(compositeKey);

    // Format & default enums
    const genderRaw = (record.gender || 'OTHER').toUpperCase();
    const gender: 'MALE' | 'FEMALE' | 'OTHER' = ['MALE', 'FEMALE'].includes(genderRaw)
      ? (genderRaw as 'MALE' | 'FEMALE')
      : 'OTHER';

    const langRaw = (record.language || 'en').toLowerCase();
    const language: Language = langRaw;

    const demographicGroup =
      record.nationality_group?.trim() ||
      record.residency_status?.trim() ||
      record.clinic_district?.trim() ||
      'CITIZEN';

    const urgencyRaw = (record.urgency || 'ROUTINE').toUpperCase();
    const urgency: Urgency = ['URGENT', 'CRITICAL'].includes(urgencyRaw) ? (urgencyRaw as Urgency) : 'ROUTINE';

    const patientId = `PAT-SYNTH-${externalPatientId}`;
    const caseId = `CASE-${resultId}`;
    const nowIso = new Date().toISOString();

    const patientRegion = record.region || record.emirate || options?.defaultRegion || 'Central District';

    const patient: Patient = {
      id: patientId,
      externalPatientId,
      synthetic: true,
      fullName,
      fullNameArabic: record.full_name_arabic || undefined,
      dateOfBirth,
      gender,
      language,
      nationalityGroup: demographicGroup,
      region: patientRegion,
      emirate: patientRegion,
      phone: phone || '+15550000000',
      email: record.email || undefined,
      consentFlags: {
        smsConsent: true,
        whatsappConsent: true,
        callConsent: true,
        navigatorOutreachConsent: true,
        dataSharingConsent: true,
        lastUpdated: nowIso,
      },
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const sla = computeCaseSla(screeningDate, pathwayConfig, urgency, undefined, calendar);

    const caseItem: Case = {
      id: caseId,
      caseNumber: `CL-${pathwayId.substring(0, 3).toUpperCase()}-${resultId}`,
      synthetic: true,
      patientId,
      patient,
      pathwayId,
      currentState: urgency === 'CRITICAL' ? 'ESCALATED' : 'RESULT_ISSUED',
      previousState: null,
      urgency,
      screeningResultId: resultId,
      screeningTestType: screeningType || 'SCREENING_FINDING',
      screeningTestDate: screeningDate,
      snomedCode: record.snomed_code || pathwayConfig.codes.confirmatorySnomed,
      loincCode: record.loinc_code || pathwayConfig.codes.screeningLoinc,
      milestones: {
        notificationDeliveredAt: null,
        acknowledgedAt: null,
        understandingConfirmedAt: null,
        referralCreatedAt: null,
        referralAcceptedAt: null,
        appointmentBookedAt: null,
        attendedAt: null,
        diagnosticDispositionDocumentedAt: null,
      },
      clinicalDeadline: sla.clinicalDeadline,
      platformSlaDueDate: sla.platformSlaDueDate,
      isOverdue: sla.isOverdue,
      closure: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    report.successfulCount++;
    report.validRecords.push({ patient, caseItem });
  }

  return report;
}
