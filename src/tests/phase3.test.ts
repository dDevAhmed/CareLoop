import { describe, it, expect } from 'vitest';
import {
  runSimulationScenario,
  SIMULATION_SCENARIOS,
  EVIDENCE_EFFECT_SIZES,
} from '../services/simulationEngine';
import {
  calculateDropOffRisk,
  createApprovalQueueItem,
  approveQueueItem,
  rejectQueueItem,
  generateHandoffSummary,
} from '../engine/aiProvider';
import { PITCH_STEPS } from '../services/pitchMode';
import {
  computeMetricSummary,
  computeSevenCoreIndicators,
  computeDisparityAnalysis,
} from '../engine/metricsEngine';
import { formatHumanLabel, formatSlaText } from '../utils/formatters';
import { getJurisdictionPack } from '../packs';
import { Case, Patient, OutreachAttempt } from '../types';

describe('Phase 3: Population Analytics, Simulation Replay & Responsible AI Verification', () => {
  // 1. Simulation Replay Engine
  describe('1. Simulation Replay Engine', () => {
    it('accurately models historical Abu Dhabi 2015-16 low baseline (13.5%) vs CareLoop', () => {
      const res = runSimulationScenario('low', 2000);
      expect(res.scenario.baselineRate).toBe(0.135);
      expect(res.baseline.completionPercentage).toBe(13.5);
      expect(res.baseline.completedCount).toBe(270);
      expect(res.careLoopManaged.completedCount).toBeGreaterThan(1500);
      expect(res.delta.additionalCompletedCases).toBeGreaterThan(1200);
      expect(res.delta.daysSavedMedian).toBeGreaterThan(50);
      expect(res.disclaimer).toContain('SIMULATION NOTICE');
    });

    it('models international opportunistic (medium 57%) and organized (high 79%) scenarios', () => {
      const med = runSimulationScenario('medium', 2000);
      expect(med.baseline.completionPercentage).toBe(57);
      expect(med.careLoopManaged.completionPercentage).toBe(87.5);

      const high = runSimulationScenario('high', 2000);
      expect(high.baseline.completionPercentage).toBe(79);
      expect(high.careLoopManaged.completionPercentage).toBe(94.2);
    });

    it('parameterizes RCT effect sizes from published literature', () => {
      expect(EVIDENCE_EFFECT_SIZES.activeNavigationLift).toBe(0.085); // US RCT
      expect(EVIDENCE_EFFECT_SIZES.smsAloneLift).toBe(0.0); // Tanzania RCT
      expect(EVIDENCE_EFFECT_SIZES.telephoneNavigationLift).toBe(0.195); // Cameroon RCT
      expect(EVIDENCE_EFFECT_SIZES.multiComponentOddsRatio).toBe(3.01); // Meta-Analysis
    });
  });

  // 2. Explainable Drop-Off Risk Score
  describe('2. Explainable Drop-Off Risk Scoring Engine', () => {
    const baseCase: Case = {
      id: 'CASE-RISK-001',
      caseNumber: 'CL-COL-001',
      synthetic: true,
      patientId: 'PAT-001',
      pathwayId: 'colorectal-uae',
      currentState: 'RESULT_ISSUED',
      urgency: 'ROUTINE',
      primaryOwnerId: 'NAV-01',
      primaryOwnerRole: 'NAVIGATOR',
      screeningResultId: 'RES-001',
      screeningTestType: 'FIT_POSITIVE',
      screeningTestDate: '2026-08-01T09:00:00Z',
      milestones: {},
      clinicalDeadline: '2026-09-15T17:00:00Z',
      platformSlaDueDate: '2026-08-06T17:00:00Z',
      isOverdue: false,
      createdAt: '2026-08-01T09:00:00Z',
      updatedAt: '2026-08-01T09:00:00Z',
    };

    it('escalates risk score when notification is unacknowledged and case is overdue', () => {
      const overdueCase: Case = {
        ...baseCase,
        isOverdue: true,
        slaWorkingDaysRemaining: -5,
      };
      const score = calculateDropOffRisk(overdueCase);
      expect(score.score).toBeGreaterThanOrEqual(50);
      expect(score.topFactors.some((f) => f.factor === 'SLA_BREACH_OVERDUE')).toBe(true);
    });

    it('identifies health literacy and communication barriers from outreach history', () => {
      const attempts: OutreachAttempt[] = [
        {
          id: 'OUT-1',
          caseId: baseCase.id,
          channel: 'CALL',
          outcome: 'NO_ANSWER',
          barrierReason: 'LOW_HEALTH_LITERACY',
          attemptedAt: new Date().toISOString(),
          byRole: 'NAVIGATOR',
          byUserId: 'NAV-01',
        },
      ];

      const score = calculateDropOffRisk(baseCase, [], attempts);
      expect(score.topFactors.some((f) => f.factor === 'HEALTH_LITERACY_OR_COMMUNICATION_BARRIER')).toBe(true);
    });

    it('generates a comprehensive multidisciplinary hand-off summary', () => {
      const patient: Patient = {
        id: 'PAT-001',
        externalPatientId: 'EXT-001',
        synthetic: true,
        fullName: 'Fatima Al-Mansoor',
        dateOfBirth: '1970-05-12',
        gender: 'FEMALE',
        language: 'ar',
        phone: '+971501112233',
        consentFlags: {
          smsConsent: true,
          whatsappConsent: true,
          callConsent: true,
          navigatorOutreachConsent: true,
          dataSharingConsent: true,
          lastUpdated: '2026-08-01T09:00:00Z',
        },
        createdAt: '2026-08-01T09:00:00Z',
        updatedAt: '2026-08-01T09:00:00Z',
      };

      const summary = generateHandoffSummary(baseCase, patient);
      expect(summary).toContain('Fatima Al-Mansoor');
      expect(summary).toContain('CL-COL-001');
      expect(summary).toContain('Next Best Action');
    });
  });

  // 3. AI Safety & Approval Queue Invariants
  describe('3. Responsible AI & Approval Queue Safety', () => {
    it('creates an approval queue item and approves with clinician sign-off', () => {
      const item = createApprovalQueueItem({
        caseId: 'CASE-001',
        patientId: 'PAT-001',
        draftText: 'Draft screening notification',
        modelIdentifier: 'MockCareLoopGenAI-v1.0-Local',
        language: 'en',
      });
      expect(item.status).toBe('PENDING_REVIEW');
      expect(item.reviewerId).toBeNull();

      const approved = approveQueueItem(item, 'DR-FATIMA-01', 'CLINICIAN');
      expect(approved.status).toBe('APPROVED');
      expect(approved.reviewerId).toBe('DR-FATIMA-01');
      expect(approved.reviewerRole).toBe('CLINICIAN');
      expect(approved.reviewedAt).toBeDefined();
    });

    it('allows human modification before sign-off with audit logging', () => {
      const item = createApprovalQueueItem({
        caseId: 'CASE-002',
        patientId: 'PAT-002',
        draftText: 'Original text',
        modelIdentifier: 'MockGenAI',
        language: 'en',
      });

      const modified = approveQueueItem(item, 'DR-FATIMA-01', 'CLINICIAN', {
        modifiedContent: 'Human corrected clinical wording',
        reviewNotes: 'Adjusted for clarity and patient reassurance',
      });

      expect(modified.status).toBe('MODIFIED_AND_APPROVED');
      expect(modified.draftContent).toBe('Human corrected clinical wording');
      expect(modified.reviewNotes).toBe('Adjusted for clarity and patient reassurance');
    });

    it('rejects an item with mandatory human reason, halting automated dispatch', () => {
      const item = createApprovalQueueItem({
        caseId: 'CASE-003',
        patientId: 'PAT-003',
        draftText: 'Inappropriate draft',
        modelIdentifier: 'MockGenAI',
        language: 'en',
      });

      const rejected = rejectQueueItem(item, 'DR-FATIMA-01', 'CLINICIAN', 'Tone too clinical; patient requires phone contact');
      expect(rejected.status).toBe('REJECTED');
      expect(rejected.reviewNotes).toBe('Tone too clinical; patient requires phone contact');
      expect(rejected.sentAt).toBeNull();
    });
  });

  // 4. Pitch Mode Evaluator Script
  describe('4. Scripted Pitch Mode & Demonstrator', () => {
    it('defines all 9 sequential steps from FIT ingestion to clinical resolution closure', () => {
      expect(PITCH_STEPS.length).toBe(9);
      expect(PITCH_STEPS[0].stage).toBe('RESULT_ISSUED');
      expect(PITCH_STEPS[1].stage).toBe('ACKNOWLEDGED');
      expect(PITCH_STEPS[4].stage).toBe('REJECTED'); // Facility rejection interception
      expect(PITCH_STEPS[5].stage).toBe('REFERRAL_ACCEPTED');
      expect(PITCH_STEPS[6].stage).toBe('ATTENDED');
      expect(PITCH_STEPS[7].stage).toBe('DIAGNOSTIC_DISPOSITION_DOCUMENTED');
      expect(PITCH_STEPS[8].stage).toBe('CLOSED');

      PITCH_STEPS.forEach((step) => {
        expect(step.presenterPrompt).toBeDefined();
        expect(step.technicalAction).toBeDefined();
      });
    });
  });

  // 5. 7 Core Indicators & Small-Cell Privacy Protection
  describe('5. 7 Core Indicators & Small-Cell Suppression', () => {
    it('computes all 7 core indicators accurately', () => {
      const sampleCases: Case[] = [
        {
          id: 'C1',
          caseNumber: 'CL-001',
          synthetic: true,
          patientId: 'P1',
          pathwayId: 'colorectal-uae',
          currentState: 'CLOSED',
          urgency: 'ROUTINE',
          primaryOwnerId: 'NAV-01',
          primaryOwnerRole: 'NAVIGATOR',
          screeningResultId: 'R1',
          screeningTestType: 'FIT',
          screeningTestDate: '2026-08-01',
          milestones: {
            notificationDeliveredAt: '2026-08-01T10:00:00Z',
            acknowledgedAt: '2026-08-01T12:00:00Z',
            understandingConfirmedAt: '2026-08-01T12:30:00Z',
            referralCreatedAt: '2026-08-02T09:00:00Z',
            referralAcceptedAt: '2026-08-02T14:00:00Z',
            appointmentBookedAt: '2026-08-03T10:00:00Z',
            attendedAt: '2026-08-10T09:00:00Z',
            diagnosticDispositionDocumentedAt: '2026-08-11T11:00:00Z',
          },
          clinicalDeadline: '2026-09-10T17:00:00Z',
          platformSlaDueDate: '2026-08-06T17:00:00Z',
          isOverdue: false,
          closure: {
            closureType: 'CLINICAL_RESOLUTION',
            authoriserId: 'DR-01',
            authoriserRole: 'CLINICIAN',
            authoriserName: 'Dr. Fatima',
            closedAt: '2026-08-12T10:00:00Z',
            closureNote: 'Clean polypectomy',
          },
          createdAt: '2026-08-01',
          updatedAt: '2026-08-12',
        },
      ];

      const indicators = computeSevenCoreIndicators(sampleCases);
      expect(indicators.notificationRate).toBe(100);
      expect(indicators.acknowledgementRate).toBe(100);
      expect(indicators.referralCompletionRate).toBe(100);
      expect(indicators.appointmentAttendanceRate).toBe(100);
      expect(indicators.clinicalResolutionRate).toBe(100);
      expect(indicators.medianDaysToResolution).toBeDefined();
    });

    it('suppresses demographic subgroups with < 10 cases to protect synthetic privacy', () => {
      const rarePatients = new Map<string, Patient>();
      const rareCases: Case[] = [];

      // Generate 5 patients (under the 10 threshold)
      for (let i = 1; i <= 5; i++) {
        const p: Patient = {
          id: `P-RARE-${i}`,
          externalPatientId: `EXT-RARE-${i}`,
          synthetic: true,
          fullName: `Patient ${i}`,
          dateOfBirth: '1985-01-01',
          gender: 'FEMALE',
          language: 'fr', // French is rare in this cohort
          phone: '+971501112233',
          consentFlags: {
            smsConsent: true,
            whatsappConsent: true,
            callConsent: true,
            navigatorOutreachConsent: true,
            dataSharingConsent: true,
            lastUpdated: '2026-08-01',
          },
          createdAt: '2026-08-01',
          updatedAt: '2026-08-01',
        };
        rarePatients.set(p.id, p);

        rareCases.push({
          id: `C-RARE-${i}`,
          caseNumber: `CL-RARE-${i}`,
          synthetic: true,
          patientId: p.id,
          pathwayId: 'breast-abudhabi',
          currentState: 'RESULT_ISSUED',
          urgency: 'ROUTINE',
          primaryOwnerId: 'NAV-01',
          primaryOwnerRole: 'NAVIGATOR',
          screeningResultId: `R-${i}`,
          screeningTestType: 'MAMMO',
          screeningTestDate: '2026-08-01',
          milestones: {},
          clinicalDeadline: '2026-08-25',
          platformSlaDueDate: '2026-08-10',
          isOverdue: false,
          createdAt: '2026-08-01',
          updatedAt: '2026-08-01',
        });
      }

      const disparity = computeDisparityAnalysis(rareCases, rarePatients);
      const frGroup = disparity.byLanguage.find((g) => g.groupId === 'fr');
      expect(frGroup).toBeDefined();
      expect(frGroup?.suppressed).toBe(true);
      expect(frGroup?.suppressionReason).toContain('sample size < 10 cases');
    });
  });

  // 6. Data Minimization & Sanitization
  describe('6. Data Minimization & Pack Label Formatting', () => {
    it('formats raw database tokens into human-readable labels', () => {
      const pack = getJurisdictionPack('abu-dhabi');
      expect(formatHumanLabel('RESULT_ISSUED', pack)).toBe('Result Issued');
      expect(formatHumanLabel('CLINICAL_RESOLUTION', pack)).toBe('Completed Clinical Resolution');
      expect(formatHumanLabel('LOW_HEALTH_LITERACY', pack)).toBe('Low Health Literacy');
      expect(formatHumanLabel('EMIRATI', pack)).toBe('UAE National (Emirati)');
    });

    it('formats SLA countdown text clearly without raw enums', () => {
      expect(formatSlaText(12, false)).toBe('12d remaining');
      expect(formatSlaText(0, false)).toBe('Due today');
      expect(formatSlaText(-4, true)).toBe('4d overdue');
    });
  });
});
