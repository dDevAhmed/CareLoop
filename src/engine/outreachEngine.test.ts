import { describe, it, expect } from 'vitest';
import { determineNextOutreachAction, recordOutreachAttempt } from './outreachEngine';
import { Case, OutreachAttempt, PathwayConfig } from '../types';

describe('CareLoop Outreach Ladder & Escalation Engine', () => {
  const genericPathwayConfig: PathwayConfig = {
    id: 'pathway-primary-care',
    name: 'Primary Care Colorectal Screening',
    nameArabic: 'فحص الرعاية الأولية',
    jurisdiction: 'Standard Jurisdiction',
    sourceRef: 'Standard Clinical Guideline',
    verified: false,
    clinicalDeadlineWorkingDays: 31,
    referralTargetPercent: 90,
    platformSlaHours: {
      ingestMaxHours: 24,
      acknowledgementMaxHours: 72,
      referralAcceptanceWorkingDays: 2,
      closureDocumentationWorkingDays: 1,
    },
    escalationLadder: [
      {
        step: 1,
        delayWorkingDays: 0,
        channel: 'SMS',
        assignedRole: 'NAVIGATOR',
        description: 'Day 0: Initial SMS notification',
      },
      {
        step: 2,
        delayWorkingDays: 3,
        channel: 'CALL',
        assignedRole: 'NAVIGATOR',
        description: 'Day 3: Interactive telephone follow-up',
      },
      {
        step: 3,
        delayWorkingDays: 7,
        channel: 'NAVIGATOR_VISIT',
        assignedRole: 'NAVIGATOR',
        description: 'Day 7: In-person navigation support',
      },
      {
        step: 4,
        delayWorkingDays: 10,
        channel: 'CLINICIAN',
        assignedRole: 'CLINICIAN',
        description: 'Day 10: Clinician peer review',
      },
    ],
    codes: {
      screeningLoinc: '14563-1',
      screeningLoincDisplay: 'FIT Stool',
      confirmatorySnomed: '73761001',
      confirmatorySnomedDisplay: 'Colonoscopy',
    },
  };

  function createTestMockCase(): Case {
    return {
      id: 'CASE-OUT-01',
      caseNumber: 'CL-SCREEN-01',
      synthetic: true,
      patientId: 'PAT-01',
      pathwayId: 'pathway-primary-care',
      currentState: 'RESULT_ISSUED',
      previousState: null,
      urgency: 'ROUTINE',
      screeningResultId: 'RES-01',
      screeningTestType: 'FIT_POSITIVE',
      screeningTestDate: '2026-08-03T08:00:00Z', // Monday
      milestones: {},
      clinicalDeadline: '2026-09-15T08:00:00Z',
      platformSlaDueDate: '2026-08-07T08:00:00Z',
      isOverdue: false,
      createdAt: '2026-08-03T08:00:00Z',
      updatedAt: '2026-08-03T08:00:00Z',
    };
  }

  it('recommends Step 1 (SMS) when no prior outreach attempts exist', () => {
    const testCase = createTestMockCase();
    const recommendation = determineNextOutreachAction(testCase, [], genericPathwayConfig, '2026-08-03T09:00:00Z');

    expect(recommendation.actionRequired).toBe(true);
    expect(recommendation.stepNumber).toBe(1);
    expect(recommendation.channel).toBe('SMS');
    expect(recommendation.assignedRole).toBe('NAVIGATOR');
  });

  it('records an outreach attempt and links barrier reason when patient hesitates', () => {
    const attempt = recordOutreachAttempt({
      caseId: 'CASE-OUT-01',
      channel: 'CALL',
      outcome: 'DECLINED',
      byRole: 'NAVIGATOR',
      byUserId: 'NAV-01',
      barrierReason: 'FEAR_ANXIETY',
      notes: 'Patient voiced intense worry regarding colonoscopy risks',
    });

    expect(attempt.channel).toBe('CALL');
    expect(attempt.outcome).toBe('DECLINED');
    expect(attempt.barrierReason).toBe('FEAR_ANXIETY');
  });

  it('escalates to Clinician immediately if an attempt outcome is DECLINED', () => {
    const testCase = createTestMockCase();
    const attempts: OutreachAttempt[] = [
      {
        id: 'OUT-1',
        caseId: testCase.id,
        channel: 'SMS',
        outcome: 'DELIVERED',
        attemptedAt: '2026-08-03T09:00:00Z',
        byRole: 'NAVIGATOR',
        byUserId: 'NAV-01',
      },
      {
        id: 'OUT-2',
        caseId: testCase.id,
        channel: 'CALL',
        outcome: 'DECLINED',
        attemptedAt: '2026-08-06T10:00:00Z',
        byRole: 'NAVIGATOR',
        byUserId: 'NAV-01',
        barrierReason: 'FEAR_ANXIETY',
      },
    ];

    const recommendation = determineNextOutreachAction(testCase, attempts, genericPathwayConfig, '2026-08-06T11:00:00Z');
    expect(recommendation.actionRequired).toBe(true);
    expect(recommendation.assignedRole).toBe('CLINICIAN');
    expect(recommendation.recommendedCaseStateTransition).toBe('ESCALATED');
  });

  it('escalates to Navigator Visit / Reconciliation if phone is WRONG_NUMBER', () => {
    const testCase = createTestMockCase();
    const attempts: OutreachAttempt[] = [
      {
        id: 'OUT-1',
        caseId: testCase.id,
        channel: 'SMS',
        outcome: 'WRONG_NUMBER',
        attemptedAt: '2026-08-03T09:00:00Z',
        byRole: 'NAVIGATOR',
        byUserId: 'NAV-01',
      },
    ];

    const recommendation = determineNextOutreachAction(testCase, attempts, genericPathwayConfig, '2026-08-03T10:00:00Z');
    expect(recommendation.actionRequired).toBe(true);
    expect(recommendation.channel).toBe('NAVIGATOR_VISIT');
    expect(recommendation.recommendedCaseStateTransition).toBe('ESCALATED');
  });

  it('stops escalation ladder when case is ACKNOWLEDGED', () => {
    const testCase = createTestMockCase();
    testCase.milestones.acknowledgedAt = '2026-08-04T12:00:00Z';

    const recommendation = determineNextOutreachAction(testCase, [], genericPathwayConfig, '2026-08-05T09:00:00Z');
    expect(recommendation.actionRequired).toBe(false);
  });
});
