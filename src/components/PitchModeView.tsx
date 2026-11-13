import React, { useState } from 'react';
import { PITCH_STEPS, PitchStep } from '../services/pitchMode';
import { formatHumanLabel } from '../utils/formatters';

interface PitchModeViewProps {
  onAdvanceClock?: (days: number) => void;
  onResetClock?: () => void;
}

export function PitchModeView({ onAdvanceClock, onResetClock }: PitchModeViewProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const activeStep: PitchStep = PITCH_STEPS[currentStepIndex] || PITCH_STEPS[0];

  function handleNext() {
    if (currentStepIndex < PITCH_STEPS.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  }

  function handlePrev() {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  }

  function handleReset() {
    setCurrentStepIndex(0);
    onResetClock?.();
  }

  return (
    <div className="space-y-6">
      {/* Pitch Mode Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded bg-cl-deep-teal text-white text-[10px] font-extrabold uppercase tracking-wider">
              Live Pitch Walkthrough
            </span>
            <span className="text-xs text-cl-muted">
              Step {currentStepIndex + 1} of {PITCH_STEPS.length}
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-cl-ink tracking-tight mt-1">
            Deterministic Scripted Evaluator Journey
          </h2>
          <p className="text-sm text-cl-muted">
            Walks evaluators through a complete patient journey from abnormal FIT detection to closed-loop diagnostic resolution.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleReset}
            className="px-3 py-1.5 bg-white border border-cl-border text-cl-muted hover:text-cl-ink text-xs font-semibold rounded-cl-sm transition-colors"
          >
            Reset Script
          </button>
          <button
            onClick={handlePrev}
            disabled={currentStepIndex === 0}
            className="px-3 py-1.5 bg-white border border-cl-border text-cl-ink disabled:opacity-40 text-xs font-bold rounded-cl-sm hover:bg-cl-page-bg transition-colors"
          >
            ← Previous
          </button>
          <button
            onClick={handleNext}
            disabled={currentStepIndex === PITCH_STEPS.length - 1}
            className="px-4 py-1.5 bg-cl-deep-teal hover:bg-cl-teal text-white disabled:opacity-40 text-xs font-bold rounded-cl-sm transition-colors shadow-sm"
          >
            Next Step →
          </button>
        </div>
      </div>

      {/* Step Progress Stepper */}
      <div className="bg-white p-4 rounded-cl-md border border-cl-border shadow-sm overflow-x-auto">
        <div className="flex items-center justify-between min-w-[700px]">
          {PITCH_STEPS.map((step, idx) => {
            const isCompleted = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;
            return (
              <div
                key={step.stepIndex}
                onClick={() => setCurrentStepIndex(idx)}
                className="flex-1 cursor-pointer group flex flex-col items-center text-center px-1"
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isCurrent
                      ? 'bg-cl-deep-teal text-white ring-4 ring-cl-deep-teal/20'
                      : isCompleted
                      ? 'bg-cl-mist text-cl-deep-teal'
                      : 'bg-cl-page-bg text-cl-muted border border-cl-border'
                  }`}
                >
                  {isCompleted ? '✓' : idx + 1}
                </div>
                <div
                  className={`mt-1.5 text-[10px] font-semibold truncate max-w-[80px] ${
                    isCurrent ? 'text-cl-deep-teal font-extrabold' : 'text-cl-muted'
                  }`}
                >
                  {formatHumanLabel(step.stage)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Presenter Commentary Card & Live Simulation Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Presenter Script & Clinical Guidance (7 cols) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-cl-md border border-cl-border shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-cl-border pb-3">
            <div>
              <span className="text-[11px] font-bold text-cl-teal uppercase tracking-wider">
                Stage {currentStepIndex + 1}: {formatHumanLabel(activeStep.stage)}
              </span>
              <h3 className="text-lg font-extrabold text-cl-ink mt-0.5">
                {activeStep.title}
              </h3>
            </div>
            <span className="px-2.5 py-1 bg-cl-neutral-chip text-cl-ink text-xs font-mono font-bold rounded">
              CASE-PITCH-101
            </span>
          </div>

          {/* On-screen Presenter Talking Points */}
          <div className="p-4 bg-cl-mist rounded-cl-sm border border-cl-border/50 space-y-2">
            <div className="flex items-center space-x-1.5 text-xs font-extrabold text-cl-deep-teal">
              <span>🎙</span>
              <span>Presenter Guidance for Innovation Challenge Judges:</span>
            </div>
            <p className="text-xs text-cl-ink leading-relaxed font-medium">
              &quot;{activeStep.presenterPrompt}&quot;
            </p>
          </div>

          {/* Technical Platform Actions */}
          <div className="space-y-1.5 text-xs">
            <div className="font-bold text-cl-muted uppercase tracking-wider text-[11px]">
              Engine State Machine &amp; Audit Execution
            </div>
            <div className="p-3 bg-cl-page-bg rounded-cl-sm border border-cl-border font-mono text-cl-ink text-[11px] leading-relaxed">
              {activeStep.technicalAction}
            </div>
          </div>
        </div>

        {/* Right: Live Case Snapshot & Overdue Escalation Demo (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-5 rounded-cl-md border border-cl-border shadow-sm space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-cl-muted">
              Live Synthetic Case State
            </h4>

            <div className="p-3 bg-cl-page-bg rounded-cl-sm border border-cl-border space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-cl-muted">Patient:</span>
                <span className="font-bold text-cl-ink">Maryam Al-Mansoor (Arabic)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-cl-muted">Pathway:</span>
                <span className="font-bold text-cl-ink">Colorectal (FIT Positive)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-cl-muted">State:</span>
                <span className="font-extrabold text-cl-deep-teal">
                  {formatHumanLabel(activeStep.stage)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-cl-muted">Clinical Deadline:</span>
                <span className="font-bold text-cl-ink">
                  {activeStep.caseSnapshot.slaWorkingDaysRemaining} working days left
                </span>
              </div>
            </div>
          </div>

          {/* Overdue Escalation Demonstration Card */}
          <div className="bg-white p-5 rounded-cl-md border border-cl-border shadow-sm space-y-3">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-cl-coral animate-ping"></span>
              <h4 className="text-xs font-bold uppercase tracking-wider text-cl-ink">
                Test SLA Escalation Engine
              </h4>
            </div>
            <p className="text-xs text-cl-muted">
              Advance the simulated system clock to observe automated SLA calculation and supervisor alert triggers.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => onAdvanceClock?.(7)}
                className="py-1.5 px-2 bg-white border border-cl-border text-cl-ink hover:bg-cl-page-bg rounded-cl-sm text-xs font-semibold transition-colors"
              >
                Advance +7 Days
              </button>
              <button
                onClick={() => onAdvanceClock?.(30)}
                className="py-1.5 px-2 bg-cl-alert-tint text-cl-alert-text hover:bg-red-200 rounded-cl-sm text-xs font-bold transition-colors"
              >
                Advance +30 Days (Breach)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

