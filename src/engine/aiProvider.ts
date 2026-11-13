import {
  AiApprovalQueueItem,
  AiProvider,
  Case,
  Language,
  Patient,
  UserRole,
  OutreachAttempt,
  CaseEvent,
  BarrierReason,
} from '../types';

export interface DropOffRiskFactor {
  factor: string;
  weight: number;
  description: string;
}

export interface DropOffRiskScore {
  score: number; // 0 - 100
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  topFactors: DropOffRiskFactor[];
  recommendedIntervention: string;
}

/**
 * Calculates a fully transparent, explainable drop-off risk score based on
 * explicit weighted risk rules.
 */
export function calculateDropOffRisk(
  caseItem: Case,
  events: CaseEvent[] = [],
  outreachAttempts: OutreachAttempt[] = []
): DropOffRiskScore {
  const factors: DropOffRiskFactor[] = [];
  let totalScore = 0;

  // 1. Unacknowledged / Engagement Delay
  const now = new Date();
  const issuedTime = new Date(caseItem.createdAt).getTime();
  const hoursSinceIssue = (now.getTime() - issuedTime) / (1000 * 60 * 60);

  if (!caseItem.acknowledgedAt) {
    if (hoursSinceIssue > 72 || caseItem.isOverdue) {
      factors.push({
        factor: 'UNACKNOWLEDGED_OVERDUE',
        weight: 30,
        description: 'Screening notification remains unacknowledged past the 72h SLA window.',
      });
      totalScore += 30;
    } else if (hoursSinceIssue > 48) {
      factors.push({
        factor: 'UNACKNOWLEDGED_48H',
        weight: 20,
        description: 'Screening notification unacknowledged for > 48 hours.',
      });
      totalScore += 20;
    }
  }

  // 2. Barrier Reasons Identified during outreach
  const recentBarriers = outreachAttempts
    .filter((o) => o.barrierReason)
    .map((o) => o.barrierReason as BarrierReason);

  if (recentBarriers.includes('COMMUNICATION_FAILURE') || recentBarriers.includes('LOW_HEALTH_LITERACY')) {
    factors.push({
      factor: 'HEALTH_LITERACY_OR_COMMUNICATION_BARRIER',
      weight: 25,
      description: 'Understanding check failed or communication barrier recorded by care team.',
    });
    totalScore += 25;
  }

  if (recentBarriers.includes('TRANSPORT') || recentBarriers.includes('FINANCIAL_OR_INSURANCE')) {
    factors.push({
      factor: 'LOGISTICAL_OR_INSURANCE_BARRIER',
      weight: 20,
      description: 'Patient reported structural transport or insurance coverage impediment.',
    });
    totalScore += 20;
  }

  if (recentBarriers.includes('FEAR_OR_ANXIETY')) {
    factors.push({
      factor: 'PSYCHOSOCIAL_AVOIDANCE',
      weight: 15,
      description: 'Patient exhibited significant apprehension or procedural avoidance.',
    });
    totalScore += 15;
  }

  // 3. Referral or Facility Stagnation
  if (caseItem.currentState === 'REJECTED') {
    factors.push({
      factor: 'REFERRAL_REJECTED',
      weight: 35,
      description: 'Specialist facility rejected referral. Case stalled without active clinic destination.',
    });
    totalScore += 35;
  } else if (caseItem.currentState === 'REFERRAL_SENT' && !caseItem.referralAcceptedAt) {
    factors.push({
      factor: 'REFERRAL_PENDING_ACCEPTANCE',
      weight: 15,
      description: 'Referral sent to diagnostic facility but not yet accepted.',
    });
    totalScore += 15;
  }

  // 4. Clinical Urgency without Attendance
  if (caseItem.urgency === 'CRITICAL' && !caseItem.attendedAt) {
    factors.push({
      factor: 'CRITICAL_URGENCY_UNATTENDED',
      weight: 20,
      description: 'High-risk screening result requiring rapid follow-up is not yet attended.',
    });
    totalScore += 20;
  }

  // 5. Overdue Status
  if (caseItem.isOverdue) {
    factors.push({
      factor: 'SLA_BREACH_OVERDUE',
      weight: 25,
      description: 'Case has exceeded jurisdiction clinical deadline SLA.',
    });
    totalScore += 25;
  }

  // Baseline risk
  const finalScore = Math.min(100, Math.max(5, totalScore || 10));

  let level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
  if (finalScore >= 75) level = 'CRITICAL';
  else if (finalScore >= 50) level = 'HIGH';
  else if (finalScore >= 25) level = 'MEDIUM';

  // Sort top factors by weight
  const sortedFactors = factors.sort((a, b) => b.weight - a.weight);

  // Derive recommended intervention
  let recommendedIntervention = 'Continue standard automated multi-channel protocol.';
  if (level === 'CRITICAL') {
    recommendedIntervention = 'Immediate same-day telephone navigation and secondary facility reassignment.';
  } else if (level === 'HIGH') {
    recommendedIntervention = 'Schedule proactive navigator voice outreach; assess barrier causes.';
  } else if (level === 'MEDIUM') {
    recommendedIntervention = 'Dispatch bilingual SMS reminder and queue for navigator review within 48h.';
  }

  return {
    score: finalScore,
    level,
    topFactors: sortedFactors,
    recommendedIntervention,
  };
}

