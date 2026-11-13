import crypto from 'crypto';
import { AuditLogEntry, UserRole } from '../types';

export const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

/**
 * Computes a deterministic SHA-256 hash for an audit log entry.
 */
export function calculateAuditEntryHash(entry: {
  sequenceNumber: number;
  timestamp: string;
  actorId: string;
  actorRole: UserRole;
  action: string;
  resourceType: string;
  resourceId: string;
  details: Record<string, unknown>;
  prevHash: string;
}): string {
  // Sort details keys deterministically to guarantee reproducible serialization
  const serializedDetails = JSON.stringify(entry.details, Object.keys(entry.details).sort());

  const payload = [
    entry.sequenceNumber,
    entry.timestamp,
    entry.actorId,
    entry.actorRole,
    entry.action,
    entry.resourceType,
    entry.resourceId,
    serializedDetails,
    entry.prevHash,
  ].join('|');

  return crypto.createHash('sha256').update(payload, 'utf8').digest('hex');
}

/**
 * Appends a new immutable audit record to the hash chain.
 */
export function createAuditLogEntry(params: {
  sequenceNumber: number;
  actorId: string;
  actorRole: UserRole;
  action: string;
  resourceType: 'Case' | 'Patient' | 'Referral' | 'Appointment' | 'OutreachAttempt' | 'AiApprovalQueue' | 'ConsultMessage' | 'Consent' | 'DemoClock';
  resourceId: string;
  details: Record<string, unknown>;
  prevHash?: string;
  timestamp?: string;
  realTimestamp?: string;
}): AuditLogEntry {
  const timestamp = params.timestamp || new Date().toISOString();
  const realTimestamp = params.realTimestamp || new Date().toISOString();
  const prevHash = params.prevHash || GENESIS_HASH;

  const hash = calculateAuditEntryHash({
    sequenceNumber: params.sequenceNumber,
    timestamp,
    actorId: params.actorId,
    actorRole: params.actorRole,
    action: params.action,
    resourceType: params.resourceType,
    resourceId: params.resourceId,
    details: params.details,
    prevHash,
  });

  return {
    id: `AUDIT-${params.sequenceNumber}-${hash.substring(0, 10)}`,
    sequenceNumber: params.sequenceNumber,
    timestamp,
    realTimestamp,
    actorId: params.actorId,
    actorRole: params.actorRole,
    action: params.action,
    resourceType: params.resourceType,
    resourceId: params.resourceId,
    details: params.details,
    prevHash,
    hash,
  };
}

/**
 * Validates the cryptographic integrity of an entire sequence of audit log entries.
 * Returns true if every entry matches its content hash and links to the previous entry's hash.
 */
export function verifyAuditChain(entries: AuditLogEntry[]): {
  valid: boolean;
  compromisedAtIndex?: number;
  reason?: string;
} {
  if (entries.length === 0) return { valid: true };

  for (let i = 0; i < entries.length; i++) {
    const current = entries[i];

    // Check sequence continuity
    if (i === 0) {
      if (current.prevHash !== GENESIS_HASH) {
        return {
          valid: false,
          compromisedAtIndex: 0,
          reason: `Genesis entry does not reference GENESIS_HASH. Found: ${current.prevHash}`,
        };
      }
    } else {
      const prev = entries[i - 1];
      if (current.prevHash !== prev.hash) {
        return {
          valid: false,
          compromisedAtIndex: i,
          reason: `Hash link broken at index ${i}: current.prevHash (${current.prevHash}) does not match previous.hash (${prev.hash})`,
        };
      }
      if (current.sequenceNumber !== prev.sequenceNumber + 1) {
        return {
          valid: false,
          compromisedAtIndex: i,
          reason: `Sequence number gap at index ${i}: ${current.sequenceNumber} after ${prev.sequenceNumber}`,
        };
      }
    }

    // Verify cryptographic self-consistency
    const recomputedHash = calculateAuditEntryHash({
      sequenceNumber: current.sequenceNumber,
      timestamp: current.timestamp,
      actorId: current.actorId,
      actorRole: current.actorRole,
      action: current.action,
      resourceType: current.resourceType,
      resourceId: current.resourceId,
      details: current.details,
      prevHash: current.prevHash,
    });

    if (recomputedHash !== current.hash) {
      return {
        valid: false,
        compromisedAtIndex: i,
        reason: `Cryptographic tamper detected at index ${i}: stored hash ${current.hash} does not match recomputed hash ${recomputedHash}`,
      };
    }
  }

  return { valid: true };
}

