/**
 * CareLoop Population Simulation Replay Engine
 * Evaluates population-level screening follow-up outcomes across 2,000 synthetic cases
 * comparing empirical baselines against evidence-based navigation lifts.
 *
 * PARAMETERIZATION SOURCES (VERIFIED FACTS ONLY):
 * - US cluster RCT, JAMA 2023 (PubMed 37815566), 44 practices, 11,980 patients, 120-day follow-up:
 *   22.9% usual care, 22.7% EHR reminders, 31.4% reminders+outreach+navigation.
 * - Tanzania RCT, JMIR 2020 (jmir.org/2020/4/e15863):
 *   24.0% vs 23.8%, RR 1.02, no p-value claimed.
 * - Cameroon RCT, Gynecologic Oncology Reports 2025 (doi 10.1016/j.gore.2025.101745):
 *   25.6% vs 6.1%, aOR 3.97 (95% CI 1.29-12.17).
 * - Meta-analysis, PLOS ONE (journals.plos.org/plosone/article?id=10.1371/journal.pone.0291931):
 *   28 studies (11 RCTs, 17 observational), cervical abnormal-screen follow-up,
 *   multicomponent OR 3.01 (95% CI 2.03-4.46) vs single 1.56 (95% CI 1.14-2.14).
 * - International FIT survey, J Med Screen 2020 (doi 10.1177/0969141320904977):
 *   35 programmes surveyed, mean 79% colonoscopy within 6 months, range 39-100%;
 *   organised 81% vs opportunistic 57%.
 * - Abu Dhabi 2015-16: Almansoori et al., BMC Cancer 2021:
 *   adult Emiratis in ambulatory healthcare centres, 23.5% FOBT uptake,
 *   13.5% follow-up colonoscopy among FOBT-positive; cited second-hand.
 *
 * STRICT DISCLAIMER:
 * Simulation under stated assumptions, not clinical effect.
 * Trial outcomes differ from our closed-loop resolution endpoint.
 * Managed median velocities are an illustrative assumption, not evidence.
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
  medianDaysNote: string;
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
    medianDaysNote: 'illustrative assumption, not evidence',
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
    medianDaysNote: 'illustrative assumption, not evidence',
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
    medianDaysNote: 'illustrative assumption, not evidence',
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
  lift: number | null;
  completionRate: number | null;
  completionPercentage: number | null;
  completedCount: number | null;
  lostToFollowUpCount: number | null;
  range: [number, number] | null;
  medianDaysToResolution: number | null;
  p90DaysToResolution: number | null;
  isApplied: boolean;
  statusText?: string;
  medianDaysNote?: string;
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
    medianDaysNote: string;
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
    velocityNote: string;
  };
  disclaimer: string;
  endpointDifferenceNote: string;
}

/**
 * Runs a deterministic simulation comparison for a given cohort size and scenario.
 * Evaluates baseline + lift (default +8.5%, optimistic +19.5%), and shows 90% guideline target separately.
 * For the 79% organized baseline ('high'), the +19.5% optimistic lift is not applied (shows "not applied").
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
    isApplied: true,
    statusText: 'applied',
    medianDaysNote: 'illustrative assumption, not evidence',
  };

  // Optimistic lift: +0.195 (Cameroon RCT)
  // Constraint: do not apply the +19.5 optimistic lift to the 79% baseline (show "not applied")
  const isOptimisticApplied = scenarioId !== 'high';
  let optimisticProjection: ModelProjection;

  if (isOptimisticApplied) {
    const optimisticLift = EVIDENCE_EFFECT_SIZES.telephoneNavigationLiftOptimistic;
    const optimisticRate = Math.min(1.0, scenario.baselineRate + optimisticLift);
    const optimisticCompleted = Math.round(cohortSize * optimisticRate);
    const optimisticLost = cohortSize - optimisticCompleted;
    const optimisticRange: [number, number] = [
      +Math.min(1.0, scenario.baselineRange[0] + optimisticLift).toFixed(3),
      +Math.min(1.0, scenario.baselineRange[1] + optimisticLift).toFixed(3),
    ];

    optimisticProjection = {
      label: 'Optimistic Model (+19.5% lift, Cameroon RCT)',
      lift: +(optimisticLift * 100).toFixed(1),
      completionRate: optimisticRate,
      completionPercentage: +(optimisticRate * 100).toFixed(1),
      completedCount: optimisticCompleted,
      lostToFollowUpCount: optimisticLost,
      range: [+(optimisticRange[0] * 100).toFixed(1), +(optimisticRange[1] * 100).toFixed(1)],
      medianDaysToResolution: Math.max(14, scenario.medianDaysManaged - 4),
      p90DaysToResolution: Math.max(25, scenario.p90DaysManaged - 8),
      isApplied: true,
      statusText: 'applied',
      medianDaysNote: 'illustrative assumption, not evidence',
    };
  } else {
    optimisticProjection = {
      label: 'Optimistic Model (+19.5% lift, Cameroon RCT)',
      lift: null,
      completionRate: null,
      completionPercentage: null,
      completedCount: null,
      lostToFollowUpCount: null,
      range: null,
      medianDaysToResolution: null,
      p90DaysToResolution: null,
      isApplied: false,
      statusText: 'not applied',
      medianDaysNote: 'illustrative assumption, not evidence',
    };
  }

  return {
    scenario,
    totalCohortSize: cohortSize,
    baseline: {
      completedCount: baselineCompleted,
      lostToFollowUpCount: baselineLost,
      completionPercentage: +(scenario.baselineRate * 100).toFixed(1),
      medianDaysToResolution: scenario.medianDaysBaseline,
      p90DaysToResolution: scenario.p90DaysBaseline,
      medianDaysNote: 'illustrative assumption, not evidence',
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
      velocityNote: 'illustrative assumption, not evidence',
    },
    disclaimer:
      'simulation under stated assumptions, not clinical effect',
    endpointDifferenceNote:
      'Note: Trial outcomes differ from our closed-loop resolution endpoint. Cited trials evaluate 120-day colonoscopy completion or attended visits; CareLoop models full closed-loop milestone tracking to diagnostic disposition.',
  };
}
