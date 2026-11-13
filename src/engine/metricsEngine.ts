import { Case, Patient, OutreachAttempt, BarrierReason, PatientGroupField } from '../types';

export interface StageAttritionStep {
  stage: string;
  stageNameArabic?: string;
  count: number;
  retentionPercentOfTotal: number;
  dropOffFromPreviousPercent: number;
}

export interface MetricSummary {
  totalCases: number;
  notificationRate: number; // 0 to 100
  acknowledgementRate: number; // 0 to 100
  understandingConfirmedRate: number; // 0 to 100
  referralInitiatedRate: number; // 0 to 100
  referralAcceptedRate: number; // 0 to 100
  appointmentBookedRate: number; // 0 to 100
  appointmentAttendanceRate: number; // 0 to 100
  diagnosticDispositionRate: number; // 0 to 100
  clinicalResolutionRate: number; // 0 to 100
  authorisedAlternativeRate: number; // 0 to 100
  escalationRate: number; // 0 to 100
  rejectionRate: number; // 0 to 100
  medianDaysToResolution: number | null;
  p90DaysToResolution: number | null;
}

export interface GroupBreakdown {
  groupId: string;
  groupLabel: string;
  totalCases: number;
  suppressed: boolean; // Suppressed if totalCases < 10
  suppressionReason?: string;
  clinicalResolutionRate?: number;
  acknowledgementRate?: number;
  attendanceRate?: number;
  medianDaysToResolution?: number | null;
}

export interface DisparityAnalysis {
  byLanguage: GroupBreakdown[];
  byGroupField: Record<string, GroupBreakdown[]>;
  byAgeBand: GroupBreakdown[];
}

/**
 * Calculates percentile from a sorted numeric array using linear interpolation.
 */
