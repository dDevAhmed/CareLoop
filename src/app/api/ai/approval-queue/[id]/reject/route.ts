import { NextRequest, NextResponse } from 'next/server';
import { getStore, logAuditEvent } from '@/services/caseRepository';
import { rejectQueueItem } from '@/engine/aiProvider';
import { UserRole } from '@/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const store = getStore();

    const queueItem = store.aiQueue.get(id);
    if (!queueItem) {
      return NextResponse.json({ error: 'Queue item not found' }, { status: 404 });
    }

    // Safety rule 4(a): Require x-user-id, no default reviewer
    const reviewerId = request.headers.get('x-user-id') || body.reviewerId;
    if (!reviewerId || typeof reviewerId !== 'string' || reviewerId.trim().length === 0) {
      return NextResponse.json(
        { error: 'Reviewer ID is required (pass via x-user-id header or reviewerId body)' },
        { status: 400 }
      );
    }

    // Safety rule 4(a): Role must be in {CLINICIAN, NAVIGATOR}
    const reviewerRole = (request.headers.get('x-user-role') || body.reviewerRole) as UserRole;
    if (!reviewerRole || !['CLINICIAN', 'NAVIGATOR'].includes(reviewerRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Reviewer must have role CLINICIAN or NAVIGATOR' },
        { status: 403 }
      );
    }

    // Safety rule 4(a): Only act on PENDING_REVIEW items
    if (queueItem.status !== 'PENDING_REVIEW') {
      return NextResponse.json(
        { error: `Queue item cannot be rejected; current status is already ${queueItem.status}` },
        { status: 409 }
      );
    }

    const reason = body.reason || body.rejectionReason;
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 });
    }

    const rejectedItem = rejectQueueItem(queueItem, reviewerId, reviewerRole, reason.trim());
    store.aiQueue.set(id, rejectedItem);

    logAuditEvent(reviewerId, reviewerRole, 'AI_DRAFT_REJECTED', 'AiApprovalQueue', id, {
      rejectionReason: reason.trim(),
    });

    return NextResponse.json({ success: true, rejectedItem });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
