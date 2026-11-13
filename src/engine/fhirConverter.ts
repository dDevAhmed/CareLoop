import { Case, Referral, Appointment, OutreachAttempt, Patient } from '../types';

export const FHIR_NOTICE =
  'Illustrative placeholder FHIR R4 subset. SNOMED CT® and LOINC® codes shown are representative examples. Comprehensive production vocabularies require official affiliate licensing.';

export interface FhirCoding {
  system: string;
  code: string;
  display: string;
}

export interface FhirReference {
  reference: string;
  display?: string;
}

export interface FhirTask {
  resourceType: 'Task';
  id: string;
  identifier: Array<{ system: string; value: string }>;
  status: 'draft' | 'requested' | 'received' | 'accepted' | 'in-progress' | 'completed' | 'cancelled' | 'failed';
  intent: 'order';
  priority: 'routine' | 'urgent' | 'asap' | 'stat';
  code: {
    coding: FhirCoding[];
    text: string;
  };
  focus?: FhirReference;
  for: FhirReference;
  authoredOn: string;
  lastModified: string;
  owner?: FhirReference;
  executionPeriod?: {
    start?: string;
    end?: string;
  };
  note?: Array<{ text: string }>;
  _licenceNotice: string;
}

export interface FhirServiceRequest {
  resourceType: 'ServiceRequest';
  id: string;
  identifier: Array<{ system: string; value: string }>;
  status: 'draft' | 'active' | 'completed' | 'revoked';
  intent: 'order';
  priority: 'routine' | 'urgent' | 'asap' | 'stat';
  code: {
    coding: FhirCoding[];
    text: string;
  };
  subject: FhirReference;
  occurrenceDateTime?: string;
  authoredOn: string;
  requester?: FhirReference;
  performer?: FhirReference[];
  reasonCode?: Array<{ coding: FhirCoding[]; text: string }>;
  _licenceNotice: string;
}

export interface FhirAppointment {
  resourceType: 'Appointment';
  id: string;
  status: 'booked' | 'arrived' | 'fulfilled' | 'cancelled' | 'noshow' | 'entered-in-error';
  serviceType?: Array<{ coding: FhirCoding[]; text: string }>;
  description?: string;
  start: string;
  participant: Array<{
    actor: FhirReference;
    status: 'accepted' | 'declined' | 'tentative' | 'needs-action';
  }>;
  _licenceNotice: string;
}

export interface FhirCommunication {
  resourceType: 'Communication';
  id: string;
  status: 'completed' | 'not-done' | 'in-progress';
  category?: Array<{ coding: FhirCoding[]; text: string }>;
  medium: Array<{ coding: FhirCoding[]; text: string }>;
  subject: FhirReference;
  sent: string;
  recipient: FhirReference[];
  sender?: FhirReference;
  note?: Array<{ text: string }>;
  _licenceNotice: string;
}

/**
 * Maps CareLoop Case urgency to FHIR R4 priority
 */
function mapUrgencyToFhirPriority(urgency: string): 'routine' | 'urgent' | 'stat' {
  if (urgency === 'CRITICAL') return 'stat';
  if (urgency === 'URGENT') return 'urgent';
  return 'routine';
}

/**
 * Maps CareLoop CaseState to FHIR R4 TaskStatus
 */
function mapCaseStateToFhirTaskStatus(state: string): FhirTask['status'] {
  switch (state) {
    case 'RESULT_ISSUED':
      return 'requested';
    case 'PATIENT_NOTIFIED':
    case 'ACKNOWLEDGED':
      return 'received';
    case 'REFERRAL_SENT':
    case 'REFERRAL_ACCEPTED':
      return 'accepted';
    case 'APPOINTMENT_BOOKED':
    case 'ATTENDED':
    case 'DIAGNOSTIC_DISPOSITION_DOCUMENTED':
    case 'TREATMENT_OR_SURVEILLANCE':
      return 'in-progress';
    case 'CLOSED':
      return 'completed';
    case 'REJECTED':
      return 'cancelled';
    case 'ESCALATED':
      return 'in-progress';
    default:
      return 'in-progress';
  }
}

/**
 * Converts a CareLoop Case to a FHIR R4 Task resource
 */
export function caseToFhirTask(caseItem: Case, patient?: Patient): FhirTask {
  return {
    resourceType: 'Task',
    id: caseItem.id,
    identifier: [
      { system: 'https://careloop.doh.gov.ae/cases', value: caseItem.caseNumber },
      { system: 'https://careloop.doh.gov.ae/screening-results', value: caseItem.screeningResultId },
    ],
    status: mapCaseStateToFhirTaskStatus(caseItem.currentState),
    intent: 'order',
    priority: mapUrgencyToFhirPriority(caseItem.urgency),
    code: {
      coding: [
        {
          system: 'http://snomed.info/sct',
          code: caseItem.snomedCode || '73761001',
          display: 'Closed-loop screening follow-up and diagnostic triage',
        },
      ],
      text: `Screening diagnostic closure: ${caseItem.screeningTestType}`,
    },
    for: {
      reference: `Patient/${caseItem.patientId}`,
      display: patient?.fullName || `Synthetic Patient ${caseItem.patientId}`,
    },
    authoredOn: caseItem.screeningTestDate,
    lastModified: caseItem.updatedAt,
    owner: caseItem.primaryOwnerId
      ? {
          reference: `Practitioner/${caseItem.primaryOwnerId}`,
          display: `Role: ${caseItem.primaryOwnerRole || 'NAVIGATOR'}`,
        }
      : undefined,
    executionPeriod: {
      start: caseItem.screeningTestDate,
      end: caseItem.clinicalDeadline,
    },
    note: caseItem.closure
      ? [
          {
            text: `Closed via ${caseItem.closure.closureType} by ${caseItem.closure.authoriserName} (${caseItem.closure.authoriserRole}): ${caseItem.closure.closureNote}`,
          },
        ]
      : undefined,
    _licenceNotice: FHIR_NOTICE,
  };
}

