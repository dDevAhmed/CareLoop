import { describe, it, expect } from 'vitest';
import {
  computeMetricSummary,
  computeStageAttrition,
  computeBarrierCounts,
  computeDisparityAnalysis,
  getAgeBand,
} from './metricsEngine';
import { Case, Patient, OutreachAttempt, PatientGroupField } from '../types';

describe('CareLoop Pure Metrics & Health Equity Engine', () => {
  const mockPatientAr: Patient = {
    id: 'PAT-01',
    externalPatientId: 'PAT-01',
    synthetic: true,
    fullName: 'Patient One',
    fullNameArabic: 'المريض الأول',
    dateOfBirth: '1970-01-01', // ~56 years old -> 50-59
    gender: 'MALE',
    language: 'ar',
    nationalityGroup: 'GROUP_A',
    region: 'District North',
    phone: '+15551111111',
    consentFlags: {
      smsConsent: true,
      whatsappConsent: true,
      callConsent: true,
      navigatorOutreachConsent: true,
      dataSharingConsent: true,
      lastUpdated: '2026-08-01T00:00:00Z',
    },
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
  };

  const mockPatientEn: Patient = {
    id: 'PAT-02',
    externalPatientId: 'PAT-02',
    synthetic: true,
    fullName: 'Patient Two',
    dateOfBirth: '1982-05-15', // ~44 years old -> 40-49
    gender: 'MALE',
    language: 'en',
    nationalityGroup: 'GROUP_B',
    region: 'District South',
    phone: '+15552222222',
    consentFlags: {
      smsConsent: true,
      whatsappConsent: true,
      callConsent: true,
      navigatorOutreachConsent: true,
      dataSharingConsent: true,
      lastUpdated: '2026-08-01T00:00:00Z',
    },
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
  };

  it('calculates correct age bands', () => {
    const ref = new Date('2026-11-01T00:00:00Z');
    expect(getAgeBand('1990-01-01', ref)).toBe('<40');
    expect(getAgeBand('1980-01-01', ref)).toBe('40-49');
    expect(getAgeBand('1970-01-01', ref)).toBe('50-59');
    expect(getAgeBand('1960-01-01', ref)).toBe('60-69');
    expect(getAgeBand('1950-01-01', ref)).toBe('70+');
  });

  it('computes metric summaries including notification, acknowledgement, resolution, and median/P90 times', () => {
    const cases: Case[] = [
      {
        id: 'C1',
        caseNumber: 'CL-01',
        synthetic: true,
        patientId: 'PAT-01',
        pathwayId: 'pathway-standard',
        currentState: 'CLOSED',
        previousState: 'DIAGNOSTIC_DISPOSITION_DOCUMENTED',
        urgency: 'ROUTINE',
        screeningResultId: 'RES-01',
        screeningTestType: 'FIT_POSITIVE',
        screeningTestDate: '2026-08-01T00:00:00Z',
        milestones: {
          notificationDeliveredAt: '2026-08-01T08:00:00Z',
          acknowledgedAt: '2026-08-02T08:00:00Z',
          understandingConfirmedAt: '2026-08-02T08:00:00Z',
          referralCreatedAt: '2026-08-03T08:00:00Z',
          referralAcceptedAt: '2026-08-04T08:00:00Z',
          appointmentBookedAt: '2026-08-05T08:00:00Z',
          attendedAt: '2026-08-10T08:00:00Z',
          diagnosticDispositionDocumentedAt: '2026-08-11T08:00:00Z',
        },
        clinicalDeadline: '2026-09-15T00:00:00Z',
        platformSlaDueDate: '2026-08-05T00:00:00Z',
        isOverdue: false,
        closure: {
          closureType: 'CLINICAL_RESOLUTION',
          authoriserId: 'CLN-01',
          authoriserName: 'Dr. Clinician',
          authoriserRole: 'CLINICIAN',
          clinicalEvidenceRef: 'REP-01',
          closureNote: 'Resolved',
          closedAt: '2026-08-12T00:00:00Z', // 11 days
        },
        createdAt: '2026-08-01T00:00:00Z',
        updatedAt: '2026-08-12T00:00:00Z',
      },
      {
        id: 'C2',
        caseNumber: 'CL-02',
        synthetic: true,
        patientId: 'PAT-02',
        pathwayId: 'pathway-standard',
        currentState: 'CLOSED',
        previousState: 'DIAGNOSTIC_DISPOSITION_DOCUMENTED',
        urgency: 'ROUTINE',
        screeningResultId: 'RES-02',
        screeningTestType: 'FIT_POSITIVE',
        screeningTestDate: '2026-08-01T00:00:00Z',
        milestones: {
          notificationDeliveredAt: '2026-08-01T08:00:00Z',
          acknowledgedAt: '2026-08-05T08:00:00Z',
          attendedAt: '2026-08-20T08:00:00Z',
          diagnosticDispositionDocumentedAt: '2026-08-21T08:00:00Z',
        },
        clinicalDeadline: '2026-09-15T00:00:00Z',
        platformSlaDueDate: '2026-08-05T00:00:00Z',
        isOverdue: false,
        closure: {
          closureType: 'CLINICAL_RESOLUTION',
          authoriserId: 'CLN-01',
          authoriserName: 'Dr. Clinician',
          authoriserRole: 'CLINICIAN',
          clinicalEvidenceRef: 'REP-02',
          closureNote: 'Resolved',
          closedAt: '2026-08-22T00:00:00Z', // 21 days
        },
        createdAt: '2026-08-01T00:00:00Z',
        updatedAt: '2026-08-22T00:00:00Z',
      },
    ];

    const summary = computeMetricSummary(cases);
    expect(summary.totalCases).toBe(2);
    expect(summary.notificationRate).toBe(100);
    expect(summary.acknowledgementRate).toBe(100);
    expect(summary.clinicalResolutionRate).toBe(100);
    expect(summary.medianDaysToResolution).toBe(16);
    expect(summary.p90DaysToResolution).toBe(20);
  });

  it('aggregates stage-by-stage pathway attrition steps', () => {
    const cases: Case[] = [
      {
        id: 'C1',
        caseNumber: 'CL-01',
        synthetic: true,
        patientId: 'PAT-01',
        pathwayId: 'pathway-standard',
        currentState: 'RESULT_ISSUED',
        previousState: null,
        urgency: 'ROUTINE',
        screeningResultId: 'RES-01',
        screeningTestType: 'FIT_POSITIVE',
        screeningTestDate: '2026-08-01T00:00:00Z',
        milestones: {},
        clinicalDeadline: '2026-09-15T00:00:00Z',
        platformSlaDueDate: '2026-08-05T00:00:00Z',
        isOverdue: false,
        createdAt: '2026-08-01T00:00:00Z',
        updatedAt: '2026-08-01T00:00:00Z',
      },
    ];

    const funnel = computeStageAttrition(cases);
    expect(funnel.length).toBeGreaterThan(5);
    expect(funnel[0].stage).toBe('Screening Result Issued');
    expect(funnel[0].count).toBe(1);
    expect(funnel[1].count).toBe(0);
  });

  it('counts barrier reasons accurately', () => {
    const attempts: OutreachAttempt[] = [
      {
        id: 'O1',
        caseId: 'C1',
        channel: 'CALL',
        outcome: 'DECLINED',
        attemptedAt: '2026-08-01T00:00:00Z',
        byRole: 'NAVIGATOR',
        byUserId: 'NAV-01',
        barrierReason: 'FEAR_ANXIETY',
      },
      {
        id: 'O2',
        caseId: 'C2',
        channel: 'CALL',
        outcome: 'DECLINED',
        attemptedAt: '2026-08-02T00:00:00Z',
        byRole: 'NAVIGATOR',
        byUserId: 'NAV-01',
        barrierReason: 'FEAR_ANXIETY',
      },
      {
        id: 'O3',
        caseId: 'C3',
        channel: 'CALL',
        outcome: 'DECLINED',
        attemptedAt: '2026-08-03T00:00:00Z',
        byRole: 'NAVIGATOR',
        byUserId: 'NAV-01',
        barrierReason: 'COST_INSURANCE',
      },
    ];

    const counts = computeBarrierCounts(attempts);
    expect(counts.FEAR_ANXIETY).toBe(2);
    expect(counts.COST_INSURANCE).toBe(1);
    expect(counts.TRANSPORT).toBe(0);
  });

  it('strictly suppresses demographic breakdown groups with fewer than 10 cases', () => {
    const cases: Case[] = [
      {
        id: 'C1',
        caseNumber: 'CL-01',
        synthetic: true,
        patientId: 'PAT-01',
        pathwayId: 'pathway-standard',
        currentState: 'RESULT_ISSUED',
        previousState: null,
        urgency: 'ROUTINE',
        screeningResultId: 'RES-01',
        screeningTestType: 'FIT_POSITIVE',
        screeningTestDate: '2026-08-01T00:00:00Z',
        milestones: {},
        clinicalDeadline: '2026-09-15T00:00:00Z',
        platformSlaDueDate: '2026-08-05T00:00:00Z',
        isOverdue: false,
        createdAt: '2026-08-01T00:00:00Z',
        updatedAt: '2026-08-01T00:00:00Z',
      },
    ];

    const patientsMap = new Map<string, Patient>();
    patientsMap.set('PAT-01', mockPatientAr);

    const disparity = computeDisparityAnalysis(cases, patientsMap);
    const arGroup = disparity.byLanguage.find((g) => g.groupId === 'ar');
    expect(arGroup?.suppressed).toBe(true);
    expect(arGroup?.suppressionReason).toContain('sample size < 10 cases');
  });

  it('unsuppresses demographic groups when cohort reaches >= 10 cases and respects pack group fields', () => {
    const cases: Case[] = [];
    const patientsMap = new Map<string, Patient>();

    const packGroupFields: PatientGroupField[] = [
      {
        id: 'nationalityGroup',
        label: 'Demographic Cohort',
        options: [
          { id: 'GROUP_A', label: 'Cohort A' },
          { id: 'GROUP_B', label: 'Cohort B' },
        ],
      },
    ];

    for (let i = 1; i <= 15; i++) {
      const pid = `PAT-${i}`;
      patientsMap.set(pid, { ...mockPatientAr, id: pid, externalPatientId: `PAT-EXT-${i}` });
      cases.push({
        id: `CASE-${i}`,
        caseNumber: `CL-${i}`,
        synthetic: true,
        patientId: pid,
        pathwayId: 'pathway-standard',
        currentState: 'CLOSED',
        previousState: 'DIAGNOSTIC_DISPOSITION_DOCUMENTED',
        urgency: 'ROUTINE',
        screeningResultId: `RES-${i}`,
        screeningTestType: 'FIT_POSITIVE',
        screeningTestDate: '2026-08-01T00:00:00Z',
        milestones: {
          notificationDeliveredAt: '2026-08-01T08:00:00Z',
          acknowledgedAt: '2026-08-02T08:00:00Z',
          attendedAt: '2026-08-10T08:00:00Z',
        },
        clinicalDeadline: '2026-09-15T00:00:00Z',
        platformSlaDueDate: '2026-08-05T00:00:00Z',
        isOverdue: false,
        closure: {
          closureType: 'CLINICAL_RESOLUTION',
          authoriserId: 'CLN-01',
          authoriserName: 'Dr. Clinician',
          authoriserRole: 'CLINICIAN',
          clinicalEvidenceRef: `REP-${i}`,
          closureNote: 'Completed',
          closedAt: '2026-08-12T00:00:00Z',
        },
        createdAt: '2026-08-01T00:00:00Z',
        updatedAt: '2026-08-12T00:00:00Z',
      });
    }

    const disparity = computeDisparityAnalysis(cases, patientsMap, packGroupFields);
    const arGroup = disparity.byLanguage.find((g) => g.groupId === 'ar');
    expect(arGroup?.suppressed).toBe(false);
    expect(arGroup?.totalCases).toBe(15);
    expect(arGroup?.clinicalResolutionRate).toBe(100);

    const cohortGroup = disparity.byGroupField['nationalityGroup']?.find((g) => g.groupId === 'GROUP_A');
    expect(cohortGroup?.totalCases).toBe(15);
    expect(cohortGroup?.groupLabel).toBe('Cohort A');
  });
});
