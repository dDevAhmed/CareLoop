import { describe, it, expect } from 'vitest';
import { createAuditLogEntry, verifyAuditChain, GENESIS_HASH } from './auditChain';
import { AuditLogEntry } from '../types';

describe('CareLoop Cryptographic Hash-Chained Audit Trail', () => {
  it('initializes audit chain with GENESIS_HASH', () => {
    const entry1 = createAuditLogEntry({
      sequenceNumber: 1,
      actorId: 'NAV-01',
      actorRole: 'NAVIGATOR',
      action: 'NOTIFICATION_SENT',
      resourceType: 'Case',
      resourceId: 'CASE-001',
      details: { channel: 'SMS', messageId: 'MSG-99' },
    });

    expect(entry1.sequenceNumber).toBe(1);
    expect(entry1.prevHash).toBe(GENESIS_HASH);
    expect(entry1.hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('chains consecutive entries so each entry embeds the previous entry hash', () => {
    const entry1 = createAuditLogEntry({
      sequenceNumber: 1,
      actorId: 'NAV-01',
      actorRole: 'NAVIGATOR',
      action: 'CASE_CREATED',
      resourceType: 'Case',
      resourceId: 'CASE-001',
      details: { initial: true },
    });

    const entry2 = createAuditLogEntry({
      sequenceNumber: 2,
      actorId: 'NAV-01',
      actorRole: 'NAVIGATOR',
      action: 'PATIENT_NOTIFIED',
      resourceType: 'Case',
      resourceId: 'CASE-001',
      details: { channel: 'WHATSAPP' },
      prevHash: entry1.hash,
    });

    const entry3 = createAuditLogEntry({
      sequenceNumber: 3,
      actorId: 'CLN-01',
      actorRole: 'CLINICIAN',
      action: 'CLINICAL_RESOLUTION',
      resourceType: 'Case',
      resourceId: 'CASE-001',
      details: { evidenceRef: 'REPORT-1' },
      prevHash: entry2.hash,
    });

    expect(entry2.prevHash).toBe(entry1.hash);
    expect(entry3.prevHash).toBe(entry2.hash);

    const verification = verifyAuditChain([entry1, entry2, entry3]);
    expect(verification.valid).toBe(true);
  });

  it('detects tampering if any payload content or hash is modified', () => {
    const entry1 = createAuditLogEntry({
      sequenceNumber: 1,
      actorId: 'NAV-01',
      actorRole: 'NAVIGATOR',
      action: 'CASE_CREATED',
      resourceType: 'Case',
      resourceId: 'CASE-001',
      details: { value: 100 },
    });

    const entry2 = createAuditLogEntry({
      sequenceNumber: 2,
      actorId: 'NAV-01',
      actorRole: 'NAVIGATOR',
      action: 'PATIENT_NOTIFIED',
      resourceType: 'Case',
      resourceId: 'CASE-001',
      details: { value: 200 },
      prevHash: entry1.hash,
    });

    // Tamper with entry 1 details
    const tamperedEntry1: AuditLogEntry = {
      ...entry1,
      details: { value: 999 }, // Tampered
    };

    const verification = verifyAuditChain([tamperedEntry1, entry2]);
    expect(verification.valid).toBe(false);
    expect(verification.compromisedAtIndex).toBe(0);
    expect(verification.reason).toContain('Cryptographic tamper detected');
  });

  it('detects a broken hash chain link if an intermediate record is swapped or deleted', () => {
    const entry1 = createAuditLogEntry({
      sequenceNumber: 1,
      actorId: 'NAV-01',
      actorRole: 'NAVIGATOR',
      action: 'CASE_CREATED',
      resourceType: 'Case',
      resourceId: 'CASE-001',
      details: {},
    });

    const entry2 = createAuditLogEntry({
      sequenceNumber: 2,
      actorId: 'NAV-01',
      actorRole: 'NAVIGATOR',
      action: 'STEP_2',
      resourceType: 'Case',
      resourceId: 'CASE-001',
      details: {},
      prevHash: entry1.hash,
    });

    const entry3 = createAuditLogEntry({
      sequenceNumber: 3,
      actorId: 'NAV-01',
      actorRole: 'NAVIGATOR',
      action: 'STEP_3',
      resourceType: 'Case',
      resourceId: 'CASE-001',
      details: {},
      prevHash: entry2.hash,
    });

    // Omit entry2 (simulating deleted audit record)
    const verification = verifyAuditChain([entry1, entry3]);
    expect(verification.valid).toBe(false);
    expect(verification.compromisedAtIndex).toBe(1);
    expect(verification.reason).toContain('Hash link broken');
  });
});

