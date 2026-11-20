import { describe, it, expect } from 'vitest';
import { generateSyntheticDataset } from './seed';
import { verifyAuditChain } from '../engine/auditChain';

describe('CareLoop Deterministic 2,000 Synthetic Cases Generator', () => {
  it('produces byte-identical output across two independent runs with seed = 42', () => {
    const run1 = generateSyntheticDataset(100, 'abu-dhabi', 42);
    const run2 = generateSyntheticDataset(100, 'abu-dhabi', 42);
    expect(JSON.stringify(run1)).toBe(JSON.stringify(run2));
  });

  it('generates exactly 2,000 cases with realistic state mix and strict safety constraints', () => {
    const data = generateSyntheticDataset(2000, 'abu-dhabi', 42);

    expect(data.patients.length).toBe(2000);
    expect(data.cases.length).toBe(2000);
    expect(data.caseEvents.length).toBeGreaterThan(2000);
    expect(data.outreachAttempts.length).toBeGreaterThan(1000);
    expect(data.referrals.length).toBeGreaterThan(500);
    expect(data.appointments.length).toBeGreaterThan(500);
    expect(data.auditLogs.length).toBeGreaterThan(2000);

    // 1. Synthetic data hygiene: Zero real patient data, +1555 phones, example.com emails
    expect(data.patients.every((p) => p.synthetic === true)).toBe(true);
    expect(data.cases.every((c) => c.synthetic === true)).toBe(true);
    expect(data.patients.every((p) => p.phone.startsWith('+1555'))).toBe(true);
    expect(data.patients.every((p) => p.email && p.email.endsWith('@synthetic-health.example.com'))).toBe(true);

    // 2. Demographic and residency consistency
    for (const p of data.patients) {
      if ((p.nationalityGroup || '').includes('EMIRATI')) {
        expect(p.residencyStatus).toBe('CITIZEN');
        expect(p.fullNameArabic).toBeTruthy();
      } else {
        expect(['RESIDENT_VISA', 'EMPLOYMENT_VISA', 'GOLDEN_VISA', 'DEPENDENT_VISA']).toContain(p.residencyStatus);
      }
    }

    // 3. Pathway distribution (60% Colorectal, 40% Breast)
    const crcCount = data.cases.filter((c) => c.pathwayId === 'colorectal-uae').length;
    const brcCount = data.cases.filter((c) => c.pathwayId === 'breast-abudhabi').length;
    expect(crcCount).toBe(1200);
    expect(brcCount).toBe(800);

    // 4. Realistic State Mix across 2,000 cases:
    // ~50% closed (1000)
    const closedCases = data.cases.filter((c) => c.currentState === 'CLOSED');
    expect(closedCases.length).toBe(1000); // exactly 50%
    for (const c of closedCases) {
      expect(c.closure).toBeDefined();
      expect(['CLINICAL_RESOLUTION', 'AUTHORISED_ALTERNATIVE']).toContain(c.closure?.closureType);
      expect(c.closure?.authoriserId).toBeTruthy();
      if (c.closure?.closureType === 'AUTHORISED_ALTERNATIVE') {
        expect(c.closure.requesterId).toBeTruthy();
        expect(c.closure.requesterId).not.toBe(c.closure.authoriserId);
      }
    }

    // ~25% in-flight on track (500)
    const inFlightTrack = data.cases.filter(
      (c) =>
        ['PATIENT_NOTIFIED', 'ACKNOWLEDGED', 'REFERRAL_SENT', 'REFERRAL_ACCEPTED', 'APPOINTMENT_BOOKED'].includes(
          c.currentState
        ) && !c.isOverdue
    );
    expect(inFlightTrack.length).toBeGreaterThanOrEqual(450);

    // ~8% due within 7 days (160)
    const dueSoon = data.cases.filter((c) => !c.isOverdue && (c.slaWorkingDaysRemaining ?? 0) <= 7 && c.currentState !== 'CLOSED');
    expect(dueSoon.length).toBeGreaterThanOrEqual(100);

    // ~7% overdue or escalated (140)
    const overdueOrEscalated = data.cases.filter((c) => c.isOverdue || c.currentState === 'ESCALATED');
    expect(overdueOrEscalated.length).toBeGreaterThanOrEqual(140);

    // ~5% critical (100)
    const critical = data.cases.filter((c) => c.urgency === 'CRITICAL');
    expect(critical.length).toBe(100);

    // ~5% rejected (100)
    const rejected = data.cases.filter((c) => c.currentState === 'REJECTED');
    expect(rejected.length).toBe(100);

    // 5. Cryptographic audit chain verification
    const auditSample = data.auditLogs.slice(0, 100);
    const auditCheck = verifyAuditChain(auditSample);
    expect(auditCheck.valid).toBe(true);
  }, 30000);

  it('generates synthetic cases for who-reference and low-resource packs using pack demographics and pathways', () => {
    const whoData = generateSyntheticDataset(50, 'who-reference', 123);
    expect(whoData.cases.length).toBe(50);
    expect(whoData.cases.every((c) => c.synthetic)).toBe(true);
    expect(whoData.patients.every((p) => p.phone.startsWith('+1555'))).toBe(true);

    const lowData = generateSyntheticDataset(50, 'low-resource', 456);
    expect(lowData.cases.length).toBe(50);
    expect(lowData.cases.every((c) => c.synthetic)).toBe(true);
    expect(lowData.patients.every((p) => p.phone.startsWith('+1555'))).toBe(true);
  });
});
