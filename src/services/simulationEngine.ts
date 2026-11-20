/**
 * CareLoop Population Simulation Replay Engine
 * Evaluates population-level screening follow-up outcomes across 2,000 cases
 * comparing empirical baselines against evidence-based navigation lifts.
 *
 * PARAMETERIZATION SOURCES:
 * - SRC-2015-AUH-EMIR: 13.5% historical baseline follow-up (Abu Dhabi audit)
 * - SRC-2020-FIT-SURVEY: 57.0% opportunistic vs 79.0% organized screening
 * - SRC-2023-US-RCT: +8.5% 120-day absolute navigation lift (US cluster RCT)
 * - SRC-2020-TZA-SMS: Standalone SMS yielded 0.0% statistically significant lift
 * - SRC-2025-CMR-TEL: +19.5% telephone navigation lift (Cameroon RCT, optimistic upper bound)
 * - SRC-2024-META-CERV: Multicomponent navigation OR = 3.01 (PLOS ONE 2024 meta-analysis)
 *
 * STRICT DISCLAIMER:
 * Simulation under stated assumptions, not clinical effect.
 * Trial outcomes differ from our closed-loop resolution endpoint.
 */

export type SimulationScenarioId = 'low' | 'medium' | 'high';

export interface ScenarioDefinition {
  id: SimulationScenarioId;
  name: string;
  sourceReference: string;
  baselineRate: number; // e.g. 0.135
  baselineRange: [number, number];
  medianDaysBaseline: number;
  medianDaysManaged: number;
  p90DaysBaseline: number;
  p90DaysManaged: number;
  description: string;
}

export const SIMULATION_SCENARIOS: Record<SimulationScenarioId, ScenarioDefinition> = {
  low: {
    id: 'low',
    name: 'Historical Baseline (2015-2016)',
    sourceReference: 'SRC-2015-AUH-EMIR',
    baselineRate: 0.135,
    baselineRange: [0.11, 0.16],
    medianDaysBaseline: 112,
    medianDaysManaged: 28,
    p90DaysBaseline: 240,
    p90DaysManaged: 54,
    description:
      'Models historical unmanaged screening where positive FIT results relied on passive patient self-referral, yielding high loss-to-follow-up.',
  },
  medium: {
    id: 'medium',
    name: 'International Opportunistic Screening',
    sourceReference: 'SRC-2020-FIT-SURVEY',
    baselineRate: 0.57,
    baselineRange: [0.52, 0.62],
    medianDaysBaseline: 74,
    medianDaysManaged: 25,
    p90DaysBaseline: 145,
    p90DaysManaged: 42,
    description:
      'Reflects uncoordinated ambulatory networks without central closed-loop navigation.',
  },
  high: {
    id: 'high',
    name: 'International Organized Screening Registry',
    sourceReference: 'SRC-2020-FIT-SURVEY',
    baselineRate: 0.79,
    baselineRange: [0.75, 0.83],
    medianDaysBaseline: 46,
    medianDaysManaged: 21,
    p90DaysBaseline: 82,
    p90DaysManaged: 34,
    description:
      'Compares established organized screening cohorts to CareLoop multi-channel navigation.',
  },
};

export interface ParameterizedEffects {
  activeNavigationLiftDefault: number; // +0.085 (US cluster RCT, 120-day)
  telephoneNavigationLiftOptimistic: number; // +0.195 (Cameroon RCT)
  smsAloneLift: number; // 0.000 (Tanzania RCT)
  multiComponentOddsRatio: number; // 3.01 (PLOS ONE 2024 meta-analysis)
  guidelineTargetRate: number; // 0.90 (90% target, not a prediction)
}

export const EVIDENCE_EFFECT_SIZES: ParameterizedEffects = {
  activeNavigationLiftDefault: 0.085,
  telephoneNavigationLiftOptimistic: 0.195,
  smsAloneLift: 0.0,
  multiComponentOddsRatio: 3.01,
  guidelineTargetRate: 0.90,
};

export interface ModelProjection {
  label: string;
  lift: number;
  completionRate: number;
  completionPercentage: number;
  completedCount: number;
  lostToFollowUpCount: number;
  range: [number, number];
  medianDaysToResolution: number;
  p90DaysToResolution: number;
}

export interface ScenarioSimulationResult {
  scenario: ScenarioDefinition;
  totalCohortSize: number;
  baseline: {
    completedCount: number;
    lostToFollowUpCount: number;
    completionPercentage: number;
    medianDaysToResolution: number;
    p90DaysToResolution: number;
  };
  defaultModel: ModelProjection;
  optimisticModel: ModelProjection;
  // Alias for backward compatibility with UI components
  careLoopManaged: ModelProjection;
  guidelineTarget: {
    targetPercentage: number;
    targetCount: number;
    label: string;
    isPrediction: boolean;
  };
  delta: {
    additionalCompletedCases: number;
    absolutePercentageLift: number;
    daysSavedMedian: number;
  };
  disclaimer: string;
  endpointDifferenceNote: string;
}

