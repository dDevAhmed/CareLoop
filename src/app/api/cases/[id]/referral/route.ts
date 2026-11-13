import { NextRequest, NextResponse } from 'next/server';
import { getStore, getActivePackId, logAuditEvent } from '@/services/caseRepository';
import { getCurrentDemoTime } from '@/services/demoClock';
import { transitionCase } from '@/engine/stateMachine';
import { Referral, UserRole } from '@/types';

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

    // Governance: Analyst is read-only
    if (actorRole === 'PROGRAMME_ANALYST') {
      return NextResponse.json(
        { error: 'Forbidden: Programme Analyst role is strictly read-only and cannot dispatch referrals.' },
        { status: 403 }
      );
    }

    const store = getStore(packId);
    const caseItem = store.cases.get(caseId);
    if (!caseItem) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    const patient = store.patients.get(caseItem.patientId);
    if (!patient) {
      return NextResponse.json({ error: 'Associated patient not found' }, { status: 404 });
    }

    // MANDATORY GOVERNANCE CONSENT CHECK: Block referral send without data-sharing consent
    if (!patient.consentFlags || !patient.consentFlags.dataSharingConsent) {
      return NextResponse.json(
        {
          success: false,
          blocked: true,
          error:
            'Referral dispatch blocked: Patient data-sharing consent has not been granted. Navigator must obtain affirmative consent before external transfer.',
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      receivingFacilityId,
      receivingFacilityName,
      specialty,
      urgency,
      reason,
      clinicalSummary,
      attachments,
    } = body;

    const demoNow = getCurrentDemoTime();

    const referral: Referral = {
      id: `REF-${caseId.substring(0, 10)}-${Date.now().toString().slice(-6)}`,
      caseId,
      synthetic: true,
      referringProviderId: actorId,
      referringProviderName: actorName,
      receivingFacilityId: receivingFacilityId || 'FAC-DIAG-01',
      receivingFacilityName: receivingFacilityName || 'Central Endoscopy & Diagnostic Hospital',
      specialty: specialty || 'Diagnostic Gastroenterology',
      urgency: urgency || caseItem.urgency,
      reason: reason || `Diagnostic workup for abnormal screening finding (${caseItem.screeningTestType})`,
      clinicalSummary: clinicalSummary || `Patient requires confirmatory evaluation following positive screening result ${caseItem.screeningResultId}.`,
      attachments: attachments || ['Screening-Lab-Report.pdf', 'Patient-Summary.pdf'],
      status: 'PENDING',
      createdAt: demoNow,
    };

    store.referrals.set(referral.id, referral);

    // Transition case state to REFERRAL_SENT
    const transitionResult = transitionCase(caseItem, {
      targetState: 'REFERRAL_SENT',
      trigger: 'REFERRAL_SUBMITTED_TO_SPECIALIST',
      actorId,
      actorRole,
      actorName,
      timestamp: demoNow,
      metadata: { referralId: referral.id },
    });

    if (transitionResult.success) {
      store.cases.set(caseId, transitionResult.updatedCase);
      store.caseEvents.push(transitionResult.event);
    }

    logAuditEvent(
      actorId,
      actorRole,
      'REFERRAL_DISPATCHED',
      'Referral',
      referral.id,
      {
        caseId,
        receivingFacility: referral.receivingFacilityName,
        specialty: referral.specialty,
        urgency: referral.urgency,
        dataSharingConsentVerified: true,
      },
      packId
    );

    return NextResponse.json({
      success: true,
      referral,
      case: caseItem,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