/**
 * Converts a CareLoop Case & Referral to a FHIR R4 ServiceRequest resource
 */
export function referralToFhirServiceRequest(
  referral: Referral,
  caseItem: Case,
  patient?: Patient
): FhirServiceRequest {
  return {
    resourceType: 'ServiceRequest',
    id: referral.id,
    identifier: [{ system: 'https://careloop.doh.gov.ae/referrals', value: referral.id }],
    status: referral.status === 'ACCEPTED' ? 'active' : referral.status === 'REJECTED' ? 'revoked' : 'draft',
    intent: 'order',
    priority: mapUrgencyToFhirPriority(referral.urgency),
    code: {
      coding: [
        {
          system: 'http://snomed.info/sct',
          code: caseItem.snomedCode || '73761001',
          display: referral.specialty,
        },
        {
          system: 'http://loinc.org',
          code: caseItem.loincCode || '14563-1',
          display: caseItem.screeningTestType,
        },
      ],
      text: `Referral to ${referral.specialty} following abnormal screening`,
    },
    subject: {
      reference: `Patient/${caseItem.patientId}`,
      display: patient?.fullName || `Patient ${caseItem.patientId}`,
    },
    authoredOn: referral.createdAt,
    requester: {
      reference: `Practitioner/${referral.referringProviderId}`,
      display: referral.referringProviderName,
    },
    performer: [
      {
        reference: `Organization/${referral.receivingFacilityId}`,
        display: referral.receivingFacilityName,
      },
    ],
    _licenceNotice: FHIR_NOTICE,
  };
}

/**
 * Converts an Appointment to a FHIR R4 Appointment resource
 */
export function appointmentToFhirAppointment(
  appointment: Appointment,
  caseItem: Case,
  patient?: Patient
): FhirAppointment {
  const statusMap: Record<string, FhirAppointment['status']> = {
    SCHEDULED: 'booked',
    ATTENDED: 'fulfilled',
    CANCELLED: 'cancelled',
    NO_SHOW: 'noshow',
  };

  return {
    resourceType: 'Appointment',
    id: appointment.id,
    status: statusMap[appointment.status] || 'booked',
    description: `Diagnostic appointment at ${appointment.facilityName}`,
    start: appointment.appointmentDate,
    participant: [
      {
        actor: {
          reference: `Patient/${caseItem.patientId}`,
          display: patient?.fullName,
        },
        status: appointment.status === 'ATTENDED' ? 'accepted' : 'accepted',
      },
      {
        actor: {
          reference: `Location/${appointment.facilityId}`,
          display: appointment.facilityName,
        },
        status: 'accepted',
      },
    ],
    _licenceNotice: FHIR_NOTICE,
  };
}

/**
 * Converts an OutreachAttempt to a FHIR R4 Communication resource
 */
export function outreachToFhirCommunication(
  attempt: OutreachAttempt,
  caseItem: Case,
  patient?: Patient
): FhirCommunication {
  const channelCodingMap: Record<string, FhirCoding> = {
    SMS: { system: 'http://terminology.hl7.org/CodeSystem/v3-ParticipationMode', code: 'SMSWRIT', display: 'SMS text message' },
    WHATSAPP: { system: 'http://terminology.hl7.org/CodeSystem/v3-ParticipationMode', code: 'APPWRIT', display: 'Secure Messaging (WhatsApp)' },
    CALL: { system: 'http://terminology.hl7.org/CodeSystem/v3-ParticipationMode', code: 'PHONE', display: 'Telephone call' },
    NAVIGATOR_VISIT: { system: 'http://terminology.hl7.org/CodeSystem/v3-ParticipationMode', code: 'INPERSON', display: 'In-person clinic navigation' },
    CLINICIAN: { system: 'http://terminology.hl7.org/CodeSystem/v3-ParticipationMode', code: 'PHYSICAL', display: 'Direct clinician consultation' },
  };

  return {
    resourceType: 'Communication',
    id: attempt.id,
    status: attempt.outcome === 'ACKNOWLEDGED' || attempt.outcome === 'DELIVERED' ? 'completed' : 'not-done',
    category: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/communication-category',
            code: 'reminder',
            display: 'Screening Follow-up Notification',
          },
        ],
        text: 'Screening result outreach & navigation',
      },
    ],
    medium: [
      {
        coding: [channelCodingMap[attempt.channel] || channelCodingMap.SMS],
        text: attempt.channel,
      },
    ],
    subject: {
      reference: `Patient/${caseItem.patientId}`,
      display: patient?.fullName,
    },
    sent: attempt.attemptedAt,
    recipient: [
      {
        reference: `Patient/${caseItem.patientId}`,
        display: patient?.fullName,
      },
    ],
    sender: {
      reference: `Practitioner/${attempt.byUserId}`,
      display: `Role: ${attempt.byRole}`,
    },
    note: attempt.notes
      ? [{ text: `${attempt.outcome}${attempt.barrierReason ? ` | Barrier: ${attempt.barrierReason}` : ''}: ${attempt.notes}` }]
      : undefined,
    _licenceNotice: FHIR_NOTICE,
  };
}
