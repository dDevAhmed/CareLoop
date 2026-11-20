/**
 * CareLoop Deterministic Synthetic Dataset Generator
 * Generates synthetic screening cases parameterized by the active JurisdictionPack.
 *
 * PRIVACY & PROVENANCE NOTICE:
 * All patient records are 100% synthetic, generated with a fixed pseudorandom seed (42).
 * Anchor reference date is fixed to 2026-11-19T09:00:00.000Z with no reliance on the real wall clock.
 * Contains ZERO real personal health information (PHI).
 */

import fs from 'fs';
import path from 'path';
import {
  Case,
  CaseEvent,
  CaseState,
  OutreachAttempt,
  OutreachOutcome,
  Patient,
  Referral,
  Appointment,
  AuditLogEntry,
  BarrierReason,
  ClosureType,
  AuthorisedAlternativeReason,
  Language,
  Urgency,
  UserRole,
} from '../types';
import { getJurisdictionPack } from '../packs';
import { computeCaseSla, addWorkingDays } from '../engine/slaEngine';
import { createAuditLogEntry, GENESIS_HASH } from '../engine/auditChain';

export const FIXED_REFERENCE_DATE = '2026-11-19T09:00:00.000Z';
export const DEFAULT_RANDOM_SEED = 42;

/**
 * Deterministic pseudo-random number generator (Mulberry32)
 */
class DeterministicRng {
  private s: number;

  constructor(seed: number) {
    this.s = seed;
  }

