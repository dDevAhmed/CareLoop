import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@/services/caseRepository';
import { outreachToFhirCommunication } from '@/engine/fhirConverter';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const store = getStore();

  const attempt = store.outreachAttempts.find((o) => o.id === id);
  if (!attempt) {
    return NextResponse.json(
      { resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'not-found', diagnostics: `Communication with id ${id} not found` }] },
      { status: 404 }
    );
  }

  const caseItem = store.cases.get(attempt.caseId);
  if (!caseItem) {
    return NextResponse.json(
      { resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'not-found', diagnostics: `Associated Case not found` }] },
      { status: 404 }
    );
  }

  const patient = store.patients.get(caseItem.patientId);
  const fhirComm = outreachToFhirCommunication(attempt, caseItem, patient);

  return NextResponse.json(fhirComm, {
    headers: { 'Content-Type': 'application/fhir+json' },
  });
}