function calculatePercentile(sortedValues: number[], percentile: number): number | null {
  if (sortedValues.length === 0) return null;
  if (sortedValues.length === 1) return sortedValues[0];

  const index = (percentile / 100) * (sortedValues.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  if (upper >= sortedValues.length) return sortedValues[sortedValues.length - 1];
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

/**
 * Computes high-level clinical pathway metrics across a cohort of cases.
 */
export function computeMetricSummary(cases: Case[]): MetricSummary {
  const total = cases.length;
  if (total === 0) {
    return {
      totalCases: 0,
      notificationRate: 0,
      acknowledgementRate: 0,
      understandingConfirmedRate: 0,
      referralInitiatedRate: 0,
      referralAcceptedRate: 0,
      appointmentBookedRate: 0,
      appointmentAttendanceRate: 0,
      diagnosticDispositionRate: 0,
      clinicalResolutionRate: 0,
      authorisedAlternativeRate: 0,
      escalationRate: 0,
      rejectionRate: 0,
      medianDaysToResolution: null,
      p90DaysToResolution: null,
    };
  }

  let notifiedCount = 0;
  let acknowledgedCount = 0;
  let understandingCount = 0;
  let referralCreatedCount = 0;
  let referralAcceptedCount = 0;
  let appointmentBookedCount = 0;
  let attendedCount = 0;
  let dispositionCount = 0;
  let clinicalResolutionCount = 0;
  let authorisedAlternativeCount = 0;
  let escalatedCount = 0;
  let rejectedCount = 0;

  const resolutionDays: number[] = [];

  for (const c of cases) {
    if (c.milestones.notificationDeliveredAt) notifiedCount++;
    if (c.milestones.acknowledgedAt) acknowledgedCount++;
    if (c.milestones.understandingConfirmedAt) understandingCount++;
    if (c.milestones.referralCreatedAt) referralCreatedCount++;
    if (c.milestones.referralAcceptedAt) referralAcceptedCount++;
    if (c.milestones.appointmentBookedAt) appointmentBookedCount++;
    if (c.milestones.attendedAt) attendedCount++;
    if (c.milestones.diagnosticDispositionDocumentedAt) dispositionCount++;

    if (c.currentState === 'ESCALATED') escalatedCount++;
    if (c.currentState === 'REJECTED') rejectedCount++;

    if (c.currentState === 'CLOSED' && c.closure) {
      if (c.closure.closureType === 'CLINICAL_RESOLUTION') {
        clinicalResolutionCount++;
      } else if (c.closure.closureType === 'AUTHORISED_ALTERNATIVE') {
        authorisedAlternativeCount++;
      }

      const start = new Date(c.screeningTestDate).getTime();
      const end = new Date(c.closure.closedAt).getTime();
      const diffDays = Math.max(0, (end - start) / (1000 * 60 * 60 * 24));
      resolutionDays.push(diffDays);
    }
  }

  resolutionDays.sort((a, b) => a - b);
  const medianDaysToResolution = calculatePercentile(resolutionDays, 50);
  const p90DaysToResolution = calculatePercentile(resolutionDays, 90);

  return {
    totalCases: total,
    notificationRate: Number(((notifiedCount / total) * 100).toFixed(1)),
    acknowledgementRate: Number(((acknowledgedCount / total) * 100).toFixed(1)),
    understandingConfirmedRate: Number(((understandingCount / total) * 100).toFixed(1)),
    referralInitiatedRate: Number(((referralCreatedCount / total) * 100).toFixed(1)),
    referralAcceptedRate: Number(((referralAcceptedCount / total) * 100).toFixed(1)),
    appointmentBookedRate: Number(((appointmentBookedCount / total) * 100).toFixed(1)),
    appointmentAttendanceRate: Number(((attendedCount / total) * 100).toFixed(1)),
    diagnosticDispositionRate: Number(((dispositionCount / total) * 100).toFixed(1)),
    clinicalResolutionRate: Number(((clinicalResolutionCount / total) * 100).toFixed(1)),
    authorisedAlternativeRate: Number(((authorisedAlternativeCount / total) * 100).toFixed(1)),
    escalationRate: Number(((escalatedCount / total) * 100).toFixed(1)),
    rejectionRate: Number(((rejectedCount / total) * 100).toFixed(1)),
    medianDaysToResolution: medianDaysToResolution !== null ? Number(medianDaysToResolution.toFixed(1)) : null,
    p90DaysToResolution: p90DaysToResolution !== null ? Number(p90DaysToResolution.toFixed(1)) : null,
  };
}

/**
 * Computes step-by-step pathway funnel attrition.
 */
export function computeStageAttrition(cases: Case[]): StageAttritionStep[] {
  const total = cases.length;
  if (total === 0) return [];

  const stages = [
    { key: 'RESULT_ISSUED', name: 'Screening Result Issued', nameAr: 'إصدار نتيجة الفحص', filter: () => true },
    { key: 'PATIENT_NOTIFIED', name: 'Patient Notified', nameAr: 'إخطار المريض', filter: (c: Case) => !!c.milestones.notificationDeliveredAt },
    { key: 'ACKNOWLEDGED', name: 'Result Acknowledged', nameAr: 'تأكيد استلام النتيجة', filter: (c: Case) => !!c.milestones.acknowledgedAt },
    { key: 'REFERRAL_SENT', name: 'Specialist Referral Sent', nameAr: 'إرسال الإحالة الطبية', filter: (c: Case) => !!c.milestones.referralCreatedAt },
    { key: 'REFERRAL_ACCEPTED', name: 'Referral Accepted', nameAr: 'قبول الإحالة الطبية', filter: (c: Case) => !!c.milestones.referralAcceptedAt },
    { key: 'APPOINTMENT_BOOKED', name: 'Appointment Booked', nameAr: 'حجز الموعد', filter: (c: Case) => !!c.milestones.appointmentBookedAt },
    { key: 'ATTENDED', name: 'Appointment Attended', nameAr: 'حضور الموعد الطبي', filter: (c: Case) => !!c.milestones.attendedAt },
    { key: 'DIAGNOSTIC_DISPOSITION_DOCUMENTED', name: 'Diagnostic Disposition Documented', nameAr: 'توثيق الرأي التشخيصي النهائي', filter: (c: Case) => !!c.milestones.diagnosticDispositionDocumentedAt },
    { key: 'CLOSED_CLINICAL_RESOLUTION', name: 'Closed: Clinical Resolution', nameAr: 'إغلاق الحالة: استكمال مسار الرعاية', filter: (c: Case) => c.currentState === 'CLOSED' && c.closure?.closureType === 'CLINICAL_RESOLUTION' },
  ];

  const steps: StageAttritionStep[] = [];
  let prevCount = total;

  for (const stage of stages) {
    const count = cases.filter(stage.filter).length;
    const retention = Number(((count / total) * 100).toFixed(1));
    const dropOff = prevCount > 0 ? Number((((prevCount - count) / prevCount) * 100).toFixed(1)) : 0;

    steps.push({
      stage: stage.name,
      stageNameArabic: stage.nameAr,
      count,
      retentionPercentOfTotal: retention,
      dropOffFromPreviousPercent: Math.max(0, dropOff),
    });

    prevCount = count;
  }

  return steps;
}

/**
 * Aggregates frequency counts of documented patient barriers.
 */
export function computeBarrierCounts(
  attempts: OutreachAttempt[],
  cases: Case[] = []
): Record<BarrierReason, number> {
  const counts: Record<BarrierReason, number> = {
    COST_INSURANCE: 0,
    TRANSPORT: 0,
    FEAR_ANXIETY: 0,
    LOW_HEALTH_LITERACY: 0,
    COMMUNICATION_FAILURE: 0,
    APPOINTMENT_UNAVAILABLE: 0,
    WORKFORCE_CAPACITY: 0,
    COMPETING_PRIORITIES: 0,
    UNREACHABLE: 0,
    OTHER: 0,
  };

  for (const attempt of attempts) {
    if (attempt.barrierReason && counts[attempt.barrierReason] !== undefined) {
      counts[attempt.barrierReason]++;
    }
  }

  return counts;
}

/**
 * Calculates patient age band based on date of birth.
 */
export function getAgeBand(dateOfBirth: string, refDate: Date = new Date()): string {
  const dob = new Date(dateOfBirth);
  let age = refDate.getFullYear() - dob.getFullYear();
  const m = refDate.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && refDate.getDate() < dob.getDate())) {
    age--;
  }

  if (age < 40) return '<40';
  if (age <= 49) return '40-49';
  if (age <= 59) return '50-59';
  if (age <= 69) return '60-69';
  return '70+';
}

