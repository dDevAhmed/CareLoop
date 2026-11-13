import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@/services/caseRepository';
import { referralToFhirServiceRequest } from '@/engine/fhirConverter';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const store = getStore();

  const referral = store.referrals.get(id);
  if (!referral) {
    return NextResponse.json(
      { resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'not-found', diagnostics: `ServiceRequest with id ${id} not found` }] },
      { status: 404 }
    );
  }

  const caseItem = store.cases.get(referral.caseId);
  if (!caseItem) {
    return NextResponse.json(
      { resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'not-found', diagnostics: `Associated Case not found` }] },
      { status: 404 }
    );
  }

  const patient = store.patients.get(caseItem.patientId);
  const fhirSR = referralToFhirServiceRequest(referral, caseItem, patient);

  return NextResponse.json(fhirSR, {
    headers: { 'Content-Type': 'application/fhir+json' },
  });
}

