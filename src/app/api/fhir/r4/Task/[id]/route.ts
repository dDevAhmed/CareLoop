import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@/services/caseRepository';
import { caseToFhirTask } from '@/engine/fhirConverter';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const store = getStore();

  const caseItem = store.cases.get(id);
  if (!caseItem) {
    return NextResponse.json({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'not-found', diagnostics: `Task with id ${id} not found` }] }, { status: 404 });
  }

  const patient = store.patients.get(caseItem.patientId);
  const fhirTask = caseToFhirTask(caseItem, patient);

  return NextResponse.json(fhirTask, {
    headers: { 'Content-Type': 'application/fhir+json' },
  });
}

