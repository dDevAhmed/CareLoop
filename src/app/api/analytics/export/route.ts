import { NextRequest, NextResponse } from 'next/server';
import { getStore, getActivePackId } from '@/services/caseRepository';
import { getJurisdictionPack } from '@/packs';
import {
  computeMetricSummary,
  computeStageAttrition,
  computeBarrierCounts,
  computeDisparityAnalysis,
  computeSevenCoreIndicators,
} from '@/engine/metricsEngine';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const pathway = searchParams.get('pathway');
  const packId = searchParams.get('pack') || getActivePackId();

  const store = getStore(packId);
  const pack = getJurisdictionPack(packId);
  let cases = Array.from(store.cases.values());

  if (pathway && pathway !== 'all') {
    cases = cases.filter((c) => c.pathwayId === pathway);
  }

  const summary = computeMetricSummary(cases);
  const attrition = computeStageAttrition(cases);
  const barrierCounts = computeBarrierCounts(store.outreachAttempts, cases);
  const disparity = computeDisparityAnalysis(cases, store.patients, pack.patientGroupFields);
  const indicators = computeSevenCoreIndicators(cases, disparity);

  const lines: string[] = [];

  // Header & Metadata
  lines.push('# CareLoop Closed-Loop Screening Analytics Export');
  lines.push(`# Jurisdiction Pack: ${pack.name} (${pack.id})`);
  lines.push(`# Generated At: ${new Date().toISOString()}`);
  lines.push(`# Total Cohort Cases: ${cases.length}`);
  lines.push('');

  // Section 1: 7 Core Closed-Loop Indicators
  lines.push('Indicator Name,Value,Unit,Target Benchmark');
  lines.push(`Notification Rate,${indicators.notificationRate},%,100%`);
  lines.push(`Acknowledgement Rate,${indicators.acknowledgementRate},%,>= 95%`);
  lines.push(`Referral Completion Rate,${indicators.referralCompletionRate},%,>= 90%`);
  lines.push(`Appointment Attendance Rate,${indicators.appointmentAttendanceRate},%,>= 85%`);
  lines.push(`Clinical Resolution Rate,${indicators.clinicalResolutionRate},%,>= 80%`);
  lines.push(`Median Time to Diagnostic Resolution,${indicators.medianDaysToResolution ?? 'N/A'},Working Days,<= 31 Days`);
  lines.push(`P90 Time to Diagnostic Resolution,${indicators.p90DaysToResolution ?? 'N/A'},Working Days,<= 45 Days`);
  lines.push(`Equity Follow-up Gap (Max Demography Disparity),${indicators.equityFollowUpGapPercent},%,<= 5.0%`);
  lines.push('');

  // Section 2: Cascade Funnel Attrition
  lines.push('Funnel Stage,Case Count,Retention (% of Cohort),Drop-off From Prior Stage (%)');
  for (const step of attrition) {
    lines.push(`"${step.stage}",${step.count},${step.retentionPercentOfTotal}%,${step.dropOffFromPreviousPercent}%`);
  }
  lines.push('');

  // Section 3: Documented Barrier Reasons
  lines.push('Reported Barrier Reason,Incident Count');
  for (const [barrier, count] of Object.entries(barrierCounts)) {
    lines.push(`"${barrier}",${count}`);
  }
  lines.push('');

  // Section 4: Demographic Equity Disparities (Small-cell protected)
  lines.push('Category,Group Label,Total Cases,Clinical Resolution (%),Acknowledgement (%),Attendance (%)');
  for (const lang of disparity.byLanguage) {
    if (lang.suppressed) {
      lines.push(`Language,"${lang.groupLabel}",${lang.totalCases},SUPPRESSED (<10),SUPPRESSED,SUPPRESSED`);
    } else {
      lines.push(`Language,"${lang.groupLabel}",${lang.totalCases},${lang.clinicalResolutionRate}%,${lang.acknowledgementRate}%,${lang.attendanceRate}%`);
    }
  }

  for (const [fieldId, groups] of Object.entries(disparity.byGroupField)) {
    for (const g of groups) {
      if (g.suppressed) {
        lines.push(`"${fieldId}","${g.groupLabel}",${g.totalCases},SUPPRESSED (<10),SUPPRESSED,SUPPRESSED`);
      } else {
        lines.push(`"${fieldId}","${g.groupLabel}",${g.totalCases},${g.clinicalResolutionRate}%,${g.acknowledgementRate}%,${g.attendanceRate}%`);
      }
    }
  }

  const csvContent = lines.join('\n');

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="careloop-analytics-${packId}-${Date.now()}.csv"`,
    },
  });
}
