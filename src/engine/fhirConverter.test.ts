import { describe, it, expect } from 'vitest';
import {
  caseToFhirTask,
  referralToFhirServiceRequest,
  appointmentToFhirAppointment,
  outreachToFhirCommunication,
  FHIR_NOTICE,
} from './fhirConverter';
import { Case, Referral, Appointment, OutreachAttempt, Patient } from '../types';

describe('CareLoop FHIR R4 Compatibility & Terminology Mapping', () => {
  const mockPatient: Patient = {
    id: 'PAT-FHIR-01',
    externalPatientId: 'PAT-REF-777',
    synthetic: true,
    fullName: 'Shamsa Al-Rumaithi',
    dateOfBirth: '1976-02-14',
    gender: 'FEMALE',
    language: 'ar',
    nationalityGroup: 'CITIZEN',
    region: 'Metropolitan District',
    phone: '+15551239876',
    consentFlags: {
      smsConsent: true,
      whatsappConsent: true,
      callConsent: true,
      navigatorOutreachConsent: true,
      dataSharingConsent: true,
      lastUpdated: '2026-08-01T00:00:00Z',
    },
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
  };

  const mockCase: Case = {
    id: 'CASE-FHIR-01',
    caseNumber: 'CL-BRC-777',
    synthetic: true,
    patientId: mockPatient.id,
    patient: mockPatient,
    pathwayId: 'pathway-breast-reference',
    currentState: 'REFERRAL_SENT',
    previousState: 'ACKNOWLEDGED',
    urgency: 'URGENT',
    primaryOwnerId: 'NAV-01',
    primaryOwnerRole: 'NAVIGATOR',
    screeningResultId: 'RES-BRC-777',
    screeningTestType: 'MAMMOGRAPHY_SUSPICIOUS',
    screeningTestDate: '2026-08-01T08:00:00Z',
    snomedCode: '392011003',
    loincCode: '24604-5',
    milestones: {
      notificationDeliveredAt: '2026-08-01T09:00:00Z',
      acknowledgedAt: '2026-08-02T10:00:00Z',
      referralCreatedAt: '2026-08-03T11:00:00Z',
    },
    clinicalDeadline: '2026-08-22T08:00:00Z',
    platformSlaDueDate: '2026-08-04T08:00:00Z',
    isOverdue: false,
    createdAt: '2026-08-01T08:00:00Z',
    updatedAt: '2026-08-03T11:00:00Z',
  };

  it('transforms a Case to a valid FHIR R4 Task resource with SNOMED CT placeholders and licensing note', () => {
    const task = caseToFhirTask(mockCase, mockPatient);

    expect(task.resourceType).toBe('Task');
    expect(task.id).toBe(mockCase.id);
    expect(task.status).toBe('accepted');
    expect(task.priority).toBe('urgent');
    expect(task.for.reference).toBe(`Patient/${mockPatient.id}`);
    expect(task.code.coding[0].system).toBe('http://snomed.info/sct');
    expect(task.code.coding[0].code).toBe('392011003');
    expect(task._licenceNotice).toBe(FHIR_NOTICE);
  });

  it('transforms a Referral to a FHIR R4 ServiceRequest resource with LOINC & SNOMED CT placeholders', () => {
    const referral: Referral = {
      id: 'REF-001',
      caseId: mockCase.id,
      synthetic: true,
      referringProviderId: 'NAV-01',
      referringProviderName: 'Nurse Navigator',
      receivingFacilityId: 'FAC-01',
      receivingFacilityName: 'Regional Diagnostic Centre',
      specialty: 'Breast Surgery',
      urgency: 'URGENT',
      status: 'ACCEPTED',
      createdAt: '2026-08-03T11:00:00Z',
      acceptedAt: '2026-08-03T11:30:00Z',
    };

    const serviceRequest = referralToFhirServiceRequest(referral, mockCase, mockPatient);

    expect(serviceRequest.resourceType).toBe('ServiceRequest');
    expect(serviceRequest.status).toBe('active');
    expect(serviceRequest.intent).toBe('order');
    expect(serviceRequest.performer?.[0].reference).toBe('Organization/FAC-01');
    expect(serviceRequest.code.coding.some((c) => c.system === 'http://loinc.org' && c.code === '24604-5')).toBe(true);
    expect(serviceRequest._licenceNotice).toBe(FHIR_NOTICE);
  });

  it('transforms an Appointment to a FHIR R4 Appointment resource', () => {
    const appointment: Appointment = {
      id: 'APT-001',
      caseId: mockCase.id,
      facilityId: 'FAC-01',
      facilityName: 'Regional Diagnostic Centre',
      appointmentDate: '2026-08-10T09:30:00Z',
      status: 'SCHEDULED',
      createdAt: '2026-08-03T12:00:00Z',
    };

    const fhirApt = appointmentToFhirAppointment(appointment, mockCase, mockPatient);
    expect(fhirApt.resourceType).toBe('Appointment');
    expect(fhirApt.status).toBe('booked');
    expect(fhirApt.start).toBe('2026-08-10T09:30:00Z');
  });

  it('transforms an OutreachAttempt to a FHIR R4 Communication resource', () => {
    const attempt: OutreachAttempt = {
      id: 'OUT-001',
      caseId: mockCase.id,
      channel: 'WHATSAPP',
      outcome: 'ACKNOWLEDGED',
      attemptedAt: '2026-08-02T10:00:00Z',
      byRole: 'NAVIGATOR',
      byUserId: 'NAV-01',
      notes: 'Patient read notification and confirmed consultation',
    };

    const comm = outreachToFhirCommunication(attempt, mockCase, mockPatient);
    expect(comm.resourceType).toBe('Communication');
    expect(comm.status).toBe('completed');
    expect(comm.medium[0].coding[0].code).toBe('APPWRIT');
  });
});