/**
 * Computes disparity and completion gap analysis across demographic strata.
 * Groups with < 10 cases are suppressed for privacy protection.
 */
export function computeDisparityAnalysis(
  cases: Case[],
  patientsMap: Map<string, Patient>,
  packGroupFields?: PatientGroupField[]
): DisparityAnalysis {
  type GroupAccumulator = {
    cases: Case[];
    label: string;
  };

  const byLanguageMap = new Map<string, GroupAccumulator>();
  const byAgeBandMap = new Map<string, GroupAccumulator>();
  const byCustomGroupMap: Record<string, Map<string, GroupAccumulator>> = {};

  // Initialize custom group maps if packGroupFields provided
  if (packGroupFields && packGroupFields.length > 0) {
    for (const field of packGroupFields) {
      byCustomGroupMap[field.id] = new Map<string, GroupAccumulator>();
    }
  } else {
    // Default group field
    byCustomGroupMap['demographicGroup'] = new Map<string, GroupAccumulator>();
  }

  for (const c of cases) {
    const patient = patientsMap.get(c.patientId) || c.patient;
    if (!patient) continue;

    // Language
    const langKey = patient.language || 'en';
    const langLabel = langKey === 'ar' ? 'Arabic' : langKey === 'fr' ? 'French' : langKey === 'es' ? 'Spanish' : 'English';
    if (!byLanguageMap.has(langKey)) byLanguageMap.set(langKey, { cases: [], label: langLabel });
    byLanguageMap.get(langKey)!.cases.push(c);

    // Age Band
    const ageBand = getAgeBand(patient.dateOfBirth);
    if (!byAgeBandMap.has(ageBand)) byAgeBandMap.set(ageBand, { cases: [], label: `Age ${ageBand}` });
    byAgeBandMap.get(ageBand)!.cases.push(c);

    // Custom patient group fields from pack
    if (packGroupFields && packGroupFields.length > 0) {
      for (const field of packGroupFields) {
        const pAny = patient as any;
        const val =
          pAny[field.id] ||
          (patient.customDemographics && patient.customDemographics[field.id]) ||
          'UNSPECIFIED';

        const option = field.options.find((o) => o.id === val);
        const label = option ? option.label : String(val);

        const fieldMap = byCustomGroupMap[field.id];
        if (!fieldMap.has(val)) fieldMap.set(val, { cases: [], label });
        fieldMap.get(val)!.cases.push(c);
      }
    } else {
      // Generic fallback
      const pAny = patient as any;
      const groupVal = pAny.nationalityGroup || pAny.residencyStatus || pAny.region || 'DEFAULT';
      const fieldMap = byCustomGroupMap['demographicGroup'];
      if (!fieldMap.has(groupVal)) fieldMap.set(groupVal, { cases: [], label: String(groupVal) });
      fieldMap.get(groupVal)!.cases.push(c);
    }
  }

  function formatGroups(map: Map<string, GroupAccumulator>): GroupBreakdown[] {
    const results: GroupBreakdown[] = [];

    for (const [key, val] of map.entries()) {
      const count = val.cases.length;
      if (count < 10) {
        results.push({
          groupId: key,
          groupLabel: val.label,
          totalCases: count,
          suppressed: true,
          suppressionReason: 'Suppressed: sample size < 10 cases (privacy protection standard)',
        });
      } else {
        const metrics = computeMetricSummary(val.cases);
        results.push({
          groupId: key,
          groupLabel: val.label,
          totalCases: count,
          suppressed: false,
          clinicalResolutionRate: metrics.clinicalResolutionRate,
          acknowledgementRate: metrics.acknowledgementRate,
          attendanceRate: metrics.appointmentAttendanceRate,
          medianDaysToResolution: metrics.medianDaysToResolution,
        });
      }
    }

    return results;
  }

  const byGroupField: Record<string, GroupBreakdown[]> = {};
  for (const [fieldId, map] of Object.entries(byCustomGroupMap)) {
    byGroupField[fieldId] = formatGroups(map);
  }

  return {
    byLanguage: formatGroups(byLanguageMap),
    byGroupField,
    byAgeBand: formatGroups(byAgeBandMap),
  };
}

