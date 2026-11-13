import { NextRequest, NextResponse } from 'next/server';
import { getStore, getActivePackId, logAuditEvent } from '@/services/caseRepository';
import { getCurrentDemoTime } from '@/services/demoClock';
import { transitionCase } from '@/engine/stateMachine';
import { Appointment, UserRole } from '@/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: caseId } = await params;
    const packId = request.nextUrl.searchParams.get('pack') || getActivePackId();
    const actorRole = (request.headers.get('x-user-role') || 'NAVIGATOR') as UserRole;
    const actorId = request.headers.get('x-user-id') || 'USER-CURRENT';
    const actorName = request.headers.get('x-user-name') || `User-${actorId}`;

    if (actorRole === 'PROGRAMME_ANALYST') {
      return NextResponse.json({ error: 'Forbidden: Programme Analyst role is read-only.' }, { status: 403 });
    }

    const body = await request.json();
    const { facilityId, facilityName, appointmentDate } = body;

    const store = getStore(packId);
    const caseItem = store.cases.get(caseId);
    if (!caseItem) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    const demoNow = getCurrentDemoTime();

    const appointment: Appointment = {
      id: `APT-${caseId.substring(0, 10)}-${Date.now().toString().slice(-6)}`,
      caseId,
      facilityId: facilityId || 'FAC-01',
      facilityName: facilityName || 'Central Endoscopy Diagnostic Suite',
      appointmentDate: appointmentDate || new Date(new Date(demoNow).getTime() + 7 * 86400000).toISOString(),
      status: 'SCHEDULED',
      createdAt: demoNow,
    };

    store.appointments.set(appointment.id, appointment);
    caseItem.milestones.appointmentBookedAt = demoNow;

    const transResult = transitionCase(caseItem, {
      targetState: 'APPOINTMENT_BOOKED',
      trigger: 'APPOINTMENT_SCHEDULED_WITH_FACILITY',
      actorId,
      actorRole,
      actorName,
      timestamp: demoNow,
      metadata: { appointmentId: appointment.id, appointmentDate: appointment.appointmentDate },
    });

    if (transResult.success) {
      store.cases.set(caseId, transResult.updatedCase);
      store.caseEvents.push(transResult.event);
    }

    logAuditEvent(
      actorId,
      actorRole,
      'APPOINTMENT_SCHEDULED',
      'Appointment',
      appointment.id,
      {
        caseId,
        facilityName: appointment.facilityName,
        appointmentDate: appointment.appointmentDate,
      },
      packId
    );

    return NextResponse.json({
      success: true,
      appointment,
      case: caseItem,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

