import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Pagination } from './Pagination';
import { CustomDropdown } from './CustomDropdown';

export interface AuditTrailViewProps {
  activePackId?: string;
}

export function AuditTrailView({ activePackId }: AuditTrailViewProps) {
  const [auditData, setAuditData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 15;

  // Filters state
  const [dateFilter, setDateFilter] = useState<string>('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchAudit = useCallback(async (page: number = currentPage) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(pageSize));
      if (activePackId) params.set('pack', activePackId);
      if (actionFilter && actionFilter !== 'all') params.set('action', actionFilter);
      if (roleFilter && roleFilter !== 'all') params.set('actorRole', roleFilter);
      if (dateFilter) params.set('date', dateFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const res = await fetch(`/api/audit?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAuditData(data);
      }
    } catch (err) {
      console.error('Failed to load audit trail', err);
    } finally {
      setLoading(false);
    }
  }, [activePackId, currentPage, pageSize, actionFilter, roleFilter, dateFilter, searchQuery]);

  useEffect(() => {
    fetchAudit(currentPage);
  }, [fetchAudit, currentPage]);

  const handleResetFilters = () => {
    setDateFilter('');
    setActionFilter('all');
    setRoleFilter('all');
    setSearchQuery('');
    setCurrentPage(1);
  };

  const hasActiveFilters = Boolean(
    dateFilter || actionFilter !== 'all' || roleFilter !== 'all' || searchQuery.trim()
  );

  const availableActions: string[] = useMemo(() => {
    return auditData?.availableActions || [];
  }, [auditData?.availableActions]);

  const availableRoles: string[] = useMemo(() => {
    return auditData?.availableRoles || [];
  }, [auditData?.availableRoles]);

  const filteredTotal = auditData?.filteredTotal ?? 0;
  const totalPages = auditData?.totalPages ?? 1;

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
              ✓ Tamper-Evident Chain Verified ({auditData.totalEntries?.toLocaleString() ?? 0} blocks)
            </span>
          )}
          <button
            onClick={() => fetchAudit(1)}
            disabled={loading}
            className="px-3 py-1.5 bg-cl-navy hover:bg-cl-deep-teal text-white rounded-cl-sm text-xs font-bold transition-colors disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Re-verify Chain'}
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-3.5 rounded-cl-md border border-cl-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Quick Search */}
        <div className="flex-1 max-w-sm relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-cl-muted">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search block #, case, actor, hash..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-cl-page-bg border border-cl-border rounded-cl-sm text-cl-ink placeholder-cl-muted focus:outline-none focus:border-cl-teal focus:ring-1 focus:ring-cl-teal transition-all"
          />
        </div>

        {/* Right: Date, Action, Actor Role Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Date Filter */}
          <div className="flex items-center space-x-1.5">
            <span className="text-cl-muted font-semibold">Date:</span>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="py-1 px-2 text-xs bg-cl-mist border border-cl-border rounded-cl-sm text-cl-ink focus:outline-none focus:border-cl-teal"
            />
          </div>

          {/* Action Filter */}
          <CustomDropdown
            value={actionFilter}
            onChange={(val) => {
              setActionFilter(val);
              setCurrentPage(1);
            }}
            options={[
              { value: 'all', label: 'All Actions' },
              ...availableActions.map((a) => ({
                value: a,
                label: a.replace('CASE_STATE_TRANSITION_', '').replace(/_/g, ' '),
              })),
            ]}
            label="Action:"
            variant="light"
            size="sm"
            align="right"
          />

          {/* Actor Role Filter */}
          <CustomDropdown
            value={roleFilter}
            onChange={(val) => {
              setRoleFilter(val);
              setCurrentPage(1);
            }}
            options={[
              { value: 'all', label: 'All Roles' },
              ...availableRoles.map((r) => ({
                value: r,
                label: r.replace(/_/g, ' '),
              })),
            ]}
            label="Role:"
            variant="light"
            size="sm"
            align="right"
          />

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="px-2.5 py-1 text-xs font-semibold text-cl-alert-text bg-cl-alert-tint border border-cl-alert-text/20 rounded-cl-sm hover:bg-cl-alert-text hover:text-white transition-colors"
            >
              Reset
            </button>
          )}
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
                    No cryptographic audit records matching criteria.
                  </td>
                </tr>
              ) : (
                auditData.recentEntries.map((e: any) => (
                  <tr key={e.id} className="hover:bg-cl-page-bg/40 font-mono transition-colors">
                    <td className="py-2 px-3 font-bold text-cl-ink">#{e.sequenceNumber}</td>
                    <td className="py-2 px-3 font-sans font-semibold text-cl-deep-teal">
                      <span className="px-2 py-0.5 rounded bg-cl-mist text-cl-deep-teal text-[11px] font-bold">
                        {e.action}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-cl-muted font-mono">{e.resourceType}:{e.resourceId}</td>
                    <td className="py-2 px-3 text-cl-ink font-sans">
                      <span className="font-semibold">{e.actorRole}</span>
                      {e.actorId && <span className="text-cl-muted ml-1 font-mono text-[10px]">({e.actorId})</span>}
                    </td>
                    <td className="py-2 px-3 text-cl-muted">{e.timestamp?.substring(0, 16).replace('T', ' ')}</td>
                    <td className="py-2 px-3 text-cl-muted truncate max-w-[140px]" title={e.hash}>
                      {e.hash?.substring(0, 16)}...
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Ledger Summary Footer */}
        <div className="p-3 bg-cl-page-bg border-t border-cl-border flex flex-col gap-2.5">
          <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-cl-muted font-medium">
            <span>
              Showing <strong className="text-cl-ink">{filteredTotal > 0 ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, filteredTotal)}</strong> of <strong className="text-cl-ink">{filteredTotal.toLocaleString()}</strong> cryptographic blocks (Page {currentPage} of {totalPages})
            </span>
            <span className="text-[11px] font-mono text-cl-muted">
              Chain Head: <span className="text-cl-deep-teal font-semibold">{auditData?.latestHash ? `${auditData.latestHash.substring(0, 16)}...` : 'Active'}</span>
            </span>
          </div>

          <div className="flex justify-center pt-2 border-t border-cl-border/60">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(page) => setCurrentPage(page)}
              size="sm"
              delta={2}
              showGoTo={true}
            />
          </div>
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
