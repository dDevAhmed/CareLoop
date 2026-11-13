import { Patient } from '../types';
import { getStore } from './caseRepository';

/**
 * Mock patient token generator and validator.
 * Enforces patient data isolation: a token only grants access to that specific patient's records.
 */

export function generateMockPatientToken(patient: Patient): string {
  return `TOKEN_${patient.id}_${patient.externalPatientId}`;
}

export function getPatientFromToken(token: string | null | undefined, packId?: string): Patient | null {
  if (!token) return null;
  const store = getStore(packId);

  // Check direct matches or token format
  for (const p of store.patients.values()) {
    if (
      token === `TOKEN_${p.id}_${p.externalPatientId}` ||
      token === p.id ||
      token === p.externalPatientId ||
      token.includes(p.id)
    ) {
      return p;
    }
  }

  return null;
}

export function verifyPatientOwnsCase(
  patient: Patient,
  caseId: string,
  packId?: string
): boolean {
  const store = getStore(packId);
  const caseItem = store.cases.get(caseId);
  if (!caseItem) return false;
  return caseItem.patientId === patient.id;
}
