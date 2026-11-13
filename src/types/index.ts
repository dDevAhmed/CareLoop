/**
 * CareLoop Core Domain Types & Enumerations
 * Aligned with Abu Dhabi Department of Health & Future Health Innovation Standards
 */

export type CaseState =
  | 'RESULT_ISSUED'
  | 'PATIENT_NOTIFIED'
  | 'ACKNOWLEDGED'
  | 'CONFIRMATORY_TEST'
  | 'REFERRAL_SENT'
  | 'REFERRAL_ACCEPTED'
  | 'APPOINTMENT_BOOKED'
  | 'ATTENDED'
  | 'DIAGNOSTIC_DISPOSITION_DOCUMENTED'
  | 'TREATMENT_OR_SURVEILLANCE'
  | 'CLOSED'
  | 'REJECTED'
  | 'ESCALATED';

export type Urgency = 'ROUTINE' | 'URGENT' | 'CRITICAL';

export type UserRole = 'PATIENT' | 'CLINICIAN' | 'NAVIGATOR' | 'PROGRAMME_ANALYST';

export type Language = string;

export type NationalityGroup =
  | 'EMIRATI'
  | 'ARAB_EXPAT'
  | 'SOUTH_ASIAN_EXPAT'
  | 'WESTERN_EXPAT'
  | 'EAST_ASIAN_EXPAT'
  | 'OTHER'
  | string;

export type OutreachChannel = 'SMS' | 'WHATSAPP' | 'CALL' | 'NAVIGATOR_VISIT' | 'CLINICIAN';

export type OutreachOutcome = 'DELIVERED' | 'NO_ANSWER' | 'ACKNOWLEDGED' | 'DECLINED' | 'WRONG_NUMBER';

export type ClosureType = 'CLINICAL_RESOLUTION' | 'AUTHORISED_ALTERNATIVE';

export type AuthorisedAlternativeReason =
  | 'INFORMED_REFUSAL'
  | 'TRANSFERRED_CARE'
  | 'DECEASED'
  | 'UNREACHABLE_AFTER_CONFIGURED_ATTEMPTS'
  | 'OTHER';

export type BarrierReason =
  | 'COST_INSURANCE'
  | 'TRANSPORT'
  | 'FEAR_ANXIETY'
  | 'LOW_HEALTH_LITERACY'
  | 'COMMUNICATION_FAILURE'
  | 'APPOINTMENT_UNAVAILABLE'
  | 'WORKFORCE_CAPACITY'
  | 'COMPETING_PRIORITIES'
  | 'UNREACHABLE'
  | 'OTHER';

export interface ConsentFlags {
  smsConsent: boolean;
  whatsappConsent: boolean;
  callConsent: boolean;
  navigatorOutreachConsent: boolean;
  dataSharingConsent: boolean;
  lastUpdated: string;
}

export interface Patient {
  id: string;
  externalPatientId: string;
  synthetic: boolean;
  fullName: string;
  fullNameArabic?: string;
  dateOfBirth: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  language: Language;
  nationalityGroup?: NationalityGroup;
  emirate?: string;
  region?: string;
  residencyStatus?: string;
  customDemographics?: Record<string, string>;
  phone: string;
  email?: string;
  consentFlags: ConsentFlags;
  createdAt: string;
  updatedAt: string;
}

export * from './pack';

export interface CaseMilestones {
  notificationDeliveredAt?: string | null;
  acknowledgedAt?: string | null;
  understandingConfirmedAt?: string | null;
  referralCreatedAt?: string | null;
  referralAcceptedAt?: string | null;
  appointmentBookedAt?: string | null;
  attendedAt?: string | null;
  diagnosticDispositionDocumentedAt?: string | null;
}

export interface CaseClosure {
  closureType: ClosureType;
  authorisedReason?: AuthorisedAlternativeReason | null;
  authoriserId: string;
  authoriserName: string;
  authoriserRole: UserRole;
  clinicalEvidenceRef?: string | null; // e.g., diagnostic report ID, pathology reference
  closureNote: string;
  closedAt: string;
}

