import { NextRequest, NextResponse } from 'next/server';
import { getStore, getActivePackId } from '@/services/caseRepository';
import { determineNextOutreachAction } from '@/engine/outreachEngine';
import { getPathwayConfig } from '@/config/pathways';
import { assessCaseHealth } from '@/engine/slaEngine';
import { UserRole } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const packId = request.nextUrl.searchParams.get('pack') || getActivePackId();
    const actorRole = (request.headers.get('x-user-role') || 'CLINICIAN') as UserRole;
    const actorId = request.headers.get('x-user-id') || '';

    const store = getStore(packId);

    const caseItem = store.cases.get(id);
    if (!caseItem) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    // Role-based access: If user role is PATIENT, strictly enforce that they own the case
    if (actorRole === 'PATIENT' && actorId && caseItem.patientId !== actorId) {
      return NextResponse.json(
        { error: 'Forbidden: A patient cannot view another patient\'s medical case.' },
        { status: 403 }
      );
    }

    const patient = store.patients.get(caseItem.patientId);
    const events = store.caseEvents
      .filter((e) => e.caseId === id)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const outreach = store.outreachAttempts
      .filter((o) => o.caseId === id)
      .sort((a, b) => new Date(a.attemptedAt).getTime() - new Date(b.attemptedAt).getTime());

    const referrals = Array.from(store.referrals.values()).filter((r) => r.caseId === id);
    const appointments = Array.from(store.appointments.values()).filter((a) => a.caseId === id);

    const auditHistory = store.auditLogs
      .filter((a) => a.resourceId === id || a.resourceId === caseItem.patientId)
      .sort((a, b) => a.sequenceNumber - b.sequenceNumber);

    const pathwayConfig = getPathwayConfig(caseItem.pathwayId);
    const nextOutreachRecommendation = pathwayConfig
      ? determineNextOutreachAction(caseItem, outreach, pathwayConfig)
      : null;

    const healthAssessment = assessCaseHealth(caseItem);

    // Consult messages with role-based visibility
    const allMessages = store.consultMessages.get(id) || [];
    const consultMessages =
      actorRole === 'PATIENT'
        ? allMessages.filter((m) => m.threadType === 'PATIENT_TO_CLINICIAN')
        : allMessages;

    const diagnosticReport = store.diagnosticReports.get(id) || caseItem.diagnosticReport || null;

    return NextResponse.json({
      case: {
        ...caseItem,
        patient,
        diagnosticReport,
      },
      patient,
      events,
      outreachAttempts: outreach,
      referrals,
      appointments,
      consultMessages,
      diagnosticReport,
      pendingAlternativeClosure: caseItem.pendingAlternativeClosure || null,
      auditHistory,
      nextOutreachRecommendation,
      healthAssessment,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
