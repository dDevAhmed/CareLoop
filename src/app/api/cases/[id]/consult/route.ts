import { NextRequest, NextResponse } from 'next/server';
import { getStore, getActivePackId, logAuditEvent } from '@/services/caseRepository';
import { getCurrentDemoTime } from '@/services/demoClock';
import { ConsultMessage, UserRole } from '@/types';
export const EMERGENCY_NOTICE_BANNER =
  'EMERGENCY NOTICE: If you are experiencing acute pain, severe bleeding, or any medical emergency, call 999 (Abu Dhabi / UAE emergency services) or go to the nearest emergency room immediately. CareLoop communications are for routine closed-loop navigation only and are not continuously monitored.';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: caseId } = await params;
    const packId = request.nextUrl.searchParams.get('pack') || getActivePackId();
    const actorRole = (request.headers.get('x-user-role') || 'CLINICIAN') as UserRole;
    const actorId = request.headers.get('x-user-id') || '';

    const store = getStore(packId);
    const caseItem = store.cases.get(caseId);
    if (!caseItem) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    if (actorRole === 'PATIENT' && actorId && caseItem.patientId !== actorId) {
      return NextResponse.json({ error: 'Forbidden: Access denied to other patient cases.' }, { status: 403 });
    }

    const allMessages = store.consultMessages.get(caseId) || [];

    const patientThread = allMessages.filter((m) => m.threadType === 'PATIENT_TO_CLINICIAN');
    const internalThread =
      actorRole === 'PATIENT'
        ? [] // Invisible to patient!
        : allMessages.filter((m) => m.threadType === 'CLINICIAN_TO_CLINICIAN');

    return NextResponse.json({
      success: true,
      caseId,
      emergencyNotice: EMERGENCY_NOTICE_BANNER,
      patientThread,
      internalThread,
      canPostInternal: actorRole === 'CLINICIAN' || actorRole === 'NAVIGATOR',
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
    const packId = request.nextUrl.searchParams.get('pack') || getActivePackId();
    const actorRole = (request.headers.get('x-user-role') || 'CLINICIAN') as UserRole;
    const actorId = request.headers.get('x-user-id') || 'USER-CURRENT';
    const actorName = request.headers.get('x-user-name') || `User-${actorId}`;

    if (actorRole === 'PROGRAMME_ANALYST') {
      return NextResponse.json(
        { error: 'Forbidden: Programme Analyst role is read-only and cannot post consult messages.' },
        { status: 403 }
      );
    }

    const store = getStore(packId);
    const caseItem = store.cases.get(caseId);
    if (!caseItem) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    const body = await request.json();
    const { threadType, content } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Message content cannot be empty' }, { status: 400 });
    }

    // Role check: Patient cannot post to internal clinician-to-clinician thread
    if (actorRole === 'PATIENT' && threadType === 'CLINICIAN_TO_CLINICIAN') {
      return NextResponse.json(
        { error: 'Forbidden: Patients cannot post to internal clinical consult thread.' },
        { status: 403 }
      );
    }

    const demoNow = getCurrentDemoTime();

    const message: ConsultMessage = {
      id: `MSG-${caseId}-${Date.now()}`,
      caseId,
      threadType: threadType || 'PATIENT_TO_CLINICIAN',
      senderId: actorId,
      senderName: actorName,
      senderRole: actorRole,
      content: content.trim(),
      timestamp: demoNow,
    };

    if (!store.consultMessages.has(caseId)) {
      store.consultMessages.set(caseId, []);
    }
    store.consultMessages.get(caseId)!.push(message);

    logAuditEvent(
      actorId,
      actorRole,
      'CONSULT_MESSAGE_POSTED',
      'ConsultMessage',
      message.id,
      {
        caseId,
        threadType: message.threadType,
        contentLength: content.trim().length,
      },
      packId
    );

    return NextResponse.json({
      success: true,
      message,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
