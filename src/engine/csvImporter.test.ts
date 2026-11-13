import { describe, it, expect } from 'vitest';
import { importScreeningResultsCsv, parseCsvText } from './csvImporter';

describe('CareLoop Batch CSV Importer for Facilities Without EHR', () => {
  it('correctly parses quoted CSV text with commas', () => {
    const raw = `external_patient_id,result_id,full_name\n"PAT-101","RES-101","Doe, Jane"`;
    const parsed = parseCsvText(raw);
    expect(parsed.length).toBe(2);
    expect(parsed[1][2]).toBe('Doe, Jane');
  });

  it('validates rows, detects duplicates on external_patient_id + result_id, and produces an import report', () => {
    const csvData = [
      'external_patient_id,result_id,full_name,date_of_birth,gender,language,nationality_group,region,phone,screening_type,screening_date,pathway_id,urgency',
      'PAT-201,RES-201,Jane Doe,1978-03-12,FEMALE,en,GROUP_A,Central District,+15551112233,FIT_POSITIVE,2026-08-01,colorectal-ontario,ROUTINE',
      'PAT-202,RES-202,Sarah Jenkins,1980-07-22,FEMALE,en,GROUP_B,Central District,+15552223344,MAMMOGRAPHY_SUSPICIOUS,2026-08-02,cervical-who,URGENT',
      // In-batch duplicate of row 1
      'PAT-201,RES-201,Jane Doe,1978-03-12,FEMALE,en,GROUP_A,Central District,+15551112233,FIT_POSITIVE,2026-08-01,colorectal-ontario,ROUTINE',
      // Invalid date row
      'PAT-203,RES-203,John Smith,INVALID_DOB,MALE,en,GROUP_A,North District,+15553334455,FIT_POSITIVE,2026-08-03,colorectal-ontario,ROUTINE',
      // Unknown pathway
      'PAT-204,RES-204,Alex Taylor,1975-01-01,MALE,en,OTHER,Central District,+15554445566,FIT_POSITIVE,2026-08-03,unknown-pathway,ROUTINE',
    ].join('\n');

    const report = importScreeningResultsCsv(csvData);

    expect(report.totalRows).toBe(5);
    expect(report.successfulCount).toBe(2);
    expect(report.duplicateCount).toBe(1);
    expect(report.invalidCount).toBe(2);
    expect(report.validRecords.length).toBe(2);

    const firstValid = report.validRecords[0];
    expect(firstValid.patient.fullName).toBe('Jane Doe');
    expect(firstValid.caseItem.screeningResultId).toBe('RES-201');
    expect(firstValid.caseItem.currentState).toBe('RESULT_ISSUED');

    // Duplicate detection check
    expect(report.duplicates[0].externalPatientId).toBe('PAT-201');
    expect(report.duplicates[0].resultId).toBe('RES-201');

    // Invalid format checks
    expect(report.errors.some((e) => e.reason.includes('Invalid date_of_birth'))).toBe(true);
    expect(report.errors.some((e) => e.reason.includes('Unknown or unconfigured pathway_id'))).toBe(true);
  });

  it('rejects duplicate pairs when checked against pre-existing records', () => {
    const existingSet = new Set<string>(['PAT-999:RES-999']);
    const csvData = [
      'external_patient_id,result_id,full_name,date_of_birth,gender,phone,screening_type,screening_date,pathway_id',
      'PAT-999,RES-999,Test Preexisting,1980-01-01,FEMALE,+15550000000,FIT_POSITIVE,2026-08-01,colorectal-ontario',
    ].join('\n');

    const report = importScreeningResultsCsv(csvData, existingSet);
    expect(report.successfulCount).toBe(0);
    expect(report.duplicateCount).toBe(1);
    expect(report.duplicates[0].externalPatientId).toBe('PAT-999');
  });
});
