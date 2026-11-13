import { Case, PathwayConfig, Urgency, WorkingDayCalendar } from '../types';

export const DEFAULT_CALENDAR: WorkingDayCalendar = {
  weekendDays: [0, 6], // Sunday = 0, Saturday = 6
  holidays: [],
};

/**
 * Checks if a given Date is a non-working day (weekend or official holiday)
 * under the configured jurisdiction calendar.
 */
export function isWeekend(date: Date, calendar: WorkingDayCalendar = DEFAULT_CALENDAR): boolean {
  const day = date.getUTCDay();
  if (calendar.weekendDays.includes(day)) {
    return true;
  }

  if (calendar.holidays && calendar.holidays.length > 0) {
    const isoDate = date.toISOString().substring(0, 10);
    if (calendar.holidays.includes(isoDate)) {
      return true;
    }
  }

  return false;
}

/**
 * Adds a specific number of working days to a base date, skipping non-working days in the calendar.
 */
export function addWorkingDays(
  startDate: Date | string,
  workingDays: number,
  calendar: WorkingDayCalendar = DEFAULT_CALENDAR
): Date {
  const current = new Date(startDate);
  let added = 0;

  while (added < workingDays) {
    current.setUTCDate(current.getUTCDate() + 1);
    if (!isWeekend(current, calendar)) {
      added++;
    }
  }

  return current;
}

/**
 * Calculates working days between two dates under the specified calendar.
 */
export function countWorkingDaysBetween(
  startDate: Date | string,
  endDate: Date | string,
  calendar: WorkingDayCalendar = DEFAULT_CALENDAR
): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (end <= start) return 0;

  let count = 0;
  const cur = new Date(start);
  while (cur < end) {
    cur.setUTCDate(cur.getUTCDate() + 1);
    if (!isWeekend(cur, calendar) && cur <= end) {
      count++;
    }
  }
  return count;
}

export interface ComputedSlaDates {
  clinicalDeadline: string; // ISO string
  platformSlaDueDate: string; // ISO string
  isOverdue: boolean;
  workingDaysRemaining: number;
  unassigned: boolean;
  isCritical: boolean;
  escalationRequired: boolean;
}

/**
 * Computes clinical deadline and intermediate platform SLAs for a case.
 */
export function computeCaseSla(
  screeningDate: Date | string,
  pathwayConfig: PathwayConfig,
  urgency: Urgency,
  asOfDate: Date | string = new Date(),
  calendar: WorkingDayCalendar = DEFAULT_CALENDAR
): ComputedSlaDates {
  const baseDate = new Date(screeningDate);
  const asOf = new Date(asOfDate);

  // If urgency is CRITICAL, routine SLAs are bypassed and clinical deadline is fast-tracked
  if (urgency === 'CRITICAL') {
    const fastTrackClinicalDeadline = addWorkingDays(baseDate, 1, calendar);
    const platformSla = new Date(baseDate.getTime() + 4 * 60 * 60 * 1000);

    const isOverdue = asOf > fastTrackClinicalDeadline;
    const workingDaysRemaining = isOverdue
      ? -countWorkingDaysBetween(fastTrackClinicalDeadline, asOf, calendar)
      : countWorkingDaysBetween(asOf, fastTrackClinicalDeadline, calendar);

    return {
      clinicalDeadline: fastTrackClinicalDeadline.toISOString(),
      platformSlaDueDate: platformSla.toISOString(),
      isOverdue,
      workingDaysRemaining,
      unassigned: false,
      isCritical: true,
      escalationRequired: true,
    };
  }

  let workingDays = pathwayConfig.clinicalDeadlineWorkingDays;
  if (urgency === 'URGENT') {
    workingDays = Math.max(3, Math.floor(workingDays / 2));
  }

  const clinicalDeadline = addWorkingDays(baseDate, workingDays, calendar);

  const totalSlaHours =
    pathwayConfig.platformSlaHours.ingestMaxHours + pathwayConfig.platformSlaHours.acknowledgementMaxHours;
  const platformSlaDueDate = new Date(baseDate.getTime() + totalSlaHours * 60 * 60 * 1000);

  const isOverdue = asOf > clinicalDeadline;
  const workingDaysRemaining = isOverdue
    ? -countWorkingDaysBetween(clinicalDeadline, asOf, calendar)
    : countWorkingDaysBetween(asOf, clinicalDeadline, calendar);

  return {
    clinicalDeadline: clinicalDeadline.toISOString(),
    platformSlaDueDate: platformSlaDueDate.toISOString(),
    isOverdue,
    workingDaysRemaining,
    unassigned: false,
    isCritical: false,
    escalationRequired: isOverdue,
  };
}

export interface CaseHealthAssessment {
  caseId: string;
  currentState: string;
  isOverdue: boolean;
  isUnassigned: boolean;
  isRejected: boolean;
  isEscalated: boolean;
  clinicalDeadline: string;
  workingDaysRemaining: number;
  attentionScore: number;
}

/**
 * Assesses an individual Case or batch of Cases for operational flags.
 */
export function assessCaseHealth(
  caseItem: Case,
  asOfDate: Date | string = new Date(),
  calendar: WorkingDayCalendar = DEFAULT_CALENDAR
): CaseHealthAssessment {
  const asOf = new Date(asOfDate);
  const deadline = new Date(caseItem.clinicalDeadline);

  const isClosed = caseItem.currentState === 'CLOSED';
  const isOverdue = !isClosed && asOf > deadline;
  const isUnassigned = !isClosed && (!caseItem.primaryOwnerId || caseItem.primaryOwnerId.trim() === '');
  const isRejected = caseItem.currentState === 'REJECTED';
  const isEscalated = caseItem.currentState === 'ESCALATED' || caseItem.urgency === 'CRITICAL';

  let workingDaysRemaining = 0;
  if (!isClosed) {
    if (isOverdue) {
      workingDaysRemaining = -countWorkingDaysBetween(deadline, asOf, calendar);
    } else {
      workingDaysRemaining = countWorkingDaysBetween(asOf, deadline, calendar);
    }
  }

  let attentionScore = 0;
  if (isEscalated) attentionScore += 100;
  if (isOverdue) attentionScore += 50 + Math.abs(workingDaysRemaining) * 2;
  if (caseItem.urgency === 'CRITICAL') attentionScore += 80;
  if (caseItem.urgency === 'URGENT') attentionScore += 30;
  if (isUnassigned) attentionScore += 25;
  if (isRejected) attentionScore += 10;
  if (isClosed) attentionScore = 0;

  return {
    caseId: caseItem.id,
    currentState: caseItem.currentState,
    isOverdue,
    isUnassigned,
    isRejected,
    isEscalated,
    clinicalDeadline: caseItem.clinicalDeadline,
    workingDaysRemaining,
    attentionScore,
  };
}
