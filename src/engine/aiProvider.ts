import { AiApprovalQueueItem, AiProvider, Case, Language, Patient, UserRole } from '../types';

/**
 * Mock implementation of the CareLoop AI Provider.
 * Strictly deterministic and local with ZERO external API calls.
 * Provides culturally nuanced, multilingual notification templates.
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
    reviewNotes: null,
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
    reviewNotes: options?.reviewNotes || null,
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
