import { NextRequest, NextResponse } from 'next/server';
import { getStore, getActivePackId } from '@/services/caseRepository';
import { determineNextOutreachAction } from '@/engine/outreachEngine';
import { getJurisdictionPack } from '@/packs';
import { UserRole } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const packId = request.nextUrl.searchParams.get('pack') || getActivePackId();
    const actorRole = (request.headers.get('x-user-role') || 'NAVIGATOR') as UserRole;
    const store = getStore(packId);
    const pack = getJurisdictionPack(packId);

    const workList: any[] = [];

    for (const c of store.cases.values()) {
      if (c.currentState === 'CLOSED' || c.currentState === 'REJECTED') {
        continue;
      }

      const patient = store.patients.get(c.patientId);
      const caseOutreach = store.outreachAttempts
        .filter((o) => o.caseId === c.id)
        .sort((a, b) => new Date(a.attemptedAt).getTime() - new Date(b.attemptedAt).getTime());

      const pathway = pack.pathways.find((p) => p.id === c.pathwayId) || pack.pathways[0];
      const nextAction = pathway ? determineNextOutreachAction(c, caseOutreach, pathway as any) : null;

      // Check if there is an understanding failure call task or missing acknowledgement
      const hasUnderstandingFailureTask = caseOutreach.some(
        (o) => o.channel === 'CALL' && o.outcome === 'NO_ANSWER' && o.barrierReason === 'COMMUNICATION_FAILURE'
      );

      const isUnacknowledged = !c.milestones.acknowledgedAt;
      const isDue = (nextAction?.actionRequired || nextAction?.isOverdue || hasUnderstandingFailureTask || c.isOverdue || c.urgency === 'CRITICAL');

      if (isDue || caseOutreach.length === 0) {
        workList.push({
          caseId: c.id,
          caseNumber: c.caseNumber,
          pathwayId: c.pathwayId,
          pathwayName: pathway?.name || c.pathwayId,
          urgency: c.urgency,
          isOverdue: c.isOverdue,
          currentState: c.currentState,
          patient: patient ? {
            id: patient.id,
            fullName: patient.fullName,
            fullNameArabic: patient.fullNameArabic,
            phone: patient.phone,
            language: patient.language,
            nationalityGroup: patient.nationalityGroup,
            residencyStatus: patient.residencyStatus,
          } : null,
          nextAction: nextAction ? {
            channel: hasUnderstandingFailureTask ? 'CALL' : nextAction.channel,
            assignedRole: nextAction.assignedRole,
            delayWorkingDays: 0,
            actionDescription: hasUnderstandingFailureTask
              ? 'Urgent Phone Call: Patient failed understanding test twice. Human explanation required.'
              : nextAction.description,
            due: true,
          } : {
            channel: 'CALL',
            assignedRole: 'NAVIGATOR',
            actionDescription: 'Direct Phone Navigation Review',
            due: true,
          },
          totalAttempts: caseOutreach.length,
          latestAttempt: caseOutreach[caseOutreach.length - 1] || null,
        });
      }
    }

    // Sort work list: CRITICAL first, then overdue, then most recent
    workList.sort((a, b) => {
      if (a.urgency === 'CRITICAL' && b.urgency !== 'CRITICAL') return -1;
      if (a.urgency !== 'CRITICAL' && b.urgency === 'CRITICAL') return 1;
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      return 0;
    });

    return NextResponse.json({
      success: true,
      totalDueTasks: workList.length,
      tasks: workList,
      role: actorRole,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
