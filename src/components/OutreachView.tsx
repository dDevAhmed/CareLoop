import React from 'react';
import { OutreachAttempt, JurisdictionPack } from '../types';
import { formatHumanLabel } from '../utils/formatters';

interface OutreachViewProps {
  attempts: OutreachAttempt[];
  activePack: JurisdictionPack | null;
}

export function OutreachView({ attempts, activePack }: OutreachViewProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-cl-ink tracking-tight">
            Multi-Channel Escalation Ladder &amp; Outreach Activity
          </h2>
          <p className="text-sm text-cl-muted">
            Monitors protocol progression across SMS, WhatsApp, telephone navigation, and direct clinician consultations.
          </p>
        </div>

        <span className="px-3 py-1 bg-cl-mist text-cl-deep-teal rounded-full text-xs font-semibold border border-cl-border">
          Active Channels: {activePack?.enabledChannels?.join(', ') || 'SMS, CALL'}
        </span>
      </div>

      {/* Escalation Ladder Multiplier Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-cl-sm border border-cl-border shadow-sm">
          <div className="text-[10px] font-bold text-cl-muted uppercase tracking-wider">Step 1: Automated SMS</div>
          <div className="text-sm font-extrabold text-cl-ink mt-1">Bilingual Text / Link</div>
          <div className="text-[11px] text-cl-muted mt-1">Triggered immediately upon result ingestion.</div>
        </div>
        <div className="bg-white p-3.5 rounded-cl-sm border border-cl-border shadow-sm">
          <div className="text-[10px] font-bold text-cl-muted uppercase tracking-wider">Step 2: Rich WhatsApp</div>
          <div className="text-sm font-extrabold text-cl-ink mt-1">Interactive Portal Notice</div>
          <div className="text-[11px] text-cl-muted mt-1">Dispatched if unacknowledged after 24 hours.</div>
        </div>
        <div className="bg-white p-3.5 rounded-cl-sm border border-cl-border shadow-sm">
          <div className="text-[10px] font-bold text-cl-deep-teal uppercase tracking-wider">Step 3: Navigator Voice</div>
          <div className="text-sm font-extrabold text-cl-deep-teal mt-1">Telephone Navigation</div>
          <div className="text-[11px] text-cl-muted mt-1">+19.5% conversion lift (Cameroon RCT).</div>
        </div>
        <div className="bg-white p-3.5 rounded-cl-sm border border-cl-border shadow-sm">
          <div className="text-[10px] font-bold text-cl-coral uppercase tracking-wider">Step 4: Clinician Call</div>
          <div className="text-sm font-extrabold text-cl-alert-text mt-1">Multidisciplinary Triage</div>
          <div className="text-[11px] text-cl-muted mt-1">High-urgency &amp; overdue breach escalation.</div>
        </div>
      </div>

      {/* Outreach Attempts Log */}
      <div className="bg-white rounded-cl-md border border-cl-border shadow-sm overflow-hidden">
        <div className="p-3 bg-cl-page-bg border-b border-cl-border text-xs font-bold text-cl-muted uppercase tracking-wider flex items-center justify-between">
          <span>Recent Outreach Attempts Log ({attempts.length})</span>
          <span className="text-cl-deep-teal">Audit-Stamped</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-cl-border bg-cl-page-bg font-semibold text-cl-muted">
                <th className="py-2.5 px-3">Case ID</th>
                <th className="py-2.5 px-3">Channel</th>
                <th className="py-2.5 px-3">Outcome</th>
                <th className="py-2.5 px-3">Barrier Encountered</th>
                <th className="py-2.5 px-3">Staff Role</th>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cl-border font-mono text-[11px]">
              {attempts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-cl-muted font-sans text-xs">
                    No outreach attempts recorded yet.
                  </td>
                </tr>
              ) : (
                attempts.slice(-25).reverse().map((att) => (
                  <tr key={att.id} className="hover:bg-cl-page-bg/40 font-sans">
                    <td className="py-2 px-3 font-mono font-bold text-cl-ink">{att.caseId}</td>
                    <td className="py-2 px-3">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cl-neutral-chip text-cl-ink">
                        {att.channel}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-semibold text-cl-deep-teal">{att.outcome}</td>
                    <td className="py-2 px-3 text-cl-alert-text">
                      {att.barrierReason ? formatHumanLabel(att.barrierReason, activePack) : '—'}
                    </td>
                    <td className="py-2 px-3 text-cl-muted">{att.byRole} ({att.byUserId})</td>
                    <td className="py-2 px-3 text-cl-muted">
                      {new Date(att.attemptedAt).toLocaleDateString()} {new Date(att.attemptedAt).toLocaleTimeString()}
                    </td>
                    <td className="py-2 px-3 text-cl-ink max-w-[200px] truncate" title={att.notes || ''}>
                      {att.notes || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