export interface Case {
  id: string;
  caseNumber: string;
  synthetic: boolean;
  patientId: string;
  patient?: Patient;
  pathwayId: string; // e.g. "colorectal-uae", "breast-abudhabi"
  currentState: CaseState;
  previousState?: CaseState | null;
  urgency: Urgency;
  primaryOwnerId?: string | null;
  primaryOwnerRole?: UserRole | null;
  screeningResultId: string;
  screeningTestType: string; // e.g. "FIT_POSITIVE", "MAMMOGRAPHY_SUSPICIOUS"
  screeningTestDate: string;
  snomedCode?: string; // Placeholder illustrative subset
  loincCode?: string; // Placeholder illustrative subset
  milestones: CaseMilestones;
  clinicalDeadline: string; // Absolute due date computed skipping weekends
  platformSlaDueDate: string; // Intermediate SLA due date
  isOverdue: boolean;
  closure?: CaseClosure | null;
  createdAt: string;
  updatedAt: string;
}

export interface CaseEvent {
  id: string;
  caseId: string;
  fromState: CaseState;
  toState: CaseState;
  trigger: string;
  ownerId: string;
  ownerRole: UserRole;
  timestamp: string;
  barrierReason?: BarrierReason | null;
  metadata?: Record<string, unknown>;
}

export interface OutreachAttempt {
  id: string;
  caseId: string;
  channel: OutreachChannel;
  outcome: OutreachOutcome;
  attemptedAt: string;
  byRole: UserRole;
  byUserId: string;
  barrierReason?: BarrierReason | null;
  notes?: string;
}

export interface Referral {
  id: string;
  caseId: string;
  synthetic: boolean;
  referringProviderId: string;
  referringProviderName: string;
  receivingFacilityId: string;
  receivingFacilityName: string;
  specialty: string; // e.g. "Gastroenterology", "Breast Surgery"
  urgency: Urgency;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
  rejectionReason?: string;
  snomedSpecialtyCode?: string; // Illustrative
  createdAt: string;
  acceptedAt?: string | null;
}

export interface Appointment {
  id: string;
  caseId: string;
  referralId?: string;
  facilityId: string;
  facilityName: string;
  appointmentDate: string;
  status: 'SCHEDULED' | 'ATTENDED' | 'CANCELLED' | 'NO_SHOW';
  cancellationReason?: BarrierReason | null;
  attendedAt?: string | null;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  sequenceNumber: number;
  timestamp: string;
  actorId: string;
  actorRole: UserRole;
  action: string;
  resourceType: 'Case' | 'Patient' | 'Referral' | 'Appointment' | 'OutreachAttempt' | 'AiApprovalQueue';
  resourceId: string;
  details: Record<string, unknown>;
  prevHash: string;
  hash: string;
}

export interface EscalationStepConfig {
  step: number;
  delayWorkingDays: number;
  channel: OutreachChannel;
  assignedRole: UserRole;
  description: string;
}

export interface PathwayConfig {
  id: string;
  name: string;
  nameArabic: string;
  jurisdiction: string;
  sourceRef: string;
  verified: boolean;
  referenceOnly?: boolean;
  clinicalDeadlineWorkingDays: number;
  referralTargetPercent: number;
  platformSlaHours: {
    ingestMaxHours: number;
    acknowledgementMaxHours: number;
    referralAcceptanceWorkingDays: number;
    closureDocumentationWorkingDays: number;
  };
  escalationLadder: EscalationStepConfig[];
  codes: {
    screeningLoinc: string;
    screeningLoincDisplay: string;
    confirmatorySnomed: string;
    confirmatorySnomedDisplay: string;
  };
}

export interface AiApprovalQueueItem {
  id: string;
  caseId: string;
  patientId: string;
  generatedByModel: string;
  contentType: 'PATIENT_NOTIFICATION' | 'NAVIGATION_SCRIPT' | 'CLINICAL_SUMMARY';
  language: Language;
  draftContent: string;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'MODIFIED_AND_APPROVED' | 'REJECTED';
  reviewerId?: string | null;
  reviewerRole?: UserRole | null;
  reviewNotes?: string | null;
  reviewedAt?: string | null;
  sentAt?: string | null;
  createdAt: string;
}

export interface AiProvider {
  name: string;
  generateDraftNotification(params: {
    patient: Patient;
    caseItem: Case;
    language: Language;
  }): Promise<{
    draftText: string;
    modelIdentifier: string;
    confidenceScore: number;
  }>;
}

export * from './pack';
