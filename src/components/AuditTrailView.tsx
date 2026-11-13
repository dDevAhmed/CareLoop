import React, { useState, useEffect } from 'react';

export function AuditTrailView() {
  const [auditData, setAuditData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchAudit();
  }, []);

  async function fetchAudit() {
    setLoading(true);
    try {
      const res = await fetch('/api/audit');
      const data = await res.json();
      setAuditData(data);
    } catch (err) {
      console.error('Failed to load audit trail', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header & Verification Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-cl-ink tracking-tight">
            Cryptographic Audit Trail &amp; Evidence Provenance
          </h2>
          <p className="text-sm text-cl-muted">
            Append-only, SHA-256 hash-chained immutable audit ledger verifying every milestone, role transition, and AI sign-off.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {auditData?.verified && (
            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold border border-emerald-200">
              ✓ Tamper-Evident Chain Verified ({auditData.totalEntries} blocks)
            </span>
          )}
          <button
            onClick={fetchAudit}
            className="px-3 py-1.5 bg-cl-navy hover:bg-cl-deep-teal text-white rounded-cl-sm text-xs font-bold transition-colors"
          >
            Re-verify Chain
          </button>
        </div>
      </div>

      {/* Hash Chained Entries Table */}
      <div className="bg-white rounded-cl-md border border-cl-border shadow-sm overflow-hidden">
        <div className="p-3 bg-cl-page-bg border-b border-cl-border text-xs font-bold text-cl-muted uppercase tracking-wider flex items-center justify-between">
          <span>Recent Cryptographic Blocks</span>
          <span className="text-cl-deep-teal font-mono">Genesis Hash Anchor Active</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="border-b border-cl-border bg-cl-page-bg text-cl-muted font-sans font-semibold">
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Entity</th>
                <th className="py-2.5 px-3">Actor Role</th>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Entry Hash (SHA-256)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cl-border text-[11px]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-cl-muted font-sans text-xs">
                    Verifying cryptographic block chain...
                  </td>
                </tr>
              ) : !auditData?.recentEntries || auditData.recentEntries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-cl-muted font-sans text-xs">
                    No audit records found.
                  </td>
                </tr>
              ) : (
                auditData.recentEntries.map((e: any) => (
                  <tr key={e.id} className="hover:bg-cl-page-bg/40 font-mono">
                    <td className="py-2 px-3 font-bold text-cl-ink">#{e.sequenceNumber}</td>
                    <td className="py-2 px-3 font-sans font-semibold text-cl-deep-teal">{e.action}</td>
                    <td className="py-2 px-3 text-cl-muted">{e.resourceType}:{e.resourceId}</td>
                    <td className="py-2 px-3 text-cl-ink font-sans">{e.actorRole} ({e.actorId})</td>
                    <td className="py-2 px-3 text-cl-muted">{e.timestamp?.substring(0, 16)}</td>
                    <td className="py-2 px-3 text-cl-muted truncate max-w-[140px]" title={e.hash}>
                      {e.hash?.substring(0, 16)}...
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Evidence Literature Table */}
      <div className="bg-white p-5 rounded-cl-md border border-cl-border shadow-sm space-y-3">
        <h3 className="text-base font-extrabold text-cl-ink">
          Data Provenance Manifest &amp; Clinical Literature Parameters
        </h3>
        <p className="text-xs text-cl-muted">
          All synthetic patient records use fixed deterministic seed = 42. Empirical rates and multi-channel ladder transition multipliers are calibrated from peer-reviewed clinical trials.
        </p>

        <div className="overflow-x-auto text-xs pt-1">
          <table className="w-full border-collapse border border-cl-border">
            <thead className="bg-cl-page-bg font-semibold text-cl-muted">
              <tr>
                <th className="border border-cl-border p-2 text-left">Source ID</th>
                <th className="border border-cl-border p-2 text-left">Study Title</th>
                <th className="border border-cl-border p-2 text-left">Year</th>
                <th className="border border-cl-border p-2 text-left">Empirical Finding</th>
                <th className="border border-cl-border p-2 text-left">CareLoop Simulated Parameter</th>
                <th className="border border-cl-border p-2 text-left">Limitation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cl-border">
              <tr>
                <td className="border border-cl-border p-2 font-mono font-bold text-cl-deep-teal">SRC-2023-US-RCT</td>
                <td className="border border-cl-border p-2">Multicomponent EHR-Based Outreach &amp; Navigation Cluster RCT</td>
                <td className="border border-cl-border p-2">2023</td>
                <td className="border border-cl-border p-2">22.9% usual care vs 31.4% with active navigation (120 days)</td>
                <td className="border border-cl-border p-2">Baseline follow-up rate without navigation vs navigator lift (+8.5%)</td>
                <td className="border border-cl-border p-2 text-cl-muted">US health safety-net; underinsured context</td>
              </tr>
              <tr>
                <td className="border border-cl-border p-2 font-mono font-bold text-cl-deep-teal">SRC-2020-TZA-SMS</td>
                <td className="border border-cl-border p-2">Mobile Phone Text Messaging Screening Follow-up RCT</td>
                <td className="border border-cl-border p-2">2020</td>
                <td className="border border-cl-border p-2">24.0% SMS arm vs 23.8% control arm (no SMS effect alone)</td>
                <td className="border border-cl-border p-2">Validates why SMS alone does not drive follow-up without active ladder</td>
                <td className="border border-cl-border p-2 text-cl-muted">Rural East African basic mobile phone cohort</td>
              </tr>
              <tr>
                <td className="border border-cl-border p-2 font-mono font-bold text-cl-deep-teal">SRC-2025-CMR-TEL</td>
                <td className="border border-cl-border p-2">Interactive Telephone Navigation vs Routine Notification RCT</td>
                <td className="border border-cl-border p-2">2025</td>
                <td className="border border-cl-border p-2">25.6% diagnostic resolution with phone call vs 6.1% routine</td>
                <td className="border border-cl-border p-2">Calibrates phone call step-up efficacy parameter (+19.5%)</td>
                <td className="border border-cl-border p-2 text-cl-muted">Low-resource standard of care baseline</td>
              </tr>
              <tr>
                <td className="border border-cl-border p-2 font-mono font-bold text-cl-deep-teal">SRC-2024-META-CERV</td>
                <td className="border border-cl-border p-2">Meta-Analysis on Multicomponent Screening Follow-up</td>
                <td className="border border-cl-border p-2">2024</td>
                <td className="border border-cl-border p-2">Multicomponent outreach OR = 3.01 vs single OR = 1.56</td>
                <td className="border border-cl-border p-2">Escalation ladder cumulative boost factor (3.0x odds)</td>
                <td className="border border-cl-border p-2 text-cl-muted">Heterogeneous study designs and screening intervals</td>
              </tr>
              <tr>
                <td className="border border-cl-border p-2 font-mono font-bold text-cl-deep-teal">SRC-2020-FIT-SURVEY</td>
                <td className="border border-cl-border p-2">International FIT Colorectal Screening Follow-up Survey</td>
                <td className="border border-cl-border p-2">2020</td>
                <td className="border border-cl-border p-2">Mean 79% colonoscopy at 6mo (organised 81% vs opportunistic 57%)</td>
                <td className="border border-cl-border p-2">Referral target benchmark ≥ 90%</td>
                <td className="border border-cl-border p-2 text-cl-muted">Cross-national endoscopy capacity variations</td>
              </tr>
              <tr>
                <td className="border border-cl-border p-2 font-mono font-bold text-cl-deep-teal">SRC-2015-AUH-EMIR</td>
                <td className="border border-cl-border p-2">Abu Dhabi Emirati Screening &amp; Follow-Up Audit</td>
                <td className="border border-cl-border p-2">2016</td>
                <td className="border border-cl-border p-2">23.5% FOBT uptake; 13.5% follow-up colonoscopy completion</td>
                <td className="border border-cl-border p-2">Historical Abu Dhabi baseline gap for closed-loop navigation</td>
                <td className="border border-cl-border p-2 text-cl-muted">Historic (2015-16) cohort limited to UAE Nationals prior to Malaffi</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

