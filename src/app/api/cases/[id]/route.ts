import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@/services/caseRepository';
import { determineNextOutreachAction } from '@/engine/outreachEngine';
import { getPathwayConfig } from '@/config/pathways';
import { assessCaseHealth } from '@/engine/slaEngine';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const store = getStore();

  const caseItem = store.cases.get(id);
  if (!caseItem) {
    return NextResponse.json({ error: 'Case not found' }, { status: 404 });
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

  return NextResponse.json({
    case: {
      ...caseItem,
      patient,
    },
    patient,
    events,
    outreachAttempts: outreach,
    referrals,
    appointments,
    auditHistory,
    nextOutreachRecommendation,
    healthAssessment,
  });
}

