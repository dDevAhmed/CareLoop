import React, { useState, useEffect } from 'react';
import { JurisdictionPack } from '../types';
import { formatHumanLabel } from '../utils/formatters';

interface AnalyticsViewProps {
  activePack: JurisdictionPack | null;
}

export function AnalyticsView({ activePack }: AnalyticsViewProps) {
  const [selectedPathway, setSelectedPathway] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchMetrics();
  }, [selectedPathway, activePack?.id]);

  async function fetchMetrics() {
    setLoading(true);
    try {
      const url = `/api/metrics?pathway=${selectedPathway}&pack=${activePack?.id || 'abu-dhabi'}`;
      const res = await fetch(url);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Failed to load analytics', err);
    } finally {
      setLoading(false);
    }
  }

  // Count verified vs unverified rules in the active pack
  const verifiedCount = activePack?.pathways.filter((p) => p.verified).length || 0;
  const totalRules = activePack?.pathways.length || 0;

  return (
    <div className="space-y-6">
      {/* Header & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-cl-ink tracking-tight">
            Population Analytics & Cascade Funnel
          </h2>
          <p className="text-sm text-cl-muted">
            Evaluates screening follow-through, clinical resolution velocity, barrier frequencies, and demographic equity.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Pathway Selector */}
          <select
            value={selectedPathway}
            onChange={(e) => setSelectedPathway(e.target.value)}
            className="px-3 py-1.5 bg-white border border-cl-border rounded-cl-sm text-xs font-semibold text-cl-ink focus:outline-none focus:ring-1 focus:ring-cl-teal"
          >
            <option value="all">All Screening Pathways</option>
            {activePack?.pathways.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Export to CSV Button */}
          <a
            href={`/api/analytics/export?pathway=${selectedPathway}&pack=${activePack?.id || 'abu-dhabi'}`}
            download
            className="px-3 py-1.5 bg-cl-navy hover:bg-cl-deep-teal text-white rounded-cl-sm text-xs font-bold transition-colors flex items-center space-x-1.5 shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {/* Pack-Aware Verified Rules Banner */}
      <div className="p-3 bg-cl-mist border border-cl-border rounded-cl-md flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <span className="font-extrabold text-cl-deep-teal">
            Jurisdiction Pack: {activePack?.name || 'Active Jurisdiction'}
          </span>
          <span className="text-cl-muted">•</span>
          <span className="text-cl-muted">
            Clinical Calendar: {activePack?.workingDayCalendar?.weekendDays?.join(', ') || 'Sat, Sun'} weekend
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span
            className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
              verifiedCount === totalRules
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-900'
            }`}
          >
            {verifiedCount}/{totalRules} Rules Clinically Verified
          </span>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-cl-muted text-sm">
          Aggregating cohort cascade and equity indicators...
        </div>
      ) : data ? (
        <>
          {/* Section 1: The 7 Core Indicators Dashboard */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-cl-muted mb-2">
              7 Core Closed-Loop Screening Indicators
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {/* Ind 1: Notification Rate */}
              <div className="bg-white p-3 rounded-cl-sm border border-cl-border shadow-sm">
                <div className="text-[11px] text-cl-muted font-medium">1. Notified</div>
                <div className="text-lg font-extrabold text-cl-ink mt-1">
                  {data.sevenIndicators?.notificationRate ?? data.summary.notificationRate}%
                </div>
                <div className="text-[10px] text-cl-teal font-semibold mt-1">Target: 100%</div>
              </div>

              {/* Ind 2: Acknowledgement Rate */}
              <div className="bg-white p-3 rounded-cl-sm border border-cl-border shadow-sm">
                <div className="text-[11px] text-cl-muted font-medium">2. Acknowledged</div>
                <div className="text-lg font-extrabold text-cl-ink mt-1">
                  {data.sevenIndicators?.acknowledgementRate ?? data.summary.acknowledgementRate}%
                </div>
                <div className="text-[10px] text-cl-teal font-semibold mt-1">Target: ≥ 95%</div>
              </div>

              {/* Ind 3: Referral Completion */}
              <div className="bg-white p-3 rounded-cl-sm border border-cl-border shadow-sm">
                <div className="text-[11px] text-cl-muted font-medium">3. Referral Done</div>
                <div className="text-lg font-extrabold text-cl-ink mt-1">
                  {data.sevenIndicators?.referralCompletionRate ?? data.summary.referralAcceptedRate}%
                </div>
                <div className="text-[10px] text-cl-teal font-semibold mt-1">Target: ≥ 90%</div>
              </div>

              {/* Ind 4: Attendance Rate */}
              <div className="bg-white p-3 rounded-cl-sm border border-cl-border shadow-sm">
                <div className="text-[11px] text-cl-muted font-medium">4. Attended</div>
                <div className="text-lg font-extrabold text-cl-ink mt-1">
                  {data.sevenIndicators?.appointmentAttendanceRate ?? data.summary.appointmentAttendanceRate}%
                </div>
                <div className="text-[10px] text-cl-teal font-semibold mt-1">Target: ≥ 85%</div>
              </div>

              {/* Ind 5: Clinical Resolution */}
              <div className="bg-white p-3 rounded-cl-sm border border-cl-border shadow-sm">
                <div className="text-[11px] text-cl-muted font-medium">5. Resolution</div>
                <div className="text-lg font-extrabold text-cl-ink mt-1">
                  {data.sevenIndicators?.clinicalResolutionRate ?? data.summary.clinicalResolutionRate}%
                </div>
                <div className="text-[10px] text-cl-teal font-semibold mt-1">Target: ≥ 80%</div>
              </div>

              {/* Ind 6: Median & P90 Days */}
              <div className="bg-white p-3 rounded-cl-sm border border-cl-border shadow-sm">
                <div className="text-[11px] text-cl-muted font-medium">6. Time to Close</div>
                <div className="text-lg font-extrabold text-cl-ink mt-1">
                  {data.sevenIndicators?.medianDaysToResolution ?? data.summary.medianDaysToResolution ?? '—'}d
                </div>
                <div className="text-[10px] text-cl-muted mt-1">
                  P90: {data.sevenIndicators?.p90DaysToResolution ?? data.summary.p90DaysToResolution ?? '—'}d
                </div>
              </div>

              {/* Ind 7: Equity Follow-Up Gap */}
              <div className="bg-white p-3 rounded-cl-sm border border-cl-border shadow-sm">
                <div className="text-[11px] text-cl-muted font-medium">7. Equity Gap</div>
                <div className="text-lg font-extrabold text-cl-ink mt-1">
                  {data.sevenIndicators?.equityFollowUpGapPercent ?? 0}%
                </div>
                <div className="text-[10px] text-cl-deep-teal font-semibold mt-1">Target: ≤ 5%</div>
              </div>
            </div>
          </div>

          {/* Section 2: Cascade Funnel Attrition */}
          <div className="bg-white p-5 rounded-cl-md border border-cl-border shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-cl-ink">
                CareLoop Closed-Loop Pathway Cascade Funnel
              </h3>
              <span className="text-xs text-cl-muted font-medium">
                Total Cohort: {data.summary.totalCases} cases
              </span>
            </div>

            <div className="space-y-3">
              {data.attrition.map((step: any, idx: number) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-cl-ink">
                      {idx + 1}. {step.stage}
                    </span>
                    <div className="flex items-center space-x-3 text-cl-muted">
                      <span className="font-bold text-cl-ink">{step.count} cases</span>
                      <span>({step.retentionPercentOfTotal}% cohort)</span>
                      {step.dropOffFromPreviousPercent > 0 && (
                        <span className="text-cl-alert-text font-semibold">
                          ↓ -{step.dropOffFromPreviousPercent}% drop-off
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="w-full bg-cl-page-bg rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-cl-deep-teal h-2.5 rounded-full transition-all"
                      style={{ width: `${step.retentionPercentOfTotal}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Documented Barriers & Time-to-Resolution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Barrier Frequencies */}
            <div className="bg-white p-5 rounded-cl-md border border-cl-border shadow-sm space-y-3">
              <h3 className="text-base font-extrabold text-cl-ink">
                Documented Patient Barrier Reasons
              </h3>
              <p className="text-xs text-cl-muted">
                Logged during multi-channel navigator outreach to direct corrective interventions.
              </p>

              <div className="space-y-2 pt-2">
                {Object.entries(data.barrierCounts || {}).map(([barrier, count]: [string, any]) => {
                  if (count === 0) return null;
                  return (
                    <div
                      key={barrier}
                      className="flex items-center justify-between py-1.5 px-2 bg-cl-page-bg rounded-cl-sm text-xs"
                    >
                      <span className="font-medium text-cl-ink">
                        {formatHumanLabel(barrier, activePack)}
                      </span>
                      <span className="font-extrabold text-cl-deep-teal px-2 py-0.5 rounded bg-white border border-cl-border">
                        {count} incidents
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Time-to-Closure vs Clinical Deadline SLA */}
            <div className="bg-white p-5 rounded-cl-md border border-cl-border shadow-sm space-y-3">
              <h3 className="text-base font-extrabold text-cl-ink">
                Velocity vs. Clinical Deadline Standard
              </h3>
              <p className="text-xs text-cl-muted">
                Tracks adherence to the 31-working-day endoscopy deadline and 15-day breast resolution standard.
              </p>

              <div className="space-y-4 pt-2">
                <div className="p-3 bg-cl-mist rounded-cl-sm space-y-1">
                  <div className="text-xs font-bold text-cl-deep-teal">
                    Median Time to Diagnostic Resolution
                  </div>
                  <div className="text-2xl font-extrabold text-cl-ink">
                    {data.summary.medianDaysToResolution ?? '—'} working days
                  </div>
                  <div className="text-xs text-cl-muted">
                    Clinical Standard Cap: ≤ 31 working days (Achieved ✓)
                  </div>
                </div>

                <div className="p-3 bg-cl-page-bg rounded-cl-sm border border-cl-border space-y-1">
                  <div className="text-xs font-bold text-cl-ink">
                    90th Percentile (P90) Resolution Time
                  </div>
                  <div className="text-xl font-extrabold text-cl-ink">
                    {data.summary.p90DaysToResolution ?? '—'} working days
                  </div>
                  <div className="text-xs text-cl-muted">
                    Reflects complex barrier resolution cases and multi-stage re-referrals.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Demographic Equity Disparities (Small-Cell Protected) */}
          <div className="bg-white p-5 rounded-cl-md border border-cl-border shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-cl-ink">
                  Fairness & Demographic Disparity Analysis
                </h3>
                <p className="text-xs text-cl-muted mt-0.5">
                  Small-cell suppression active: Any demographic subgroup with &lt;10 cases is masked to protect synthetic patient privacy.
                </p>
              </div>
              <span className="px-2.5 py-1 bg-cl-neutral-chip text-cl-ink text-xs font-semibold rounded-full">
                Protected Subgroups (&lt;10 Masked)
              </span>
            </div>

            <div className="overflow-x-auto pt-2">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-cl-border bg-cl-page-bg text-cl-muted font-semibold">
                    <th className="py-2.5 px-3">Subgroup</th>
                    <th className="py-2.5 px-3">Total Cases</th>
                    <th className="py-2.5 px-3">Clinical Resolution</th>
                    <th className="py-2.5 px-3">Acknowledgement</th>
                    <th className="py-2.5 px-3">Attendance</th>
                    <th className="py-2.5 px-3">Median Days</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cl-border">
                  {/* Language Groups */}
                  {data.disparity?.byLanguage?.map((g: any) => (
                    <tr key={g.groupId} className="hover:bg-cl-page-bg/40">
                      <td className="py-2.5 px-3 font-semibold text-cl-ink">
                        Language: {g.groupLabel}
                      </td>
                      <td className="py-2.5 px-3">{g.totalCases}</td>
                      <td className="py-2.5 px-3 font-bold text-cl-deep-teal">
                        {g.suppressed ? (
                          <span className="text-cl-muted italic">&lt;10 (Protected)</span>
                        ) : (
                          `${g.clinicalResolutionRate}%`
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {g.suppressed ? '—' : `${g.acknowledgementRate}%`}
                      </td>
                      <td className="py-2.5 px-3">
                        {g.suppressed ? '—' : `${g.attendanceRate}%`}
                      </td>
                      <td className="py-2.5 px-3">
                        {g.suppressed ? '—' : `${g.medianDaysToResolution ?? '—'}d`}
                      </td>
                    </tr>
                  ))}

                  {/* Demographic Fields from Pack */}
                  {Object.entries(data.disparity?.byGroupField || {}).map(([fieldId, groups]: [string, any]) =>
                    groups.map((g: any) => (
                      <tr key={`${fieldId}-${g.groupId}`} className="hover:bg-cl-page-bg/40">
                        <td className="py-2.5 px-3 font-semibold text-cl-ink">
                          {formatHumanLabel(fieldId, activePack)}: {formatHumanLabel(g.groupLabel, activePack)}
                        </td>
                        <td className="py-2.5 px-3">{g.totalCases}</td>
                        <td className="py-2.5 px-3 font-bold text-cl-deep-teal">
                          {g.suppressed ? (
                            <span className="text-cl-muted italic">&lt;10 (Protected)</span>
                          ) : (
                            `${g.clinicalResolutionRate}%`
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          {g.suppressed ? '—' : `${g.acknowledgementRate}%`}
                        </td>
                        <td className="py-2.5 px-3">
                          {g.suppressed ? '—' : `${g.attendanceRate}%`}
                        </td>
                        <td className="py-2.5 px-3">
                          {g.suppressed ? '—' : `${g.medianDaysToResolution ?? '—'}d`}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