export interface SevenCoreIndicators {
  notificationRate: number; // Indicator 1: Notification rate
  acknowledgementRate: number; // Indicator 2: Acknowledgement rate
  referralCompletionRate: number; // Indicator 3: Referral completion
  appointmentAttendanceRate: number; // Indicator 4: Appointment attendance
  clinicalResolutionRate: number; // Indicator 5: Clinical resolution
  medianDaysToResolution: number | null; // Indicator 6: Median time to resolution
  p90DaysToResolution: number | null; // Indicator 6b: P90 time to resolution
  equityFollowUpGapPercent: number; // Indicator 7: Equity of follow-up (max disparity gap)
}

/**
 * Extracts and consolidates the 7 primary closed-loop screening indicators.
 */
export function computeSevenCoreIndicators(
  cases: Case[],
  disparity?: DisparityAnalysis
): SevenCoreIndicators {
  const summary = computeMetricSummary(cases);

  // Calculate disparity gap across unsuppressed groups
  let maxRate = 0;
  let minRate = 100;
  let hasValidGroups = false;

  if (disparity) {
    const allGroups = [
      ...disparity.byLanguage,
      ...disparity.byAgeBand,
      ...Object.values(disparity.byGroupField).flat(),
    ].filter((g) => !g.suppressed && g.clinicalResolutionRate !== undefined);

    for (const g of allGroups) {
      if (g.clinicalResolutionRate !== undefined) {
        hasValidGroups = true;
        if (g.clinicalResolutionRate > maxRate) maxRate = g.clinicalResolutionRate;
        if (g.clinicalResolutionRate < minRate) minRate = g.clinicalResolutionRate;
      }
    }
  }

  const equityGap = hasValidGroups ? Number((maxRate - minRate).toFixed(1)) : 0;

  return {
    notificationRate: summary.notificationRate,
    acknowledgementRate: summary.acknowledgementRate,
    referralCompletionRate: summary.referralAcceptedRate,
    appointmentAttendanceRate: summary.appointmentAttendanceRate,
    clinicalResolutionRate: summary.clinicalResolutionRate,
    medianDaysToResolution: summary.medianDaysToResolution,
    p90DaysToResolution: summary.p90DaysToResolution,
    equityFollowUpGapPercent: equityGap,
  };
}

