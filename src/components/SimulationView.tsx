import React, { useState } from 'react';
import {
  SimulationScenarioId,
  SIMULATION_SCENARIOS,
  EVIDENCE_EFFECT_SIZES,
  runSimulationScenario,
} from '../services/simulationEngine';

export function SimulationView() {
  const [selectedScenarioId, setSelectedScenarioId] = useState<SimulationScenarioId>('low');
  const [cohortSize, setCohortSize] = useState<number>(2000);

  const result = runSimulationScenario(selectedScenarioId, cohortSize);
  const scenario = SIMULATION_SCENARIOS[selectedScenarioId];

  return (
    <div className="space-y-6">
      {/* Header & Prominent Disclaimer */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-cl-ink tracking-tight">
            Closed-Loop Population Simulation Replay
          </h2>
          <p className="text-sm text-cl-muted">
            Simulates 2,000 screening cases comparing unmanaged standard care to CareLoop active closed-loop navigation.
          </p>
        </div>

        <span className="px-3 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-full text-xs font-semibold">
          Simulation model, not individual clinical effect
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
        <div className="text-xs font-bold text-cl-deep-teal uppercase tracking-wider">
          Evidence-Based RCT Parameters Powering the Simulation
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="p-2 bg-white rounded-cl-sm border border-cl-border">
            <div className="text-cl-muted text-[11px]">Active Navigation Lift</div>
            <div className="font-extrabold text-cl-ink mt-0.5">+8.5% (US RCT)</div>
            <div className="text-[10px] text-cl-teal">SRC-2023-US-RCT</div>
          </div>
          <div className="p-2 bg-white rounded-cl-sm border border-cl-border">
            <div className="text-cl-muted text-[11px]">Standalone SMS Lift</div>
            <div className="font-extrabold text-cl-alert-text mt-0.5">0.0% (No effect)</div>
            <div className="text-[10px] text-cl-muted">SRC-2020-TZA-SMS</div>
          </div>
          <div className="p-2 bg-white rounded-cl-sm border border-cl-border">
            <div className="text-cl-muted text-[11px]">Phone Navigation Lift</div>
            <div className="font-extrabold text-cl-deep-teal mt-0.5">+19.5% (Cameroon RCT)</div>
            <div className="text-[10px] text-cl-teal">SRC-2025-CMR-TEL</div>
          </div>
          <div className="p-2 bg-white rounded-cl-sm border border-cl-border">
            <div className="text-cl-muted text-[11px]">Multicomponent Escalation</div>
            <div className="font-extrabold text-cl-deep-teal mt-0.5">Odds Ratio 3.01</div>
            <div className="text-[10px] text-cl-teal">SRC-2024-META-CERV</div>
          </div>
        </div>
      </div>

      {/* Main Simulation Replay Head-to-Head Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Baseline (Unmanaged) Card */}
        <div className="bg-white p-5 rounded-cl-md border border-cl-border shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-cl-border pb-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-cl-alert-text">
                Standard Care / Historical Baseline
              </span>
              <h3 className="text-base font-extrabold text-cl-ink mt-0.5">
                Passive Screening (No Closed-Loop)
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded bg-cl-alert-tint text-cl-alert-text text-xs font-bold">
              High Loss to Follow-Up
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-cl-page-bg rounded-cl-sm">
              <div className="text-xs text-cl-muted">Diagnostic Resolution</div>
              <div className="text-2xl font-extrabold text-cl-alert-text mt-1">
                {result.baseline.completionPercentage}%
              </div>
              <div className="text-[11px] text-cl-muted mt-0.5">
                {result.baseline.completedCount} of {result.totalCohortSize} completed
              </div>
            </div>

            <div className="p-3 bg-cl-page-bg rounded-cl-sm">
              <div className="text-xs text-cl-muted">Lost to Follow-up</div>
              <div className="text-2xl font-extrabold text-cl-alert-text mt-1">
                {result.baseline.lostToFollowUpCount}
              </div>
              <div className="text-[11px] text-cl-muted mt-0.5">
                Unclosed abnormal findings
              </div>
            </div>

            <div className="p-3 bg-cl-page-bg rounded-cl-sm">
              <div className="text-xs text-cl-muted">Median Resolution Velocity</div>
              <div className="text-xl font-bold text-cl-ink mt-1">
                {result.baseline.medianDaysToResolution} days
              </div>
              <div className="text-[11px] text-cl-muted mt-0.5">
                P90: {result.baseline.p90DaysToResolution} days
              </div>
            </div>

            <div className="p-3 bg-cl-page-bg rounded-cl-sm">
              <div className="text-xs text-cl-muted">Early Neoplasia Identified</div>
              <div className="text-xl font-bold text-cl-ink mt-1">
                {result.baseline.estimatedAdvancedCasesIdentified}
              </div>
              <div className="text-[11px] text-cl-muted mt-0.5">
                Low yield due to drop-offs
              </div>
            </div>
          </div>
        </div>

        {/* CareLoop Managed Card */}
        <div className="bg-white p-5 rounded-cl-md border border-cl-deep-teal shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-cl-border pb-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-cl-teal">
                CareLoop Active Protocol
              </span>
              <h3 className="text-base font-extrabold text-cl-ink mt-0.5">
                Multi-Channel Closed-Loop Navigation
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded bg-cl-mist text-cl-deep-teal text-xs font-bold">
              Protected Follow-Through
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-cl-mist rounded-cl-sm">
              <div className="text-xs text-cl-deep-teal font-semibold">Diagnostic Resolution</div>
              <div className="text-2xl font-extrabold text-cl-deep-teal mt-1">
                {result.careLoopManaged.completionPercentage}%
              </div>
              <div className="text-[11px] text-cl-muted mt-0.5">
                {result.careLoopManaged.completedCount} of {result.totalCohortSize} completed
              </div>
            </div>

            <div className="p-3 bg-cl-mist rounded-cl-sm">
              <div className="text-xs text-cl-deep-teal font-semibold">Patients Protected</div>
              <div className="text-2xl font-extrabold text-cl-deep-teal mt-1">
                +{result.delta.additionalCompletedCases}
              </div>
              <div className="text-[11px] text-cl-muted mt-0.5">
                Rescued from drop-off
              </div>
            </div>

            <div className="p-3 bg-cl-page-bg rounded-cl-sm">
              <div className="text-xs text-cl-muted">Median Resolution Velocity</div>
              <div className="text-xl font-bold text-cl-ink mt-1">
                {result.careLoopManaged.medianDaysToResolution} days
              </div>
              <div className="text-[11px] text-cl-teal font-semibold mt-0.5">
                Saved {result.delta.daysSavedMedian} days vs baseline
              </div>
            </div>

            <div className="p-3 bg-cl-page-bg rounded-cl-sm">
              <div className="text-xs text-cl-muted">Early Neoplasia Identified</div>
              <div className="text-xl font-bold text-cl-ink mt-1">
                {result.careLoopManaged.estimatedAdvancedCasesIdentified}
              </div>
              <div className="text-[11px] text-cl-teal font-semibold mt-0.5">
                +{result.delta.potentialEarlyDetectionsGained} gained early
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sensitivity Projection Ranges */}
      <div className="bg-white p-5 rounded-cl-md border border-cl-border shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-cl-ink">
            Sensitivity Analysis & 95% Confidence Intervals
          </h3>
          <span className="text-xs font-mono text-cl-muted">
            Absolute Lift: +{result.delta.absolutePercentageLift}%
          </span>
        </div>

        <div className="p-3 bg-cl-page-bg rounded-cl-sm space-y-2 text-xs">
          <div className="flex items-center justify-between font-semibold text-cl-ink">
            <span>Conservative (Lower Bound):</span>
            <span className="font-mono">{result.sensitivityRange.minProjectedCompletion}%</span>
          </div>
          <div className="flex items-center justify-between font-bold text-cl-deep-teal">
            <span>Expected Point Estimate:</span>
            <span className="font-mono text-base">{result.sensitivityRange.expectedProjectedCompletion}%</span>
          </div>
          <div className="flex items-center justify-between font-semibold text-cl-ink">
            <span>Optimistic (Upper Bound):</span>
            <span className="font-mono">{result.sensitivityRange.maxProjectedCompletion}%</span>
          </div>
        </div>

        <p className="text-[11px] text-cl-muted leading-relaxed">
          {result.disclaimer}
        </p>
      </div>
    </div>
  );
}