/**
 * Runs a deterministic simulation comparison for a given cohort size and scenario.
 * Evaluates baseline + lift (default +8.5%, optimistic +19.5%), and shows 90% guideline target separately.
 */
export function runSimulationScenario(
  scenarioId: SimulationScenarioId = 'low',
  cohortSize: number = 2000
): ScenarioSimulationResult {
  const scenario = SIMULATION_SCENARIOS[scenarioId];

  // Baseline calculations
  const baselineCompleted = Math.round(cohortSize * scenario.baselineRate);
  const baselineLost = cohortSize - baselineCompleted;

  // Default lift: +0.085 (US cluster RCT, within 120 days)
  const defaultLift = EVIDENCE_EFFECT_SIZES.activeNavigationLiftDefault;
  const defaultRate = Math.min(1.0, scenario.baselineRate + defaultLift);
  const defaultCompleted = Math.round(cohortSize * defaultRate);
  const defaultLost = cohortSize - defaultCompleted;
  const defaultRange: [number, number] = [
    +Math.min(1.0, scenario.baselineRange[0] + defaultLift).toFixed(3),
    +Math.min(1.0, scenario.baselineRange[1] + defaultLift).toFixed(3),
  ];

  // Optimistic lift: +0.195 (Cameroon RCT)
  const optimisticLift = EVIDENCE_EFFECT_SIZES.telephoneNavigationLiftOptimistic;
  const optimisticRate = Math.min(1.0, scenario.baselineRate + optimisticLift);
  const optimisticCompleted = Math.round(cohortSize * optimisticRate);
  const optimisticLost = cohortSize - optimisticCompleted;
  const optimisticRange: [number, number] = [
    +Math.min(1.0, scenario.baselineRange[0] + optimisticLift).toFixed(3),
    +Math.min(1.0, scenario.baselineRange[1] + optimisticLift).toFixed(3),
  ];

  const defaultProjection: ModelProjection = {
    label: 'Default Model (+8.5% lift, US Cluster RCT)',
    lift: +(defaultLift * 100).toFixed(1),
    completionRate: defaultRate,
    completionPercentage: +(defaultRate * 100).toFixed(1),
    completedCount: defaultCompleted,
    lostToFollowUpCount: defaultLost,
    range: [+(defaultRange[0] * 100).toFixed(1), +(defaultRange[1] * 100).toFixed(1)],
    medianDaysToResolution: scenario.medianDaysManaged,
    p90DaysToResolution: scenario.p90DaysManaged,
  };

  const optimisticProjection: ModelProjection = {
    label: 'Optimistic Model (+19.5% lift, Cameroon RCT)',
    lift: +(optimisticLift * 100).toFixed(1),
    completionRate: optimisticRate,
    completionPercentage: +(optimisticRate * 100).toFixed(1),
    completedCount: optimisticCompleted,
    lostToFollowUpCount: optimisticLost,
    range: [+(optimisticRange[0] * 100).toFixed(1), +(optimisticRange[1] * 100).toFixed(1)],
    medianDaysToResolution: Math.max(14, scenario.medianDaysManaged - 4),
    p90DaysToResolution: Math.max(25, scenario.p90DaysManaged - 8),
  };

  return {
    scenario,
    totalCohortSize: cohortSize,
    baseline: {
      completedCount: baselineCompleted,
      lostToFollowUpCount: baselineLost,
      completionPercentage: +(scenario.baselineRate * 100).toFixed(1),
      medianDaysToResolution: scenario.medianDaysBaseline,
      p90DaysToResolution: scenario.p90DaysBaseline,
    },
    defaultModel: defaultProjection,
    optimisticModel: optimisticProjection,
    careLoopManaged: defaultProjection,
    guidelineTarget: {
      targetPercentage: +(EVIDENCE_EFFECT_SIZES.guidelineTargetRate * 100).toFixed(1),
      targetCount: Math.round(cohortSize * EVIDENCE_EFFECT_SIZES.guidelineTargetRate),
      label: 'Guideline Target (Benchmark)',
      isPrediction: false,
    },
    delta: {
      additionalCompletedCases: defaultCompleted - baselineCompleted,
      absolutePercentageLift: +(defaultLift * 100).toFixed(1),
      daysSavedMedian: scenario.medianDaysBaseline - scenario.medianDaysManaged,
    },
    disclaimer:
      'simulation under stated assumptions, not clinical effect',
    endpointDifferenceNote:
      'Note: Trial outcomes differ from our closed-loop resolution endpoint. Cited trials evaluate 120-day colonoscopy completion or attended visits; CareLoop models full closed-loop milestone tracking to diagnostic disposition.',
  };
}
