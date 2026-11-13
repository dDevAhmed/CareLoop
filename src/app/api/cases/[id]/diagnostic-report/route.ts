import { NextRequest, NextResponse } from 'next/server';
import { getStore, getActivePackId, logAuditEvent } from '@/services/caseRepository';
import { getCurrentDemoTime } from '@/services/demoClock';
import { transitionCase } from '@/engine/stateMachine';
import { DiagnosticReport, UserRole } from '@/types';

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
    const {
      disposition,
      findingsSummary,
      histopathologyGrade,
      facilityName,
      signedByClinician,
    } = body;

    if (!disposition || !findingsSummary) {
      return NextResponse.json(
        { error: 'disposition and findingsSummary are required fields for a diagnostic report.' },
        { status: 400 }
      );
    }

    const demoNow = getCurrentDemoTime();

    const report: DiagnosticReport = {
      reportId: `REP-${caseId.substring(0, 8)}-${Date.now().toString().slice(-6)}`,
      caseId,
      disposition: disposition.trim(),
      findingsSummary: findingsSummary.trim(),
      histopathologyGrade: histopathologyGrade || 'Benign / Low Grade',
      facilityName: facilityName || 'Regional Diagnostic Endoscopy Centre',
      signedByClinician: signedByClinician || actorName,
      uploadedAt: demoNow,
    };

    caseItem.diagnosticReport = report;
    store.diagnosticReports.set(caseId, report);
    caseItem.milestones.diagnosticDispositionDocumentedAt = demoNow;

    const transResult = transitionCase(caseItem, {
      targetState: 'DIAGNOSTIC_DISPOSITION_DOCUMENTED',
      trigger: 'DIAGNOSTIC_DISPOSITION_REPORT_UPLOADED',
      actorId,
      actorRole,
      actorName,
      timestamp: demoNow,
      metadata: { reportId: report.reportId, disposition: report.disposition },
    });

    if (transResult.success) {
      store.cases.set(caseId, transResult.updatedCase);
      store.caseEvents.push(transResult.event);
    }

    logAuditEvent(
      actorId,
      actorRole,
      'DIAGNOSTIC_DISPOSITION_DOCUMENTED',
      'Case',
      caseId,
      {
        reportId: report.reportId,
        disposition: report.disposition,
        findingsSummary: report.findingsSummary,
        signedBy: report.signedByClinician,
      },
      packId
    );

    return NextResponse.json({
      success: true,
      report,
      case: caseItem,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

