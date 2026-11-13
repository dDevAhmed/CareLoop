import { NextRequest, NextResponse } from 'next/server';
import { getStore, getActivePackId, logAuditEvent } from '@/services/caseRepository';
import { getCurrentDemoTime } from '@/services/demoClock';
import { transitionCase } from '@/engine/stateMachine';
import { UserRole } from '@/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: caseId } = await params;
    const packId = request.nextUrl.searchParams.get('pack') || getActivePackId();
    const actorRole = (request.headers.get('x-user-role') || 'CLINICIAN') as UserRole;
    const actorId = request.headers.get('x-user-id') || 'USER-FACILITY-TRIAGE';
    const actorName = request.headers.get('x-user-name') || 'Diagnostic Unit Intake';

    // Analyst is read-only
    if (actorRole === 'PROGRAMME_ANALYST') {
      return NextResponse.json({ error: 'Forbidden: Programme Analyst role is read-only.' }, { status: 403 });
    }

    const body = await request.json();
    const { action, rejectionReason } = body;

    const store = getStore(packId);
    const caseItem = store.cases.get(caseId);
    if (!caseItem) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    const referral = Array.from(store.referrals.values()).find((r) => r.caseId === caseId);
    if (!referral) {
      return NextResponse.json({ error: 'No active referral found for this case' }, { status: 404 });
    }

    const demoNow = getCurrentDemoTime();

    if (action === 'ACCEPT') {
      referral.status = 'ACCEPTED';
      referral.acceptedAt = demoNow;
      caseItem.milestones.referralAcceptedAt = demoNow;

      const transResult = transitionCase(caseItem, {
        targetState: 'REFERRAL_ACCEPTED',
        trigger: 'RECEIVING_FACILITY_ACCEPTED_REFERRAL',
        actorId,
        actorRole,
        actorName,
        timestamp: demoNow,
        metadata: { referralId: referral.id },
      });

      if (transResult.success) {
        store.cases.set(caseId, transResult.updatedCase);
        store.caseEvents.push(transResult.event);
      }

      logAuditEvent(
        actorId,
        actorRole,
        'REFERRAL_ACCEPTED',
        'Referral',
        referral.id,
        {
          caseId,
          facilityName: referral.receivingFacilityName,
        },
        packId
      );

      return NextResponse.json({
        success: true,
        action: 'ACCEPTED',
        referral,
        case: caseItem,
      });
    }

    if (action === 'REJECT') {
      if (!rejectionReason || !rejectionReason.trim()) {
        return NextResponse.json(
          { error: 'Rejection requires a documented reason code or note.' },
          { status: 400 }
        );
      }

      referral.status = 'REJECTED';
      referral.rejectionReason = rejectionReason.trim();
      referral.rejectedAt = demoNow;

      // Returning the case to the owner as ESCALATED
      const transResult = transitionCase(caseItem, {
        targetState: 'ESCALATED',
        trigger: 'REFERRAL_REJECTED_BY_RECEIVING_FACILITY',
        actorId,
        actorRole,
        actorName,
        timestamp: demoNow,
        barrierReason: 'APPOINTMENT_UNAVAILABLE',
        metadata: {
          referralId: referral.id,
          rejectionReason: referral.rejectionReason,
        },
      });

      if (transResult.success) {
        store.cases.set(caseId, transResult.updatedCase);
        store.caseEvents.push(transResult.event);
      }

      logAuditEvent(
        actorId,
        actorRole,
        'REFERRAL_REJECTED_CASE_ESCALATED',
        'Referral',
        referral.id,
        {
          caseId,
          rejectionReason: referral.rejectionReason,
          returnedToOwner: caseItem.primaryOwnerId,
        },
        packId
      );

      return NextResponse.json({
        success: true,
        action: 'REJECTED',
        referral,
        case: caseItem,
        message: `Referral rejected: ${rejectionReason}. Case returned to owner as ESCALATED.`,
      });
    }

    return NextResponse.json({ error: 'Action must be ACCEPT or REJECT' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

