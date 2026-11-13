import { NextRequest, NextResponse } from 'next/server';
import { getStore, getActivePackId, logAuditEvent } from '@/services/caseRepository';
import { getPatientFromToken, verifyPatientOwnsCase } from '@/services/patientAuth';
import { getCurrentDemoTime } from '@/services/demoClock';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: caseId } = await params;
    const token = request.headers.get('x-patient-token') || request.nextUrl.searchParams.get('token');
    const packId = request.nextUrl.searchParams.get('pack') || getActivePackId();

    const patient = getPatientFromToken(token, packId);
    if (!patient) {
      return NextResponse.json({ error: 'Unauthorized: Valid patient token required' }, { status: 401 });
    }

    if (!verifyPatientOwnsCase(patient, caseId, packId)) {
      return NextResponse.json({ error: 'Forbidden: Patient does not own this case' }, { status: 403 });
    }

    const store = getStore(packId);
    const body = await request.json();
    const demoNow = getCurrentDemoTime();

    patient.consentFlags = {
      smsConsent: body.smsConsent !== undefined ? Boolean(body.smsConsent) : patient.consentFlags.smsConsent,
      whatsappConsent: body.whatsappConsent !== undefined ? Boolean(body.whatsappConsent) : patient.consentFlags.whatsappConsent,
      callConsent: body.callConsent !== undefined ? Boolean(body.callConsent) : patient.consentFlags.callConsent,
      navigatorOutreachConsent: body.navigatorOutreachConsent !== undefined ? Boolean(body.navigatorOutreachConsent) : patient.consentFlags.navigatorOutreachConsent,
      dataSharingConsent: body.dataSharingConsent !== undefined ? Boolean(body.dataSharingConsent) : patient.consentFlags.dataSharingConsent,
      lastUpdated: demoNow,
    };

    store.patients.set(patient.id, patient);

    logAuditEvent(
      patient.id,
      'PATIENT',
      'PATIENT_CONSENT_FLAGS_UPDATED',
      'Consent',
      patient.id,
      {
        consentFlags: patient.consentFlags,
        caseId,
      },
      packId
    );

    return NextResponse.json({
      success: true,
      consentFlags: patient.consentFlags,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
