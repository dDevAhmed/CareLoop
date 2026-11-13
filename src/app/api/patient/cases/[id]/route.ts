import { NextRequest, NextResponse } from 'next/server';
import { getStore, getActivePackId } from '@/services/caseRepository';
import { getPatientFromToken, verifyPatientOwnsCase } from '@/services/patientAuth';
import { getPatientResultTemplate, SYNTHETIC_DEMO_FOOTER } from '@/config/patientTemplates';
import { getJurisdictionPack } from '@/packs';

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
      return NextResponse.json(
        { error: 'Unauthorized: Valid patient authentication token required.' },
        { status: 401 }
      );
    }

    const isOwner = verifyPatientOwnsCase(patient, caseId, packId);
    if (!isOwner) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to access another patient\'s medical case.' },
        { status: 403 }
      );
    }

    const store = getStore(packId);
    const caseItem = store.cases.get(caseId);
    if (!caseItem) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    const pack = getJurisdictionPack(packId);
    const template = getPatientResultTemplate(caseItem.pathwayId, patient.language || 'en');

    // Find linked referral & appointment if any
    const referral = Array.from(store.referrals.values()).find((r) => r.caseId === caseId) || null;
    const appointment = Array.from(store.appointments.values()).find((a) => a.caseId === caseId) || null;

    // Filter messages: patient can ONLY see PATIENT_TO_CLINICIAN thread
    const allMessages = store.consultMessages.get(caseId) || [];
    const patientVisibleMessages = allMessages.filter(
      (m) => m.threadType === 'PATIENT_TO_CLINICIAN'
    );

    // Compute plain-language "What Happens Next" explanation based on current status
    let nextStepTitle = 'Step 1: Acknowledge & Understand Your Result';
    let nextStepExplanation = 'Please review your screening test details and answer 3 quick questions to confirm you understand the findings.';

    if (!caseItem.milestones.acknowledgedAt) {
      nextStepTitle = 'Action Required: Acknowledge Test Result';
      nextStepExplanation = 'Please tap "I Acknowledge Receipt" below so your care team knows you have safely received this message.';
    } else if (!caseItem.milestones.understandingConfirmedAt) {
      nextStepTitle = 'Action Required: Complete 3-Question Understanding Check';
      nextStepExplanation = 'Answer 3 brief questions below to confirm next steps. If you have any difficulty, a nurse navigator will phone you to explain.';
    } else if (caseItem.currentState === 'CONFIRMATORY_TEST' || caseItem.currentState === 'REFERRAL_SENT') {
      nextStepTitle = 'Step 2: Referral Sent to Diagnostic Centre';
      nextStepExplanation = `Your referral has been submitted to ${referral?.receivingFacilityName || 'the specialist diagnostic endoscopy unit'}. You will receive a booking confirmation shortly.`;
    } else if (caseItem.currentState === 'REFERRAL_ACCEPTED') {
      nextStepTitle = 'Step 3: Referral Accepted — Booking In Progress';
      nextStepExplanation = 'The specialist centre has accepted your referral. Our scheduling coordinator is selecting the earliest available appointment.';
    } else if (caseItem.currentState === 'APPOINTMENT_BOOKED') {
      nextStepTitle = 'Step 4: Confirmatory Appointment Scheduled';
      nextStepExplanation = `Your appointment is booked for ${appointment?.appointmentDate || 'the upcoming clinic session'}. Please review fasting and preparation instructions.`;
    } else if (caseItem.currentState === 'ATTENDED') {
      nextStepTitle = 'Step 5: Appointment Attended — Awaiting Pathology';
      nextStepExplanation = 'You have completed your examination. Your doctor is finalizing the official diagnostic disposition report.';
    } else if (caseItem.currentState === 'DIAGNOSTIC_DISPOSITION_DOCUMENTED') {
      nextStepTitle = 'Step 6: Diagnostic Findings Documented';
      nextStepExplanation = 'Your diagnostic report is complete and verified by the specialist. Your primary doctor is closing the screening loop or planning surveillance.';
    } else if (caseItem.currentState === 'CLOSED') {
      nextStepTitle = 'Loop Closed: Screening Cycle Complete';
      nextStepExplanation = caseItem.closure?.closureType === 'CLINICAL_RESOLUTION'
        ? 'Diagnostic follow-up has resolved with documented clinical evidence. You are safely cleared until your next routine screening interval.'
        : `Case closed under authorized alternative disposition (${caseItem.closure?.authorisedReason}).`;
    }

    return NextResponse.json({
      success: true,
      case: caseItem,
      patient,
      pack: {
        id: pack.id,
        name: pack.name,
        languages: pack.languages,
      },
      template,
      referral,
      appointment,
      messages: patientVisibleMessages,
      nextStep: {
        title: nextStepTitle,
        explanation: nextStepExplanation,
      },
      criticalInstruction: caseItem.urgency === 'CRITICAL' ? template.criticalAlert : null,
      syntheticFooter: SYNTHETIC_DEMO_FOOTER,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
