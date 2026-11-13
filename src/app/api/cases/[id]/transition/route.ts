import { NextRequest, NextResponse } from 'next/server';
import { getStore, logAuditEvent } from '@/services/caseRepository';
import { transitionCase } from '@/engine/stateMachine';
import { UserRole } from '@/types';

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

    const actorId = (request.headers.get('x-user-id') || body.actorId || 'USER-CURRENT') as string;
    const actorRole = (request.headers.get('x-user-role') || body.actorRole || 'NAVIGATOR') as UserRole;
    const actorName = (request.headers.get('x-user-name') || body.actorName || `User-${actorId}`) as string;

    const transitionResult = transitionCase(caseItem, {
      targetState: body.targetState,
      trigger: body.trigger || 'MANUAL_USER_ACTION',
      actorId,
      actorRole,
      actorName,
      barrierReason: body.barrierReason,
      closureDetails: body.closureDetails,
      metadata: body.metadata,
      timestamp: body.timestamp || new Date().toISOString(),
    });

    // Update in-memory store
    store.cases.set(id, transitionResult.updatedCase);
    store.caseEvents.push(transitionResult.event);

    // Cryptographic hash-chained audit logging
    logAuditEvent(actorId, actorRole, `CASE_STATE_TRANSITION_${body.targetState}`, 'Case', id, {
      fromState: transitionResult.event.fromState,
      toState: transitionResult.event.toState,
      trigger: transitionResult.event.trigger,
      barrierReason: transitionResult.event.barrierReason,
      closureDetails: body.closureDetails,
    });

    return NextResponse.json({
      success: true,
      updatedCase: transitionResult.updatedCase,
      event: transitionResult.event,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

