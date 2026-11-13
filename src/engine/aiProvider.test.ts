import { describe, it, expect } from 'vitest';
import { MockAiProvider, createApprovalQueueItem, approveQueueItem, rejectQueueItem } from './aiProvider';
import { Case, Patient } from '../types';

describe('CareLoop AI Provider & Human Approval Queue Governance', () => {
  const provider = new MockAiProvider();

  const mockPatientAr: Patient = {
    id: 'PAT-AI-01',
    externalPatientId: 'PAT-AI-EXT-01',
    synthetic: true,
    fullName: 'Sultan Al-Dhaheri',
    fullNameArabic: 'سلطان الظاهري',
    dateOfBirth: '1974-06-20',
    gender: 'MALE',
    language: 'ar',
    nationalityGroup: 'CITIZEN',
    region: 'Central District',
    phone: '+15551230000',
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

  const mockCase: Case = {
    id: 'CASE-AI-01',
    caseNumber: 'CL-SCREEN-999',
    synthetic: true,
    patientId: mockPatientAr.id,
    patient: mockPatientAr,
    pathwayId: 'pathway-colorectal-screening',
    currentState: 'RESULT_ISSUED',
    previousState: null,
    urgency: 'ROUTINE',
    screeningResultId: 'RES-AI-01',
    screeningTestType: 'FIT_POSITIVE',
    screeningTestDate: '2026-08-01T00:00:00Z',
    milestones: {},
    clinicalDeadline: '2026-09-15T00:00:00Z',
    platformSlaDueDate: '2026-08-05T00:00:00Z',
    isOverdue: false,
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
  };

  it('generates culturally nuanced, bilingual mock notifications without external outbound network calls', async () => {
    const draftAr = await provider.generateDraftNotification({
      patient: mockPatientAr,
      caseItem: mockCase,
      language: 'ar',
      organizationName: 'Screening Programme',
    });

    expect(draftAr.draftText).toContain('سلطان الظاهري');
    expect(draftAr.draftText).toContain('القولون والمستقيم');
    expect(draftAr.confidenceScore).toBeGreaterThan(0.9);

    const draftEn = await provider.generateDraftNotification({
      patient: mockPatientAr,
      caseItem: mockCase,
      language: 'en',
      organizationName: 'Screening Programme',
    });

    expect(draftEn.draftText).toContain('Sultan Al-Dhaheri');
    expect(draftEn.draftText).toContain('colorectal screening test');
  });

  it('enforces mandatory human-in-the-loop review before any notification is dispatched to patient', () => {
    const queueItem = createApprovalQueueItem({
      caseId: mockCase.id,
      patientId: mockPatientAr.id,
      draftText: 'Draft communication awaiting clinical review',
      modelIdentifier: provider.name,
      language: 'ar',
    });

    expect(queueItem.status).toBe('PENDING_REVIEW');
    expect(queueItem.sentAt).toBeNull();
    expect(queueItem.reviewerId).toBeNull();

    const approved = approveQueueItem(queueItem, 'CLN-01', 'CLINICIAN', {
      modifiedContent: 'Clinical supervisor reviewed and customized communication text.',
      reviewNotes: 'Verified patient language suitability.',
    });

    expect(approved.status).toBe('MODIFIED_AND_APPROVED');
    expect(approved.reviewerId).toBe('CLN-01');
    expect(approved.reviewerRole).toBe('CLINICIAN');
    expect(approved.sentAt).toBeTruthy();
  });

  it('supports rejecting an AI drafted notification, blocking automated transmission', () => {
    const queueItem = createApprovalQueueItem({
      caseId: mockCase.id,
      patientId: mockPatientAr.id,
      draftText: 'Inaccurate tone',
      modelIdentifier: provider.name,
      language: 'ar',
    });

    const rejected = rejectQueueItem(queueItem, 'NAV-01', 'NAVIGATOR', 'Tone too clinical; patient prefers telephone contact.');
    expect(rejected.status).toBe('REJECTED');
    expect(rejected.reviewNotes).toContain('Tone too clinical');
    expect(rejected.sentAt).toBeNull();
  });
});
