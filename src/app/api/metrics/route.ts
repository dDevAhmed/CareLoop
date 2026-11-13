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
  const sevenIndicators = computeSevenCoreIndicators(cases, disparity);

  return NextResponse.json({
    packId: pack.id,
    packName: pack.name,
    patientGroupFields: pack.patientGroupFields,
    summary,
    sevenIndicators,
    attrition,
    barrierCounts,
    disparity,
  });
}
