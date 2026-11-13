import { describe, it, expect } from 'vitest';
import { transitionCase } from './stateMachine';
import { Case, Patient } from '../types';

const mockPatient: Patient = {
  id: 'PAT-001',
  externalPatientId: 'PAT-ID-100001',
  synthetic: true,
  fullName: 'Fatima Al-Mansouri',
  fullNameArabic: 'فاطمة المنصوري',
  dateOfBirth: '1975-04-12',
  gender: 'FEMALE',
  language: 'ar',
  nationalityGroup: 'CITIZEN',
  region: 'Central District',
  phone: '+15551234567',
  consentFlags: {
    smsConsent: true,
    whatsappConsent: true,
    callConsent: true,
    navigatorOutreachConsent: true,
    dataSharingConsent: true,
    lastUpdated: '2026-08-01T08:00:00Z',
  },
  createdAt: '2026-08-01T08:00:00Z',
  updatedAt: '2026-08-01T08:00:00Z',
};

function createInitialCase(): Case {
  return {
    id: 'CASE-001',
    caseNumber: 'CL-SCREEN-001',
    synthetic: true,
    patientId: 'PAT-001',
    patient: mockPatient,
    pathwayId: 'pathway-screening-primary',
    currentState: 'RESULT_ISSUED',
    previousState: null,
    urgency: 'ROUTINE',
    screeningResultId: 'RES-001',
    screeningTestType: 'FIT_POSITIVE',
    screeningTestDate: '2026-08-01T08:00:00Z',
    milestones: {},
    clinicalDeadline: '2026-09-12T08:00:00Z',
    platformSlaDueDate: '2026-08-05T08:00:00Z',
    isOverdue: false,
    closure: null,
    createdAt: '2026-08-01T08:00:00Z',
    updatedAt: '2026-08-01T08:00:00Z',
  };
}

