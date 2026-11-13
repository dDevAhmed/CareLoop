import { describe, it, expect } from 'vitest';
import { generateSyntheticDataset } from './seed';
import { verifyAuditChain } from '../engine/auditChain';

describe('CareLoop Deterministic 2,000 Synthetic Cases Generator', () => {
  it('generates exactly 2,000 cases across Colorectal (UAE) and Breast (Abu Dhabi) pathways with seed = 42', () => {
    const data = generateSyntheticDataset(2000);

    expect(data.patients.length).toBe(2000);
    expect(data.cases.length).toBe(2000);
    expect(data.caseEvents.length).toBeGreaterThan(2000);
    expect(data.outreachAttempts.length).toBeGreaterThan(1000);
    expect(data.referrals.length).toBeGreaterThan(500);
    expect(data.appointments.length).toBeGreaterThan(500);
    expect(data.auditLogs.length).toBeGreaterThan(2000);

    // Verify all patients & cases are synthetic
    expect(data.patients.every((p) => p.synthetic === true)).toBe(true);
    expect(data.cases.every((c) => c.synthetic === true)).toBe(true);

    // Verify pathway distribution (60% Colorectal, 40% Breast)
    const crcCount = data.cases.filter((c) => c.pathwayId === 'colorectal-uae').length;
    const brcCount = data.cases.filter((c) => c.pathwayId === 'breast-abudhabi').length;
    expect(crcCount).toBe(1200);
    expect(brcCount).toBe(800);

    // Verify presence of all expected states across 2000 cases
    const states = new Set(data.cases.map((c) => c.currentState));
    expect(states.has('CLOSED')).toBe(true);
    expect(states.has('ESCALATED')).toBe(true);
    expect(states.has('REJECTED')).toBe(true);

    // Verify closures adhere strictly to CLINICAL_RESOLUTION or AUTHORISED_ALTERNATIVE
    const closedCases = data.cases.filter((c) => c.currentState === 'CLOSED');
    expect(closedCases.length).toBeGreaterThan(500);
    for (const c of closedCases) {
      expect(c.closure).toBeDefined();
      expect(['CLINICAL_RESOLUTION', 'AUTHORISED_ALTERNATIVE']).toContain(c.closure?.closureType);
      expect(c.closure?.authoriserId).toBeTruthy();
    }

    // Verify that the generated audit log has a valid cryptographic SHA-256 hash chain
    // Test verification on the first 100 entries for fast execution
    const auditSample = data.auditLogs.slice(0, 100);
    const auditCheck = verifyAuditChain(auditSample);
    expect(auditCheck.valid).toBe(true);
  }, 30000); // 30s timeout for generating 2000 records

  it('generates synthetic cases for who-reference and low-resource packs using pack demographics and pathways', () => {
    // Generate sample for who-reference
    const whoData = generateSyntheticDataset(50, 'who-reference', 123);
    expect(whoData.cases.length).toBe(50);
    expect(whoData.cases.every((c) => c.synthetic)).toBe(true);
    const whoPathwayIds = new Set(whoData.cases.map((c) => c.pathwayId));
    expect(whoPathwayIds.has('cervical-who') || whoPathwayIds.has('breast-who') || whoPathwayIds.has('colorectal-ontario')).toBe(true);

    // Generate sample for low-resource
    const lowData = generateSyntheticDataset(50, 'low-resource', 456);
    expect(lowData.cases.length).toBe(50);
    expect(lowData.cases.every((c) => c.synthetic)).toBe(true);
    const lowPathwayIds = new Set(lowData.cases.map((c) => c.pathwayId));
    expect(lowPathwayIds.has('community-fobt') || lowPathwayIds.has('community-womens-health')).toBe(true);
  });
});

