import { NextRequest, NextResponse } from 'next/server';
import { getStore, logAuditEvent } from '@/services/caseRepository';
import { approveQueueItem } from '@/engine/aiProvider';
import { recordOutreachAttempt } from '@/engine/outreachEngine';
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

    const queueItem = store.aiQueue.get(id);
    if (!queueItem) {
      return NextResponse.json({ error: 'Queue item not found' }, { status: 404 });
    }

    const reviewerId = (request.headers.get('x-user-id') || body.reviewerId || 'NAV-01') as string;
    const reviewerRole = (request.headers.get('x-user-role') || body.reviewerRole || 'NAVIGATOR') as UserRole;

    const approvedItem = approveQueueItem(queueItem, reviewerId, reviewerRole, {
      modifiedContent: body.modifiedContent,
      reviewNotes: body.reviewNotes,
    });

    store.aiQueue.set(id, approvedItem);

    // Record outreach attempt dispatch now that human approval has been granted!
    const attempt = recordOutreachAttempt({
      caseId: queueItem.caseId,
      channel: 'SMS',
      outcome: 'DELIVERED',
      byRole: reviewerRole,
      byUserId: reviewerId,
      notes: `Human-approved AI drafted communication (${approvedItem.status}): "${approvedItem.draftContent.substring(0, 80)}..."`,
    });
    store.outreachAttempts.push(attempt);

    // Transition case to PATIENT_NOTIFIED if currently RESULT_ISSUED
    const caseItem = store.cases.get(queueItem.caseId);
    if (caseItem && caseItem.currentState === 'RESULT_ISSUED') {
      const trans = transitionCase(caseItem, {
        targetState: 'PATIENT_NOTIFIED',
        trigger: 'APPROVED_AI_NOTIFICATION_DISPATCHED',
        actorId: reviewerId,
        actorRole: reviewerRole,
      });
      store.cases.set(caseItem.id, trans.updatedCase);
      store.caseEvents.push(trans.event);
    }

    logAuditEvent(reviewerId, reviewerRole, 'AI_DRAFT_APPROVED_AND_DISPATCHED', 'AiApprovalQueue', id, {
      status: approvedItem.status,
      reviewNotes: body.reviewNotes,
    });

    return NextResponse.json({ success: true, approvedItem });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