describe('CareLoop State Machine & Closed-Loop Invariants', () => {
  it('requires an owner and records an append-only CaseEvent for every transition', () => {
    const initialCase = createInitialCase();

    const res = transitionCase(initialCase, {
      targetState: 'PATIENT_NOTIFIED',
      trigger: 'DISPATCH_BILINGUAL_SMS',
      actorId: 'NAV-01',
      actorRole: 'NAVIGATOR',
      timestamp: '2026-08-01T09:00:00Z',
    });

    expect(res.success).toBe(true);
    expect(res.updatedCase.currentState).toBe('PATIENT_NOTIFIED');
    expect(res.updatedCase.previousState).toBe('RESULT_ISSUED');
    expect(res.updatedCase.milestones.notificationDeliveredAt).toBe('2026-08-01T09:00:00Z');
    expect(res.event).toBeDefined();
    expect(res.event.fromState).toBe('RESULT_ISSUED');
    expect(res.event.toState).toBe('PATIENT_NOTIFIED');
    expect(res.event.ownerId).toBe('NAV-01');
    expect(res.event.ownerRole).toBe('NAVIGATOR');
  });

  it('progresses through the full closed-loop screening-to-care lifecycle', () => {
    let current = createInitialCase();

    // 1. RESULT_ISSUED -> PATIENT_NOTIFIED
    let res = transitionCase(current, {
      targetState: 'PATIENT_NOTIFIED',
      trigger: 'SMS_SENT',
      actorId: 'NAV-01',
      actorRole: 'NAVIGATOR',
    });
    current = res.updatedCase;
    expect(current.currentState).toBe('PATIENT_NOTIFIED');
    expect(current.milestones.notificationDeliveredAt).toBeTruthy();

    // 2. PATIENT_NOTIFIED -> ACKNOWLEDGED
    res = transitionCase(current, {
      targetState: 'ACKNOWLEDGED',
      trigger: 'PATIENT_CONFIRMED_ONLINE',
      actorId: 'NAV-01',
      actorRole: 'NAVIGATOR',
      metadata: { understandingConfirmed: true },
    });
    current = res.updatedCase;
    expect(current.currentState).toBe('ACKNOWLEDGED');
    expect(current.milestones.acknowledgedAt).toBeTruthy();
    expect(current.milestones.understandingConfirmedAt).toBeTruthy();

    // 3. ACKNOWLEDGED -> REFERRAL_SENT
    res = transitionCase(current, {
      targetState: 'REFERRAL_SENT',
      trigger: 'SPECIALIST_REFERRAL_DISPATCHED',
      actorId: 'NAV-01',
      actorRole: 'NAVIGATOR',
    });
    current = res.updatedCase;
    expect(current.currentState).toBe('REFERRAL_SENT');
    expect(current.milestones.referralCreatedAt).toBeTruthy();

    // 4. REFERRAL_SENT -> REFERRAL_ACCEPTED
    res = transitionCase(current, {
      targetState: 'REFERRAL_ACCEPTED',
      trigger: 'HOSPITAL_ACCEPTED_REFERRAL',
      actorId: 'CLN-01',
      actorRole: 'CLINICIAN',
    });
    current = res.updatedCase;
    expect(current.currentState).toBe('REFERRAL_ACCEPTED');
    expect(current.milestones.referralAcceptedAt).toBeTruthy();

    // 5. REFERRAL_ACCEPTED -> APPOINTMENT_BOOKED
    res = transitionCase(current, {
      targetState: 'APPOINTMENT_BOOKED',
      trigger: 'COLONOSCOPY_SLOT_CONFIRMED',
      actorId: 'NAV-01',
      actorRole: 'NAVIGATOR',
    });
    current = res.updatedCase;
    expect(current.currentState).toBe('APPOINTMENT_BOOKED');
    expect(current.milestones.appointmentBookedAt).toBeTruthy();

    // 6. APPOINTMENT_BOOKED -> ATTENDED
    res = transitionCase(current, {
      targetState: 'ATTENDED',
      trigger: 'PATIENT_CHECKED_IN_AND_COMPLETED',
      actorId: 'CLN-01',
      actorRole: 'CLINICIAN',
    });
    current = res.updatedCase;
    expect(current.currentState).toBe('ATTENDED');
    expect(current.milestones.attendedAt).toBeTruthy();

    // 7. ATTENDED -> DIAGNOSTIC_DISPOSITION_DOCUMENTED
    res = transitionCase(current, {
      targetState: 'DIAGNOSTIC_DISPOSITION_DOCUMENTED',
      trigger: 'PATHOLOGY_AND_ENDOSCOPY_REPORT_FILED',
      actorId: 'CLN-01',
      actorRole: 'CLINICIAN',
    });
    current = res.updatedCase;
    expect(current.currentState).toBe('DIAGNOSTIC_DISPOSITION_DOCUMENTED');
    expect(current.milestones.diagnosticDispositionDocumentedAt).toBeTruthy();

    // 8. DIAGNOSTIC_DISPOSITION_DOCUMENTED -> CLOSED (CLINICAL_RESOLUTION)
    res = transitionCase(current, {
      targetState: 'CLOSED',
      trigger: 'DIAGNOSTIC_TRIAGE_COMPLETED',
      actorId: 'CLN-01',
      actorRole: 'CLINICIAN',
      actorName: 'Dr. Clinician',
      closureDetails: {
        closureType: 'CLINICAL_RESOLUTION',
        clinicalEvidenceRef: 'PATH-REPORT-9941-BENIGN-ADENOMA',
        closureNote: 'Complete colonoscopy performed. Tubular adenoma resected with clean margins.',
      },
    });
    current = res.updatedCase;
    expect(current.currentState).toBe('CLOSED');
    expect(current.closure).toBeDefined();
    expect(current.closure?.closureType).toBe('CLINICAL_RESOLUTION');
    expect(current.closure?.clinicalEvidenceRef).toBe('PATH-REPORT-9941-BENIGN-ADENOMA');
    expect(current.closure?.authoriserRole).toBe('CLINICIAN');
  });

  it('strictly forbids closing a case without valid closure evidence or authorization', () => {
    const attendedCase = createInitialCase();
    attendedCase.currentState = 'DIAGNOSTIC_DISPOSITION_DOCUMENTED';
    attendedCase.milestones.attendedAt = '2026-08-10T08:00:00Z';
    attendedCase.milestones.diagnosticDispositionDocumentedAt = '2026-08-11T08:00:00Z';

    expect(() =>
      transitionCase(attendedCase, {
        targetState: 'CLOSED',
        trigger: 'CLOSE_WITHOUT_DETAILS',
        actorId: 'CLN-01',
        actorRole: 'CLINICIAN',
      })
    ).toThrow(/explicit closureDetails/);

    expect(() =>
      transitionCase(attendedCase, {
        targetState: 'CLOSED',
        trigger: 'CLOSE_MISSING_REF',
        actorId: 'CLN-01',
        actorRole: 'CLINICIAN',
        closureDetails: {
          closureType: 'CLINICAL_RESOLUTION',
          closureNote: 'Diagnostic test completed',
        },
      })
    ).toThrow(/clinicalEvidenceRef/);
  });

  it('never allows closing on notification, referral creation, or booking alone', () => {
    const rawCase = createInitialCase();

    expect(() =>
      transitionCase(rawCase, {
        targetState: 'CLOSED',
        trigger: 'TRY_CLOSE',
        actorId: 'NAV-01',
        actorRole: 'NAVIGATOR',
        closureDetails: {
          closureType: 'CLINICAL_RESOLUTION',
          clinicalEvidenceRef: 'SOME-REF',
          closureNote: 'Cannot close from raw result',
        },
      })
    ).toThrow();

    const bookedCase = createInitialCase();
    bookedCase.currentState = 'APPOINTMENT_BOOKED';
    bookedCase.milestones.appointmentBookedAt = '2026-08-05T08:00:00Z';

    expect(() =>
      transitionCase(bookedCase, {
        targetState: 'CLOSED',
        trigger: 'CLOSE_PREMATURELY',
        actorId: 'CLN-01',
        actorRole: 'CLINICIAN',
        closureDetails: {
          closureType: 'CLINICAL_RESOLUTION',
          clinicalEvidenceRef: 'REP-123',
          closureNote: 'Trying to close on booking alone',
        },
      })
    ).toThrow(/Cannot close via CLINICAL_RESOLUTION without a documented diagnostic disposition/);
  });

  it('permits AUTHORISED_ALTERNATIVE closure with named authoriser, reason code, and explanatory note', () => {
    const acknowledgedCase = createInitialCase();
    acknowledgedCase.currentState = 'ACKNOWLEDGED';
    acknowledgedCase.milestones.acknowledgedAt = '2026-08-02T08:00:00Z';

    const res = transitionCase(acknowledgedCase, {
      targetState: 'CLOSED',
      trigger: 'PATIENT_REFUSED_INFORMED',
      actorId: 'CLN-02',
      actorName: 'Dr. Specialist',
      actorRole: 'CLINICIAN',
      closureDetails: {
        closureType: 'AUTHORISED_ALTERNATIVE',
        authorisedReason: 'INFORMED_REFUSAL',
        closureNote: 'Patient counseled on risks of missed pathology; signed informed refusal form on file.',
      },
    });

    expect(res.success).toBe(true);
    expect(res.updatedCase.currentState).toBe('CLOSED');
    expect(res.updatedCase.closure?.closureType).toBe('AUTHORISED_ALTERNATIVE');
    expect(res.updatedCase.closure?.authorisedReason).toBe('INFORMED_REFUSAL');
    expect(res.updatedCase.closure?.authoriserId).toBe('CLN-02');
  });

  it('supports ESCALATED and REJECTED states with appropriate audit events', () => {
    const initialCase = createInitialCase();

    const escalated = transitionCase(initialCase, {
      targetState: 'ESCALATED',
      trigger: 'OVERDUE_RESPONSE_OR_CRITICAL_RED_FLAG',
      actorId: 'NAV-01',
      actorRole: 'NAVIGATOR',
      barrierReason: 'COMMUNICATION_FAILURE',
    });

    expect(escalated.updatedCase.currentState).toBe('ESCALATED');
    expect(escalated.event.barrierReason).toBe('COMMUNICATION_FAILURE');

    const resolved = transitionCase(escalated.updatedCase, {
      targetState: 'CONFIRMATORY_TEST',
      trigger: 'CLINICIAN_REVIEWED_AND_REDIRECTED',
      actorId: 'CLN-01',
      actorRole: 'CLINICIAN',
    });

    expect(resolved.updatedCase.currentState).toBe('CONFIRMATORY_TEST');
  });
});
