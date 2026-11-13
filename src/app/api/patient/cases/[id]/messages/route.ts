import { NextRequest, NextResponse } from 'next/server';
import { getStore, getActivePackId, logAuditEvent } from '@/services/caseRepository';
import { getPatientFromToken, verifyPatientOwnsCase } from '@/services/patientAuth';
import { getCurrentDemoTime } from '@/services/demoClock';
import { ConsultMessage } from '@/types';

export const EMERGENCY_NOTICE_BANNER =
  'EMERGENCY NOTICE: If you are experiencing acute severe symptoms (such as heavy bleeding, severe unremitting pain, shortness of breath, or collapse), call emergency services immediately (999 / 911 / 112) or proceed to the nearest emergency department. This messaging thread is not monitored 24/7 for acute medical emergencies.';

export async function GET(
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
    const messages = (store.consultMessages.get(caseId) || []).filter(
      (m) => m.threadType === 'PATIENT_TO_CLINICIAN'
    );

    return NextResponse.json({
      success: true,
      emergencyNotice: EMERGENCY_NOTICE_BANNER,
      messages,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

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

    const body = await request.json();
    const { content } = body;
    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Message content cannot be empty' }, { status: 400 });
    }

    const store = getStore(packId);
    const demoNow = getCurrentDemoTime();

    const newMessage: ConsultMessage = {
      id: `MSG-${caseId}-${Date.now()}`,
      caseId,
      threadType: 'PATIENT_TO_CLINICIAN',
      senderId: patient.id,
      senderName: patient.fullName,
      senderRole: 'PATIENT',
      content: content.trim(),
      timestamp: demoNow,
    };

    if (!store.consultMessages.has(caseId)) {
      store.consultMessages.set(caseId, []);
    }
    store.consultMessages.get(caseId)!.push(newMessage);

    logAuditEvent(
      patient.id,
      'PATIENT',
      'PATIENT_CONSULT_MESSAGE_SENT',
      'ConsultMessage',
      newMessage.id,
      {
        caseId,
        contentLength: content.trim().length,
      },
      packId
    );

    return NextResponse.json({
      success: true,
      message: newMessage,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
