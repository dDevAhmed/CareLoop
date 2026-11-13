import { Case, CaseState, UserRole } from '../types';

export interface PitchStep {
  stepIndex: number;
  title: string;
  stage: CaseState;
  presenterPrompt: string;
  technicalAction: string;
  caseSnapshot: Partial<Case>;
}

export const PITCH_STEPS: PitchStep[] = [
  {
    stepIndex: 0,
    title: '1. Positive FIT Result Ingested',
    stage: 'RESULT_ISSUED',
    presenterPrompt:
      'An actionable positive FIT result is received from the primary screening laboratory. The 72h patient acknowledgment window starts, and automated bilingual outreach is queued.',
    technicalAction: 'System creates Case CASE-PITCH-101 in RESULT_ISSUED state with 31-working-day clinical SLA deadline.',
    caseSnapshot: {
      id: 'case-pitch-001',
      caseNumber: 'CASE-PITCH-101',
      currentState: 'RESULT_ISSUED',
      urgency: 'ROUTINE',
      slaWorkingDaysRemaining: 31,
      isOverdue: false,
    },
  },
  {
    stepIndex: 1,
    title: '2. Patient Receives & Acknowledges Result',
    stage: 'ACKNOWLEDGED',
    presenterPrompt:
      'Patient receives the native Arabic notification and accesses the mobile Companion PWA. She taps "I have read my result", updating both delivered and acknowledged timestamps.',
    technicalAction: 'Transition to ACKNOWLEDGED with notificationDeliveredAt and acknowledgedAt set.',
    caseSnapshot: {
      currentState: 'ACKNOWLEDGED',
      slaWorkingDaysRemaining: 30,
      isOverdue: false,
    },
  },
  {
    stepIndex: 2,
    title: '3. Understanding Check Failed -> Human Escalation',
    stage: 'ACKNOWLEDGED',
    presenterPrompt:
      'Patient attempts the 3-question understanding check but fails. Rather than abandoning the patient, CareLoop detects low health literacy, halts unmonitored self-booking, and flags a priority phone task.',
    technicalAction:
      'Logged OutreachAttempt with barrierReason: LOW_HEALTH_LITERACY. Created Navigator Call Task.',
    caseSnapshot: {
      currentState: 'ACKNOWLEDGED',
      slaWorkingDaysRemaining: 29,
      isOverdue: false,
    },
  },
  {
    stepIndex: 3,
    title: '4. Navigator Voice Outreach Overcomes Barrier',
    stage: 'CONFIRMATORY_TEST',
    presenterPrompt:
      'Assigned Navigator Fatima conducts a structured telephone call in Arabic, answers questions, alleviates anxiety, and confirms patient comprehension.',
    technicalAction:
      'understandingConfirmedAt recorded. Case advances to CONFIRMATORY_TEST.',
    caseSnapshot: {
      currentState: 'CONFIRMATORY_TEST',
      slaWorkingDaysRemaining: 28,
      isOverdue: false,
    },
  },
  {
    stepIndex: 4,
    title: '5. Facility Referral Rejection Intercepted',
    stage: 'REJECTED',
    presenterPrompt:
      'Referral is dispatched to Central Endoscopy Center, which rejects due to capacity. In standard care, this referral would sit unread in an inbox; CareLoop instantly flags it as REJECTED on the triage worklist.',
    technicalAction:
      'Referral updated to status: REJECTED with rejectionReason: CLINICAL_CAPACITY_EXCEEDED. Case transitions to REJECTED.',
    caseSnapshot: {
      currentState: 'REJECTED',
      slaWorkingDaysRemaining: 26,
      isOverdue: false,
    },
  },
  {
    stepIndex: 5,
    title: '6. Navigator Reassigns -> Facility Acceptance',
    stage: 'REFERRAL_ACCEPTED',
    presenterPrompt:
      'Navigator re-triages the referral to Al Reem Diagnostic Hospital, which accepts the referral within 3 hours.',
    technicalAction:
      'Secondary referral issued and accepted. referralAcceptedAt milestone stamped.',
    caseSnapshot: {
      currentState: 'REFERRAL_ACCEPTED',
      slaWorkingDaysRemaining: 24,
      isOverdue: false,
    },
  },
  {
    stepIndex: 6,
    title: '7. Appointment Booked & Attended',
    stage: 'ATTENDED',
    presenterPrompt:
      'Diagnostic colonoscopy appointment is booked. Patient receives Arabic SMS confirmation and arrives on schedule for the procedure.',
    technicalAction:
      'appointmentBookedAt and attendedAt milestones confirmed.',
    caseSnapshot: {
      currentState: 'ATTENDED',
      slaWorkingDaysRemaining: 18,
      isOverdue: false,
    },
  },
  {
    stepIndex: 7,
    title: '8. Histology Evidence Documented',
    stage: 'DIAGNOSTIC_DISPOSITION_DOCUMENTED',
    presenterPrompt:
      'Endoscopist excises a 12mm tubular adenoma with clear margins and documents clinical disposition: 3-year surveillance colonoscopy.',
    technicalAction:
      'diagnosticDispositionDocumentedAt set with histology evidence: PATH-COL-2026-904.',
    caseSnapshot: {
      currentState: 'DIAGNOSTIC_DISPOSITION_DOCUMENTED',
      slaWorkingDaysRemaining: 14,
      isOverdue: false,
    },
  },
  {
    stepIndex: 8,
    title: '9. Clinical Resolution Closure Verified',
    stage: 'CLOSED',
    presenterPrompt:
      'Case reaches full closed-loop resolution with certified clinical evidence and append-only hash-chained audit verification. No patient left behind.',
    technicalAction:
      'Case closed with closureType: CLINICAL_RESOLUTION and immutable cryptographic audit proof.',
    caseSnapshot: {
      currentState: 'CLOSED',
      slaWorkingDaysRemaining: 14,
      isOverdue: false,
    },
  },
];

