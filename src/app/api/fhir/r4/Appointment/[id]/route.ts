import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@/services/caseRepository';
import { appointmentToFhirAppointment } from '@/engine/fhirConverter';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const store = getStore();

  const appointment = store.appointments.get(id);
  if (!appointment) {
    return NextResponse.json(
      { resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'not-found', diagnostics: `Appointment with id ${id} not found` }] },
      { status: 404 }
    );
  }

  const caseItem = store.cases.get(appointment.caseId);
  if (!caseItem) {
    return NextResponse.json(
      { resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'not-found', diagnostics: `Associated Case not found` }] },
      { status: 404 }
    );
  }

  const patient = store.patients.get(caseItem.patientId);
  const fhirApt = appointmentToFhirAppointment(appointment, caseItem, patient);

  return NextResponse.json(fhirApt, {
    headers: { 'Content-Type': 'application/fhir+json' },
  });
}

