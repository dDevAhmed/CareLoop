import { NextRequest, NextResponse } from 'next/server';
import { getStore, getActivePackId, logAuditEvent } from '@/services/caseRepository';
import { getPatientFromToken, verifyPatientOwnsCase } from '@/services/patientAuth';
import { getCurrentDemoTime } from '@/services/demoClock';
import { getPatientResultTemplate } from '@/config/patientTemplates';
import { processUnderstandingSubmission } from '@/engine/understandingEngine';

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

    const store = getStore(packId);
    const caseItem = store.cases.get(caseId);
    if (!caseItem) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    const body = await request.json();
    const { answers } = body; // Array of selected answer indices e.g. [1, 1, 0]

    if (!Array.isArray(answers) || answers.length === 0) {
      return NextResponse.json({ error: 'Answers array is required' }, { status: 400 });
    }

    const template = getPatientResultTemplate(caseItem.pathwayId, patient.language || 'en');
    const demoNow = getCurrentDemoTime();

    const result = processUnderstandingSubmission(
      caseItem,
      patient,
      template.understandingQuestions,
      answers,
      demoNow
    );

    // If a new outreach attempt was generated (e.g. navigator CALL task), add it to store
    if (result.newOutreachAttempt) {
      store.outreachAttempts.push(result.newOutreachAttempt);
    }

    store.cases.set(caseItem.id, caseItem);

    logAuditEvent(
      patient.id,
      'PATIENT',
      result.passed
        ? 'PATIENT_UNDERSTANDING_CONFIRMED'
        : `PATIENT_UNDERSTANDING_FAILED_ATTEMPT_${result.attemptNumber}`,
      'Case',
      caseItem.id,
      {
        attemptNumber: result.attemptNumber,
        score: result.attempt.score,
        totalQuestions: result.attempt.totalQuestions,
        passed: result.passed,
        navigatorCallTaskCreated: result.navigatorCallTaskCreated,
        barrierReason: result.barrierReason,
      },
      packId
    );

    return NextResponse.json({
      success: true,
      passed: result.passed,
      score: result.attempt.score,
      total: result.attempt.totalQuestions,
      attemptNumber: result.attemptNumber,
      simplifiedWording: !result.passed && result.attemptNumber === 1 ? template.simplifiedWording : null,
      navigatorCallTaskCreated: result.navigatorCallTaskCreated,
      barrierReason: result.barrierReason,
      case: caseItem,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

