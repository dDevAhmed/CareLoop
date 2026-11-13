/**
 * CareLoop Deterministic Synthetic Dataset Generator
 * Generates synthetic screening cases parameterized by the active JurisdictionPack.
 *
 * PRIVACY & PROVENANCE NOTICE:
 * All patient records are 100% synthetic, generated with a fixed pseudorandom seed (42).
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

const DEFAULT_RANDOM_SEED = 42;

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

// Name banks
const ARABIC_MALE_NAMES = ['محمد', 'أحمد', 'سلطان', 'خالد', 'سعيد', 'عبدالله', 'راشد', 'منصور', 'عمر', 'زايد', 'علي', 'حمد'];
const ARABIC_FEMALE_NAMES = ['فاطمة', 'مريم', 'عائشة', 'شيخة', 'موزة', 'لطيفة', 'شمسة', 'سلامة', 'نورة', 'ريم', 'هند', 'ميثاء'];
const ARABIC_FAMILY_NAMES = ['المنصوري', 'المزروعي', 'الظاهري', 'الفلاسي', 'الرميثي', 'الكعبي', 'السويدي', 'الشامسي', 'الدرعي', 'النعيمي'];

const WESTERN_FIRST_NAMES = ['James', 'Emma', 'David', 'Sarah', 'Michael', 'Emily', 'Robert', 'Jessica', 'Thomas', 'Laura'];
const WESTERN_LAST_NAMES = ['Smith', 'Johnson', 'Brown', 'Williams', 'Jones', 'Miller', 'Davis', 'Wilson', 'Anderson', 'Taylor'];

const SOUTH_ASIAN_FIRST_NAMES = ['Rahul', 'Priya', 'Mohammad', 'Fatima', 'Amit', 'Sunita', 'Rajesh', 'Ananya', 'Suresh', 'Kavita'];
const SOUTH_ASIAN_LAST_NAMES = ['Sharma', 'Khan', 'Patel', 'Singh', 'Verma', 'Kumar', 'Nair', 'Ali', 'Chatterjee', 'Reddy'];

const EAST_ASIAN_FIRST_NAMES = ['Wei', 'Li', 'Jun', 'Mei', 'Hao', 'Ying', 'Kenji', 'Yuki', 'Min', 'Ji-Hoon'];
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
    timestamp = new Date().toISOString()
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
    { id: 'CLN-01', name: 'Dr. Mariam', role: 'CLINICIAN' as UserRole },
    { id: 'CLN-02', name: 'Dr. Tariq', role: 'CLINICIAN' as UserRole },
    { id: 'CLN-03', name: 'Dr. Sarah', role: 'CLINICIAN' as UserRole },
  ];

  const FACILITIES = [
    { id: 'FAC-01', name: 'Central Diagnostic Centre' },
    { id: 'FAC-02', name: 'Regional Ambulatory Hospital' },
    { id: 'FAC-03', name: 'Community Health Outpost' },
  ];

  const baseEpoch = new Date('2026-08-01T08:00:00Z').getTime();

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

    // Synthetic Name
    let fullName = '';
    let fullNameArabic: string | undefined = undefined;

    if (language === 'ar') {
      const firstAr = gender === 'MALE' ? rng.choice(ARABIC_MALE_NAMES) : rng.choice(ARABIC_FEMALE_NAMES);
      const lastAr = rng.choice(ARABIC_FAMILY_NAMES);
      fullNameArabic = `${firstAr} ${lastAr}`;
      fullName = `${firstAr} ${lastAr}`;
    } else {
      const firstEn = rng.choice(WESTERN_FIRST_NAMES);
      const lastEn = rng.choice(WESTERN_LAST_NAMES);
      fullName = `${firstEn} ${lastEn}`;
    }

    const age = rng.nextInt(40, 72);
    const birthYear = 2026 - age;
    const birthMonth = String(rng.nextInt(1, 12)).padStart(2, '0');
    const birthDay = String(rng.nextInt(1, 28)).padStart(2, '0');
    const dateOfBirth = `${birthYear}-${birthMonth}-${birthDay}`;

    const patientId = `PAT-${pack.id.substring(0, 3).toUpperCase()}-${String(i).padStart(5, '0')}`;
    const externalPatientId = `EXT-${String(100000 + i)}`;
    const phone = `+1555${String(1000000 + i).substring(1)}`;

    const dayOffset = rng.nextInt(0, 85);
    const screeningDateObj = new Date(baseEpoch + dayOffset * 86400000 + rng.nextInt(0, 36000000));
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
      residencyStatus: selectedGroupOption.id,
      region: 'Central District',
      emirate: 'Central District',
      customDemographics: {
        [primaryGroupField ? primaryGroupField.id : 'group']: selectedGroupOption.id,
      },
      phone,
      email: `${fullName.toLowerCase().replace(/[^a-z]/g, '')}${i}@synthetic-health.org`,
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

    appendAudit('PATIENT_RECORD_SYNTHESIZED', 'Patient', patient.id, { externalPatientId }, 'SYS-SEEDER', 'PROGRAMME_ANALYST', screeningTestDate);

    const urgency = rng.weightedChoice<Urgency>([
      { item: 'ROUTINE', weight: 85 },
      { item: 'URGENT', weight: 10 },
      { item: 'CRITICAL', weight: 5 },
    ]);

    const sla = computeCaseSla(screeningTestDate, pathway as any, urgency, undefined, pack.workingDayCalendar);
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

    const progressionRoll = rng.next();
    let finalState: CaseState = 'RESULT_ISSUED';
    let closureType: ClosureType | null = null;
    let authorisedReason: AuthorisedAlternativeReason | null = null;
    let closureNote = '';
    let clinicalEvidenceRef: string | null = null;
    let closedAt: string | null = null;

    let eventTime = new Date(screeningDateObj);

    function nextEventTimestamp(workingDaysDelta: number): string {
      eventTime = addWorkingDays(eventTime, workingDaysDelta, pack.workingDayCalendar);
      eventTime.setHours(rng.nextInt(9, 16), rng.nextInt(0, 59));
      return eventTime.toISOString();
    }

    function createEvent(from: CaseState, to: CaseState, trigger: string, actor = assignedNavigator.id, role = assignedNavigator.role, barrier?: BarrierReason) {
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

    if (progressionRoll < 0.02) {
      finalState = 'REJECTED';
      nextEventTimestamp(1);
      createEvent('RESULT_ISSUED', 'REJECTED', 'INAPPROPRIATE_CRITERIA_OR_DUPLICATE', CLINICIANS[0].id, 'CLINICIAN');
    } else if (urgency === 'CRITICAL') {
      finalState = 'ESCALATED';
      nextEventTimestamp(1);
      createEvent('RESULT_ISSUED', 'ESCALATED', 'CRITICAL_URGENCY_BYPASS', CLINICIANS[0].id, 'CLINICIAN');

      const attempt: OutreachAttempt = {
        id: `OUT-${caseId}-1`,
        caseId,
        channel: 'CLINICIAN',
        outcome: 'ACKNOWLEDGED',
        attemptedAt: eventTime.toISOString(),
        byRole: 'CLINICIAN',
        byUserId: CLINICIANS[0].id,
        notes: 'Direct clinician triage consultation completed.',
      };
      outreachAttempts.push(attempt);
      milestones.notificationDeliveredAt = eventTime.toISOString();
      milestones.acknowledgedAt = eventTime.toISOString();
      milestones.understandingConfirmedAt = eventTime.toISOString();
    } else {
      const t1 = nextEventTimestamp(0);
      milestones.notificationDeliveredAt = t1;
      createEvent('RESULT_ISSUED', 'PATIENT_NOTIFIED', 'NOTIFICATION_DISPATCHED');

      const smsAck = rng.next() < 0.3;
      const attempt1: OutreachAttempt = {
        id: `OUT-${caseId}-1`,
        caseId,
        channel: 'SMS',
        outcome: smsAck ? 'ACKNOWLEDGED' : 'DELIVERED',
        attemptedAt: t1,
        byRole: 'NAVIGATOR',
        byUserId: assignedNavigator.id,
        notes: smsAck ? 'Patient acknowledged link' : 'Delivered, awaiting response',
      };
      outreachAttempts.push(attempt1);

      if (smsAck) {
        milestones.acknowledgedAt = t1;
        createEvent('PATIENT_NOTIFIED', 'ACKNOWLEDGED', 'PATIENT_ACKNOWLEDGED_ONLINE');
        milestones.understandingConfirmedAt = t1;
      } else {
        const t2 = nextEventTimestamp(3);
        const callOutcomeRoll = rng.next();
        let outcome2: OutreachOutcome = 'NO_ANSWER';
        let barrier2: BarrierReason | undefined = undefined;

        if (callOutcomeRoll < 0.55) {
          outcome2 = 'ACKNOWLEDGED';
        } else if (callOutcomeRoll < 0.85) {
          outcome2 = 'NO_ANSWER';
        } else if (callOutcomeRoll < 0.95) {
          outcome2 = 'DECLINED';
          barrier2 = rng.choice(BARRIERS);
        } else {
          outcome2 = 'WRONG_NUMBER';
        }

        const attempt2: OutreachAttempt = {
          id: `OUT-${caseId}-2`,
          caseId,
          channel: 'CALL',
          outcome: outcome2,
          attemptedAt: t2,
          byRole: 'NAVIGATOR',
          byUserId: assignedNavigator.id,
          barrierReason: barrier2,
          notes: `Follow-up phone outreach: ${outcome2}`,
        };
        outreachAttempts.push(attempt2);

        if (outcome2 === 'ACKNOWLEDGED') {
          milestones.acknowledgedAt = t2;
          milestones.understandingConfirmedAt = t2;
          createEvent('PATIENT_NOTIFIED', 'ACKNOWLEDGED', 'NAVIGATOR_PHONE_CALL_ACKNOWLEDGED');
        } else if (outcome2 === 'DECLINED') {
          finalState = 'ESCALATED';
          createEvent('PATIENT_NOTIFIED', 'ESCALATED', 'PATIENT_DECLINED_OR_HESITANT', assignedNavigator.id, 'NAVIGATOR', barrier2);
        } else {
          const t3 = nextEventTimestamp(4);
          const ack3 = rng.next() < 0.5;
          const attempt3: OutreachAttempt = {
            id: `OUT-${caseId}-3`,
            caseId,
            channel: pack.enabledChannels.includes('NAVIGATOR_VISIT') ? 'NAVIGATOR_VISIT' : 'CALL',
            outcome: ack3 ? 'ACKNOWLEDGED' : 'NO_ANSWER',
            attemptedAt: t3,
            byRole: 'NAVIGATOR',
            byUserId: assignedNavigator.id,
            barrierReason: ack3 ? undefined : 'UNREACHABLE',
            notes: ack3 ? 'Reached patient via outreach' : 'Unreachable after ladder steps',
          };
          outreachAttempts.push(attempt3);

          if (ack3) {
            milestones.acknowledgedAt = t3;
            milestones.understandingConfirmedAt = t3;
            createEvent('PATIENT_NOTIFIED', 'ACKNOWLEDGED', 'OUTREACH_ACKNOWLEDGED');
          } else {
            if (rng.next() < 0.6) {
              finalState = 'CLOSED';
              closureType = 'AUTHORISED_ALTERNATIVE';
              authorisedReason = 'UNREACHABLE_AFTER_CONFIGURED_ATTEMPTS';
              closureNote = 'Patient remained unreachable after configured outreach attempts.';
              closedAt = t3;
              createEvent('PATIENT_NOTIFIED', 'CLOSED', 'AUTHORISED_CLOSURE_UNREACHABLE', assignedNavigator.id, 'NAVIGATOR', 'UNREACHABLE');
            } else {
              finalState = 'ESCALATED';
              createEvent('PATIENT_NOTIFIED', 'ESCALATED', 'OUTREACH_EXHAUSTED', assignedNavigator.id, 'NAVIGATOR', 'UNREACHABLE');
            }
          }
        }
      }

      if (milestones.acknowledgedAt && finalState !== 'CLOSED' && finalState !== 'ESCALATED') {
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

        const tRefAcc = nextEventTimestamp(1);
        milestones.referralAcceptedAt = tRefAcc;
        createEvent('REFERRAL_SENT', 'REFERRAL_ACCEPTED', 'RECEIVING_FACILITY_ACCEPTED');

        const tBook = nextEventTimestamp(2);
        milestones.appointmentBookedAt = tBook;
        createEvent('REFERRAL_ACCEPTED', 'APPOINTMENT_BOOKED', 'APPOINTMENT_BOOKED');

        const appointmentDate = addWorkingDays(eventTime, rng.nextInt(3, 10), pack.workingDayCalendar).toISOString();
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

        if (rng.next() < 0.18) {
          const barrier = rng.choice(BARRIERS);
          aptObj.status = rng.next() < 0.5 ? 'NO_SHOW' : 'CANCELLED';
          aptObj.cancellationReason = barrier;
          appointments.push(aptObj);

          if (rng.next() < 0.4) {
            finalState = 'CLOSED';
            closureType = 'AUTHORISED_ALTERNATIVE';
            authorisedReason = rng.choice(['INFORMED_REFUSAL', 'TRANSFERRED_CARE', 'OTHER']);
            closureNote = `Patient elected not to proceed due to: ${barrier}`;
            closedAt = nextEventTimestamp(2);
            createEvent('APPOINTMENT_BOOKED', 'CLOSED', 'AUTHORISED_CLOSURE_BARRIER', CLINICIANS[1].id, 'CLINICIAN', barrier);
          } else {
            finalState = 'ESCALATED';
            createEvent('APPOINTMENT_BOOKED', 'ESCALATED', 'NO_SHOW_ESCALATION', assignedNavigator.id, 'NAVIGATOR', barrier);
          }
        } else {
          milestones.attendedAt = appointmentDate;
          aptObj.status = 'ATTENDED';
          aptObj.attendedAt = appointmentDate;
          appointments.push(aptObj);
          eventTime = new Date(appointmentDate);
          createEvent('APPOINTMENT_BOOKED', 'ATTENDED', 'PATIENT_ATTENDED_CLINICAL_VISIT', CLINICIANS[0].id, 'CLINICIAN');

          const tDisp = nextEventTimestamp(1);
          milestones.diagnosticDispositionDocumentedAt = tDisp;
          createEvent('ATTENDED', 'DIAGNOSTIC_DISPOSITION_DOCUMENTED', 'DIAGNOSTIC_REPORT_FILED', CLINICIANS[0].id, 'CLINICIAN');

          if (rng.next() < 0.85) {
            finalState = 'CLOSED';
            closureType = 'CLINICAL_RESOLUTION';
            clinicalEvidenceRef = `DIAG-REP-${caseId}`;
            closureNote = 'Confirmatory diagnostic evaluation and histopathology completed with clean findings.';
            closedAt = nextEventTimestamp(1);
            createEvent('DIAGNOSTIC_DISPOSITION_DOCUMENTED', 'CLOSED', 'CLINICAL_RESOLUTION_COMPLETED', CLINICIANS[0].id, 'CLINICIAN');
          } else {
            finalState = 'TREATMENT_OR_SURVEILLANCE';
            nextEventTimestamp(1);
            createEvent('DIAGNOSTIC_DISPOSITION_DOCUMENTED', 'TREATMENT_OR_SURVEILLANCE', 'ONGOING_SURVEILLANCE_SCHEDULED', CLINICIANS[0].id, 'CLINICIAN');
          }
        }
      }
    }

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
      isOverdue: finalState !== 'CLOSED' && new Date() > new Date(sla.clinicalDeadline),
      closure:
        finalState === 'CLOSED' && closureType
          ? {
              closureType,
              authorisedReason,
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
 * CLI execution entrypoint to generate synthetic dataset per pack
 */
export function runSeedCli(packId: string = 'abu-dhabi', totalCount: number = 2000) {
  console.log(`Generating ${totalCount} synthetic CareLoop cases for pack '${packId}' with seed = 42...`);
  const result = generateSyntheticDataset(totalCount, packId, DEFAULT_RANDOM_SEED);

  const outDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outFileName = packId === 'abu-dhabi' ? 'synthetic_cases_2000.json' : `synthetic_cases_${packId}.json`;
  const outFilePath = path.join(outDir, outFileName);

  fs.writeFileSync(
    outFilePath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
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

  console.log(`Successfully generated and wrote synthetic cases to ${outFilePath}`);
}

if (require.main === module) {
  runSeedCli('abu-dhabi', 2000);
}
