import { NextRequest, NextResponse } from 'next/server';
import { getStore, getActivePackId, logAuditEvent } from '@/services/caseRepository';
import { getPatientFromToken, verifyPatientOwnsCase } from '@/services/patientAuth';
import { getCurrentDemoTime } from '@/services/demoClock';
import { transitionCase } from '@/engine/stateMachine';

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
    const caseItem = store.cases.get(caseId);
    if (!caseItem) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    const demoNow = getCurrentDemoTime();

    // Sets notificationDeliveredAt (if empty) and acknowledgedAt
    if (!caseItem.milestones.notificationDeliveredAt) {
      caseItem.milestones.notificationDeliveredAt = demoNow;
    }
    caseItem.milestones.acknowledgedAt = demoNow;

    // Transition state if currently at RESULT_ISSUED or PATIENT_NOTIFIED
    if (caseItem.currentState === 'RESULT_ISSUED' || caseItem.currentState === 'PATIENT_NOTIFIED') {
      const transResult = transitionCase(caseItem, {
        targetState: 'ACKNOWLEDGED',
        trigger: 'PATIENT_AFFIRMATIVE_ACKNOWLEDGEMENT',
        actorId: patient.id,
        actorRole: 'PATIENT',
        actorName: patient.fullName,
        timestamp: demoNow,
      });

      if (transResult.success) {
        store.cases.set(caseItem.id, caseItem);
        store.caseEvents.push(transResult.event);
      }
    }

    logAuditEvent(
      patient.id,
      'PATIENT',
      'PATIENT_ACKNOWLEDGED_RESULT',
      'Case',
      caseItem.id,
      {
        notificationDeliveredAt: caseItem.milestones.notificationDeliveredAt,
        acknowledgedAt: caseItem.milestones.acknowledgedAt,
        state: caseItem.currentState,
      },
      packId
    );

    return NextResponse.json({
      success: true,
      case: caseItem,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
