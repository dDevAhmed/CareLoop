import { NextRequest, NextResponse } from 'next/server';
import { getStore, logAuditEvent } from '@/services/caseRepository';
import { MockAiProvider, createApprovalQueueItem } from '@/engine/aiProvider';
import { UserRole } from '@/types';

const aiProvider = new MockAiProvider();

export async function GET() {
  const store = getStore();
  const queue = Array.from(store.aiQueue.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return NextResponse.json({
    total: queue.length,
    pendingCount: queue.filter((i) => i.status === 'PENDING_REVIEW').length,
    items: queue,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { caseId, language = 'ar' } = body;
    const store = getStore();

    const caseItem = store.cases.get(caseId);
    if (!caseItem) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    const patient = store.patients.get(caseItem.patientId);
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Generate draft using local mock provider (NO outbound external AI calls)
    const result = await aiProvider.generateDraftNotification({
      patient,
      caseItem,
      language,
    });

    // Enforce governance: route output to human approval queue
    const queueItem = createApprovalQueueItem({
      caseId,
      patientId: patient.id,
      draftText: result.draftText,
      modelIdentifier: result.modelIdentifier,
      language,
    });

    store.aiQueue.set(queueItem.id, queueItem);

    const actorId = (request.headers.get('x-user-id') || 'NAV-01') as string;
    const actorRole = (request.headers.get('x-user-role') || 'NAVIGATOR') as UserRole;

    logAuditEvent(actorId, actorRole, 'AI_DRAFT_QUEUED_FOR_APPROVAL', 'AiApprovalQueue', queueItem.id, {
      caseId,
      model: result.modelIdentifier,
      language,
    });

    return NextResponse.json({ success: true, queueItem });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

