import { Case, Patient, OutreachAttempt, UnderstandingAttempt, BarrierReason, UserRole } from '../types';
import { UnderstandingQuestion } from '../config/patientTemplates';

export interface UnderstandingEvaluationResult {
  passed: boolean;
  score: number;
  total: number;
  incorrectIndices: number[];
}

/**
 * Pure evaluation of patient answers against template questions.
 */
export function evaluateUnderstandingScore(
  questions: UnderstandingQuestion[],
  userAnswers: number[]
): UnderstandingEvaluationResult {
  let score = 0;
  const incorrectIndices: number[] = [];

  for (let i = 0; i < questions.length; i++) {
    if (userAnswers[i] === questions[i].correctIndex) {
      score++;
    } else {
      incorrectIndices.push(i);
    }
  }

  const total = questions.length;
  const passed = score === total;

  return {
    passed,
    score,
    total,
    incorrectIndices,
  };
}

export interface ProcessUnderstandingResult {
  attempt: UnderstandingAttempt;
  passed: boolean;
  attemptNumber: number;
  navigatorCallTaskCreated: boolean;
  barrierReason?: BarrierReason;
  newOutreachAttempt?: OutreachAttempt;
  caseUpdated: boolean;
}

/**
 * Handles patient understanding check logic:
 * - Attempt 1 fail: returns simplified wording requirement
 * - Attempt 2 fail: creates a navigator CALL task and records COMMUNICATION_FAILURE / LOW_HEALTH_LITERACY barrier
 * - Pass: marks understandingConfirmedAt on Case milestones
 */
export function processUnderstandingSubmission(
  caseItem: Case,
  _patient: Patient,
  questions: UnderstandingQuestion[],
  userAnswers: number[],
  timestamp: string
): ProcessUnderstandingResult {
  const evalResult = evaluateUnderstandingScore(questions, userAnswers);
  const existingAttempts = caseItem.understandingAttempts || [];
  const attemptNumber = existingAttempts.length + 1;

  const attempt: UnderstandingAttempt = {
    id: `UND-${caseItem.id}-ATT-${attemptNumber}`,
    caseId: caseItem.id,
    attemptNumber,
    answers: [...userAnswers],
    score: evalResult.score,
    totalQuestions: evalResult.total,
    passed: evalResult.passed,
    timestamp,
  };

  if (!caseItem.understandingAttempts) {
    caseItem.understandingAttempts = [];
  }
  caseItem.understandingAttempts.push(attempt);

  let navigatorCallTaskCreated = false;
  let barrierReason: BarrierReason | undefined;
  let newOutreachAttempt: OutreachAttempt | undefined;

  if (evalResult.passed) {
    caseItem.milestones.understandingConfirmedAt = timestamp;
  } else if (attemptNumber >= 2) {
    // Second failure: automatically creates a navigator CALL task with barrier reason
    navigatorCallTaskCreated = true;
    barrierReason = 'COMMUNICATION_FAILURE';

    newOutreachAttempt = {
      id: `ATT-NAV-CALL-${caseItem.id}-${Date.now()}`,
      caseId: caseItem.id,
      channel: 'CALL',
      outcome: 'NO_ANSWER', // Pending navigator phone call completion
      attemptedAt: timestamp,
      byRole: 'NAVIGATOR' as UserRole,
      byUserId: caseItem.primaryOwnerId || 'NAV-DISPATCH-01',
      barrierReason: 'COMMUNICATION_FAILURE',
      notes: 'Patient failed understanding check twice. Assigned high-priority phone call navigation to explain diagnostic findings.',
    };
  }

  return {
    attempt,
    passed: evalResult.passed,
    attemptNumber,
    navigatorCallTaskCreated,
    barrierReason,
    newOutreachAttempt,
    caseUpdated: true,
  };
}

