import { NextRequest, NextResponse } from 'next/server';
import { getStore, getActivePackId, logAuditEvent } from '@/services/caseRepository';
import { getCurrentDemoTime } from '@/services/demoClock';
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

    // Governance: Programme Analyst is strictly read-only
    if (actorRole === 'PROGRAMME_ANALYST') {
      return NextResponse.json(
        { error: 'Forbidden: Programme Analyst role is strictly read-only and cannot reassign case owners.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { ownerId, ownerName, ownerRole } = body;

    if (!ownerId || !ownerRole) {
      return NextResponse.json({ error: 'ownerId and ownerRole are required' }, { status: 400 });
    }

    const store = getStore(packId);
    const caseItem = store.cases.get(caseId);
    if (!caseItem) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    const demoNow = getCurrentDemoTime();

    caseItem.primaryOwnerId = ownerId;
    caseItem.primaryOwnerRole = ownerRole;
    caseItem.assignedOwner = {
      id: ownerId,
      name: ownerName || `User-${ownerId}`,
      role: ownerRole,
    };
    caseItem.updatedAt = demoNow;

    const assignEvt = {
      id: `EVT-ASSIGN-${caseId}-${Date.now()}`,
      caseId,
      fromState: caseItem.currentState,
      toState: caseItem.currentState,
      trigger: 'MANUAL_OWNER_REASSIGNMENT',
      ownerId: actorId,
      ownerRole: actorRole,
      timestamp: demoNow,
      metadata: { note: `Case assigned to ${ownerName || ownerId} (${ownerRole}).` },
    };
    store.caseEvents.push(assignEvt);
    if (!caseItem.events) caseItem.events = [];
    caseItem.events.push(assignEvt);

    logAuditEvent(
      actorId,
      actorRole,
      'CASE_OWNER_ASSIGNED',
      'Case',
      caseId,
      {
        newOwnerId: ownerId,
        newOwnerName: ownerName,
        newOwnerRole: ownerRole,
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
