import { NextRequest, NextResponse } from 'next/server';
import { getStore, logAuditEvent } from '@/services/caseRepository';
import { recordOutreachAttempt } from '@/engine/outreachEngine';
import { transitionCase } from '@/engine/stateMachine';
import { OutreachChannel, OutreachOutcome, UserRole } from '@/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const store = getStore();

    const caseItem = store.cases.get(id);
    if (!caseItem) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    const patient = store.patients.get(caseItem.patientId);

    const channel: OutreachChannel = body.channel || 'SMS';
    const outcome: OutreachOutcome = body.outcome || 'DELIVERED';
    const actorId = (request.headers.get('x-user-id') || body.actorId || 'NAV-01') as string;
    const actorRole = (request.headers.get('x-user-role') || body.actorRole || 'NAVIGATOR') as UserRole;

    // Consent check on patient-facing channels
    if (patient) {
      if (channel === 'SMS' && !patient.consentFlags.smsConsent) {
        return NextResponse.json(
          { error: 'Patient consent violation: Patient has not consented to SMS communications.' },
          { status: 403 }
        );
      }
      if (channel === 'WHATSAPP' && !patient.consentFlags.whatsappConsent) {
        return NextResponse.json(
          { error: 'Patient consent violation: Patient has not consented to WhatsApp communications.' },
          { status: 403 }
        );
      }
      if (channel === 'CALL' && !patient.consentFlags.callConsent) {
        return NextResponse.json(
          { error: 'Patient consent violation: Patient has not consented to Voice Telephone outreach.' },
          { status: 403 }
        );
      }
    }

    const attempt = recordOutreachAttempt({
      caseId: id,
      channel,
      outcome,
      byRole: actorRole,
      byUserId: actorId,
      barrierReason: body.barrierReason,
      notes: body.notes,
      attemptedAt: body.attemptedAt || new Date().toISOString(),
    });

    store.outreachAttempts.push(attempt);

    logAuditEvent(actorId, actorRole, 'OUTREACH_ATTEMPT_RECORDED', 'OutreachAttempt', attempt.id, {
      caseId: id,
      channel,
      outcome,
      barrierReason: body.barrierReason,
    });

    // Auto-advance case state if appropriate
    let updatedCase = caseItem;
    if (caseItem.currentState === 'RESULT_ISSUED') {
      const trans = transitionCase(caseItem, {
        targetState: 'PATIENT_NOTIFIED',
        trigger: `OUTREACH_DISPATCHED_${channel}`,
        actorId,
        actorRole,
      });
      store.cases.set(id, trans.updatedCase);
      store.caseEvents.push(trans.event);
      updatedCase = trans.updatedCase;
    }

    if (outcome === 'ACKNOWLEDGED' && ['RESULT_ISSUED', 'PATIENT_NOTIFIED'].includes(updatedCase.currentState)) {
      const trans = transitionCase(updatedCase, {
        targetState: 'ACKNOWLEDGED',
        trigger: `PATIENT_ACKNOWLEDGED_VIA_${channel}`,
        actorId,
        actorRole,
        metadata: { understandingConfirmed: body.understandingConfirmed ?? true },
      });
      store.cases.set(id, trans.updatedCase);
      store.caseEvents.push(trans.event);
      updatedCase = trans.updatedCase;
    } else if (outcome === 'DECLINED' && updatedCase.currentState !== 'ESCALATED') {
      const trans = transitionCase(updatedCase, {
        targetState: 'ESCALATED',
        trigger: 'PATIENT_DECLINED_OUTREACH',
        actorId,
        actorRole,
        barrierReason: body.barrierReason,
      });
      store.cases.set(id, trans.updatedCase);
      store.caseEvents.push(trans.event);
      updatedCase = trans.updatedCase;
    }

    return NextResponse.json({
      success: true,
      attempt,
      updatedCase,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

