import {
  Case,
  CaseClosure,
  CaseEvent,
  CaseState,
  UserRole,
  BarrierReason,
  AuthorisedAlternativeReason,
} from '../types';

export interface TransitionRequest {
  targetState: CaseState;
  trigger: string;
  actorId: string;
  actorRole: UserRole;
  actorName?: string;
  barrierReason?: BarrierReason;
  closureDetails?: {
    closureType: 'CLINICAL_RESOLUTION' | 'AUTHORISED_ALTERNATIVE';
    authorisedReason?: AuthorisedAlternativeReason;
    clinicalEvidenceRef?: string;
    closureNote: string;
    requesterId?: string;
    requesterName?: string;
    requesterRole?: UserRole;
  };
  metadata?: Record<string, unknown>;
  timestamp?: string; // ISO string, defaults to now
}

export interface TransitionResult {
  success: boolean;
  updatedCase: Case;
  event: CaseEvent;
  error?: string;
}

/**
 * Valid state transitions mapping
 */
const ALLOWED_TRANSITIONS: Record<CaseState, CaseState[]> = {
  RESULT_ISSUED: ['PATIENT_NOTIFIED', 'REJECTED', 'ESCALATED'],
  PATIENT_NOTIFIED: ['ACKNOWLEDGED', 'CONFIRMATORY_TEST', 'REJECTED', 'ESCALATED', 'CLOSED'],
  ACKNOWLEDGED: ['CONFIRMATORY_TEST', 'REFERRAL_SENT', 'REJECTED', 'ESCALATED', 'CLOSED'],
  CONFIRMATORY_TEST: ['REFERRAL_SENT', 'APPOINTMENT_BOOKED', 'REJECTED', 'ESCALATED', 'CLOSED'],
  REFERRAL_SENT: ['REFERRAL_ACCEPTED', 'REJECTED', 'ESCALATED', 'CLOSED'],
  REFERRAL_ACCEPTED: ['APPOINTMENT_BOOKED', 'REJECTED', 'ESCALATED', 'CLOSED'],
  APPOINTMENT_BOOKED: ['ATTENDED', 'REJECTED', 'ESCALATED', 'CLOSED'],
  ATTENDED: ['DIAGNOSTIC_DISPOSITION_DOCUMENTED', 'ESCALATED', 'CLOSED'],
  DIAGNOSTIC_DISPOSITION_DOCUMENTED: ['TREATMENT_OR_SURVEILLANCE', 'CLOSED', 'ESCALATED'],
  TREATMENT_OR_SURVEILLANCE: ['CLOSED', 'ESCALATED'],
  ESCALATED: [
    'PATIENT_NOTIFIED',
    'ACKNOWLEDGED',
    'CONFIRMATORY_TEST',
    'REFERRAL_SENT',
    'REFERRAL_ACCEPTED',
    'APPOINTMENT_BOOKED',
    'ATTENDED',
    'DIAGNOSTIC_DISPOSITION_DOCUMENTED',
    'TREATMENT_OR_SURVEILLANCE',
    'CLOSED',
    'REJECTED',
  ],
  REJECTED: ['RESULT_ISSUED', 'ESCALATED'], // Re-opening or correcting a rejected case
  CLOSED: [], // Terminal unless explicitly escalated/audited
};

/**
 * Checks if a transition between two states is structurally allowed
 */
export function isValidTransition(from: CaseState, to: CaseState): boolean {
  const allowed = ALLOWED_TRANSITIONS[from];
  return !!allowed && allowed.includes(to);
}

/**
 * Roles permitted to perform specific transitions
 */
const ROLE_PERMISSIONS: Partial<Record<CaseState, UserRole[]>> = {
  CLOSED: ['CLINICIAN', 'NAVIGATOR', 'PROGRAMME_ANALYST'],
  REJECTED: ['CLINICIAN', 'NAVIGATOR'],
  DIAGNOSTIC_DISPOSITION_DOCUMENTED: ['CLINICIAN'],
  TREATMENT_OR_SURVEILLANCE: ['CLINICIAN', 'NAVIGATOR'],
  ESCALATED: ['CLINICIAN', 'NAVIGATOR', 'PROGRAMME_ANALYST', 'PATIENT'],
};

