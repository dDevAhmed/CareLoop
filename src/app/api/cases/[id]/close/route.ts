import { NextRequest, NextResponse } from 'next/server';
import { getStore, getActivePackId, logAuditEvent } from '@/services/caseRepository';
import { getCurrentDemoTime } from '@/services/demoClock';
import { transitionCase } from '@/engine/stateMachine';
import { UserRole, AuthorisedAlternativeReason } from '@/types';

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

    const body = await request.json();
    const { action, clinicalEvidenceRef, closureNote, reason, requesterId, requesterName, requesterRole } = body;
    const demoNow = getCurrentDemoTime();

    // Option A: CLINICAL_RESOLUTION
    if (action === 'CLINICAL_RESOLUTION') {
      const evidence = clinicalEvidenceRef || caseItem.diagnosticReport?.reportId;
      if (!evidence) {
        return NextResponse.json(
          { error: 'CLINICAL_RESOLUTION requires clinical evidence (e.g. diagnostic report or pathology ID).' },
          { status: 400 }
        );
      }

      const transResult = transitionCase(caseItem, {
        targetState: 'CLOSED',
        trigger: 'CLINICAL_RESOLUTION_CONFIRMED',
        actorId,
        actorRole,
        actorName,
        timestamp: demoNow,
        closureDetails: {
          closureType: 'CLINICAL_RESOLUTION',
          clinicalEvidenceRef: evidence,
          closureNote: closureNote || 'Diagnostic examination completed and verified with clinical evidence.',
        },
      });

      if (transResult.success) {
        store.cases.set(caseId, transResult.updatedCase);
        store.caseEvents.push(transResult.event);
      }

      logAuditEvent(
        actorId,
        actorRole,
        'CASE_CLOSED_CLINICAL_RESOLUTION',
        'Case',
        caseId,
        {
          clinicalEvidenceRef: evidence,
          closedAt: demoNow,
        },
        packId
      );

      return NextResponse.json({
        success: true,
        case: caseItem,
        closure: caseItem.closure,
      });
    }

    // Option B, Step 1: Navigator requests AUTHORISED_ALTERNATIVE
    if (action === 'REQUEST_AUTHORISED_ALTERNATIVE') {
      if (!reason) {
        return NextResponse.json({ error: 'Authorised alternative reason is required.' }, { status: 400 });
      }
      if (!closureNote || closureNote.trim().length < 5) {
        return NextResponse.json({ error: 'Explanatory closure note is required (min 5 characters).' }, { status: 400 });
      }

      const reqId = requesterId || actorId;
      const reqName = requesterName || actorName;
      const reqRole = requesterRole || actorRole;

      caseItem.pendingAlternativeClosure = {
        requesterId: reqId,
        requesterName: reqName,
        requesterRole: reqRole,
        reason: reason as AuthorisedAlternativeReason,
        note: closureNote.trim(),
        requestedAt: demoNow,
      };

      store.cases.set(caseId, caseItem);

      logAuditEvent(
        reqId,
        reqRole,
        'AUTHORISED_ALTERNATIVE_CLOSURE_REQUESTED',
        'Case',
        caseId,
        {
          reason,
          note: closureNote,
          requestedAt: demoNow,
        },
        packId
      );

      return NextResponse.json({
        success: true,
        message: 'Authorised alternative closure requested. Awaiting independent clinician authorization.',
        pendingAlternativeClosure: caseItem.pendingAlternativeClosure,
        case: caseItem,
      });
    }

    // Option B, Step 2: Clinician authorises AUTHORISED_ALTERNATIVE
    if (action === 'AUTHORISE_ALTERNATIVE') {
      const pending = caseItem.pendingAlternativeClosure;
      if (!pending) {
        return NextResponse.json(
          { error: 'No pending authorised alternative closure request found for this case.' },
          { status: 400 }
        );
      }

      // MANDATORY RULE: Requester and authoriser MUST be different users!
      if (pending.requesterId === actorId) {
        return NextResponse.json(
          { error: 'Authorised alternative closure requires that the requester and authoriser be different users.' },
          { status: 400 }
        );
      }

      const transResult = transitionCase(caseItem, {
        targetState: 'CLOSED',
        trigger: 'AUTHORISED_ALTERNATIVE_APPROVED_BY_CLINICIAN',
        actorId,
        actorRole: 'CLINICIAN',
        actorName,
        timestamp: demoNow,
        closureDetails: {
          closureType: 'AUTHORISED_ALTERNATIVE',
          authorisedReason: pending.reason,
          closureNote: pending.note,
          requesterId: pending.requesterId,
          requesterName: pending.requesterName,
          requesterRole: pending.requesterRole,
        },
      });

      if (transResult.success) {
        caseItem.pendingAlternativeClosure = null;
        store.cases.set(caseId, transResult.updatedCase);
        store.caseEvents.push(transResult.event);
      }

      logAuditEvent(
        actorId,
        'CLINICIAN',
        'CASE_CLOSED_AUTHORISED_ALTERNATIVE',
        'Case',
        caseId,
        {
          reason: pending.reason,
          requesterId: pending.requesterId,
          authoriserId: actorId,
          closedAt: demoNow,
        },
        packId
      );

      return NextResponse.json({
        success: true,
        case: caseItem,
        closure: caseItem.closure,
      });
    }

    return NextResponse.json({ error: 'Invalid close action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

