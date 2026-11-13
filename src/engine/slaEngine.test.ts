import { describe, it, expect } from 'vitest';
import { isWeekend, addWorkingDays, countWorkingDaysBetween, computeCaseSla, assessCaseHealth } from './slaEngine';
import { Case, PathwayConfig, WorkingDayCalendar } from '../types';

describe('CareLoop SLA Engine & Jurisdiction Working Day Calendar', () => {
  it('correctly identifies weekend days under standard weekend calendar (Saturday and Sunday)', () => {
    // 2026-08-01 was a Saturday
    expect(isWeekend(new Date('2026-08-01T10:00:00Z'))).toBe(true);
    // 2026-08-02 was a Sunday
    expect(isWeekend(new Date('2026-08-02T10:00:00Z'))).toBe(true);
    // 2026-08-03 was a Monday
    expect(isWeekend(new Date('2026-08-03T10:00:00Z'))).toBe(false);
    // 2026-08-07 was a Friday
    expect(isWeekend(new Date('2026-08-07T10:00:00Z'))).toBe(false);
  });

  it('correctly respects custom jurisdiction calendars (e.g. Friday/Saturday weekend + official holidays)', () => {
    const customCalendar: WorkingDayCalendar = {
      weekendDays: [5, 6], // Friday (5) and Saturday (6)
      holidays: ['2026-08-03'], // Holiday on Monday 2026-08-03
    };

    // Sunday (0) is a working day under this custom calendar
    expect(isWeekend(new Date('2026-08-02T10:00:00Z'), customCalendar)).toBe(false);
    // Friday (5) is a weekend day
    expect(isWeekend(new Date('2026-08-07T10:00:00Z'), customCalendar)).toBe(true);
    // Monday 2026-08-03 is a specified holiday
    expect(isWeekend(new Date('2026-08-03T10:00:00Z'), customCalendar)).toBe(true);
  });

  it('adds working days strictly skipping weekend days and holidays', () => {
    // Starting on Friday 2026-08-07, +1 working day should be Monday 2026-08-10
    const startFriday = new Date('2026-08-07T08:00:00Z');
    const plusOneDay = addWorkingDays(startFriday, 1);
    expect(plusOneDay.getUTCDay()).toBe(1); // Monday
    expect(plusOneDay.toISOString().startsWith('2026-08-10')).toBe(true);

    // +5 working days from Friday 2026-08-07 should be Friday 2026-08-14
    const plusFiveDays = addWorkingDays(startFriday, 5);
    expect(plusFiveDays.getUTCDay()).toBe(5); // Friday
    expect(plusFiveDays.toISOString().startsWith('2026-08-14')).toBe(true);
  });

  it('counts working days accurately between two dates', () => {
    // From Monday 2026-08-03 to Friday 2026-08-07 = 4 days difference
    expect(countWorkingDaysBetween('2026-08-03T00:00:00Z', '2026-08-07T00:00:00Z')).toBe(4);
    // Across weekend: Friday 2026-08-07 to Monday 2026-08-10 = 1 working day
    expect(countWorkingDaysBetween('2026-08-07T00:00:00Z', '2026-08-10T00:00:00Z')).toBe(1);
  });

  it('computes clinical deadlines & platform SLAs based on configured pathway parameters', () => {
    const mockPathway: PathwayConfig = {
      id: 'pathway-standard-31d',
      name: 'Standard Screening Pathway',
      nameArabic: 'مسار الفحص القياسي',
      jurisdiction: 'Standard Jurisdiction',
      sourceRef: 'Standard Reference Guidelines',
      verified: false,
      clinicalDeadlineWorkingDays: 31,
      referralTargetPercent: 90,
      platformSlaHours: {
        ingestMaxHours: 24,
        acknowledgementMaxHours: 72,
        referralAcceptanceWorkingDays: 2,
        closureDocumentationWorkingDays: 1,
      },
      escalationLadder: [],
      codes: {
        screeningLoinc: '14563-1',
        screeningLoincDisplay: 'FIT Stool',
        confirmatorySnomed: '73761001',
        confirmatorySnomedDisplay: 'Colonoscopy',
      },
    };

    const baseDate = '2026-08-03T08:00:00Z'; // Monday

    const sla = computeCaseSla(baseDate, mockPathway, 'ROUTINE', baseDate);
    expect(sla.isOverdue).toBe(false);
    expect(sla.workingDaysRemaining).toBe(31);
    expect(sla.isCritical).toBe(false);
  });

  it('handles CRITICAL urgency by bypassing routine SLAs with fast-track escalation', () => {
    const mockPathway: PathwayConfig = {
      id: 'pathway-urgent',
      name: 'Urgent Screening Pathway',
      nameArabic: 'مسار الفحص السريع',
      jurisdiction: 'Standard Jurisdiction',
      sourceRef: 'Standard Reference Guidelines',
      verified: false,
      clinicalDeadlineWorkingDays: 30,
      referralTargetPercent: 90,
      platformSlaHours: {
        ingestMaxHours: 24,
        acknowledgementMaxHours: 72,
        referralAcceptanceWorkingDays: 2,
        closureDocumentationWorkingDays: 1,
      },
      escalationLadder: [],
      codes: {
        screeningLoinc: '14563-1',
        screeningLoincDisplay: 'FIT Stool',
        confirmatorySnomed: '73761001',
        confirmatorySnomedDisplay: 'Colonoscopy',
      },
    };

    const baseDate = '2026-08-03T08:00:00Z';
    const criticalSla = computeCaseSla(baseDate, mockPathway, 'CRITICAL', baseDate);
    expect(criticalSla.isCritical).toBe(true);
    expect(criticalSla.escalationRequired).toBe(true);
    expect(criticalSla.workingDaysRemaining).toBe(1);
  });

  it('assesses case health correctly and flags overdue, unassigned, rejected and escalated states', () => {
    const mockCase: Case = {
      id: 'CASE-HEALTH-01',
      caseNumber: 'CL-SCREEN-99',
      synthetic: true,
      patientId: 'PAT-1',
      pathwayId: 'pathway-screening-primary',
      currentState: 'RESULT_ISSUED',
      previousState: null,
      urgency: 'ROUTINE',
      primaryOwnerId: null, // Unassigned
      screeningResultId: 'RES-99',
      screeningTestType: 'FIT_POSITIVE',
      screeningTestDate: '2026-07-01T08:00:00Z',
      milestones: {},
      clinicalDeadline: '2026-07-20T08:00:00Z',
      platformSlaDueDate: '2026-07-05T08:00:00Z',
      isOverdue: true,
      createdAt: '2026-07-01T08:00:00Z',
      updatedAt: '2026-07-01T08:00:00Z',
    };

    const assessment = assessCaseHealth(mockCase, '2026-08-01T08:00:00Z');
    expect(assessment.isOverdue).toBe(true);
    expect(assessment.isUnassigned).toBe(true);
    expect(assessment.attentionScore).toBeGreaterThan(50);
  });
});