/**
 * Validates whether a state transition is legal according to clinical & governance rules
 */
export function validateTransition(currentCase: Case, request: TransitionRequest): { valid: boolean; reason?: string } {
  const { targetState, actorRole, closureDetails } = request;
  const currentState = currentCase.currentState;

  // 1. Basic transition graph check
  const allowed = ALLOWED_TRANSITIONS[currentState];
  if (!allowed || !allowed.includes(targetState)) {
    return {
      valid: false,
      reason: `Illegal transition from ${currentState} to ${targetState}. Allowed transitions: [${(allowed || []).join(', ')}]`,
    };
  }

  // 2. Role permission check
  const requiredRoles = ROLE_PERMISSIONS[targetState];
  if (requiredRoles && !requiredRoles.includes(actorRole)) {
    return {
      valid: false,
      reason: `User with role ${actorRole} is not authorised to transition case to ${targetState}. Required roles: [${requiredRoles.join(', ')}]`,
    };
  }

  // 3. Strict Closure Invariants
  if (targetState === 'CLOSED') {
    if (!closureDetails) {
      return {
        valid: false,
        reason: 'A case can only reach CLOSED with explicit closureDetails (CLINICAL_RESOLUTION or AUTHORISED_ALTERNATIVE).',
      };
    }

    if (closureDetails.closureType === 'CLINICAL_RESOLUTION') {
      // Must have diagnostic disposition documented
      if (!currentCase.milestones.diagnosticDispositionDocumentedAt && currentState !== 'DIAGNOSTIC_DISPOSITION_DOCUMENTED') {
        return {
          valid: false,
          reason: 'Cannot close via CLINICAL_RESOLUTION without a documented diagnostic disposition (diagnosticDispositionDocumentedAt).',
        };
      }
      // Must have clinical evidence reference (e.g. lab/pathology/colonoscopy report id)
      if (!closureDetails.clinicalEvidenceRef || closureDetails.clinicalEvidenceRef.trim() === '') {
        return {
          valid: false,
          reason: 'CLINICAL_RESOLUTION requires a non-empty clinicalEvidenceRef (e.g. diagnostic report or pathology ID).',
        };
      }
    } else if (closureDetails.closureType === 'AUTHORISED_ALTERNATIVE') {
      // Must have valid authorised alternative reason
      if (!closureDetails.authorisedReason) {
        return {
          valid: false,
          reason: 'AUTHORISED_ALTERNATIVE requires an authorisedReason (INFORMED_REFUSAL, TRANSFERRED_CARE, DECEASED, UNREACHABLE_AFTER_CONFIGURED_ATTEMPTS, or OTHER).',
        };
      }
      // Must have named authoriser and explanatory note
      if (!closureDetails.closureNote || closureDetails.closureNote.trim().length < 5) {
        return {
          valid: false,
          reason: 'AUTHORISED_ALTERNATIVE requires an explanatory closureNote (minimum 5 characters).',
        };
      }
      // Requester and authoriser must be different users
      if (closureDetails.requesterId && closureDetails.requesterId === request.actorId) {
        return {
          valid: false,
          reason: 'Authorised alternative closure requires that the requester and authoriser be different users.',
        };
      }
    } else {
      return {
        valid: false,
        reason: 'Invalid closureType provided.',
      };
    }

    // Explicit invariant: Never close on notification, referral creation or booking alone!
    if (['RESULT_ISSUED'].includes(currentState)) {
      return {
        valid: false,
        reason: 'Cannot close a case directly from RESULT_ISSUED without triage or formal authorised alternative.',
      };
    }
  }

  // 4. Invariant: Cannot reach DIAGNOSTIC_DISPOSITION_DOCUMENTED unless attended
  if (targetState === 'DIAGNOSTIC_DISPOSITION_DOCUMENTED' && !currentCase.milestones.attendedAt && currentState !== 'ATTENDED') {
    return {
      valid: false,
      reason: 'Cannot document diagnostic disposition for an unattended appointment.',
    };
  }

  return { valid: true };
}