/**
 * Generates an executive hand-off summary for multidisciplinary team transfer.
 */
export function generateHandoffSummary(
  caseItem: Case,
  patient: Patient,
  events: CaseEvent[] = [],
  outreachAttempts: OutreachAttempt[] = []
): string {
  const isUrgent = caseItem.urgency === 'CRITICAL' || caseItem.urgency === 'URGENT';
  const barriers = outreachAttempts.filter((o) => o.barrierReason).map((o) => o.barrierReason);
  const barrierText = barriers.length > 0 ? Array.from(new Set(barriers)).join(', ') : 'None recorded';

  return `[CareLoop Clinical Hand-off Summary]
Patient: ${patient.fullName} (${patient.gender}, DOB: ${patient.dateOfBirth})
Case ID: ${caseItem.caseNumber} | Pathway: ${caseItem.pathwayId.toUpperCase()}
Current Stage: ${caseItem.currentState} | Urgency: ${caseItem.urgency} ${isUrgent ? '⚠️ PRIORITY' : ''}
Clinical Deadline: ${new Date(caseItem.clinicalDeadline).toLocaleDateString()} (${caseItem.slaWorkingDaysRemaining} working days remaining)
SLA Status: ${caseItem.isOverdue ? 'EXCEEDED (OVERDUE)' : 'ON TRACK'}
Identified Barriers: ${barrierText}
Total Outreach Attempts: ${outreachAttempts.length}
Key Milestone Progress:
- Notified: ${caseItem.notificationDeliveredAt ? 'Yes' : 'No'}
- Acknowledged: ${caseItem.acknowledgedAt ? 'Yes' : 'No'}
- Understanding Confirmed: ${caseItem.understandingConfirmedAt ? 'Yes' : 'No'}
- Referral Created: ${caseItem.referralCreatedAt ? 'Yes' : 'No'}
- Diagnostic Disposition: ${caseItem.diagnosticDispositionDocumentedAt ? 'Yes' : 'No'}
Next Best Action: ${
    caseItem.currentState === 'REJECTED'
      ? 'Reassign referral to accredited secondary diagnostic center.'
      : !caseItem.acknowledgedAt
      ? 'Conduct structured phone navigation to secure acknowledgment and address patient questions.'
      : !caseItem.appointmentBookedAt
      ? 'Facilitate direct appointment booking at receiving endoscopy or imaging suite.'
      : 'Verify appointment attendance and obtain pathology report.'
  }`;
}

/**
 * Mock implementation of the CareLoop AI Provider.
 * Strictly deterministic and local with ZERO external API calls.
 * Provides culturally nuanced, multilingual notification templates and safety checks.
 */
export class MockAiProvider implements AiProvider {
  name = 'MockCareLoopGenAI-v1.0-Local';

