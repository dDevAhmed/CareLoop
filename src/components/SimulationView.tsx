'use client';

import React, { useState } from 'react';
import {
  SimulationScenarioId,
  SIMULATION_SCENARIOS,
  runSimulationScenario,
} from '../services/simulationEngine';

export function SimulationView() {
  const [selectedScenarioId, setSelectedScenarioId] = useState<SimulationScenarioId>('low');
  const [cohortSize] = useState<number>(2000);

  const result = runSimulationScenario(selectedScenarioId, cohortSize);

  return (
    <div className="space-y-6">
      {/* Header & Prominent Disclaimer */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-cl-ink tracking-tight">
            Population Follow-Up Simulation Replay
          </h2>
          <p className="text-sm text-cl-muted">
            Simulates 2,000 screening cases comparing empirical baselines against navigation lifts.
          </p>
        </div>

        <span className="px-3 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-full text-xs font-semibold">
          simulation under stated assumptions, not clinical effect
        </span>
      </div>

      {/* Scenario Selection Chips */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {(['low', 'medium', 'high'] as SimulationScenarioId[]).map((id) => {
          const sc = SIMULATION_SCENARIOS[id];
          const isSelected = selectedScenarioId === id;
          return (
            <button
              key={id}
              onClick={() => setSelectedScenarioId(id)}
              className={`p-4 rounded-cl-md text-left transition-all border ${
                isSelected
                  ? 'bg-white border-cl-deep-teal ring-2 ring-cl-deep-teal/20 shadow-sm'
                  : 'bg-white border-cl-border hover:bg-cl-page-bg'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-cl-muted uppercase tracking-wider">
                  Scenario {id.toUpperCase()}
                </span>
                <span className="font-mono text-[10px] text-cl-teal font-semibold">
                  {sc.sourceReference}
                </span>
              </div>
              <div className="font-extrabold text-sm text-cl-ink">{sc.name}</div>
              <div className="text-xs text-cl-muted mt-1 leading-snug">{sc.description}</div>
              <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-cl-border">
                <span className="text-cl-muted">Baseline follow-up:</span>
                <span className="font-extrabold text-cl-alert-text">
                  {(sc.baselineRate * 100).toFixed(1)}%
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Parameterized RCT Effect Sizes Reference Bar */}
      <div className="p-3 bg-cl-mist border border-cl-border rounded-cl-md space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-cl-deep-teal uppercase tracking-wider">
            Evidence-Based Trial Parameters Powering the Simulation
          </span>
          <span className="text-[10px] text-cl-muted italic">
            simulation under stated assumptions, not clinical effect
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="p-2 bg-white rounded-cl-sm border border-cl-border">
            <div className="text-cl-muted text-[11px]">Default Navigation Lift</div>
            <div className="font-extrabold text-cl-ink mt-0.5">+8.5% (US Cluster RCT)</div>
            <div className="text-[10px] text-cl-teal">JAMA 2023 (PubMed 37815566)</div>
          </div>
          <div className="p-2 bg-white rounded-cl-sm border border-cl-border">
            <div className="text-cl-muted text-[11px]">Optimistic Telephone Lift</div>
            <div className="font-extrabold text-cl-deep-teal mt-0.5">+19.5% (Cameroon RCT)</div>
            <div className="text-[10px] text-cl-teal">Gynecol Oncol Rep 2025</div>
          </div>
          <div className="p-2 bg-white rounded-cl-sm border border-cl-border">
            <div className="text-cl-muted text-[11px]">Standalone SMS Lift</div>
            <div className="font-extrabold text-cl-muted mt-0.5">0.0% (RR 1.02)</div>
            <div className="text-[10px] text-cl-muted">JMIR 2020 (no p-value claimed)</div>
          </div>
          <div className="p-2 bg-white rounded-cl-sm border border-cl-border">
            <div className="text-cl-muted text-[11px]">Multicomponent Meta-Analysis</div>
            <div className="font-extrabold text-cl-deep-teal mt-0.5">OR = 3.01 (95% CI 2.03-4.46)</div>
            <div className="text-[10px] text-cl-teal">PLOS ONE 2024 meta-analysis</div>
          </div>
        </div>
      </div>

      {/* Main Simulation Replay Comparison Table & Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-cl-ink">
            Comparative Model Outcomes (Cohort = {result.totalCohortSize} cases)
          </h3>
          <span className="text-xs text-cl-muted italic">
            simulation under stated assumptions, not clinical effect
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Card 1: Baseline */}
          <div className="bg-white p-4 rounded-cl-md border border-cl-border shadow-xs space-y-3">
            <div className="border-b border-cl-border pb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cl-alert-text">
                Baseline (Unmanaged)
              </span>
              <div className="text-sm font-extrabold text-cl-ink mt-0.5">
                {result.scenario.name}
              </div>
            </div>
            <div className="text-2xl font-extrabold text-cl-alert-text">
              {result.baseline.completionPercentage}%
            </div>
            <div className="text-xs text-cl-muted">
              {result.baseline.completedCount} of {result.totalCohortSize} resolved
            </div>
            <div className="text-[11px] text-cl-muted border-t border-cl-border pt-2 space-y-0.5">
              <div>Median velocity: {result.baseline.medianDaysToResolution} days (P90: {result.baseline.p90DaysToResolution}d)</div>
              <div className="text-[10px] text-cl-muted italic">illustrative assumption, not evidence</div>
            </div>
          </div>

          {/* Card 2: Default Model (Baseline + 8.5%) */}
          <div className="bg-white p-4 rounded-cl-md border-2 border-cl-deep-teal shadow-xs space-y-3">
            <div className="border-b border-cl-border pb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cl-deep-teal">
                Default Projection (+8.5% Lift)
              </span>
              <div className="text-sm font-extrabold text-cl-ink mt-0.5">
                Baseline + US Cluster RCT Lift
              </div>
            </div>
            <div className="text-2xl font-extrabold text-cl-deep-teal">
              {result.defaultModel.completionPercentage}%
            </div>
            <div className="text-xs text-cl-muted">
              {result.defaultModel.completedCount} of {result.totalCohortSize} resolved
            </div>
            <div className="text-[11px] text-cl-ink font-semibold">
              Range: {result.defaultModel.range?.[0]}% – {result.defaultModel.range?.[1]}%
            </div>
            <div className="text-[11px] text-cl-muted border-t border-cl-border pt-2 space-y-0.5">
              <div>Median velocity: {result.defaultModel.medianDaysToResolution} days</div>
              <div className="text-[10px] text-cl-muted italic">illustrative assumption, not evidence</div>
            </div>
          </div>

          {/* Card 3: Optimistic Model (Baseline + 19.5%) */}
          <div className="bg-white p-4 rounded-cl-md border border-cl-teal/60 shadow-xs space-y-3">
            <div className="border-b border-cl-border pb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cl-teal">
                Optimistic (+19.5% Lift)
              </span>
              <div className="text-sm font-extrabold text-cl-ink mt-0.5">
                Baseline + Cameroon RCT Lift
              </div>
            </div>
            {!result.optimisticModel.isApplied ? (
              <div className="space-y-2 py-2">
                <div className="text-2xl font-extrabold text-cl-muted italic">
                  not applied
                </div>
                <div className="text-xs text-cl-muted">
                  Optimistic lift not applied to 79.0% organized screening baseline.
                </div>
                <div className="text-[11px] text-cl-muted border-t border-cl-border pt-2">
                  <span className="text-[10px] text-cl-muted italic">illustrative assumption, not evidence</span>
                </div>
              </div>
            ) : (
              <>
                <div className="text-2xl font-extrabold text-cl-teal">
                  {result.optimisticModel.completionPercentage}%
                </div>
                <div className="text-xs text-cl-muted">
                  {result.optimisticModel.completedCount} of {result.totalCohortSize} resolved
                </div>
                <div className="text-[11px] text-cl-ink font-semibold">
                  Range: {result.optimisticModel.range?.[0]}% – {result.optimisticModel.range?.[1]}%
                </div>
                <div className="text-[11px] text-cl-muted border-t border-cl-border pt-2 space-y-0.5">
                  <div>Median velocity: {result.optimisticModel.medianDaysToResolution} days</div>
                  <div className="text-[10px] text-cl-muted italic">illustrative assumption, not evidence</div>
                </div>
              </>
            )}
          </div>

          {/* Card 4: 90% Guideline Target (Benchmark, Not a Prediction) */}
          <div className="bg-cl-page-bg p-4 rounded-cl-md border border-dashed border-cl-border space-y-3">
            <div className="border-b border-cl-border pb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cl-muted">
                Guideline Target (Benchmark)
              </span>
              <div className="text-sm font-bold text-cl-ink mt-0.5">
                Target Only — Not a Prediction
              </div>
            </div>
            <div className="text-2xl font-extrabold text-cl-muted">
              {result.guidelineTarget.targetPercentage}%
            </div>
            <div className="text-xs text-cl-muted">
              {result.guidelineTarget.targetCount} cases (Ideal organized registry target)
            </div>
            <div className="text-[11px] text-amber-800 bg-amber-50 p-1.5 rounded border border-amber-200">
              International policy target; shown separately from predictive models.
            </div>
          </div>
        </div>
      </div>

      {/* Endpoint Difference & Assumptions Note */}
      <div className="p-4 bg-white rounded-cl-md border border-cl-border space-y-2 text-xs">
        <div className="font-bold text-cl-ink">Methodological Declarations & Endpoint Alignment</div>
        <p className="text-cl-muted leading-relaxed">
          {result.endpointDifferenceNote}
        </p>
        <div className="pt-2 border-t border-cl-border text-[11px] text-cl-muted">
          <strong>Citation Note:</strong> Multi-component escalation odds ratio (3.01, 95% CI 2.03–4.46) is attributed to the PLOS ONE 2024 meta-analysis on abnormal screening follow-up. Simulation values represent deterministic arithmetic models parameterized by cited trial data (baseline + lift). All projected velocities and median durations are an <em>illustrative assumption, not evidence</em>.
        </div>
      </div>
    </div>
  );
}