  next(): number {
    let t = (this.s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  choice<T>(items: T[]): T {
    return items[Math.floor(this.next() * items.length)];
  }

  weightedChoice<T>(items: { item: T; weight: number }[]): T {
    const total = items.reduce((sum, i) => sum + i.weight, 0);
    let r = this.next() * total;
    for (const entry of items) {
      r -= entry.weight;
      if (r <= 0) return entry.item;
    }
    return items[items.length - 1].item;
  }
}

// Name pools per demographic group and gender
const ARABIC_MALE_NAMES = ['محمد', 'أحمد', 'سلطان', 'خالد', 'سعيد', 'عبدالله', 'راشد', 'منصور', 'عمر', 'زايد', 'علي', 'حمد'];
const ARABIC_FEMALE_NAMES = ['فاطمة', 'مريم', 'عائشة', 'شيخة', 'موزة', 'لطيفة', 'شمسة', 'سلامة', 'نورة', 'ريم', 'هند', 'ميثاء'];
const ARABIC_FAMILY_NAMES = ['المنصوري', 'المزروعي', 'الظاهري', 'الفلاسي', 'الرميثي', 'الكعبي', 'السويدي', 'الشامسي', 'الدرعي', 'النعيمي'];

const WESTERN_MALE_NAMES = ['James', 'David', 'Michael', 'Robert', 'Thomas', 'John', 'William', 'Richard', 'Charles', 'Daniel'];
const WESTERN_FEMALE_NAMES = ['Emma', 'Sarah', 'Emily', 'Jessica', 'Laura', 'Olivia', 'Sophia', 'Charlotte', 'Amelia', 'Hannah'];
const WESTERN_LAST_NAMES = ['Smith', 'Johnson', 'Brown', 'Williams', 'Jones', 'Miller', 'Davis', 'Wilson', 'Anderson', 'Taylor'];

const SOUTH_ASIAN_MALE_NAMES = ['Rahul', 'Mohammad', 'Amit', 'Rajesh', 'Suresh', 'Vikram', 'Arjun', 'Sanjay', 'Deepak', 'Imran'];
const SOUTH_ASIAN_FEMALE_NAMES = ['Priya', 'Fatima', 'Sunita', 'Ananya', 'Kavita', 'Aisha', 'Pooja', 'Neha', 'Rani', 'Meera'];
const SOUTH_ASIAN_LAST_NAMES = ['Sharma', 'Khan', 'Patel', 'Singh', 'Verma', 'Kumar', 'Nair', 'Ali', 'Chatterjee', 'Reddy'];

const EAST_ASIAN_MALE_NAMES = ['Wei', 'Jun', 'Hao', 'Kenji', 'Ji-Hoon', 'Min-Jun', 'Chen', 'Bo', 'Tao', 'Takeshi'];
const EAST_ASIAN_FEMALE_NAMES = ['Li', 'Mei', 'Ying', 'Yuki', 'Min', 'Soo-Jin', 'Lin', 'Xia', 'Hana', 'Sakura'];
const EAST_ASIAN_LAST_NAMES = ['Wang', 'Zhang', 'Chen', 'Liu', 'Tanaka', 'Sato', 'Kim', 'Park', 'Lee', 'Nguyen'];

const BARRIERS: BarrierReason[] = [
  'FEAR_ANXIETY',
  'APPOINTMENT_UNAVAILABLE',
  'COMPETING_PRIORITIES',
  'COST_INSURANCE',
  'LOW_HEALTH_LITERACY',
  'COMMUNICATION_FAILURE',
  'TRANSPORT',
  'WORKFORCE_CAPACITY',
  'UNREACHABLE',
  'OTHER',
];

export interface SeedDataResult {
  packId: string;
  patients: Patient[];
  cases: Case[];
  caseEvents: CaseEvent[];
  outreachAttempts: OutreachAttempt[];
  referrals: Referral[];
  appointments: Appointment[];
  auditLogs: AuditLogEntry[];
}

export function generateSyntheticDataset(
  totalCount: number = 2000,
  packId: string = 'abu-dhabi',
  seed: number = DEFAULT_RANDOM_SEED
): SeedDataResult {
  const rng = new DeterministicRng(seed);
  const pack = getJurisdictionPack(packId);

  const patients: Patient[] = [];
  const cases: Case[] = [];
  const caseEvents: CaseEvent[] = [];
  const outreachAttempts: OutreachAttempt[] = [];
  const referrals: Referral[] = [];
  const appointments: Appointment[] = [];
  const auditLogs: AuditLogEntry[] = [];

  let auditSequence = 1;
  let lastAuditHash = GENESIS_HASH;

  function appendAudit(
    action: string,
    resourceType: 'Case' | 'Patient' | 'Referral' | 'Appointment' | 'OutreachAttempt',
    resourceId: string,
    details: Record<string, unknown>,
    actorId = 'SYS-SEEDER',
    actorRole: UserRole = 'PROGRAMME_ANALYST',
    timestamp = FIXED_REFERENCE_DATE
  ) {
    const entry = createAuditLogEntry({
      sequenceNumber: auditSequence++,
      actorId,
      actorRole,
      action,
      resourceType,
      resourceId,
      details,
      prevHash: lastAuditHash,
      timestamp,
      realTimestamp: timestamp,
    });
    lastAuditHash = entry.hash;
    auditLogs.push(entry);
  }

  const NAVIGATORS = [
    { id: 'NAV-01', name: 'Noura Al-Hosani', role: 'NAVIGATOR' as UserRole },
    { id: 'NAV-02', name: 'Zayed Al-Marzooqi', role: 'NAVIGATOR' as UserRole },
    { id: 'NAV-03', name: 'Priya Sundaram', role: 'NAVIGATOR' as UserRole },
    { id: 'NAV-04', name: 'James Taylor', role: 'NAVIGATOR' as UserRole },
  ];

  const CLINICIANS = [
    { id: 'CLN-01', name: 'Dr. Mariam Al-Kaabi', role: 'CLINICIAN' as UserRole },
    { id: 'CLN-02', name: 'Dr. Tariq Al-Suwaidi', role: 'CLINICIAN' as UserRole },
    { id: 'CLN-03', name: 'Dr. Sarah Smith', role: 'CLINICIAN' as UserRole },
  ];

  const FACILITIES = [
    { id: 'FAC-01', name: 'Central Diagnostic Centre' },
    { id: 'FAC-02', name: 'Regional Ambulatory Hospital' },
    { id: 'FAC-03', name: 'Community Health Outpost' },
  ];

  const refEpoch = new Date(FIXED_REFERENCE_DATE).getTime();

  for (let i = 1; i <= totalCount; i++) {
    // Select pathway from pack (for hero abu-dhabi pack preserve 60/40 colorectal/breast split, otherwise round-robin)
    const pathway =
      pack.id === 'abu-dhabi' && pack.pathways.length >= 2
        ? (i <= Math.round(totalCount * 0.6) ? pack.pathways[0] : pack.pathways[1])
        : pack.pathways[(i - 1) % pack.pathways.length];
    const isColorectal = pathway.id.includes('colorectal') || pathway.id.includes('fobt');
    const isFemaleSpecific = pathway.id.includes('breast') || pathway.id.includes('cervical') || pathway.id.includes('womens');

    const gender: 'MALE' | 'FEMALE' = isFemaleSpecific ? 'FEMALE' : rng.next() < 0.5 ? 'MALE' : 'FEMALE';

    // Demographic fields derived from pack
    const primaryGroupField = pack.patientGroupFields[0];
    const selectedGroupOption = primaryGroupField ? rng.choice(primaryGroupField.options) : { id: 'STANDARD', label: 'Standard Group' };

    // Language selection from pack
    const packLang = rng.choice(pack.languages);
    const language: Language = packLang.code;

    // Generate Name consistent with gender AND nationality group
    let fullName = '';
    let fullNameArabic: string | undefined = undefined;
    const groupKey = selectedGroupOption.id.toUpperCase();

    if (groupKey.includes('EMIRATI') || groupKey.includes('ARAB')) {
      const first = gender === 'MALE' ? rng.choice(ARABIC_MALE_NAMES) : rng.choice(ARABIC_FEMALE_NAMES);
      const last = rng.choice(ARABIC_FAMILY_NAMES);
      fullName = `${first} ${last}`;
      fullNameArabic = fullName;
    } else if (groupKey.includes('SOUTH_ASIAN')) {
      const first = gender === 'MALE' ? rng.choice(SOUTH_ASIAN_MALE_NAMES) : rng.choice(SOUTH_ASIAN_FEMALE_NAMES);
      const last = rng.choice(SOUTH_ASIAN_LAST_NAMES);
      fullName = `${first} ${last}`;
    } else if (groupKey.includes('EAST_ASIAN')) {
      const first = gender === 'MALE' ? rng.choice(EAST_ASIAN_MALE_NAMES) : rng.choice(EAST_ASIAN_FEMALE_NAMES);
      const last = rng.choice(EAST_ASIAN_LAST_NAMES);
      fullName = `${first} ${last}`;
    } else {
      const first = gender === 'MALE' ? rng.choice(WESTERN_MALE_NAMES) : rng.choice(WESTERN_FEMALE_NAMES);
      const last = rng.choice(WESTERN_LAST_NAMES);
      fullName = `${first} ${last}`;
    }

    // Distinct residency status from nationality group
    let residencyStatus: string;
    if (groupKey.includes('EMIRATI')) {
      residencyStatus = 'CITIZEN';
    } else {
      residencyStatus = rng.choice(['RESIDENT_VISA', 'EMPLOYMENT_VISA', 'GOLDEN_VISA', 'DEPENDENT_VISA']);
    }

    const age = rng.nextInt(40, 72);
    const birthYear = 2026 - age;
    const birthMonth = String(rng.nextInt(1, 12)).padStart(2, '0');
    const birthDay = String(rng.nextInt(1, 28)).padStart(2, '0');
    const dateOfBirth = `${birthYear}-${birthMonth}-${birthDay}`;

    const patientId = `PAT-${pack.id.substring(0, 3).toUpperCase()}-${String(i).padStart(5, '0')}`;
    const externalPatientId = `EXT-${String(100000 + i)}`;
    const phone = `+1555${String(1000000 + i).substring(1)}`;

    // Partition states realistically across the 2,000 cases:
    // ~5% Critical (100)
    // ~5% Rejected/Other (100)
    // ~50% Closed (1000)
    // ~25% In-Flight on Track (500)
    // ~8% Due within 7 days (160)
    // ~7% Overdue or Escalated (140)
    const ratio = (i - 1) / totalCount;
    type Category = 'CRITICAL' | 'REJECTED' | 'CLOSED' | 'IN_FLIGHT_ON_TRACK' | 'DUE_SOON' | 'OVERDUE_ESCALATED';

    let category: Category;
    if (ratio < 0.05) {
      category = 'CRITICAL';
    } else if (ratio < 0.10) {
      category = 'REJECTED';
    } else if (ratio < 0.60) {
      category = 'CLOSED';
    } else if (ratio < 0.85) {
      category = 'IN_FLIGHT_ON_TRACK';
    } else if (ratio < 0.93) {
      category = 'DUE_SOON';
    } else {
      category = 'OVERDUE_ESCALATED';
    }

    let urgency: Urgency = 'ROUTINE';
    let screeningDaysBeforeRef = 10;

    if (category === 'CRITICAL') {
      urgency = 'CRITICAL';
      screeningDaysBeforeRef = rng.nextInt(1, 3);
    } else if (category === 'REJECTED') {
      urgency = 'ROUTINE';
      screeningDaysBeforeRef = rng.nextInt(5, 20);
    } else if (category === 'CLOSED') {
      urgency = rng.weightedChoice([{ item: 'ROUTINE', weight: 80 }, { item: 'URGENT', weight: 20 }]);
      screeningDaysBeforeRef = rng.nextInt(35, 75);
    } else if (category === 'IN_FLIGHT_ON_TRACK') {
      urgency = 'ROUTINE';
      screeningDaysBeforeRef = rng.nextInt(2, 12);
    } else if (category === 'DUE_SOON') {
      urgency = 'ROUTINE';
      // In Abu Dhabi colorectal pathway, deadline is 30 working days (~42 calendar days).
      // Placing screening ~32-38 calendar days before reference leaves 1-7 working days remaining.
      screeningDaysBeforeRef = rng.nextInt(30, 36);
    } else {
      // OVERDUE_ESCALATED: Exceeded deadline or escalated
      urgency = rng.weightedChoice([{ item: 'ROUTINE', weight: 80 }, { item: 'URGENT', weight: 20 }]);
      screeningDaysBeforeRef = rng.nextInt(50, 85);
    }

    const screeningTimeMs = refEpoch - screeningDaysBeforeRef * 86400000 + rng.nextInt(0, 28800000);
    const screeningDateObj = new Date(screeningTimeMs);
    const screeningTestDate = screeningDateObj.toISOString();

    const patient: Patient = {
      id: patientId,
      externalPatientId,
      synthetic: true,
      fullName,
      fullNameArabic,
      dateOfBirth,
      gender,
      language,
      nationalityGroup: selectedGroupOption.id,
      residencyStatus,
      region: 'Central District',
      emirate: 'Central District',
      customDemographics: {
        [primaryGroupField ? primaryGroupField.id : 'group']: selectedGroupOption.id,
      },
      phone,
      email: `${fullName.toLowerCase().replace(/[^a-z]/g, '')}${i}@synthetic-health.example.com`,
      consentFlags: {
        smsConsent: true,
        whatsappConsent: pack.enabledChannels.includes('WHATSAPP'),
        callConsent: true,
        navigatorOutreachConsent: true,
        dataSharingConsent: true,
        lastUpdated: screeningTestDate,
      },
      createdAt: screeningTestDate,
      updatedAt: screeningTestDate,
    };
    patients.push(patient);

    appendAudit(
      'PATIENT_RECORD_SYNTHESIZED',
      'Patient',
      patient.id,
      { externalPatientId },
      'SYS-SEEDER',
      'PROGRAMME_ANALYST',
      screeningTestDate
    );

    const sla = computeCaseSla(
      screeningTestDate,
      pathway as any,
      urgency,
      FIXED_REFERENCE_DATE,
      pack.workingDayCalendar
    );

    const assignedNavigator = rng.choice(NAVIGATORS);
    const caseId = `CASE-${pack.id.substring(0, 3).toUpperCase()}-${String(i).padStart(5, '0')}`;
    const caseNumber = `CL-${pathway.id.substring(0, 3).toUpperCase()}-${String(i).padStart(5, '0')}`;

    const milestones = {
      notificationDeliveredAt: null as string | null,
      acknowledgedAt: null as string | null,
      understandingConfirmedAt: null as string | null,
      referralCreatedAt: null as string | null,
      referralAcceptedAt: null as string | null,
      appointmentBookedAt: null as string | null,
      attendedAt: null as string | null,
      diagnosticDispositionDocumentedAt: null as string | null,
    };

    let finalState: CaseState = 'RESULT_ISSUED';
    let closureType: ClosureType | null = null;
    let authorisedReason: AuthorisedAlternativeReason | null = null;
    let closureNote = '';
    let clinicalEvidenceRef: string | null = null;
    let closedAt: string | null = null;
    let requesterId: string | undefined = undefined;

    let eventTime = new Date(screeningDateObj);

    function nextEventTimestamp(workingDaysDelta: number): string {
      eventTime = addWorkingDays(eventTime, workingDaysDelta, pack.workingDayCalendar);
      eventTime.setUTCHours(rng.nextInt(9, 16), rng.nextInt(0, 59));
      // Clamp to reference date so event time never runs past the demo clock
      if (eventTime.getTime() > refEpoch) {
        eventTime = new Date(refEpoch - rng.nextInt(3600000, 18000000));
      }
      return eventTime.toISOString();
    }

    function createEvent(
      from: CaseState,
      to: CaseState,
      trigger: string,
      actor = assignedNavigator.id,
      role = assignedNavigator.role,
      barrier?: BarrierReason
    ) {
      const ts = eventTime.toISOString();
      const evt: CaseEvent = {
        id: `EVT-${caseId}-${caseEvents.length + 1}`,
        caseId,
        fromState: from,
        toState: to,
        trigger,
        ownerId: actor,
        ownerRole: role,
        timestamp: ts,
        barrierReason: barrier || null,
      };
      caseEvents.push(evt);
      appendAudit(`CASE_STATE_TRANSITION_${to}`, 'Case', caseId, { from, to, trigger, barrier }, actor, role, ts);
    }

    createEvent('RESULT_ISSUED', 'RESULT_ISSUED', 'SCREENING_RESULT_INGESTED', 'SYS-FEED', 'PROGRAMME_ANALYST');

    if (category === 'REJECTED') {
      finalState = 'REJECTED';
      nextEventTimestamp(1);
      createEvent('RESULT_ISSUED', 'REJECTED', 'INAPPROPRIATE_CRITERIA_OR_DUPLICATE', CLINICIANS[0].id, 'CLINICIAN');
    } else if (category === 'CRITICAL') {
      finalState = 'ESCALATED';
      nextEventTimestamp(0);
      createEvent('RESULT_ISSUED', 'ESCALATED', 'CRITICAL_URGENCY_BYPASS', CLINICIANS[0].id, 'CLINICIAN');

      const attempt: OutreachAttempt = {
        id: `OUT-${caseId}-1`,
        caseId,
        channel: 'CLINICIAN',
        outcome: 'ACKNOWLEDGED',
        attemptedAt: eventTime.toISOString(),
        byRole: 'CLINICIAN',
        byUserId: CLINICIANS[0].id,
        notes: 'Critical result priority triage outreach completed by clinician.',
      };
      outreachAttempts.push(attempt);
      milestones.notificationDeliveredAt = eventTime.toISOString();
      milestones.acknowledgedAt = eventTime.toISOString();
      milestones.understandingConfirmedAt = eventTime.toISOString();
    } else {
      // Ingested notification
      const t1 = nextEventTimestamp(0);
      milestones.notificationDeliveredAt = t1;
      createEvent('RESULT_ISSUED', 'PATIENT_NOTIFIED', 'NOTIFICATION_DISPATCHED');

      const isAck = category !== 'OVERDUE_ESCALATED' || rng.next() < 0.5;
      const attempt1: OutreachAttempt = {
        id: `OUT-${caseId}-1`,
        caseId,
        channel: 'SMS',
        outcome: isAck ? 'ACKNOWLEDGED' : 'DELIVERED',
        attemptedAt: t1,
        byRole: 'NAVIGATOR',
        byUserId: assignedNavigator.id,
        notes: isAck ? 'Patient acknowledged screening result via secure link' : 'Delivered, awaiting patient response',
      };
      outreachAttempts.push(attempt1);

      if (category === 'IN_FLIGHT_ON_TRACK' && (i % 5 === 0)) {
        // Leave at PATIENT_NOTIFIED
        finalState = 'PATIENT_NOTIFIED';
      } else {
        const t2 = nextEventTimestamp(isAck ? 1 : 3);
        milestones.acknowledgedAt = t2;
        milestones.understandingConfirmedAt = t2;
        createEvent('PATIENT_NOTIFIED', 'ACKNOWLEDGED', isAck ? 'PATIENT_ACKNOWLEDGED_ONLINE' : 'NAVIGATOR_PHONE_CALL_ACKNOWLEDGED');

        if (category === 'IN_FLIGHT_ON_TRACK' && (i % 5 === 1)) {
          // Leave at ACKNOWLEDGED
          finalState = 'ACKNOWLEDGED';
        } else if (category === 'OVERDUE_ESCALATED' && rng.next() < 0.5) {
          finalState = 'ESCALATED';
          createEvent('ACKNOWLEDGED', 'ESCALATED', 'PATIENT_HESITANT_BARRIER', assignedNavigator.id, 'NAVIGATOR', 'FEAR_ANXIETY');
        } else {
          // Referral sent
          const facility = rng.choice(FACILITIES);
          const tRef = nextEventTimestamp(1);
          milestones.referralCreatedAt = tRef;
          createEvent('ACKNOWLEDGED', 'REFERRAL_SENT', 'REFERRAL_DISPATCHED');

          const referralId = `REF-${caseId}`;
          referrals.push({
            id: referralId,
            caseId,
            synthetic: true,
            referringProviderId: assignedNavigator.id,
            referringProviderName: assignedNavigator.name,
            receivingFacilityId: facility.id,
            receivingFacilityName: facility.name,
            specialty: isColorectal ? 'Gastroenterology' : 'Diagnostic Clinic',
            urgency,
            status: 'ACCEPTED',
            createdAt: tRef,
            acceptedAt: tRef,
          });

          if (category === 'IN_FLIGHT_ON_TRACK' && (i % 5 === 2)) {
            finalState = 'REFERRAL_SENT';
          } else {
            const tRefAcc = nextEventTimestamp(1);
            milestones.referralAcceptedAt = tRefAcc;
            createEvent('REFERRAL_SENT', 'REFERRAL_ACCEPTED', 'RECEIVING_FACILITY_ACCEPTED');

            if (category === 'IN_FLIGHT_ON_TRACK' && (i % 5 === 3)) {
              finalState = 'REFERRAL_ACCEPTED';
            } else {
              const tBook = nextEventTimestamp(2);
              milestones.appointmentBookedAt = tBook;
              createEvent('REFERRAL_ACCEPTED', 'APPOINTMENT_BOOKED', 'APPOINTMENT_BOOKED');

              const appointmentDaysAhead = category === 'DUE_SOON' ? rng.nextInt(2, 6) : rng.nextInt(3, 12);
              const appointmentDate = addWorkingDays(eventTime, appointmentDaysAhead, pack.workingDayCalendar).toISOString();
              const appointmentId = `APT-${caseId}`;
              const aptObj: Appointment = {
                id: appointmentId,
                caseId,
                referralId,
                facilityId: facility.id,
                facilityName: facility.name,
                appointmentDate,
                status: 'ATTENDED',
                createdAt: tBook,
              };

              if (category === 'IN_FLIGHT_ON_TRACK' && (i % 5 === 4)) {
                finalState = 'APPOINTMENT_BOOKED';
                aptObj.status = 'SCHEDULED';
                appointments.push(aptObj);
              } else if (category === 'DUE_SOON') {
                finalState = 'APPOINTMENT_BOOKED';
                aptObj.status = 'SCHEDULED';
                appointments.push(aptObj);
              } else if (category === 'OVERDUE_ESCALATED') {
                finalState = 'ESCALATED';
                aptObj.status = 'NO_SHOW';
                aptObj.cancellationReason = 'APPOINTMENT_UNAVAILABLE';
                appointments.push(aptObj);
                createEvent('APPOINTMENT_BOOKED', 'ESCALATED', 'NO_SHOW_ESCALATION', assignedNavigator.id, 'NAVIGATOR', 'APPOINTMENT_UNAVAILABLE');
              } else if (category === 'CLOSED') {
                // Closed group reaches closure
                if (rng.next() < 0.15) {
                  // AUTHORISED_ALTERNATIVE closure
                  finalState = 'CLOSED';
                  closureType = 'AUTHORISED_ALTERNATIVE';
                  authorisedReason = rng.choice(['INFORMED_REFUSAL', 'TRANSFERRED_CARE', 'UNREACHABLE_AFTER_CONFIGURED_ATTEMPTS']);
                  closureNote = `Patient case closed via authorised alternative pathway: ${authorisedReason}`;
                  requesterId = assignedNavigator.id;
                  closedAt = nextEventTimestamp(2);
                  createEvent('APPOINTMENT_BOOKED', 'CLOSED', 'AUTHORISED_ALTERNATIVE_APPROVED_BY_CLINICIAN', CLINICIANS[0].id, 'CLINICIAN');
                } else {
                  // CLINICAL_RESOLUTION closure
                  milestones.attendedAt = appointmentDate;
                  aptObj.status = 'ATTENDED';
                  aptObj.attendedAt = appointmentDate;
                  appointments.push(aptObj);
                  createEvent('APPOINTMENT_BOOKED', 'ATTENDED', 'PATIENT_ATTENDED_CLINICAL_VISIT', CLINICIANS[0].id, 'CLINICIAN');

                  const tDisp = nextEventTimestamp(1);
                  milestones.diagnosticDispositionDocumentedAt = tDisp;
                  createEvent('ATTENDED', 'DIAGNOSTIC_DISPOSITION_DOCUMENTED', 'DIAGNOSTIC_REPORT_FILED', CLINICIANS[0].id, 'CLINICIAN');

                  finalState = 'CLOSED';
                  closureType = 'CLINICAL_RESOLUTION';
                  clinicalEvidenceRef = `DIAG-REP-${caseId}`;
                  closureNote = 'Confirmatory diagnostic evaluation completed with negative/benign histopathology findings.';
                  closedAt = nextEventTimestamp(1);
                  createEvent('DIAGNOSTIC_DISPOSITION_DOCUMENTED', 'CLOSED', 'CLINICAL_RESOLUTION_CONFIRMED', CLINICIANS[0].id, 'CLINICIAN');
                }
              }
            }
          }
        }
      }
    }

    // Determine overdue status deterministically relative to FIXED_REFERENCE_DATE
    const isOverdue = finalState !== 'CLOSED' && (category === 'OVERDUE_ESCALATED' || sla.isOverdue);

    const caseItem: Case = {
      id: caseId,
      caseNumber,
      synthetic: true,
      patientId,
      patient,
      pathwayId: pathway.id,
      currentState: finalState,
      previousState: finalState === 'RESULT_ISSUED' ? null : 'RESULT_ISSUED',
      urgency,
      primaryOwnerId: assignedNavigator.id,
      primaryOwnerRole: assignedNavigator.role,
      screeningResultId: `RES-${String(i).padStart(5, '0')}`,
      screeningTestType: pathway.codes.screeningDisplay,
      screeningTestDate,
      snomedCode: pathway.codes.confirmatoryCode,
      loincCode: pathway.codes.screeningCode,
      milestones,
      clinicalDeadline: sla.clinicalDeadline,
      platformSlaDueDate: sla.platformSlaDueDate,
      slaWorkingDaysRemaining: sla.workingDaysRemaining,
      isOverdue,
      closure:
        finalState === 'CLOSED' && closureType
          ? {
              closureType,
              authorisedReason,
              requesterId: requesterId || undefined,
              authoriserId: CLINICIANS[0].id,
              authoriserName: CLINICIANS[0].name,
              authoriserRole: CLINICIANS[0].role,
              clinicalEvidenceRef,
              closureNote,
              closedAt: closedAt || eventTime.toISOString(),
            }
          : null,
      createdAt: screeningTestDate,
      updatedAt: eventTime.toISOString(),
    };

    cases.push(caseItem);
  }

  return {
    packId: pack.id,
    patients,
    cases,
    caseEvents,
    outreachAttempts,
    referrals,
    appointments,
    auditLogs,
  };
}

/**
 * CLI execution entrypoint to generate synthetic dataset per pack.
 * Writes to outDir (defaults to process.cwd()/data).
 */
export function runSeedCli(
  packId: string = 'abu-dhabi',
  totalCount: number = 2000,
  outDir?: string
) {
  const targetDir = outDir || path.join(process.cwd(), 'data');
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const result = generateSyntheticDataset(totalCount, packId, DEFAULT_RANDOM_SEED);
  const outFileName = packId === 'abu-dhabi' ? 'synthetic_cases_2000.json' : `synthetic_cases_${packId}.json`;
  const outFilePath = path.join(targetDir, outFileName);

  fs.writeFileSync(
    outFilePath,
    JSON.stringify(
      {
        generatedAt: FIXED_REFERENCE_DATE,
        packId,
        randomSeed: DEFAULT_RANDOM_SEED,
        notice: '100% synthetic dataset. Zero real patient data.',
        counts: {
          patients: result.patients.length,
          cases: result.cases.length,
          caseEvents: result.caseEvents.length,
          outreachAttempts: result.outreachAttempts.length,
          referrals: result.referrals.length,
          appointments: result.appointments.length,
          auditLogs: result.auditLogs.length,
        },
        patients: result.patients,
        cases: result.cases,
        caseEvents: result.caseEvents,
        outreachAttempts: result.outreachAttempts,
        referrals: result.referrals,
        appointments: result.appointments,
        auditLogs: result.auditLogs,
      },
      null,
      2
    )
  );

  return outFilePath;
}

if (require.main === module) {
  runSeedCli('abu-dhabi', 2000);
}
