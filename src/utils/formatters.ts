import { JurisdictionPack } from '../types';

/**
 * Human-readable formatters for CareLoop UI.
 * Enforces data minimization by never surfacing raw database enums to clinicians or patients.
 */

const STAGE_LABELS: Record<string, string> = {
  RESULT_ISSUED: 'Result Issued',
  PATIENT_NOTIFIED: 'Patient Notified',
  ACKNOWLEDGED: 'Acknowledged',
  CONFIRMATORY_TEST: 'Confirmatory Test',
  REFERRAL_SENT: 'Referral Sent',
  REFERRAL_ACCEPTED: 'Referral Accepted',
  APPOINTMENT_BOOKED: 'Appointment Booked',
  ATTENDED: 'Appointment Attended',
  DIAGNOSTIC_DISPOSITION_DOCUMENTED: 'Disposition Documented',
  TREATMENT_OR_SURVEILLANCE: 'Surveillance & Care',
  CLOSED: 'Case Closed',
  ESCALATED: 'Clinician Escalated',
  REJECTED: 'Facility Rejected',
};

const BARRIER_LABELS: Record<string, string> = {
  FEAR_ANXIETY: 'Procedural Fear / Anxiety',
  APPOINTMENT_UNAVAILABLE: 'No Timely Appointments',
  COMPETING_PRIORITIES: 'Work / Family Obligations',
  COST_INSURANCE: 'Insurance / Financial Impediment',
  LOW_HEALTH_LITERACY: 'Low Health Literacy',
  COMMUNICATION_FAILURE: 'Language / Communication Barrier',
  TRANSPORT: 'Transportation Difficulties',
  WORKFORCE_CAPACITY: 'Clinical Capacity Exceeded',
  UNREACHABLE: 'Unreachable via Known Contact',
  OTHER: 'Other Identified Barrier',
};

const CLOSURE_LABELS: Record<string, string> = {
  CLINICAL_RESOLUTION: 'Completed Clinical Resolution',
  AUTHORISED_ALTERNATIVE: 'Authorised Alternative Outcome',
  INFORMED_REFUSAL: 'Documented Informed Refusal',
  TRANSFERRED_CARE: 'Care Transferred to External Facility',
  DECEASED: 'Patient Deceased',
  OTHER: 'Authorised Administrative Closure',
};

/**
 * Maps any raw database token or enum to a sanitized, human-readable label.
 */
export function formatHumanLabel(rawKey: string | null | undefined, pack?: JurisdictionPack | null): string {
  if (!rawKey) return 'Not Specified';

  if (STAGE_LABELS[rawKey]) return STAGE_LABELS[rawKey];
  if (BARRIER_LABELS[rawKey]) return BARRIER_LABELS[rawKey];
  if (CLOSURE_LABELS[rawKey]) return CLOSURE_LABELS[rawKey];

  // Check if active pack has a matching patientGroupField option
  if (pack && pack.patientGroupFields) {
    for (const field of pack.patientGroupFields) {
      const matched = field.options.find((opt) => opt.id === rawKey);
      if (matched) return matched.label;
    }
  }

  // Friendly sentence/title case fallback
  return rawKey
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Formats working days SLA status into clear readable text.
 */
export function formatSlaText(workingDaysRemaining: number, isOverdue: boolean): string {
  if (isOverdue || workingDaysRemaining < 0) {
    const overdueDays = Math.abs(workingDaysRemaining) || 1;
    return `${overdueDays}d overdue`;
  }
  if (workingDaysRemaining === 0) {
    return 'Due today';
  }
  return `${workingDaysRemaining}d remaining`;
}

/**
 * Calculates a bounded SLA progress percentage (0 - 100).
 */
export function getSlaProgressPercent(workingDaysRemaining: number, targetDays: number = 31): number {
  if (workingDaysRemaining <= 0) return 100;
  const elapsed = Math.max(0, targetDays - workingDaysRemaining);
  return Math.min(100, Math.round((elapsed / targetDays) * 100));
}

