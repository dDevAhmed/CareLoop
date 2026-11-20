'use client';

import React, { useState, useMemo } from 'react';
import { Case, UserRole, JurisdictionPack, OutreachOutcome, BarrierReason, OutreachChannel } from '../types';
import { CustomDropdown } from './CustomDropdown';

interface WorklistViewProps {
  cases: Case[];
  activePack: JurisdictionPack | null;
  activeRole: UserRole;
  onOpenCaseModal: (caseItem: Case) => void;
  onQuickAction: (caseItem: Case, actionType: string) => void;
}

type WorklistTab = 'due_now' | 'later_today' | 'done';

interface OutreachTaskItem {
  id: string;
  caseItem: Case;
  actionTitle: string;
  actionSubtitle: string;
  channel: OutreachChannel;
  dueTime: string;
  isOverdue: boolean;
  overdueDays: number;
  ladder: { label: string; completed: boolean }[];
  phoneEnding: string;
  callPreferences: string;
}

export function WorklistView({
  cases,
  activePack,
  activeRole,
  onOpenCaseModal,
  onQuickAction,
}: WorklistViewProps) {
  const [activeTab, setActiveTab] = useState<WorklistTab>('due_now');
  const [selectedPathway, setSelectedPathway] = useState<string>('all');
  const [selectedChannel, setSelectedChannel] = useState<string>('all');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Outcome panel form state
  const [outcome, setOutcome] = useState<OutreachOutcome | null>('NO_ANSWER');
  const [barrier, setBarrier] = useState<BarrierReason | null>(null);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [doneTaskIds, setDoneTaskIds] = useState<Set<string>>(new Set());

  // Derive actionable outreach tasks from cases
  const allTasks: OutreachTaskItem[] = useMemo(() => {
    return cases
      .filter((c) => c.currentState !== 'CLOSED')
      .map((c, index) => {
        const phone = c.patient?.phone || '+15551234417';
        const phoneEnding = phone.slice(-4);
        const langLabel = c.patient?.language === 'ar' ? 'Arabic' : 'English';
        const isOverdue = c.isOverdue;
        const overdueDays = Math.max(1, Math.abs(c.slaWorkingDaysRemaining || 1));

        // Determine action, subtitle, and escalation ladder
        let actionTitle = 'Call · attempt 1';
        let actionSubtitle = 'Result not acknowledged after 72 hours';
        let channel: OutreachChannel = 'CALL';
        let dueTime = isOverdue ? 'Due now' : index % 3 === 0 ? '2:00 pm' : index % 3 === 1 ? '4:00 pm' : '5:00 pm';
        let ladder = [
          { label: 'SMS', completed: true },
          { label: 'Call', completed: false },
          { label: 'Visit', completed: false },
        ];

        if (c.currentState === 'REJECTED') {
          actionTitle = 'Reassign facility';
          actionSubtitle = 'Diagnostic center rejected due to capacity';
          channel = 'CALL';
          ladder = [
            { label: 'Referral', completed: true },
            { label: 'Chase', completed: true },
            { label: 'Escalate', completed: false },
          ];
        } else if (c.currentState === 'ESCALATED') {
          actionTitle = 'Navigator visit';
          actionSubtitle = 'Two calls unanswered, visit required';
          channel = 'NAVIGATOR_VISIT';
          ladder = [
            { label: 'SMS', completed: true },
            { label: 'Call', completed: true },
            { label: 'Visit', completed: true },
          ];
        } else if (c.milestones?.referralCreatedAt && !c.milestones?.referralAcceptedAt) {
          actionTitle = 'Chase referral';
          actionSubtitle = 'Sent 4 days ago, not yet accepted';
          channel = 'CALL';
          ladder = [
            { label: 'Referral', completed: true },
            { label: 'Chase', completed: true },
            { label: 'Escalate', completed: false },
          ];
        } else if (c.milestones?.acknowledgedAt && !c.milestones?.attendedAt) {
          actionTitle = 'Confirm attendance';
          actionSubtitle = 'Appointment upcoming / prep kit verification';
          channel = 'CALL';
          ladder = [
            { label: 'Booked', completed: true },
            { label: 'Confirm', completed: true },
            { label: 'Report', completed: false },
          ];
        } else if (index % 2 === 0) {
          actionTitle = 'Call · attempt 2';
          actionSubtitle = 'No reply to the SMS for 3 days';
          ladder = [
            { label: 'SMS', completed: true },
            { label: 'Call', completed: true },
            { label: 'Visit', completed: false },
          ];
        }

        return {
          id: c.id,
          caseItem: c,
          actionTitle,
          actionSubtitle,
          channel,
          dueTime,
          isOverdue,
          overdueDays,
          ladder,
          phoneEnding,
          callPreferences: `Prefers calls after 4 pm · ${langLabel}`,
        };
      });
  }, [cases]);

  // Filter tasks into the 3 tabs: Due now / Later today / Done
  const dueNowTasks = useMemo(() => {
    return allTasks.filter((t) => !doneTaskIds.has(t.id) && (t.isOverdue || t.dueTime === 'Due now'));
  }, [allTasks, doneTaskIds]);

  const laterTodayTasks = useMemo(() => {
    return allTasks.filter((t) => !doneTaskIds.has(t.id) && !t.isOverdue && t.dueTime !== 'Due now');
  }, [allTasks, doneTaskIds]);

  const doneTasks = useMemo(() => {
    return allTasks.filter((t) => doneTaskIds.has(t.id));
  }, [allTasks, doneTaskIds]);

  // Current tab tasks with pathway and channel filters
  const currentTabTasks = useMemo(() => {
    let pool = activeTab === 'due_now' ? dueNowTasks : activeTab === 'later_today' ? laterTodayTasks : doneTasks;
    if (selectedPathway !== 'all') {
      pool = pool.filter((t) => t.caseItem.pathwayId === selectedPathway);
    }
    if (selectedChannel !== 'all') {
      pool = pool.filter((t) => t.channel === selectedChannel);
    }
    return pool;
  }, [activeTab, dueNowTasks, laterTodayTasks, doneTasks, selectedPathway, selectedChannel]);

  // Active task for outcome drawer
  const activeTask = useMemo(() => {
    if (selectedTaskId) {
      const found = allTasks.find((t) => t.id === selectedTaskId);
      if (found) return found;
    }
    return currentTabTasks[0] || allTasks[0] || null;
  }, [selectedTaskId, currentTabTasks, allTasks]);

  // Progress metrics
  const totalShiftActions = 25;
  const doneCount = 7 + doneTaskIds.size;
  const progressPercent = Math.min(100, Math.round((doneCount / totalShiftActions) * 100));

  // Handle Save and Next
  const handleSaveAndNext = async () => {
    if (!activeTask || !outcome) return;
    setIsSubmitting(true);
    try {
      await fetch(`/api/cases/${activeTask.id}/outreach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: activeTask.channel,
          outcome,
          barrierReason: barrier,
          notes,
          actorRole: activeRole,
        }),
      });

      // Mark current task as done
      setDoneTaskIds((prev) => new Set(prev).add(activeTask.id));

      // Advance to next task in the list
      const currentIndex = currentTabTasks.findIndex((t) => t.id === activeTask.id);
      if (currentIndex !== -1 && currentIndex + 1 < currentTabTasks.length) {
        setSelectedTaskId(currentTabTasks[currentIndex + 1].id);
      } else if (currentTabTasks.length > 1) {
        setSelectedTaskId(currentTabTasks[0].id);
      }

      // Reset form fields
      setOutcome('NO_ANSWER');
      setBarrier(null);
      setNotes('');
    } catch (err) {
      console.error('Failed to log outreach outcome:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Escalate to clinician
  const handleEscalateToClinician = async () => {
    if (!activeTask) return;
    try {
      await fetch(`/api/cases/${activeTask.id}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetState: 'ESCALATED',
          trigger: 'NAVIGATOR_MANUAL_ESCALATION',
          actorRole: activeRole,
          barrierReason: barrier,
        }),
      });
      setDoneTaskIds((prev) => new Set(prev).add(activeTask.id));
      onQuickAction(activeTask.caseItem, 'ESCALATE');
    } catch (err) {
      console.error('Failed to escalate case:', err);
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-cl-ink tracking-tight">
            Navigator worklist
          </h1>
          <p className="text-xs text-cl-muted mt-1">
            <span className="font-semibold text-cl-ink">{dueNowTasks.length} outreach actions</span> due today. Work from the top: the list is ordered by deadline risk.
          </p>
        </div>

        {/* Done Today Progress Bar (Matching Image #2) */}
        <div className="w-full sm:w-64 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-cl-muted">Done today</span>
            <span className="font-bold text-cl-ink">{doneCount} of {totalShiftActions}</span>
          </div>
          <div className="w-full bg-cl-page-bg border border-cl-border rounded-full h-2 overflow-hidden">
            <div
              className="bg-cl-teal h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* 2. Tabs & Filter Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-cl-border pb-3">
        {/* 3 Tabs: Due now / Later today / Done */}
        <div className="flex items-center space-x-2">
          {[
            { id: 'due_now', label: 'Due now', count: dueNowTasks.length },
            { id: 'later_today', label: 'Later today', count: laterTodayTasks.length },
            { id: 'done', label: 'Done', count: doneCount },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as WorklistTab)}
                className={`flex items-center space-x-2 px-3 py-1.5 text-xs font-semibold rounded-cl-sm transition-colors ${
                  isActive
                    ? 'border-b-2 border-cl-deep-teal text-cl-deep-teal bg-cl-mist/50 font-bold'
                    : 'text-cl-muted hover:text-cl-ink hover:bg-white'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[11px] font-bold ${
                    isActive
                      ? 'bg-cl-deep-teal text-white'
                      : 'bg-cl-neutral-chip text-cl-muted'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filters: Pathway & Channel */}
        <div className="flex items-center space-x-2 text-xs">
          <CustomDropdown
            value={selectedPathway}
            onChange={setSelectedPathway}
            options={[
              { value: 'all', label: 'Pathway: All' },
              ...(activePack?.pathways.map((p) => ({ value: p.id, label: p.name })) || []),
            ]}
            variant="light"
            size="sm"
          />

          <CustomDropdown
            value={selectedChannel}
            onChange={setSelectedChannel}
            options={[
              { value: 'all', label: 'Channel: All' },
              { value: 'CALL', label: 'Phone Call' },
              { value: 'SMS', label: 'SMS' },
              { value: 'NAVIGATOR_VISIT', label: 'Navigator Visit' },
            ]}
            variant="light"
            size="sm"
            align="right"
          />
        </div>
      </div>

      {/* 3. Master-Detail Layout: Task List (Left) + Log Outcome Panel (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Worklist Rows */}
        <div className="lg:col-span-7 space-y-3">
          {currentTabTasks.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-cl-md border border-cl-border text-cl-muted text-xs">
              No outreach tasks found for this view. All cases in this category have been handled.
            </div>
          ) : (
            currentTabTasks.map((task) => {
              const isSelected = activeTask?.id === task.id;
              const patientName =
                task.caseItem.patient?.fullNameArabic && task.caseItem.patient.language === 'ar'
                  ? task.caseItem.patient.fullNameArabic
                  : task.caseItem.patient?.fullName || 'Anonymous Patient';

              return (
                <div
                  key={task.id}
                  onClick={() => setSelectedTaskId(task.id)}
                  className={`bg-white p-4 rounded-cl-md border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                    isSelected
                      ? 'border-cl-deep-teal ring-1 ring-cl-deep-teal/40 shadow-sm bg-cl-page-bg/30'
                      : 'border-cl-border hover:border-cl-deep-teal/30 hover:bg-cl-page-bg/20'
                  }`}
                >
                  {/* Left: Status Icon & Details */}
                  <div className="flex items-start space-x-3 min-w-0">
                    {/* Priority Alert Icon */}
                    <div className="pt-0.5">
                      {task.isOverdue || task.caseItem.urgency === 'CRITICAL' ? (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-cl-coral/20 text-cl-coral font-bold text-xs">
                          !
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-cl-mist text-cl-deep-teal font-bold text-xs">
                          ✓
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 min-w-0">
                      {/* Patient Name & Case Subtitle */}
                      <div className="flex items-baseline space-x-2">
                        <span dir="auto" className="font-extrabold text-sm text-cl-ink truncate">
                          {patientName}
                        </span>
                        <span className="text-xs text-cl-muted font-mono truncate">
                          {task.caseItem.caseNumber} · {task.caseItem.pathwayId.split('-')[0].toUpperCase()}
                        </span>
                      </div>

                      {/* Action Title & Reason Subtitle */}
                      <div className="text-xs font-bold text-cl-ink">
                        {task.actionTitle}
                      </div>
                      <p className="text-xs text-cl-muted">
                        {task.actionSubtitle}
                      </p>

                      {/* Escalation Ladder Chips */}
                      <div className="flex items-center space-x-2 pt-1 text-[11px] text-cl-muted">
                        {task.ladder.map((step, idx) => (
                          <span key={idx} className="flex items-center space-x-1">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                step.completed ? 'bg-cl-deep-teal' : 'border border-cl-muted bg-white'
                              }`}
                            ></span>
                            <span className={step.completed ? 'font-semibold text-cl-ink' : 'text-cl-muted'}>
                              {step.label}
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right: Due Time Badge & CTA Button */}
                  <div className="flex flex-col items-end space-y-2 flex-shrink-0">
                    <span
                      className={`text-xs font-semibold ${
                        task.isOverdue || task.dueTime === 'Due now'
                          ? 'text-cl-alert-text font-bold'
                          : 'text-cl-muted'
                      }`}
                    >
                      {task.dueTime}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTaskId(task.id);
                      }}
                      className={`px-3 py-1.5 rounded-cl-sm text-xs font-bold transition-colors ${
                        isSelected
                          ? 'bg-cl-deep-teal text-white shadow-xs'
                          : 'border border-cl-deep-teal text-cl-deep-teal bg-white hover:bg-cl-mist'
                      }`}
                    >
                      Log outcome
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Log Outcome Drawer Panel (Matching Image #2) */}
        <div className="lg:col-span-5 bg-white rounded-cl-md border border-cl-border shadow-sm p-4 space-y-4 sticky top-[68px]">
          {activeTask ? (
            <>
              {/* Drawer Top Header: Patient Name & Overdue Badge */}
              <div className="flex items-start justify-between border-b border-cl-border pb-3">
                <div>
                  <h3 dir="auto" className="text-base font-extrabold text-cl-ink">
                    {activeTask.caseItem.patient?.fullNameArabic && activeTask.caseItem.patient.language === 'ar'
                      ? activeTask.caseItem.patient.fullNameArabic
                      : activeTask.caseItem.patient?.fullName || 'Anonymous Patient'}
                  </h3>
                  <div className="text-xs text-cl-muted font-mono mt-0.5">
                    {activeTask.caseItem.caseNumber} · Call, attempt 2 of 3
                  </div>
                </div>

                {activeTask.isOverdue && (
                  <span className="px-2 py-0.5 rounded bg-cl-alert-tint text-cl-alert-text text-xs font-bold border border-cl-coral/30">
                    {activeTask.overdueDays} days overdue
                  </span>
                )}
              </div>

              {/* Patient Contact Card */}
              <div className="p-3 bg-cl-page-bg rounded-cl-sm border border-cl-border flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-cl-ink">
                    Phone ending {activeTask.phoneEnding}
                  </div>
                  <div className="text-[11px] text-cl-muted mt-0.5">
                    {activeTask.callPreferences}
                  </div>
                </div>

                <a
                  href={`tel:${activeTask.caseItem.patient?.phone || ''}`}
                  className="px-3.5 py-1 bg-cl-deep-teal text-white rounded-cl-sm text-xs font-bold hover:bg-cl-teal transition-colors shadow-xs"
                >
                  Call
                </a>
              </div>

              {/* "What happened?" Pill Buttons */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-cl-ink">What happened?</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'ACKNOWLEDGED', label: 'Reached, understood' },
                    { id: 'NO_ANSWER', label: 'No answer' },
                    { id: 'DECLINED', label: 'Declined' },
                    { id: 'WRONG_NUMBER', label: 'Wrong number' },
                  ].map((btn) => {
                    const isPicked = outcome === btn.id;
                    return (
                      <button
                        key={btn.id}
                        type="button"
                        onClick={() => setOutcome(btn.id as OutreachOutcome)}
                        className={`py-2 px-2 text-xs font-semibold rounded-cl-sm border transition-colors ${
                          isPicked
                            ? 'bg-cl-mist border-cl-deep-teal text-cl-deep-teal font-bold shadow-xs'
                            : 'bg-white border-cl-border text-cl-ink hover:bg-cl-page-bg'
                        }`}
                      >
                        {btn.label}
                      </button>
                    );
                  })}
                </div>

                {/* Dynamic Protocol Guidance */}
                <p className="text-[11px] text-cl-muted italic pt-1">
                  {outcome === 'NO_ANSWER'
                    ? 'After two unanswered calls this case moves to a navigator visit and a clinician is told.'
                    : outcome === 'ACKNOWLEDGED'
                    ? 'Patient acknowledged screening notification. Clinical pathway proceeds to specialist referral scheduling.'
                    : outcome === 'DECLINED'
                    ? 'Patient declined navigation. Document specific barriers below to support clinician follow-up.'
                    : 'Contact number invalid. Flag for patient intake registry review.'}
                </p>
              </div>

              {/* "Barrier, if you know it" Chips */}
              <div className="space-y-2 pt-1 border-t border-cl-border">
                <label className="text-xs font-bold text-cl-ink">Barrier, if you know it</label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'TRANSPORT', label: 'Transport' },
                    { id: 'COST_INSURANCE', label: 'Cost or insurance' },
                    { id: 'FEAR_ANXIETY', label: 'Fear or worry' },
                    { id: 'LOW_HEALTH_LITERACY', label: 'Needs explaining' },
                    { id: 'APPOINTMENT_UNAVAILABLE', label: 'No slot' },
                    { id: 'OTHER', label: 'Other' },
                  ].map((b) => {
                    const isSelected = barrier === b.id;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setBarrier(isSelected ? null : (b.id as BarrierReason))}
                        className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                          isSelected
                            ? 'bg-cl-deep-teal text-white border-cl-deep-teal font-bold shadow-xs'
                            : 'bg-white border-cl-border text-cl-muted hover:border-cl-deep-teal hover:text-cl-ink'
                        }`}
                      >
                        {b.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Optional Note Textarea */}
              <div className="space-y-1">
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add a short note (optional)"
                  className="w-full px-3 py-1.5 text-xs bg-cl-page-bg border border-cl-border rounded-cl-sm text-cl-ink placeholder-cl-muted focus:outline-none focus:border-cl-deep-teal focus:ring-1 focus:ring-cl-deep-teal transition-all"
                />
              </div>

              {/* CTA: Save and next */}
              <button
                type="button"
                disabled={isSubmitting || !outcome}
                onClick={handleSaveAndNext}
                className="w-full py-2.5 bg-cl-deep-teal text-white rounded-cl-sm font-bold text-xs hover:bg-cl-teal transition-colors shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Save and next'}
              </button>

              {/* Secondary Link: Escalate to clinician */}
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={handleEscalateToClinician}
                  className="text-xs font-bold text-cl-alert-text hover:underline transition-colors"
                >
                  Escalate to clinician
                </button>
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-cl-muted text-xs">
              Select an outreach task to log outcomes.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