  async generateDraftNotification(params: {
    patient: Patient;
    caseItem: Case;
    language: Language;
    organizationName?: string;
  }): Promise<{
    draftText: string;
    modelIdentifier: string;
    confidenceScore: number;
  }> {
    const { patient, caseItem, language } = params;
    const isColorectal = caseItem.pathwayId.includes('colorectal') || caseItem.pathwayId.includes('fobt');
    const isUrgent = caseItem.urgency === 'CRITICAL' || caseItem.urgency === 'URGENT';
    const orgName = params.organizationName || 'Preventive Screening Programme';

    let draftText = '';

    if (language === 'ar') {
      const patientName = patient.fullNameArabic || patient.fullName;
      if (isColorectal) {
        draftText = `عزيزي/عزيزتي ${patientName}،\n\nنأمل أن تكون بأتم الصحة والعافية. نود إبلاغكم بأن نتيجة فحص القولون والمستقيم الدوري الأخير تتطلب استكمال بعض الفحوصات التشخيصية التأكيدية لضمان سلامتكم وراحتكم.\n\nإن وجود نتيجة غير حاسمة أو إيجابية لا يعني بالضرورة وجود مرض خطير، ولكنه خطوة استباقية مهمة تتيح لفريقنا الطبي تقديم الرعاية الأفضل في الوقت المناسب.\n\nيرجى التواصل مع منسق الرعاية المخصص لكم، أو الضغط على الرابط أدناه لتحديد موعد مناسب:\nhttps://careloop.health/ack/${caseItem.caseNumber}\n\nمع تمنياتنا لكم بدوام الصحة،\nفريق برنامج الرعاية الوقائية`;
      } else {
        draftText = `عزيزتي ${patientName}،\n\nتحية طيبة وبعد، نحيطك علماً بأن نتيجة الفحص الدوري الأخير تتطلب إجراء فحص تصويري تكميلي من قبل الفريق الطبي المختص.\n\nنود طمأنتك بأن الفحوصات التكميلية هي إجراء وقائي روتيني وموصى به لمتابعة أدق التفاصيل.\n\nقام فريق التنسيق الطبي بحجز موعد استشاري مبدئي لك. يرجى تأكيد الموعد عبر الرابط التالي أو الاتصال بنا مباشرة:\nhttps://careloop.health/ack/${caseItem.caseNumber}\n\nدمتِ بصحة وأمان،\nفريق رعاية صحة المرأة`;
      }
    } else {
      const patientName = patient.fullName;
      if (isColorectal) {
        draftText = `Dear ${patientName},\n\nWe hope this message finds you in good health. We are reaching out regarding your recent routine colorectal screening test, which shows findings that recommend a routine confirmatory follow-up consultation.\n\nPlease be reassured that an abnormal screening result is very common and does not indicate cancer; it simply means further diagnostic evaluation (such as a colonoscopy) is needed as a proactive health measure.\n\nYour assigned Care Navigator is ready to assist you with scheduling and any questions. Please tap below to acknowledge and view available appointments:\nhttps://careloop.health/ack/${caseItem.caseNumber}\n\nWarm regards,\n${orgName}`;
      } else {
        draftText = `Dear ${patientName},\n\nWe are writing to share an update on your recent routine screening examination. The clinical team has recommended a supplementary diagnostic evaluation to ensure thorough review.\n\nThis is a standard follow-up step designed to give you clarity and peace of mind. A specialized appointment has been provisioned for you.\n\nPlease confirm your preferred timing using this secure link:\nhttps://careloop.health/ack/${caseItem.caseNumber}\n\nWith care,\n${orgName}`;
      }
    }

    if (isUrgent) {
      if (language === 'ar') {
        draftText += `\n\n[تنبيه سريري ذو أولوية: سيتصل بكم منسق الرعاية الطبية مباشرة خلال الساعات القادمة للمساعدة الفورية.]`;
      } else {
        draftText += `\n\n[Priority Clinical Notice: A care coordinator will follow up with you directly via telephone within the next few hours.]`;
      }
    }

    return {
      draftText,
      modelIdentifier: this.name,
      confidenceScore: 0.96,
    };
  }
}

/**
 * Creates an entry in the mandatory human-in-the-loop AI Approval Queue.
 */
export function createApprovalQueueItem(params: {
  caseId: string;
  patientId: string;
  draftText: string;
  modelIdentifier: string;
  language: Language;
  contentType?: 'PATIENT_NOTIFICATION' | 'NAVIGATION_SCRIPT' | 'CLINICAL_SUMMARY';
  clinicalFacts?: string;
}): AiApprovalQueueItem {
  return {
    id: `AI-REV-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    caseId: params.caseId,
    patientId: params.patientId,
    generatedByModel: params.modelIdentifier,
    contentType: params.contentType || 'PATIENT_NOTIFICATION',
    language: params.language,
    draftContent: params.draftText,
    status: 'PENDING_REVIEW',
    reviewerId: null,
    reviewerRole: null,
    reviewNotes: params.clinicalFacts || null,
    reviewedAt: null,
    sentAt: null,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Approves a queued AI communication item with optional human edits before patient dispatch.
 */
export function approveQueueItem(
  item: AiApprovalQueueItem,
  reviewerId: string,
  reviewerRole: UserRole,
  options?: {
    modifiedContent?: string;
    reviewNotes?: string;
  }
): AiApprovalQueueItem {
  const isModified = options?.modifiedContent && options.modifiedContent.trim() !== item.draftContent.trim();
  const now = new Date().toISOString();

  return {
    ...item,
    status: isModified ? 'MODIFIED_AND_APPROVED' : 'APPROVED',
    draftContent: options?.modifiedContent || item.draftContent,
    reviewerId,
    reviewerRole,
    reviewNotes: options?.reviewNotes || item.reviewNotes || null,
    reviewedAt: now,
    sentAt: now,
  };
}

/**
 * Rejects an AI draft communication, stopping any automated dispatch.
 */
export function rejectQueueItem(
  item: AiApprovalQueueItem,
  reviewerId: string,
  reviewerRole: UserRole,
  rejectionReason: string
): AiApprovalQueueItem {
  return {
    ...item,
    status: 'REJECTED',
    reviewerId,
    reviewerRole,
    reviewNotes: rejectionReason,
    reviewedAt: new Date().toISOString(),
    sentAt: null,
  };
}
