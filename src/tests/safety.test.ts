import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as approveRoute } from '../app/api/ai/approval-queue/[id]/approve/route';
import { POST as rejectRoute } from '../app/api/ai/approval-queue/[id]/reject/route';
import { POST as closeCaseRoute } from '../app/api/cases/[id]/close/route';
import { POST as demoClockRoute } from '../app/api/demo-clock/route';
import { getStore } from '../services/caseRepository';
import { createApprovalQueueItem } from '../engine/aiProvider';
import { transitionCase, validateTransition, isValidTransition } from '../engine/stateMachine';
import { computeCaseSla } from '../engine/slaEngine';
import { verifyAuditChain, createAuditLogEntry, GENESIS_HASH } from '../engine/auditChain';
import { computeDisparityAnalysis } from '../engine/metricsEngine';
import { getJurisdictionPack } from '../packs';
import { Case, Patient } from '../types';

describe('CareLoop Safety Hardening & Access Control Verification', () => {
  const pack = getJurisdictionPack('abu-dhabi');
  const store = getStore('abu-dhabi');

  // 1. AI Approval Queue Safety Tests
  describe('1. AI Approve/Reject Safety Rules', () => {
    it('requires x-user-id and returns 400 when missing (no default reviewer)', async () => {
      const queueItem = createApprovalQueueItem({
        caseId: 'CASE-SAFETY-001',
        patientId: 'PAT-001',
        draftText: 'Safety test notification message',
        modelIdentifier: 'mock-model-v1',
        language: 'en',
        clinicalFacts: 'FIT positive',
      });
      store.aiQueue.set(queueItem.id, queueItem);

      // Missing x-user-id
      const req = new NextRequest('http://localhost/api/ai/approval-queue/' + queueItem.id + '/approve', {
        method: 'POST',
        headers: {
          'x-user-role': 'NAVIGATOR',
          // no x-user-id
        },
        body: JSON.stringify({}),
      });

      const res = await approveRoute(req, { params: Promise.resolve({ id: queueItem.id }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Reviewer ID is required');
    });

    it('requires role in {CLINICIAN, NAVIGATOR} and returns 403 for other roles', async () => {
      const queueItem = createApprovalQueueItem({
        caseId: 'CASE-SAFETY-002',
        patientId: 'PAT-002',
        draftText: 'Safety test notification message',
        modelIdentifier: 'mock-model-v1',
        language: 'en',
        clinicalFacts: 'FIT positive',
      });
      store.aiQueue.set(queueItem.id, queueItem);

      // Role is PROGRAMME_ANALYST (not allowed to approve)
      const req = new NextRequest('http://localhost/api/ai/approval-queue/' + queueItem.id + '/approve', {
        method: 'POST',
        headers: {
          'x-user-id': 'ANALYST-01',
          'x-user-role': 'PROGRAMME_ANALYST',
        },
        body: JSON.stringify({}),
      });

      const res = await approveRoute(req, { params: Promise.resolve({ id: queueItem.id }) });
      expect(res.status).toBe(403);
    });

    it('only acts on PENDING_REVIEW items, returning 409 when item is already approved', async () => {
      const queueItem = createApprovalQueueItem({
        caseId: 'CASE-SAFETY-003',
        patientId: 'PAT-003',
        draftText: 'Safety test notification message',
        modelIdentifier: 'mock-model-v1',
        language: 'en',
        clinicalFacts: 'FIT positive',
      });
      queueItem.status = 'APPROVED';
      store.aiQueue.set(queueItem.id, queueItem);

      const req = new NextRequest('http://localhost/api/ai/approval-queue/' + queueItem.id + '/approve', {
        method: 'POST',
        headers: {
          'x-user-id': 'NAV-01',
          'x-user-role': 'NAVIGATOR',
        },
        body: JSON.stringify({}),
      });

      const res = await approveRoute(req, { params: Promise.resolve({ id: queueItem.id }) });
      expect(res.status).toBe(409);
    });

    it('requires a rejection reason on reject, returning 400 when missing', async () => {
      const queueItem = createApprovalQueueItem({
        caseId: 'CASE-SAFETY-004',
        patientId: 'PAT-004',
        draftText: 'Safety test notification message',
        modelIdentifier: 'mock-model-v1',
        language: 'en',
        clinicalFacts: 'FIT positive',
      });
      store.aiQueue.set(queueItem.id, queueItem);

      const req = new NextRequest('http://localhost/api/ai/approval-queue/' + queueItem.id + '/reject', {
        method: 'POST',
        headers: {
          'x-user-id': 'CLN-01',
          'x-user-role': 'CLINICIAN',
        },
        body: JSON.stringify({}), // empty body, no reason
      });

      const res = await rejectRoute(req, { params: Promise.resolve({ id: queueItem.id }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Rejection reason is required');
    });
  });

  // 2. Closure Safety Tests (Dual Authorization & Evidence)
  describe('2. Case Closure Safety Rules', () => {
    it('requires requesterId and requester !== authoriser for AUTHORISED_ALTERNATIVE closure', async () => {
      const mockCase: Case = {
        id: 'CASE-CLOSE-TEST-001',
        caseNumber: 'CL-COL-99901',
        synthetic: true,
        patientId: 'PAT-99901',
        pathwayId: 'colorectal-uae',
        currentState: 'APPOINTMENT_BOOKED',
        urgency: 'ROUTINE',
        primaryOwnerId: 'NAV-01',
        primaryOwnerRole: 'NAVIGATOR',
        screeningResultId: 'RES-99901',
        screeningTestType: 'FIT_POSITIVE',
        screeningTestDate: '2026-10-01T09:00:00Z',
        milestones: {},
        clinicalDeadline: '2026-11-25T17:00:00Z',
        platformSlaDueDate: '2026-10-06T17:00:00Z',
        isOverdue: false,
        createdAt: '2026-10-01T09:00:00Z',
        updatedAt: '2026-10-01T09:00:00Z',
      };
      store.cases.set(mockCase.id, mockCase);

      // Attempt self-authorization where requester === authoriser
      const req = new NextRequest(`http://localhost/api/cases/${mockCase.id}/close`, {
        method: 'POST',
        headers: {
          'x-user-id': 'CLN-01',
          'x-user-role': 'CLINICIAN',
        },
        body: JSON.stringify({
          action: 'AUTHORISED_ALTERNATIVE',
          reason: 'INFORMED_REFUSAL',
          requesterId: 'CLN-01', // same as actorId!
        }),
      });

      const res = await closeCaseRoute(req, { params: Promise.resolve({ id: mockCase.id }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('requester and authoriser be different users');
    });

    it('succeeds for AUTHORISED_ALTERNATIVE when requester !== authoriser', async () => {
      const mockCase: Case = {
        id: 'CASE-CLOSE-TEST-002',
        caseNumber: 'CL-COL-99902',
        synthetic: true,
        patientId: 'PAT-99902',
        pathwayId: 'colorectal-uae',
        currentState: 'APPOINTMENT_BOOKED',
        urgency: 'ROUTINE',
        primaryOwnerId: 'NAV-01',
        primaryOwnerRole: 'NAVIGATOR',
        screeningResultId: 'RES-99902',
        screeningTestType: 'FIT_POSITIVE',
        screeningTestDate: '2026-10-01T09:00:00Z',
        milestones: {},
        clinicalDeadline: '2026-11-25T17:00:00Z',
        platformSlaDueDate: '2026-10-06T17:00:00Z',
        isOverdue: false,
        createdAt: '2026-10-01T09:00:00Z',
        updatedAt: '2026-10-01T09:00:00Z',
      };
      store.cases.set(mockCase.id, mockCase);

      // Distinct requester and authoriser
      const req = new NextRequest(`http://localhost/api/cases/${mockCase.id}/close`, {
        method: 'POST',
        headers: {
          'x-user-id': 'CLN-01',
          'x-user-role': 'CLINICIAN',
        },
        body: JSON.stringify({
          action: 'AUTHORISED_ALTERNATIVE',
          reason: 'INFORMED_REFUSAL',
          requesterId: 'NAV-01', // different from CLN-01!
          closureNote: 'Patient informed refusal documented.',
        }),
      });

      const res = await closeCaseRoute(req, { params: Promise.resolve({ id: mockCase.id }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.closure.requesterId).toBe('NAV-01');
      expect(json.closure.authoriserId).toBe('CLN-01');
    });
  });

  // 3. Fail-Closed Authentication & Admin Control Tests
  describe('3. Fail-Closed RBAC & Admin Demo Clock Restriction', () => {
    it('fails closed: returns 401 on missing or invalid x-user-role', async () => {
      const req = new NextRequest('http://localhost/api/cases/CASE-001/close', {
        method: 'POST',
        headers: {
          // missing x-user-role
          'x-user-id': 'USER-1',
        },
        body: JSON.stringify({ action: 'CLINICAL_RESOLUTION' }),
      });

      const res = await closeCaseRoute(req, { params: Promise.resolve({ id: 'CASE-001' }) });
      expect(res.status).toBe(401);
    });

    it('restricts demo-clock POST to admin demo roles, returning 403 for NAVIGATOR/PATIENT', async () => {
      const req = new NextRequest('http://localhost/api/demo-clock', {
        method: 'POST',
        headers: {
          'x-user-role': 'NAVIGATOR', // non-admin
          'x-user-id': 'NAV-01',
        },
        body: JSON.stringify({ advanceDays: 1 }),
      });

      const res = await demoClockRoute(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain('Demo clock modifications restricted to admin demo role');
    });

    it('allows demo-clock POST for ADMIN or PROGRAMME_ANALYST role', async () => {
      const req = new NextRequest('http://localhost/api/demo-clock', {
        method: 'POST',
        headers: {
          'x-user-role': 'ADMIN',
          'x-user-id': 'ADMIN-01',
        },
        body: JSON.stringify({ advanceDays: 1 }),
      });

      const res = await demoClockRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });
  });

  // 4. Clinical State Machine & Urgency Safety Invariants
  describe('4. State Machine & Urgency Safety Invariants', () => {
    it('CRITICAL urgency bypasses routine timers with expedited clinical SLA', () => {
      const pathway = pack.pathways[0];
      const screeningDate = '2026-11-01T09:00:00Z';
      const asOfDate = '2026-11-01T09:00:00Z';

      const routineSla = computeCaseSla(screeningDate, pathway as any, 'ROUTINE', asOfDate, pack.workingDayCalendar);
      const criticalSla = computeCaseSla(screeningDate, pathway as any, 'CRITICAL', asOfDate, pack.workingDayCalendar);

      expect(criticalSla.isCritical).toBe(true);
      expect(criticalSla.escalationRequired).toBe(true);
      // Critical SLA deadline is next working day (1 day) vs 30 days routine
      expect(criticalSla.workingDaysRemaining).toBeLessThanOrEqual(1);
      expect(routineSla.workingDaysRemaining).toBeGreaterThan(20);
    });

    it('prohibits premature case closure on notification, referral, or booking alone without clinical evidence or named authoriser', () => {
      const baseCase: Case = {
        id: 'CASE-SAFETY-PREMATURE',
        caseNumber: 'CL-COL-PREM',
        synthetic: true,
        patientId: 'PAT-PREM',
        pathwayId: 'colorectal-uae',
        currentState: 'PATIENT_NOTIFIED',
        urgency: 'ROUTINE',
        primaryOwnerId: 'NAV-01',
        primaryOwnerRole: 'NAVIGATOR',
        screeningResultId: 'RES-PREM',
        screeningTestType: 'FIT_POSITIVE',
        screeningTestDate: '2026-11-01T09:00:00Z',
        milestones: { notificationDeliveredAt: '2026-11-01T10:00:00Z' },
        clinicalDeadline: '2026-12-15T17:00:00Z',
        platformSlaDueDate: '2026-11-05T17:00:00Z',
        isOverdue: false,
        createdAt: '2026-11-01T09:00:00Z',
        updatedAt: '2026-11-01T09:00:00Z',
      };

      // 1. Attempting transition to CLOSED without closureDetails fails
      const noDetails = validateTransition(baseCase, {
        targetState: 'CLOSED',
        trigger: 'PREMATURE_CLOSE',
        actorId: 'CLN-01',
        actorRole: 'CLINICIAN',
      });
      expect(noDetails.valid).toBe(false);

      // 2. Attempting CLINICAL_RESOLUTION on notification alone fails (no diagnostic disposition)
      const resOnNotification = validateTransition(baseCase, {
        targetState: 'CLOSED',
        trigger: 'CLINICAL_RESOLUTION',
        actorId: 'CLN-01',
        actorRole: 'CLINICIAN',
        closureDetails: {
          closureType: 'CLINICAL_RESOLUTION',
          clinicalEvidenceRef: 'EV-123',
          closureNote: 'Premature resolution attempt',
        },
      });
      expect(resOnNotification.valid).toBe(false);
      expect(resOnNotification.reason).toContain('diagnostic disposition');

      // 3. Attempting CLINICAL_RESOLUTION on referral alone fails
      const referralCase: Case = { ...baseCase, currentState: 'REFERRAL_SENT', milestones: { referralCreatedAt: '2026-11-02T10:00:00Z' } };
      const resOnReferral = validateTransition(referralCase, {
        targetState: 'CLOSED',
        trigger: 'CLINICAL_RESOLUTION',
        actorId: 'CLN-01',
        actorRole: 'CLINICIAN',
        closureDetails: {
          closureType: 'CLINICAL_RESOLUTION',
          clinicalEvidenceRef: 'EV-123',
          closureNote: 'Premature resolution attempt',
        },
      });
      expect(resOnReferral.valid).toBe(false);

      // 4. Attempting CLINICAL_RESOLUTION on booking alone fails
      const bookingCase: Case = { ...baseCase, currentState: 'APPOINTMENT_BOOKED', milestones: { appointmentBookedAt: '2026-11-03T10:00:00Z' } };
      const resOnBooking = validateTransition(bookingCase, {
        targetState: 'CLOSED',
        trigger: 'CLINICAL_RESOLUTION',
        actorId: 'CLN-01',
        actorRole: 'CLINICIAN',
        closureDetails: {
          closureType: 'CLINICAL_RESOLUTION',
          clinicalEvidenceRef: 'EV-123',
          closureNote: 'Premature resolution attempt',
        },
      });
      expect(resOnBooking.valid).toBe(false);
    });

    it('detects tampering in cryptographic audit hash chain', () => {
      const entries = [
        createAuditLogEntry({
          sequenceNumber: 1,
          actorId: 'NAV-01',
          actorRole: 'NAVIGATOR',
          action: 'SCREENING_RESULT_INGESTED',
          resourceType: 'Case',
          resourceId: 'CASE-001',
          details: { test: 'initial' },
          prevHash: GENESIS_HASH,
          timestamp: '2026-11-01T10:00:00Z',
        }),
      ];
      entries.push(
        createAuditLogEntry({
          sequenceNumber: 2,
          actorId: 'NAV-01',
          actorRole: 'NAVIGATOR',
          action: 'PATIENT_NOTIFIED',
          resourceType: 'Case',
          resourceId: 'CASE-001',
          details: { channel: 'SMS' },
          prevHash: entries[0].hash,
          timestamp: '2026-11-01T10:05:00Z',
        })
      );

      // Verify authentic chain is valid
      expect(verifyAuditChain(entries).valid).toBe(true);

      // Tamper with entry 1
      const tampered = JSON.parse(JSON.stringify(entries));
      tampered[0].details.test = 'TAMPERED_CONTENT';
      expect(verifyAuditChain(tampered).valid).toBe(false);
    });

    it('enforces small-cell suppression (< 10) on demographic analytics', () => {
      // Create a cohort where a subgroup has fewer than 10 cases
      const mockCases: Case[] = [];
      const mockPatients: Patient[] = [];

      for (let i = 1; i <= 5; i++) {
        const patient: Patient = {
          id: `PAT-SMALL-${i}`,
          externalPatientId: `EXT-${i}`,
          synthetic: true,
          fullName: `Small Cell ${i}`,
          dateOfBirth: '1980-01-01',
          gender: 'FEMALE',
          language: 'en',
          nationalityGroup: 'SMALL_GROUP',
          residencyStatus: 'VISITOR',
          region: 'Central',
          emirate: 'Abu Dhabi',
          phone: `+1555000${i}`,
          email: `small${i}@synthetic-health.example.com`,
          consentFlags: {
            smsConsent: true,
            whatsappConsent: false,
            callConsent: true,
            navigatorOutreachConsent: true,
            dataSharingConsent: true,
            lastUpdated: '2026-11-01T00:00:00Z',
          },
          createdAt: '2026-11-01T00:00:00Z',
          updatedAt: '2026-11-01T00:00:00Z',
        };
        mockPatients.push(patient);

        mockCases.push({
          id: `CASE-SMALL-${i}`,
          caseNumber: `CL-COL-S${i}`,
          synthetic: true,
          patientId: patient.id,
          patient,
          pathwayId: 'colorectal-uae',
          currentState: 'CLOSED',
          urgency: 'ROUTINE',
          primaryOwnerId: 'NAV-01',
          primaryOwnerRole: 'NAVIGATOR',
          screeningResultId: `RES-${i}`,
          screeningTestType: 'FIT',
          screeningTestDate: '2026-11-01T00:00:00Z',
          milestones: {},
          clinicalDeadline: '2026-12-01T00:00:00Z',
          platformSlaDueDate: '2026-11-05T00:00:00Z',
          isOverdue: false,
          closure: {
            closureType: 'CLINICAL_RESOLUTION',
            authoriserId: 'CLN-01',
            authoriserName: 'Dr. Clinician',
            authoriserRole: 'CLINICIAN',
            clinicalEvidenceRef: `EV-${i}`,
            closureNote: 'Clean colonoscopy findings verified.',
            closedAt: '2026-11-10T00:00:00Z',
          },
          createdAt: '2026-11-01T00:00:00Z',
          updatedAt: '2026-11-10T00:00:00Z',
        });
      }

      const patientsMap = new Map<string, Patient>();
      for (const p of mockPatients) {
        patientsMap.set(p.id, p);
      }

      const disparity = computeDisparityAnalysis(mockCases, patientsMap);
      expect(disparity.byLanguage.length).toBeGreaterThan(0);
      const enGroup = disparity.byLanguage.find((g) => g.groupId === 'en');
      expect(enGroup).toBeDefined();
      // Subgroup has 5 cases (< 10 threshold), so suppressed must be true!
      expect(enGroup?.suppressed).toBe(true);
      expect(enGroup?.clinicalResolutionRate).toBeUndefined();
    });
  });
});
