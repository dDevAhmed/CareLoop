import { NextRequest, NextResponse } from 'next/server';
import { getStore, getActivePackId, logAuditEvent } from '@/services/caseRepository';
import { getPatientFromToken, verifyPatientOwnsCase } from '@/services/patientAuth';
import { getCurrentDemoTime } from '@/services/demoClock';
import { getPatientResultTemplate } from '@/config/patientTemplates';
import { UserRole } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: caseId } = await params;
    const token = request.headers.get('x-patient-token') || request.nextUrl.searchParams.get('token');
    const packId = request.nextUrl.searchParams.get('pack') || getActivePackId();

    const patient = getPatientFromToken(token, packId);
    if (!patient) {
      return NextResponse.json({ error: 'Unauthorized: Valid patient token required' }, { status: 401 });
    }

    if (!verifyPatientOwnsCase(patient, caseId, packId)) {
      return NextResponse.json({ error: 'Forbidden: Patient does not own this case' }, { status: 403 });
    }

    const store = getStore(packId);
    const caseItem = store.cases.get(caseId);
    if (!caseItem) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    const template = getPatientResultTemplate(caseItem.pathwayId, patient.language || 'en');
    const outreachAttempts = store.outreachAttempts.filter((a) => a.caseId === caseId);

    // Build simulated plain-text SMS transcript
    const smsTranscript = [
      {
        direction: 'OUTBOUND',
        from: 'CareLoop-Screening',
        to: patient.phone,
        text: `[CareLoop Health Notice] Dear ${patient.fullName}, your screening result for ${template.testDisplayName} is ready. Reply 1 to confirm receipt or visit secure portal.`,
        sentAt: caseItem.createdAt,
      },
    ];

    if (caseItem.milestones.acknowledgedAt) {
      smsTranscript.push({
        direction: 'INBOUND',
        from: patient.phone,
        to: 'CareLoop-Screening',
        text: '1',
        sentAt: caseItem.milestones.acknowledgedAt,
      });
      smsTranscript.push({
        direction: 'OUTBOUND',
        from: 'CareLoop-Screening',
        to: patient.phone,
        text: `Thank you for acknowledging. ${template.simplifiedWording}`,
        sentAt: caseItem.milestones.acknowledgedAt,
      });
    }

    const unacknowledged = !caseItem.milestones.acknowledgedAt;

    return NextResponse.json({
      success: true,
      caseId,
      unacknowledged,
      smsTranscript,
      outreachAttempts,
      notice: 'Low-Bandwidth Plain-Text Interface. SMS reminders alone do not close the care loop.',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: caseId } = await params;
    const token = request.headers.get('x-patient-token') || request.nextUrl.searchParams.get('token');
    const packId = request.nextUrl.searchParams.get('pack') || getActivePackId();

    const patient = getPatientFromToken(token, packId);
    if (!patient) {
      return NextResponse.json({ error: 'Unauthorized: Valid patient token required' }, { status: 401 });
    }

    if (!verifyPatientOwnsCase(patient, caseId, packId)) {
      return NextResponse.json({ error: 'Forbidden: Patient does not own this case' }, { status: 403 });
    }

    const body = await request.json();
    const { action, replyText } = body;
    const store = getStore(packId);
    const caseItem = store.cases.get(caseId);
    if (!caseItem) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    const demoNow = getCurrentDemoTime();

    if (action === 'REPLY_SMS') {
      if (replyText === '1' || replyText?.toLowerCase() === 'yes') {
        if (!caseItem.milestones.notificationDeliveredAt) {
          caseItem.milestones.notificationDeliveredAt = demoNow;
        }
        caseItem.milestones.acknowledgedAt = demoNow;
        if (caseItem.currentState === 'RESULT_ISSUED' || caseItem.currentState === 'PATIENT_NOTIFIED') {
          caseItem.currentState = 'ACKNOWLEDGED';
        }
        store.cases.set(caseItem.id, caseItem);

        logAuditEvent(patient.id, 'PATIENT', 'LOW_BANDWIDTH_SMS_ACKNOWLEDGED', 'Case', caseItem.id, { replyText }, packId);

        return NextResponse.json({
          success: true,
          message: 'SMS acknowledgement received. Care loop advanced to ACKNOWLEDGED.',
          case: caseItem,
        });
      }
    }

    // Trigger escalation: missing acknowledgement after delay creates navigator call task
    if (action === 'ESCALATE_MISSING_ACKNOWLEDGEMENT') {
      const callAttempt = {
        id: `ATT-LOWBW-CALL-${caseItem.id}-${Date.now()}`,
        caseId: caseItem.id,
        channel: 'CALL' as const,
        outcome: 'NO_ANSWER' as const,
        attemptedAt: demoNow,
        byRole: 'NAVIGATOR' as UserRole,
        byUserId: caseItem.primaryOwnerId || 'NAV-OUTREACH-01',
        barrierReason: 'COMMUNICATION_FAILURE' as const,
        notes: 'SMS notification unacknowledged after configured platform SLA window. Automated step-up to Navigator voice phone call task created.',
      };

      store.outreachAttempts.push(callAttempt);

      logAuditEvent(
        'SYS-LOWBW-ENGINE',
        'NAVIGATOR',
        'LOW_BANDWIDTH_UNACKNOWLEDGED_SMS_CALL_TASK_CREATED',
        'OutreachAttempt',
        callAttempt.id,
        {
          caseId: caseItem.id,
          reason: 'SMS alone is not sufficient. Unacknowledged SMS escalated to navigator call task.',
        },
        packId
      );

      return NextResponse.json({
        success: true,
        callTaskCreated: true,
        attempt: callAttempt,
        message: 'SMS alone is not sufficient. Unacknowledged text notification escalated to assigned navigator phone call task.',
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
