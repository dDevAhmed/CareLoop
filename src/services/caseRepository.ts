import fs from 'fs';
import path from 'path';
import {
  Case,
  Patient,
  CaseEvent,
  OutreachAttempt,
  Referral,
  Appointment,
  AuditLogEntry,
  AiApprovalQueueItem,
  ConsultMessage,
  DiagnosticReport,
  UserRole,
} from '../types';
import { createAuditLogEntry, GENESIS_HASH } from '../engine/auditChain';
import { generateSyntheticDataset } from '../scripts/seed';
import { getCurrentDemoTime, getWallClockTime } from './demoClock';

export interface DatabaseStore {
  patients: Map<string, Patient>;
  cases: Map<string, Case>;
  caseEvents: CaseEvent[];
  outreachAttempts: OutreachAttempt[];
  referrals: Map<string, Referral>;
  appointments: Map<string, Appointment>;
  consultMessages: Map<string, ConsultMessage[]>;
  diagnosticReports: Map<string, DiagnosticReport>;
  auditLogs: AuditLogEntry[];
  aiQueue: Map<string, AiApprovalQueueItem>;
  lastAuditHash: string;
  auditSequence: number;
}

// Stores cached per jurisdiction pack
const stores = new Map<string, DatabaseStore>();
let currentActivePackId = 'abu-dhabi';

export function getActivePackId(): string {
  return currentActivePackId;
}

export function setActivePackId(packId: string): void {
  currentActivePackId = packId;
}

function loadPackData(packId: string): DatabaseStore {
  let rawData: {
    patients: Patient[];
    cases: Case[];
    caseEvents: CaseEvent[];
    outreachAttempts: OutreachAttempt[];
    referrals: Referral[];
    appointments: Appointment[];
    auditLogs: AuditLogEntry[];
  } | null = null;

  const candidateFiles = [
    path.join(process.cwd(), 'data', `synthetic_cases_${packId}.json`),
  ];
  if (packId === 'abu-dhabi') {
    candidateFiles.unshift(path.join(process.cwd(), 'data', 'synthetic_cases_2000.json'));
  }

  for (const f of candidateFiles) {
    if (fs.existsSync(f)) {
      try {
        const content = fs.readFileSync(f, 'utf-8');
        rawData = JSON.parse(content);
        break;
      } catch (err) {
        console.error(`Failed to read data file ${f}:`, err);
      }
    }
  }

  if (!rawData) {
    // Generate dynamically using deterministic seeder
    const count = packId === 'abu-dhabi' ? 2000 : 500;
    const generated = generateSyntheticDataset(count, packId, 42);
    rawData = {
      patients: generated.patients,
      cases: generated.cases,
      caseEvents: generated.caseEvents,
      outreachAttempts: generated.outreachAttempts,
      referrals: generated.referrals,
      appointments: generated.appointments,
      auditLogs: generated.auditLogs,
    };
  }

  const patientsMap = new Map<string, Patient>();
  for (const p of rawData.patients) patientsMap.set(p.id, p);

  const casesMap = new Map<string, Case>();
  for (const c of rawData.cases) casesMap.set(c.id, c);

  const referralsMap = new Map<string, Referral>();
  for (const r of rawData.referrals) referralsMap.set(r.id, r);

  const appointmentsMap = new Map<string, Appointment>();
  for (const a of rawData.appointments) appointmentsMap.set(a.id, a);

  const aiQueueMap = new Map<string, AiApprovalQueueItem>();

  let lastHash = GENESIS_HASH;
  let maxSeq = 1;

  if (rawData.auditLogs.length > 0) {
    const lastEntry = rawData.auditLogs[rawData.auditLogs.length - 1];
    lastHash = lastEntry.hash;
    maxSeq = lastEntry.sequenceNumber + 1;
  }

  return {
    patients: patientsMap,
    cases: casesMap,
    caseEvents: [...rawData.caseEvents],
    outreachAttempts: [...rawData.outreachAttempts],
    referrals: referralsMap,
    appointments: appointmentsMap,
    consultMessages: new Map<string, ConsultMessage[]>(),
    diagnosticReports: new Map<string, DiagnosticReport>(),
    auditLogs: [...rawData.auditLogs],
    aiQueue: aiQueueMap,
    lastAuditHash: lastHash,
    auditSequence: maxSeq,
  };
}

export function getStore(packId?: string): DatabaseStore {
  const resolvedPackId = packId || currentActivePackId;
  let store = stores.get(resolvedPackId);
  if (!store) {
    store = loadPackData(resolvedPackId);
    stores.set(resolvedPackId, store);
  }
  return store;
}

export function logAuditEvent(
  actorId: string,
  actorRole: UserRole,
  action: string,
  resourceType: 'Case' | 'Patient' | 'Referral' | 'Appointment' | 'OutreachAttempt' | 'AiApprovalQueue' | 'ConsultMessage' | 'Consent' | 'DemoClock',
  resourceId: string,
  details: Record<string, unknown>,
  packId?: string
): AuditLogEntry {
  const currentStore = getStore(packId);
  const entry = createAuditLogEntry({
    sequenceNumber: currentStore.auditSequence++,
    actorId,
    actorRole,
    action,
    resourceType,
    resourceId,
    details,
    prevHash: currentStore.lastAuditHash,
    timestamp: getCurrentDemoTime(),
    realTimestamp: getWallClockTime(),
  });

  currentStore.lastAuditHash = entry.hash;
  currentStore.auditLogs.push(entry);
  return entry;
}