/**
 * Pure transition function: Executes a state change, updates milestones, and produces an append-only CaseEvent
 */
export function transitionCase(currentCase: Case, request: TransitionRequest): TransitionResult {
  const validation = validateTransition(currentCase, request);
  if (!validation.valid) {
    throw new Error(`Transition rejected: ${validation.reason}`);
  }

  const now = request.timestamp || new Date().toISOString();
  const eventId = `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  // Clone milestones
  const updatedMilestones = { ...currentCase.milestones };

  // Update appropriate milestones based on target state
  switch (request.targetState) {
    case 'PATIENT_NOTIFIED':
      if (!updatedMilestones.notificationDeliveredAt) {
        updatedMilestones.notificationDeliveredAt = now;
      }
      break;
    case 'ACKNOWLEDGED':
      if (!updatedMilestones.acknowledgedAt) {
        updatedMilestones.acknowledgedAt = now;
      }
      if (request.metadata?.understandingConfirmed && !updatedMilestones.understandingConfirmedAt) {
        updatedMilestones.understandingConfirmedAt = now;
      }
      break;
    case 'REFERRAL_SENT':
      if (!updatedMilestones.referralCreatedAt) {
        updatedMilestones.referralCreatedAt = now;
      }
      break;
    case 'REFERRAL_ACCEPTED':
      if (!updatedMilestones.referralAcceptedAt) {
        updatedMilestones.referralAcceptedAt = now;
      }
      break;
    case 'APPOINTMENT_BOOKED':
      if (!updatedMilestones.appointmentBookedAt) {
        updatedMilestones.appointmentBookedAt = now;
      }
      break;
    case 'ATTENDED':
      if (!updatedMilestones.attendedAt) {
        updatedMilestones.attendedAt = now;
      }
      break;
    case 'DIAGNOSTIC_DISPOSITION_DOCUMENTED':
      if (!updatedMilestones.diagnosticDispositionDocumentedAt) {
        updatedMilestones.diagnosticDispositionDocumentedAt = now;
      }
      break;
  }

  // Handle closure object
  let closure: CaseClosure | null = currentCase.closure || null;
  if (request.targetState === 'CLOSED' && request.closureDetails) {
    closure = {
      closureType: request.closureDetails.closureType,
      authorisedReason: request.closureDetails.authorisedReason || null,
      authoriserId: request.actorId,
      authoriserName: request.actorName || `User-${request.actorId}`,
      authoriserRole: request.actorRole,
      requesterId: request.closureDetails.requesterId || null,
      requesterName: request.closureDetails.requesterName || null,
      requesterRole: request.closureDetails.requesterRole || null,
      clinicalEvidenceRef: request.closureDetails.clinicalEvidenceRef || null,
      closureNote: request.closureDetails.closureNote,
      closedAt: now,
    };
  }

  const updatedCase: Case = {
    ...currentCase,
    previousState: currentCase.currentState,
    currentState: request.targetState,
    milestones: updatedMilestones,
    closure,
    primaryOwnerId: currentCase.primaryOwnerId || request.actorId,
    primaryOwnerRole: currentCase.primaryOwnerRole || request.actorRole,
    updatedAt: now,
  };

  const event: CaseEvent = {
    id: eventId,
    caseId: currentCase.id,
    fromState: currentCase.currentState,
    toState: request.targetState,
    trigger: request.trigger,
    ownerId: request.actorId,
    ownerRole: request.actorRole,
    timestamp: now,
    barrierReason: request.barrierReason || null,
    metadata: request.metadata,
  };

  return {
    success: true,
    updatedCase,
    event,
  };
}

