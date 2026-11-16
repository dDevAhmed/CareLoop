import React, { useState, useMemo } from 'react';
import { Case, JurisdictionPack } from '../types';
import { formatHumanLabel } from '../utils/formatters';
import { Pagination } from './Pagination';
import { CustomDropdown } from './CustomDropdown';

interface ReferralsViewProps {
  cases: Case[];
  activePack: JurisdictionPack | null;
  onOpenCaseModal: (caseItem: Case) => void;
  onQuickAction: (caseItem: Case, actionType: string) => void;
}

export function ReferralsView({
  cases,
  activePack,
  onOpenCaseModal,
  onQuickAction,
}: ReferralsViewProps) {
  const [filterType, setFilterType] = useState<'all' | 'rejected' | 'pending' | 'accepted'>('all');
  const [selectedPathway, setSelectedPathway] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const PAGE_SIZE = 15;

  // Cases with active referrals
  const referralCases = useMemo(() => {
    return cases.filter(
      (c) =>
        c.milestones?.referralCreatedAt ||
        c.currentState === 'REFERRAL_SENT' ||
        c.currentState === 'REFERRAL_ACCEPTED' ||
        c.currentState === 'REJECTED'
    );
  }, [cases]);

  const rejectedCases = useMemo(() => {
    return referralCases.filter((c) => c.currentState === 'REJECTED');
  }, [referralCases]);

  const pendingCases = useMemo(() => {
    return referralCases.filter(
      (c) =>
        c.currentState !== 'REJECTED' &&
        !c.milestones?.referralAcceptedAt &&
        c.currentState !== 'REFERRAL_ACCEPTED'
    );
  }, [referralCases]);

  const acceptedCases = useMemo(() => {
    return referralCases.filter(
      (c) => !!c.milestones?.referralAcceptedAt || c.currentState === 'REFERRAL_ACCEPTED'
    );
  }, [referralCases]);

  // Apply filters
  const filteredReferrals = useMemo(() => {
    return referralCases.filter((c) => {
      // Status filter
      if (filterType === 'rejected' && c.currentState !== 'REJECTED') return false;
      if (
        filterType === 'pending' &&
        (c.currentState === 'REJECTED' ||
          !!c.milestones?.referralAcceptedAt ||
          c.currentState === 'REFERRAL_ACCEPTED')
      )
        return false;
      if (
        filterType === 'accepted' &&
        !c.milestones?.referralAcceptedAt &&
        c.currentState !== 'REFERRAL_ACCEPTED'
      )
        return false;

      // Pathway filter
      if (selectedPathway !== 'all' && c.pathwayId !== selectedPathway) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const patientName = (c.patient?.fullName || '').toLowerCase();
        const patientNameAr = (c.patient?.fullNameArabic || '').toLowerCase();
        const caseNumber = (c.caseNumber || '').toLowerCase();
        if (!patientName.includes(q) && !patientNameAr.includes(q) && !caseNumber.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [referralCases, filterType, selectedPathway, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredReferrals.length / PAGE_SIZE));
  const paginatedReferrals = filteredReferrals.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const handleStatusChange = (status: 'all' | 'rejected' | 'pending' | 'accepted') => {
    setFilterType(status);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setFilterType('all');
    setSelectedPathway('all');
    setSearchQuery('');
    setCurrentPage(1);
  };

  const hasActiveFilters = Boolean(
    filterType !== 'all' || selectedPathway !== 'all' || searchQuery.trim()
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-cl-ink tracking-tight">
            Specialist Referral &amp; Diagnostic Transfer Management
          </h2>
          <p className="text-sm text-cl-muted">
            Monitors end-to-end referral dispatch, receiving facility acceptance, and instant interception of rejections.
          </p>
        </div>
      </div>

      {/* Rejected Referral Interception Alert */}
      {rejectedCases.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-cl-md flex items-center justify-between text-xs shadow-xs">
          <div className="flex items-center space-x-2.5">
            <span className="text-lg">⚠</span>
            <div>
              <span className="font-extrabold text-amber-900 text-sm">
                {rejectedCases.length} Referrals Require Immediate Reassignment!
              </span>
              <p className="text-amber-800 mt-0.5">
                Receiving diagnostic centers rejected these referrals due to capacity constraints. CareLoop has intercepted these drop-offs.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setFilterType('rejected');
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 bg-white border border-amber-300 text-amber-900 rounded-cl-sm font-bold hover:bg-amber-100 transition-colors"
            >
              Filter Rejected ({rejectedCases.length})
            </button>
            <button
              onClick={() => onQuickAction(rejectedCases[0], 'REASSIGN')}
              className="px-3 py-1.5 bg-amber-800 text-white rounded-cl-sm font-bold hover:bg-amber-900 transition-colors shadow-xs"
            >
              Reassign First Case
            </button>
          </div>
        </div>
      )}

      {/* Filter Chips Bar */}
      <div className="bg-white p-3.5 rounded-cl-md border border-cl-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Status Filter Tabs */}
        <div className="flex items-center space-x-1.5 overflow-x-auto">
          {[
            { id: 'all', label: 'All Referrals', count: referralCases.length },
            { id: 'rejected', label: 'Rejected (Capacity)', count: rejectedCases.length, alert: true },
            { id: 'pending', label: 'Pending Acceptance', count: pendingCases.length },
            { id: 'accepted', label: 'Accepted', count: acceptedCases.length },
          ].map((tab) => {
            const isTabActive = filterType === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleStatusChange(tab.id as any)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-cl-sm text-xs font-semibold transition-colors flex-shrink-0 ${
                  isTabActive
                    ? 'bg-cl-navy text-white shadow-sm'
                    : 'text-cl-muted hover:text-cl-ink hover:bg-cl-mist'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isTabActive
                      ? 'bg-white/20 text-white'
                      : tab.alert && tab.count > 0
                      ? 'bg-cl-alert-tint text-cl-alert-text'
                      : 'bg-cl-neutral-chip text-cl-muted'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right: Search & Pathway Filter */}
        <div className="flex items-center space-x-2 text-xs">
          {/* Quick Search */}
          <div className="relative w-48 sm:w-56">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-cl-muted">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
              placeholder="Search patient, case #..."
              className="w-full pl-8 pr-2.5 py-1 text-xs bg-cl-page-bg border border-cl-border rounded-cl-sm text-cl-ink placeholder-cl-muted focus:outline-none focus:border-cl-teal focus:ring-1 focus:ring-cl-teal transition-all"
            />
          </div>

          {/* Pathway Filter */}
          <CustomDropdown
            value={selectedPathway}
            onChange={(val) => {
              setSelectedPathway(val);
              setCurrentPage(1);
            }}
            options={[
              { value: 'all', label: 'All Pathways' },
              ...(activePack?.pathways.map((p) => ({ value: p.id, label: p.name })) || []),
            ]}
            variant="light"
            size="sm"
            align="right"
          />

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="px-2 py-1 text-xs font-semibold text-cl-alert-text bg-cl-alert-tint border border-cl-alert-text/20 rounded-cl-sm hover:bg-cl-alert-text hover:text-white transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Referrals Table */}
      <div className="bg-white rounded-cl-md border border-cl-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-cl-border bg-cl-page-bg font-semibold text-cl-muted uppercase tracking-wider">
                <th className="py-3 px-3">Patient</th>
                <th className="py-3 px-3">Case #</th>
                <th className="py-3 px-3">Pathway</th>
                <th className="py-3 px-3">Diagnostic Target</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Sent Milestone</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cl-border">
              {paginatedReferrals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-cl-muted text-sm">
                    No active referrals found matching criteria.
                  </td>
                </tr>
              ) : (
                paginatedReferrals.map((c) => {
                  const isRejected = c.currentState === 'REJECTED';
                  const isAccepted =
                    !!c.milestones?.referralAcceptedAt || c.currentState === 'REFERRAL_ACCEPTED';

                  return (
                    <tr key={c.id} className="hover:bg-cl-page-bg/50 transition-colors">
                      <td className="py-3 px-3 font-semibold text-cl-ink">
                        <div dir="auto">
                          {c.patient?.fullNameArabic && c.patient.language === 'ar'
                            ? c.patient.fullNameArabic
                            : c.patient?.fullName}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono text-cl-muted">{c.caseNumber}</td>
                      <td className="py-3 px-3 text-cl-muted">
                        {formatHumanLabel(c.pathwayId, activePack)}
                      </td>
                      <td className="py-3 px-3 text-cl-ink">
                        Central Endoscopy &amp; Diagnostic Pavilion
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            isRejected
                              ? 'bg-cl-alert-tint text-cl-alert-text'
                              : isAccepted
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isRejected
                            ? 'REJECTED (CAPACITY)'
                            : isAccepted
                            ? 'ACCEPTED'
                            : 'PENDING ACCEPTANCE'}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-cl-muted">
                        {c.milestones?.referralCreatedAt
                          ? new Date(c.milestones.referralCreatedAt).toLocaleDateString()
                          : 'In queue'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => onOpenCaseModal(c)}
                          className={`px-2.5 py-1 font-semibold rounded-cl-sm text-xs transition-colors ${
                            isRejected
                              ? 'bg-cl-alert-tint text-cl-alert-text hover:bg-cl-alert-text hover:text-white'
                              : 'bg-cl-mist text-cl-deep-teal hover:bg-cl-teal hover:text-white'
                          }`}
                        >
                          {isRejected ? 'Reassign Facility' : 'Manage'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {filteredReferrals.length > 0 && (
          <div className="p-3 bg-cl-page-bg border-t border-cl-border flex flex-col gap-2.5">
            <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-cl-muted font-medium px-1">
              <span>
                Showing <strong className="text-cl-ink">{(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredReferrals.length)}</strong> of <strong className="text-cl-ink">{filteredReferrals.length.toLocaleString()}</strong> referrals
                {filteredReferrals.length !== referralCases.length && (
                  <span> (filtered from {referralCases.length.toLocaleString()} total)</span>
                )}
              </span>
              <span>
                Page <strong className="text-cl-ink">{currentPage}</strong> of <strong className="text-cl-ink">{totalPages}</strong>
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
        )}
      </div>
    </div>
  );
}
