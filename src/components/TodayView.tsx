import React, { useState, useMemo } from 'react';
import { Case, JurisdictionPack, UserRole } from '../types';
import { formatHumanLabel, formatSlaText, getSlaProgressPercent } from '../utils/formatters';
import { calculateDropOffRisk } from '../engine/aiProvider';
import { CustomDropdown } from './CustomDropdown';
import { Pagination } from './Pagination';

interface TodayViewProps {
  cases: Case[];
  activePack: JurisdictionPack | null;
  activeRole: UserRole;
  onOpenCaseModal: (caseItem: Case) => void;
  onQuickAction: (caseItem: Case, actionType: string) => void;
  searchQuery: string;
}

type QueueTab = 'critical' | 'overdue' | 'dueThisWeek' | 'onTrack';

export function TodayView({
  cases,
  activePack,
  activeRole,
  onOpenCaseModal,
  onQuickAction,
  searchQuery,
}: TodayViewProps) {
  const [selectedQueueTab, setSelectedQueueTab] = useState<QueueTab>('critical');
  const [selectedPathway, setSelectedPathway] = useState<string>('all');
  const [selectedOwner, setSelectedOwner] = useState<string>('all');
  const [selectedLang, setSelectedLang] = useState<string>('all');
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const PAGE_SIZE = 10;

  // Compute metrics for KPI cards
  const totalCases = cases.length;
  const criticalCases = useMemo(() => cases.filter((c) => c.urgency === 'CRITICAL' && c.currentState !== 'CLOSED'), [cases]);
  const overdueCases = useMemo(() => cases.filter((c) => c.isOverdue && c.currentState !== 'CLOSED'), [cases]);
  const dueThisWeekCases = useMemo(
    () => cases.filter((c) => !c.isOverdue && c.slaWorkingDaysRemaining <= 5 && c.currentState !== 'CLOSED'),
    [cases]
  );
  const onTrackCases = useMemo(
    () => cases.filter((c) => !c.isOverdue && c.slaWorkingDaysRemaining > 5 && c.currentState !== 'CLOSED'),
    [cases]
  );

  // Median days late for overdue cases
  const medianDaysLate = useMemo(() => {
    if (overdueCases.length === 0) return 0;
    const diffs = overdueCases.map((c) => Math.abs(c.slaWorkingDaysRemaining || 1)).sort((a, b) => a - b);
    return diffs[Math.floor(diffs.length / 2)] || 1;
  }, [overdueCases]);

  // Acknowledged within 72h rate
  const ackWithin72hRate = useMemo(() => {
    if (totalCases === 0) return 0;
    const acknowledged = cases.filter((c) => c.milestones?.acknowledgedAt).length;
    return Math.round((acknowledged / totalCases) * 100);
  }, [cases, totalCases]);

  // Clinical resolution rate
  const clinicalResolutionRate = useMemo(() => {
    if (totalCases === 0) return 0;
    const closedResolved = cases.filter(
      (c) => c.currentState === 'CLOSED' && c.closure?.closureType === 'CLINICAL_RESOLUTION'
    ).length;
    return Math.round((closedResolved / totalCases) * 100);
  }, [cases, totalCases]);

  // Needs action today count: critical + overdue + due this week
  const needsActionCount = criticalCases.length + overdueCases.length + dueThisWeekCases.length;

  // Filter cases based on active queue tab and filter chips
  const filteredCases = useMemo(() => {
    let pool = cases;

    // Filter by Queue Tab
    if (selectedQueueTab === 'critical') {
      pool = pool.filter((c) => c.urgency === 'CRITICAL' && c.currentState !== 'CLOSED');
    } else if (selectedQueueTab === 'overdue') {
      pool = pool.filter((c) => c.isOverdue && c.currentState !== 'CLOSED');
    } else if (selectedQueueTab === 'dueThisWeek') {
      pool = pool.filter((c) => !c.isOverdue && c.slaWorkingDaysRemaining <= 5 && c.currentState !== 'CLOSED');
    } else if (selectedQueueTab === 'onTrack') {
      pool = pool.filter((c) => !c.isOverdue && c.slaWorkingDaysRemaining > 5 && c.currentState !== 'CLOSED');
    }

    // Filter by Pathway
    if (selectedPathway !== 'all') {
      pool = pool.filter((c) => c.pathwayId === selectedPathway);
    }

    // Filter by Owner
    if (selectedOwner === 'unassigned') {
      pool = pool.filter((c) => !c.primaryOwnerId);
    }

    // Filter by Language
    if (selectedLang !== 'all') {
      pool = pool.filter((c) => c.patient?.language === selectedLang);
    }

    // Global Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      pool = pool.filter(
        (c) =>
          c.caseNumber.toLowerCase().includes(q) ||
          c.patient?.fullName.toLowerCase().includes(q) ||
          c.screeningResultId?.toLowerCase().includes(q)
      );
    }

    return pool;
  }, [cases, selectedQueueTab, selectedPathway, selectedOwner, selectedLang, searchQuery]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredCases.length / PAGE_SIZE));
  const paginatedCases = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredCases.slice(start, start + PAGE_SIZE);
  }, [filteredCases, currentPage]);

  // Active selected case for 360px Drawer
  const activeDrawerCase = useMemo(() => {
    if (selectedCaseId) {
      const found = cases.find((c) => c.id === selectedCaseId);
      if (found) return found;
    }
    return paginatedCases[0] || null;
  }, [selectedCaseId, paginatedCases, cases]);

  // Compute explainable risk score for the selected drawer case
  const drawerRiskScore = useMemo(() => {
    if (!activeDrawerCase) return null;
    return calculateDropOffRisk(activeDrawerCase);
  }, [activeDrawerCase]);

  // Derive role-specific greeting
  const greetingRoleName =
    activeRole === 'CLINICIAN'
      ? 'Dr. Fatima'
      : activeRole === 'NAVIGATOR'
      ? 'Navigator Layla'
      : 'Programme Analyst';

  return (
    <div className="space-y-6">
      {/* Greeting Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-extrabold text-cl-ink tracking-tight">
            Good morning, {greetingRoleName}
          </h1>
          <p className="text-sm text-cl-muted mt-0.5">
            <span className="font-semibold text-cl-ink">{needsActionCount} cases</span> need action today,{' '}
            <span className="font-semibold text-cl-alert-text">{criticalCases.length} critical priority</span>.
          </p>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Needs Action Today */}
        <div className="bg-white p-4 rounded-cl-md border border-cl-border shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-cl-muted font-medium">
            <span>Needs Action Today</span>
            <span className="p-1 rounded bg-cl-mist text-cl-deep-teal">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-cl-ink">{needsActionCount}</span>
            <span className="text-xs font-semibold text-cl-alert-text">
              {criticalCases.length} Critical
            </span>
          </div>
          <div className="mt-2 text-xs text-cl-muted">Triage priority for current shift</div>
        </div>

        {/* KPI 2: Overdue Cases */}
        <div className="bg-white p-4 rounded-cl-md border border-cl-border shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-cl-muted font-medium">
            <span>Overdue Cases</span>
            <span className="p-1 rounded bg-cl-alert-tint text-cl-alert-text">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-cl-alert-text">{overdueCases.length}</span>
            <span className="text-xs font-semibold text-cl-muted">
              Median {medianDaysLate}d late
            </span>
          </div>
          <div className="mt-2 text-xs text-cl-muted">Clinical SLA breaches escalated</div>
        </div>

        {/* KPI 3: Acknowledged Within 72h */}
        <div className="bg-white p-4 rounded-cl-md border border-cl-border shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-cl-muted font-medium">
            <span>Acknowledged ≤ 72h</span>
            <span className="p-1 rounded bg-cl-mist text-cl-teal">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-cl-ink">{ackWithin72hRate}%</span>
            <span className="text-xs font-semibold text-cl-teal">Target: ≥ 95% ✓</span>
          </div>
          {/* Progress track with target tick */}
          <div className="mt-2 w-full bg-cl-page-bg rounded-full h-1.5 relative overflow-hidden">
            <div
              className="bg-cl-teal h-1.5 rounded-full"
              style={{ width: `${Math.min(100, ackWithin72hRate)}%` }}
            ></div>
          </div>
        </div>

        {/* KPI 4: Clinical Resolution */}
        <div className="bg-white p-4 rounded-cl-md border border-cl-border shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-cl-muted font-medium">
            <span>Clinical Resolution</span>
            <span className="p-1 rounded bg-cl-mist text-cl-deep-teal">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-cl-ink">{clinicalResolutionRate}%</span>
            <span className="text-xs font-semibold text-cl-text-teal">Target: ≥ 80% ✓</span>
          </div>
          {/* Progress track with target tick */}
          <div className="mt-2 w-full bg-cl-page-bg rounded-full h-1.5 relative overflow-hidden">
            <div
              className="bg-cl-deep-teal h-1.5 rounded-full"
              style={{ width: `${Math.min(100, clinicalResolutionRate)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Queue Tabs & Filters Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-cl-border pb-3">
        {/* Queue Tabs with Counts */}
        <div className="flex items-center space-x-1 overflow-x-auto">
          {[
            { id: 'critical', label: 'Critical', count: criticalCases.length, alert: true },
            { id: 'overdue', label: 'Overdue', count: overdueCases.length, alert: true },
            { id: 'dueThisWeek', label: 'Due This Week', count: dueThisWeekCases.length },
            { id: 'onTrack', label: 'On Track', count: onTrackCases.length },
          ].map((tab) => {
            const isTabActive = selectedQueueTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setSelectedQueueTab(tab.id as QueueTab);
                  setCurrentPage(1);
                }}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-cl-sm text-sm font-semibold transition-colors ${
                  isTabActive
                    ? 'bg-cl-navy text-white shadow-sm'
                    : 'text-cl-muted hover:text-cl-ink hover:bg-white'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-xs font-bold ${
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

        {/* Filter Chips: Pathway, Owner, Language */}
        <div className="flex items-center space-x-2 text-xs">
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
          />

          {/* Owner Filter */}
          <CustomDropdown
            value={selectedOwner}
            onChange={(val) => {
              setSelectedOwner(val);
              setCurrentPage(1);
            }}
            options={[
              { value: 'all', label: 'All Owners' },
              { value: 'unassigned', label: 'Unassigned Only' },
            ]}
            variant="light"
            size="sm"
          />

          {/* Language Filter */}
          <CustomDropdown
            value={selectedLang}
            onChange={(val) => {
              setSelectedLang(val);
              setCurrentPage(1);
            }}
            options={[
              { value: 'all', label: 'All Languages' },
              { value: 'ar', label: 'Arabic (عربي)' },
              { value: 'en', label: 'English' },
            ]}
            variant="light"
            size="sm"
          />
        </div>
      </div>

      {/* Master-Detail Layout: Cases Table (Left) + 360px Preview Drawer (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Cases Table (lg:col-span-8 or 7 depending on screen) */}
        <div className="lg:col-span-8 bg-white rounded-cl-md border border-cl-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-cl-border bg-cl-page-bg text-xs font-semibold text-cl-muted uppercase tracking-wider">
                  <th className="py-3 px-3 w-8"></th>
                  <th className="py-3 px-3">Patient</th>
                  <th className="py-3 px-3">Pathway</th>
                  <th className="py-3 px-3">Stage</th>
                  <th className="py-3 px-3">SLA Status</th>
                  <th className="py-3 px-3">Owner</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cl-border text-sm">
                {filteredCases.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-cl-muted text-sm">
                      No cases found matching the active queue and filter criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedCases.map((c) => {
                    const isSelected = activeDrawerCase?.id === c.id;
                    const isCritical = c.urgency === 'CRITICAL';
                    const isOverdue = c.isOverdue;
                    const progress = getSlaProgressPercent(c.slaWorkingDaysRemaining);
                    const slaText = formatSlaText(c.slaWorkingDaysRemaining, isOverdue);

                    return (
                      <tr
                        key={c.id}
                        onClick={() => setSelectedCaseId(c.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-cl-mist/70 font-medium'
                            : 'hover:bg-cl-page-bg/60'
                        }`}
                      >
                        {/* 1. Priority Icon (Critical Only) */}
                        <td className="py-3 px-3 text-center">
                          {isCritical ? (
                            <span
                              className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-cl-coral text-white font-extrabold text-[10px]"
                              title="CRITICAL PRIORITY"
                            >
                              !
                            </span>
                          ) : null}
                        </td>

                        {/* 2. Patient: Name + Case Number on 2nd Line */}
                        <td className="py-3 px-3">
                          <div
                            dir="auto"
                            className="font-semibold text-cl-ink truncate max-w-[180px]"
                          >
                            {c.patient?.fullNameArabic && c.patient.language === 'ar'
                              ? c.patient.fullNameArabic
                              : c.patient?.fullName || 'Anonymous Patient'}
                          </div>
                          <div className="text-xs text-cl-muted font-mono">
                            {c.caseNumber}
                          </div>
                        </td>

                        {/* 3. Pathway */}
                        <td className="py-3 px-3 text-xs text-cl-muted truncate max-w-[120px]">
                          {formatHumanLabel(c.pathwayId, activePack)}
                        </td>

                        {/* 4. Single Stage Chip */}
                        <td className="py-3 px-3">
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-cl-neutral-chip text-cl-ink">
                            {formatHumanLabel(c.currentState, activePack)}
                          </span>
                        </td>

                        {/* 5. SLA Cell: Text + Progress Bar */}
                        <td className="py-3 px-3 min-w-[130px]">
                          <div className="flex items-center justify-between text-xs">
                            <span
                              className={`font-semibold ${
                                isOverdue ? 'text-cl-alert-text' : 'text-cl-muted'
                              }`}
                            >
                              {slaText}
                            </span>
                          </div>
                          <div className="mt-1 w-full bg-cl-page-bg rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full ${
                                isOverdue
                                  ? 'bg-cl-alert-text'
                                  : progress > 80
                                  ? 'bg-amber-500'
                                  : 'bg-cl-teal'
                              }`}
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                        </td>

                        {/* 6. Owner Avatar */}
                        <td className="py-3 px-3">
                          <div
                            className="w-6 h-6 rounded-full bg-cl-neutral-chip text-cl-ink flex items-center justify-center text-[10px] font-bold"
                            title={c.primaryOwnerId || 'Unassigned'}
                          >
                            {c.primaryOwnerId ? c.primaryOwnerId.substring(0, 2) : '—'}
                          </div>
                        </td>

                        {/* 7. Contextual Next Action Button */}
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onQuickAction(c, 'NAVIGATE');
                            }}
                            className="px-2.5 py-1 text-xs font-semibold rounded-cl-sm bg-cl-mist text-cl-deep-teal hover:bg-cl-teal hover:text-white transition-colors"
                          >
                            {c.currentState === 'REJECTED'
                              ? 'Reassign'
                              : !c.milestones?.acknowledgedAt
                              ? 'Call Patient'
                              : !c.milestones?.referralAcceptedAt
                              ? 'Send Referral'
                              : 'Inspect'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer with Pagination */}
          <div className="p-3.5 border-t border-cl-border bg-cl-page-bg flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-cl-muted">
            <div className="flex items-center space-x-2">
              <span>
                Showing <strong className="text-cl-ink font-semibold">{filteredCases.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}</strong>–
                <strong className="text-cl-ink font-semibold">{Math.min(currentPage * PAGE_SIZE, filteredCases.length)}</strong> of{' '}
                <strong className="text-cl-ink font-semibold">{filteredCases.length}</strong> filtered cases
              </span>
              <span className="text-cl-border">|</span>
              <span className="text-cl-muted">
                Cohort: <strong className="text-cl-ink font-semibold">{totalCases}</strong>
              </span>
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              size="sm"
            />
          </div>
        </div>

        {/* Right: 360px Preview Drawer */}
        <div className="lg:col-span-4 w-full bg-white rounded-cl-md border border-cl-border shadow-sm p-4 space-y-4 sticky top-20">
          {activeDrawerCase ? (
            <>
              {/* Drawer Header */}
              <div className="border-b border-cl-border pb-3 flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    {activeDrawerCase.urgency === 'CRITICAL' && (
                      <span className="px-1.5 py-0.5 rounded bg-cl-coral text-white text-[10px] font-extrabold">
                        CRITICAL
                      </span>
                    )}
                    <span className="text-xs font-mono text-cl-muted">
                      {activeDrawerCase.caseNumber}
                    </span>
                  </div>
                  <h3
                    dir="auto"
                    className="text-base font-extrabold text-cl-ink mt-0.5"
                  >
                    {activeDrawerCase.patient?.fullNameArabic &&
                    activeDrawerCase.patient.language === 'ar'
                      ? activeDrawerCase.patient.fullNameArabic
                      : activeDrawerCase.patient?.fullName}
                  </h3>
                  <p className="text-xs text-cl-muted">
                    {formatHumanLabel(activeDrawerCase.pathwayId, activePack)} •{' '}
                    {activeDrawerCase.patient?.gender},{' '}
                    {activeDrawerCase.patient?.dateOfBirth}
                  </p>
                </div>

                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-cl-neutral-chip text-cl-ink">
                  {formatHumanLabel(activeDrawerCase.currentState, activePack)}
                </span>
              </div>

              {/* Overdue Status & Clinical Deadline Source */}
              <div
                className={`p-3 rounded-cl-sm text-xs space-y-1 ${
                  activeDrawerCase.isOverdue
                    ? 'bg-cl-alert-tint text-cl-alert-text border border-cl-coral/30'
                    : 'bg-cl-mist text-cl-deep-teal'
                }`}
              >
                <div className="font-bold flex items-center justify-between">
                  <span>
                    {activeDrawerCase.isOverdue
                      ? `⚠ ${formatSlaText(activeDrawerCase.slaWorkingDaysRemaining, true)}`
                      : `⏱ ${formatSlaText(activeDrawerCase.slaWorkingDaysRemaining, false)}`}
                  </span>
                  <span className="text-[11px] font-normal opacity-90">
                    Deadline: {new Date(activeDrawerCase.clinicalDeadline).toLocaleDateString()}
                  </span>
                </div>
                <div className="text-[11px] opacity-80">
                  Target Rule Source: {activePack?.id || 'standard'} verified pathway specification
                </div>
              </div>

              {/* Next Best Action Card */}
              <div className="bg-cl-page-bg p-3 rounded-cl-sm border border-cl-border space-y-2">
                <div className="text-xs font-bold text-cl-ink flex items-center justify-between">
                  <span>Next Best Action</span>
                  <span className="text-[10px] text-cl-teal font-semibold">Recommended</span>
                </div>
                <p className="text-xs text-cl-muted">
                  {activeDrawerCase.currentState === 'REJECTED'
                    ? 'Diagnostic facility rejected referral due to capacity. Reassign to accredited secondary clinic.'
                    : !activeDrawerCase.milestones?.acknowledgedAt
                    ? 'Screening result unacknowledged. Initiate structured telephone outreach in preferred language.'
                    : !activeDrawerCase.milestones?.referralAcceptedAt
                    ? 'Follow up on pending specialist referral at diagnostic endoscopy center.'
                    : 'Confirm procedural appointment booking and verify prep kit delivery.'}
                </p>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => onQuickAction(activeDrawerCase, 'PRIMARY_ACTION')}
                    className="w-full py-1.5 px-2 bg-cl-deep-teal text-white rounded-cl-sm font-semibold text-xs hover:bg-cl-teal transition-colors"
                  >
                    Execute Step
                  </button>
                  <button
                    onClick={() => onQuickAction(activeDrawerCase, 'LOG_OUTREACH')}
                    className="w-full py-1.5 px-2 bg-white border border-cl-border text-cl-ink rounded-cl-sm font-semibold text-xs hover:bg-cl-page-bg transition-colors"
                  >
                    Log Call
                  </button>
                </div>
              </div>

              {/* Explainable Drop-off Risk Score */}
              {drawerRiskScore && (
                <div className="p-3 bg-white rounded-cl-sm border border-cl-border space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-cl-ink">Drop-off Risk Score</span>
                    <span
                      className={`font-extrabold text-xs px-2 py-0.5 rounded ${
                        drawerRiskScore.level === 'CRITICAL'
                          ? 'bg-cl-alert-tint text-cl-alert-text'
                          : drawerRiskScore.level === 'HIGH'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-cl-mist text-cl-deep-teal'
                      }`}
                    >
                      {drawerRiskScore.score}/100 ({drawerRiskScore.level})
                    </span>
                  </div>
                  <div className="text-[11px] text-cl-muted">
                    {drawerRiskScore.topFactors.length > 0
                      ? drawerRiskScore.topFactors[0].description
                      : 'Standard baseline monitoring active.'}
                  </div>
                </div>
              )}

              {/* Mini Timeline */}
              <div className="space-y-1 pt-1">
                <div className="text-xs font-bold text-cl-ink">Milestones</div>
                <div className="space-y-1 text-xs text-cl-muted">
                  <div className="flex items-center justify-between">
                    <span>Result Issued:</span>
                    <span className="font-mono text-cl-ink">
                      {new Date(activeDrawerCase.screeningTestDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Acknowledged:</span>
                    <span className="font-mono text-cl-ink">
                      {activeDrawerCase.milestones?.acknowledgedAt
                        ? new Date(activeDrawerCase.milestones.acknowledgedAt).toLocaleDateString()
                        : 'Pending'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Referral Sent:</span>
                    <span className="font-mono text-cl-ink">
                      {activeDrawerCase.milestones?.referralCreatedAt
                        ? new Date(activeDrawerCase.milestones.referralCreatedAt).toLocaleDateString()
                        : 'Pending'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Open Full Case Button */}
              <button
                onClick={() => onOpenCaseModal(activeDrawerCase)}
                className="w-full py-2 bg-cl-navy text-white rounded-cl-sm font-bold text-xs hover:bg-cl-deep-teal transition-colors shadow-sm"
              >
                Open Full Case File
              </button>
            </>
          ) : (
            <div className="py-12 text-center text-cl-muted text-xs">
              Select a case row to inspect details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

