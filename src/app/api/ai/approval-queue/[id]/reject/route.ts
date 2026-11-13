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
    const body = await request.json();
    const store = getStore();

    const queueItem = store.aiQueue.get(id);
    if (!queueItem) {
      return NextResponse.json({ error: 'Queue item not found' }, { status: 404 });
    }

    const reviewerId = (request.headers.get('x-user-id') || body.reviewerId || 'NAV-01') as string;
    const reviewerRole = (request.headers.get('x-user-role') || body.reviewerRole || 'NAVIGATOR') as UserRole;
    const reason = body.reason || 'Content rejected during clinical review';

    const rejectedItem = rejectQueueItem(queueItem, reviewerId, reviewerRole, reason);
    store.aiQueue.set(id, rejectedItem);

    logAuditEvent(reviewerId, reviewerRole, 'AI_DRAFT_REJECTED', 'AiApprovalQueue', id, {
      rejectionReason: reason,
    });

    return NextResponse.json({ success: true, rejectedItem });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

