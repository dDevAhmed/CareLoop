import { NextRequest, NextResponse } from 'next/server';
import { getStore, getActivePackId, logAuditEvent } from '@/services/caseRepository';
import { getCurrentDemoTime } from '@/services/demoClock';
import { transitionCase } from '@/engine/stateMachine';
import { UserRole } from '@/types';

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
      return NextResponse.json({ error: 'Forbidden: Programme Analyst role is read-only.' }, { status: 403 });
    }

    const store = getStore(packId);
    const caseItem = store.cases.get(caseId);
    if (!caseItem) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    const demoNow = getCurrentDemoTime();

    // Find linked appointment and mark attended
    const appointment = Array.from(store.appointments.values()).find((a) => a.caseId === caseId);
    if (appointment) {
      appointment.status = 'ATTENDED';
      appointment.attendedAt = demoNow;
    }

    caseItem.milestones.attendedAt = demoNow;

    const transResult = transitionCase(caseItem, {
      targetState: 'ATTENDED',
      trigger: 'PATIENT_ATTENDED_CLINICAL_ENCOUNTER',
      actorId,
      actorRole,
      actorName,
      timestamp: demoNow,
      metadata: { attendedAt: demoNow },
    });

    if (transResult.success) {
      store.cases.set(caseId, transResult.updatedCase);
      store.caseEvents.push(transResult.event);
    }

    logAuditEvent(
      actorId,
      actorRole,
      'APPOINTMENT_ATTENDED',
      'Appointment',
      appointment?.id || caseId,
      {
        caseId,
        attendedAt: demoNow,
      },
      packId
    );

    return NextResponse.json({
      success: true,
      case: caseItem,
      appointment,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

