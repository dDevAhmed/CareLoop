import {
  Case,
  OutreachAttempt,
  OutreachChannel,
  OutreachOutcome,
  UserRole,
  BarrierReason,
  PathwayConfig,
  EscalationStepConfig,
} from '../types';
import { addWorkingDays } from './slaEngine';

export interface NextOutreachRecommendation {
  actionRequired: boolean;
  stepNumber: number;
  channel: OutreachChannel;
  assignedRole: UserRole;
  description: string;
  dueDate: string;
  isOverdue: boolean;
  allAttemptsExhausted: boolean;
  recommendedCaseStateTransition?: 'ACKNOWLEDGED' | 'ESCALATED' | null;
  reason: string;
}

/**
 * Determines the next appropriate outreach step based on the pathway's escalation ladder
 * and previous outreach attempts and outcomes.
 */
export function determineNextOutreachAction(
  caseItem: Case,
  attempts: OutreachAttempt[],
  pathwayConfig: PathwayConfig,
  asOfDate: Date | string = new Date()
): NextOutreachRecommendation {
  const asOf = new Date(asOfDate);
  const ladder = pathwayConfig.escalationLadder;

  // If case is already acknowledged or past acknowledgement, no outreach ladder needed
  const isAlreadyAcknowledged =
    caseItem.milestones.acknowledgedAt !== null && caseItem.milestones.acknowledgedAt !== undefined;

  const hasAcknowledgedAttempt = attempts.some((a) => a.outcome === 'ACKNOWLEDGED');

  if (isAlreadyAcknowledged || hasAcknowledgedAttempt) {
    return {
      actionRequired: false,
      stepNumber: 0,
      channel: 'SMS',
      assignedRole: 'NAVIGATOR',
      description: 'Case has already been acknowledged by patient.',
      dueDate: '',
      isOverdue: false,
      allAttemptsExhausted: false,
      recommendedCaseStateTransition: isAlreadyAcknowledged ? null : 'ACKNOWLEDGED',
      reason: 'Patient acknowledged outreach; progression to referral/appointment triage active.',
    };
  }

  // If no attempts made yet, step 1 is required
  if (attempts.length === 0) {
    const firstStep = ladder[0] || {
      step: 1,
      delayWorkingDays: 0,
      channel: 'SMS' as OutreachChannel,
      assignedRole: 'NAVIGATOR' as UserRole,
      description: 'Initial notification',
    };

    const dueDate = addWorkingDays(caseItem.screeningTestDate, firstStep.delayWorkingDays);
    const isOverdue = asOf > dueDate;

    return {
      actionRequired: true,
      stepNumber: firstStep.step,
      channel: firstStep.channel,
      assignedRole: firstStep.assignedRole,
      description: firstStep.description,
      dueDate: dueDate.toISOString(),
      isOverdue,
      allAttemptsExhausted: false,
      reason: 'Initial outreach not yet attempted.',
    };
  }

  // Sort attempts chronologically
  const sortedAttempts = [...attempts].sort(
    (a, b) => new Date(a.attemptedAt).getTime() - new Date(b.attemptedAt).getTime()
  );
  const lastAttempt = sortedAttempts[sortedAttempts.length - 1];

  // If an attempt was declined or wrong number, immediate escalation to Navigator/Clinician
  if (lastAttempt.outcome === 'DECLINED') {
    return {
      actionRequired: true,
      stepNumber: attempts.length + 1,
      channel: 'CLINICIAN',
      assignedRole: 'CLINICIAN',
      description: 'Patient expressed hesitation or refusal; clinician peer consultation required',
      dueDate: asOf.toISOString(),
      isOverdue: true,
      allAttemptsExhausted: false,
      recommendedCaseStateTransition: 'ESCALATED',
      reason: 'Patient declined/expressed hesitation during outreach.',
    };
  }

  if (lastAttempt.outcome === 'WRONG_NUMBER') {
    return {
      actionRequired: true,
      stepNumber: attempts.length + 1,
      channel: 'NAVIGATOR_VISIT',
      assignedRole: 'NAVIGATOR',
      description: 'Invalid phone number on file; navigator demographic reconciliation required',
      dueDate: asOf.toISOString(),
      isOverdue: true,
      allAttemptsExhausted: false,
      recommendedCaseStateTransition: 'ESCALATED',
      reason: 'Demographic contact failure (wrong number).',
    };
  }

  // Determine next step from ladder
  const nextStepIndex = attempts.length;
  if (nextStepIndex < ladder.length) {
    const nextStep = ladder[nextStepIndex];
    const dueDate = addWorkingDays(caseItem.screeningTestDate, nextStep.delayWorkingDays);
    const isOverdue = asOf > dueDate;

    return {
      actionRequired: asOf >= dueDate || isOverdue,
      stepNumber: nextStep.step,
      channel: nextStep.channel,
      assignedRole: nextStep.assignedRole,
      description: nextStep.description,
      dueDate: dueDate.toISOString(),
      isOverdue,
      allAttemptsExhausted: false,
      reason: `Step ${nextStep.step} due under pathway escalation protocol.`,
    };
  }

  // All ladder steps exhausted without response
  return {
    actionRequired: true,
    stepNumber: ladder.length + 1,
    channel: 'CLINICIAN',
    assignedRole: 'CLINICIAN',
    description: 'All configured outreach attempts exhausted without acknowledgement. Authorised alternative closure or clinical escalation required.',
    dueDate: asOf.toISOString(),
    isOverdue: true,
    allAttemptsExhausted: true,
    recommendedCaseStateTransition: 'ESCALATED',
    reason: 'Configured outreach ladder exhausted without patient contact.',
  };
}

/**
 * Creates and registers a new OutreachAttempt record
 */
export function recordOutreachAttempt(params: {
  caseId: string;
  channel: OutreachChannel;
  outcome: OutreachOutcome;
  attemptedAt?: string;
  byRole: UserRole;
  byUserId: string;
  barrierReason?: BarrierReason | null;
  notes?: string;
}): OutreachAttempt {
  return {
    id: `OUT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    caseId: params.caseId,
    channel: params.channel,
    outcome: params.outcome,
    attemptedAt: params.attemptedAt || new Date().toISOString(),
    byRole: params.byRole,
    byUserId: params.byUserId,
    barrierReason: params.barrierReason || null,
    notes: params.notes,
  };
}

