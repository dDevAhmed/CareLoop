import { NextRequest, NextResponse } from 'next/server';
import {
  advanceDemoClock,
  resetDemoClock,
  getDemoClockState,
  getCurrentDemoTime,
} from '@/services/demoClock';
import { getStore, getActivePackId, logAuditEvent } from '@/services/caseRepository';
import { getJurisdictionPack } from '@/packs';
import { computeCaseSla } from '@/engine/slaEngine';
import { UserRole } from '@/types';

export async function GET() {
  const state = getDemoClockState();
  return NextResponse.json(state);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { advanceDays, reset } = body;

    let clockState;
    if (reset) {
      clockState = resetDemoClock();
    } else if (typeof advanceDays === 'number') {
      clockState = advanceDemoClock(advanceDays);
    } else {
      return NextResponse.json({ error: 'advanceDays or reset required' }, { status: 400 });
    }

    const demoNow = getCurrentDemoTime();
    const activePackId = getActivePackId();
    const store = getStore(activePackId);
    const pack = getJurisdictionPack(activePackId);

    // Recompute SLA and overdue flags for all active cases in the active pack
    let overdueCount = 0;
    let newlyEscalatedCount = 0;

    for (const c of store.cases.values()) {
      const pathway = pack.pathways.find((p) => p.id === c.pathwayId) || pack.pathways[0];
      if (!pathway) continue;

      const sla = computeCaseSla(
        c.createdAt,
        pathway as any,
        c.urgency,
        demoNow,
        pack.workingDayCalendar
      );

      const wasOverdue = c.isOverdue;
      c.isOverdue = sla.isOverdue;
      c.slaWorkingDaysRemaining = sla.workingDaysRemaining;
      c.clinicalDeadline = sla.clinicalDeadline;

      if (c.isOverdue) overdueCount++;

      // If case became overdue and is still in an open non-terminal state, demonstrate escalation
      if (
        !wasOverdue &&
        c.isOverdue &&
        c.currentState !== 'CLOSED' &&
        c.currentState !== 'REJECTED' &&
        c.currentState !== 'ESCALATED'
      ) {
        c.currentState = 'ESCALATED';
        c.assignedOwner = {
          id: 'CLN-ESCALATION-LEAD',
          name: 'Dr. Tariq (Senior Triage Lead)',
          role: 'CLINICIAN' as UserRole,
        };
        newlyEscalatedCount++;

        const escEvt = {
          id: `EVT-DEMO-ESC-${c.id}-${Date.now()}`,
          caseId: c.id,
          fromState: c.currentState,
          toState: 'ESCALATED' as const,
          trigger: 'DEMO_CLOCK_OVERDUE_ESCALATION',
          ownerId: 'SYS-DEMO-CLOCK',
          ownerRole: 'PROGRAMME_ANALYST' as UserRole,
          timestamp: demoNow,
          metadata: {
            note: `Case flagged OVERDUE by demo clock advance (+${advanceDays || 0}d). Automatically escalated and reassigned to Senior Triage Lead.`,
          },
        };
        store.caseEvents.push(escEvt);
        if (!c.events) c.events = [];
        c.events.push(escEvt);
      }
    }

    logAuditEvent(
      'ADMIN-DEMO-USER',
      'PROGRAMME_ANALYST',
      reset ? 'DEMO_CLOCK_RESET' : 'DEMO_CLOCK_ADVANCED',
      'DemoClock',
      'GLOBAL-DEMO-CLOCK',
      {
        advanceDays: advanceDays || 0,
        simulatedNow: clockState.simulatedNow,
        realNow: clockState.realNow,
        overdueCount,
        newlyEscalatedCount,
      },
      activePackId
    );

    return NextResponse.json({
      success: true,
      clockState,
      impact: {
        overdueCount,
        newlyEscalatedCount,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
