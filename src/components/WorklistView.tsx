import React, { useState } from 'react';
import { Case, UserRole, JurisdictionPack } from '../types';
import { formatHumanLabel, formatSlaText } from '../utils/formatters';
import { Pagination } from './Pagination';

interface WorklistViewProps {
  cases: Case[];
  activePack: JurisdictionPack | null;
  activeRole: UserRole;
  onOpenCaseModal: (caseItem: Case) => void;
  onQuickAction: (caseItem: Case, actionType: string) => void;
}

export function WorklistView({
  cases,
  activePack,
  activeRole,
  onOpenCaseModal,
  onQuickAction,
}: WorklistViewProps) {
  const [filterType, setFilterType] = useState<'all' | 'unacknowledged' | 'barriers' | 'rejected'>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const PAGE_SIZE = 10;

  // Filter tasks requiring active human navigation
  const tasks = cases.filter((c) => {
    if (c.currentState === 'CLOSED') return false;
    if (filterType === 'unacknowledged') {
      return !c.milestones?.acknowledgedAt;
    }
    if (filterType === 'rejected') {
      return c.currentState === 'REJECTED';
    }
    if (filterType === 'barriers') {
      return c.currentState === 'ESCALATED' || c.urgency === 'CRITICAL';
    }
    return !c.milestones?.acknowledgedAt || c.currentState === 'REJECTED' || c.isOverdue || c.urgency === 'CRITICAL';
  });

  const totalPages = Math.max(1, Math.ceil(tasks.length / PAGE_SIZE));
  const paginatedTasks = tasks.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-cl-ink tracking-tight">
            Care Navigator &amp; Outreach Worklist
          </h2>
          <p className="text-sm text-cl-muted">
            Prioritized task queue for patient engagement, overcoming literacy/transport barriers, and re-triaging rejected referrals.
          </p>
        </div>

        <div className="flex items-center space-x-1.5 bg-white border border-cl-border rounded-cl-sm p-1 text-xs">
          {[
            { id: 'all', label: 'All Actionable' },
            { id: 'unacknowledged', label: 'Unacknowledged' },
            { id: 'rejected', label: 'Rejected Referrals' },
            { id: 'barriers', label: 'Priority Escalations' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => {
                setFilterType(f.id as any);
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded transition-colors font-medium ${
                filterType === f.id
                  ? 'bg-cl-deep-teal text-white font-bold'
                  : 'text-cl-muted hover:text-cl-ink'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Task Cards List */}
      <div className="space-y-3">
        {tasks.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-cl-md border border-cl-border text-cl-muted">
            No active navigation tasks in this queue. All patients are progressing on track!
          </div>
        ) : (
          paginatedTasks.map((c) => {
            const isCritical = c.urgency === 'CRITICAL';
            const isRejected = c.currentState === 'REJECTED';
            const slaText = formatSlaText(c.slaWorkingDaysRemaining, c.isOverdue);

            return (
              <div
                key={c.id}
                className={`bg-white p-4 rounded-cl-md border shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  c.isOverdue
                    ? 'border-cl-coral/40 bg-cl-alert-tint/10'
                    : 'border-cl-border hover:border-cl-deep-teal/40'
                }`}
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center space-x-2">
                    {isCritical && (
                      <span className="px-2 py-0.5 rounded bg-cl-coral text-white text-[10px] font-extrabold">
                        CRITICAL
                      </span>
                    )}
                    {isRejected && (
                      <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                        FACILITY REJECTED
                      </span>
                    )}
                    <span className="font-mono text-xs text-cl-muted">{c.caseNumber}</span>
                    <span className="text-xs text-cl-muted">•</span>
                    <span className="text-xs text-cl-muted">
                      {formatHumanLabel(c.pathwayId, activePack)}
                    </span>
                  </div>

                  <div className="flex items-baseline space-x-2">
                    <h3
                      dir="auto"
                      className="text-base font-extrabold text-cl-ink"
                    >
                      {c.patient?.fullNameArabic && c.patient.language === 'ar'
                        ? c.patient.fullNameArabic
                        : c.patient?.fullName}
                    </h3>
                    <span className="text-xs text-cl-muted">
                      (Phone: {c.patient?.phone || 'On file'}, Lang: {c.patient?.language?.toUpperCase()})
                    </span>
                  </div>

                  <p className="text-xs text-cl-muted">
                    {isRejected
                      ? 'Action Required: Facility capacity exceeded. Reassign referral to secondary diagnostic provider.'
                      : !c.milestones?.acknowledgedAt
                      ? 'Action Required: Screening notification unacknowledged. Initiate structured telephone outreach in preferred language.'
                      : 'Action Required: Review diagnostic appointment schedule and confirm attendance prep.'}
                  </p>
                </div>

                <div className="flex items-center space-x-3 self-end md:self-center">
                  <div className="text-right">
                    <div
                      className={`text-xs font-bold ${
                        c.isOverdue ? 'text-cl-alert-text' : 'text-cl-muted'
                      }`}
                    >
                      {slaText}
                    </div>
                    <div className="text-[10px] text-cl-muted">
                      Deadline: {new Date(c.clinicalDeadline).toLocaleDateString()}
                    </div>
                  </div>

                  <button
                    onClick={() => onQuickAction(c, isRejected ? 'REASSIGN' : 'OUTREACH')}
                    className="px-3.5 py-2 bg-cl-deep-teal hover:bg-cl-teal text-white rounded-cl-sm font-bold text-xs transition-colors shadow-sm"
                  >
                    {isRejected ? 'Reassign Facility' : 'Call & Log Outreach'}
                  </button>

                  <button
                    onClick={() => onOpenCaseModal(c)}
                    className="px-3 py-2 bg-white border border-cl-border text-cl-ink hover:bg-cl-page-bg rounded-cl-sm font-semibold text-xs transition-colors"
                  >
                    View File
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Footer */}
      {tasks.length > 0 && (
        <div className="p-4 bg-white rounded-cl-md border border-cl-border flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-cl-muted">
          <span>
            Showing <strong className="text-cl-ink font-semibold">{(currentPage - 1) * PAGE_SIZE + 1}</strong>–
            <strong className="text-cl-ink font-semibold">{Math.min(currentPage * PAGE_SIZE, tasks.length)}</strong> of{' '}
            <strong className="text-cl-ink font-semibold">{tasks.length}</strong> actionable tasks
          </span>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            size="sm"
          />
        </div>
      )}
    </div>
  );
}

