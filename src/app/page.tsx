'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Case,
  UserRole,
  Language,
  JurisdictionPack,
  OutreachAttempt,
} from '@/types';
import { Sidebar, MainTab } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';
import { TodayView } from '@/components/TodayView';
import { WorklistView } from '@/components/WorklistView';
import { ReferralsView } from '@/components/ReferralsView';
import { OutreachView } from '@/components/OutreachView';
import { AnalyticsView } from '@/components/AnalyticsView';
import { AiApprovalsView } from '@/components/AiApprovalsView';
import { SimulationView } from '@/components/SimulationView';
import { PitchModeView } from '@/components/PitchModeView';
import { CsvImportView } from '@/components/CsvImportView';
import { AuditTrailView } from '@/components/AuditTrailView';
import { CaseDetailModal } from '@/components/CaseDetailModal';

export default function CareLoopDashboard() {
  const [lang, setLang] = useState<Language>('en');
  const [activeRole, setActiveRole] = useState<UserRole>('NAVIGATOR');
  const [activeTab, setActiveTab] = useState<MainTab>('today');

  // Jurisdiction Pack state
  const [packs, setPacks] = useState<JurisdictionPack[]>([]);
  const [activePackId, setActivePackIdState] = useState<string>('abu-dhabi');
  const [activePack, setActivePack] = useState<JurisdictionPack | null>(null);

  // Demo Clock state
  const [demoClockState, setDemoClockState] = useState<{
    simulatedNow: string;
    realNow: string;
    offsetDays: number;
    isAdvanced: boolean;
  } | null>(null);

  // Data state
  const [cases, setCases] = useState<Case[]>([]);
  const [outreachAttempts, setOutreachAttempts] = useState<OutreachAttempt[]>([]);
  const [outreachLoading, setOutreachLoading] = useState<boolean>(true);
  const [outreachError, setOutreachError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [aiQueueCount, setAiQueueCount] = useState<number>(0);

  // Selected Case for Modal
  const [selectedCaseDetail, setSelectedCaseDetail] = useState<any | null>(null);

  // Load packs, demo clock, and cases on mount
  useEffect(() => {
    fetchPacks();
    fetchDemoClock();
    fetchAiQueueCount();
  }, []);

  useEffect(() => {
    fetchCases();
    fetchOutreachAttempts();
  }, [activePackId]);

  async function fetchPacks() {
    try {
      const res = await fetch('/api/packs');
      const data = await res.json();
      if (data.packs) {
        setPacks(data.packs);
        const curId = data.activePackId || 'abu-dhabi';
        setActivePackIdState(curId);
        const current = data.packs.find((p: any) => p.id === curId) || data.packs[0];
        setActivePack(current);
      }
    } catch (err) {
      console.error('Failed to load packs', err);
    }
  }

  async function fetchDemoClock() {
    try {
      const res = await fetch('/api/demo-clock');
      const data = await res.json();
      setDemoClockState(data);
    } catch (err) {
      console.error('Failed to load demo clock', err);
    }
  }

  async function fetchAiQueueCount() {
    try {
      const res = await fetch('/api/ai/approval-queue');
      const data = await res.json();
      if (data.items) {
        setAiQueueCount(data.items.length);
      }
    } catch (err) {
      console.error('Failed to load AI queue count', err);
    }
  }

  async function fetchCases() {
    setLoading(true);
    try {
      const res = await fetch(`/api/cases?limit=2000&pack=${activePackId}`);
      const data = await res.json();
      if (data.cases) {
        setCases(data.cases);
      }
    } catch (err) {
      console.error('Failed to load cases', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchOutreachAttempts() {
    setOutreachLoading(true);
    setOutreachError(null);
    try {
      const res = await fetch(`/api/outreach?pack=${encodeURIComponent(activePackId)}`);
      if (!res.ok) {
        throw new Error(`Outreach request failed: HTTP ${res.status}`);
      }
      const data = await res.json();
      if (!Array.isArray(data.attempts)) {
        throw new Error('The outreach response did not contain an attempts list.');
      }
      setOutreachAttempts(data.attempts);
    } catch (err) {
      console.error('Failed to load outreach attempts', err);
      setOutreachAttempts([]);
      setOutreachError('Outreach activity could not be loaded. Please refresh the page to try again.');
    } finally {
      setOutreachLoading(false);
    }
  }

  async function fetchCaseDetail(caseId: string) {
    try {
      const res = await fetch(`/api/cases/${caseId}`);
      const data = await res.json();
      if (data.case) {
        setSelectedCaseDetail(data);
      }
    } catch (err) {
      console.error('Failed to load case detail', err);
    }
  }

  async function handleAdvanceClock(days: number) {
    try {
      const res = await fetch('/api/demo-clock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'ADMIN',
          'x-user-id': 'DEMO-ADMIN-01',
        },
        body: JSON.stringify({ advanceDays: days }),
      });
      const data = await res.json();
      setDemoClockState(data.clock);
      fetchCases();
    } catch (err) {
      console.error('Failed to advance clock', err);
    }
  }

  async function handleResetClock() {
    try {
      const res = await fetch('/api/demo-clock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'ADMIN',
          'x-user-id': 'DEMO-ADMIN-01',
        },
        body: JSON.stringify({ reset: true }),
      });
      const data = await res.json();
      setDemoClockState(data.clock);
      fetchCases();
    } catch (err) {
      console.error('Failed to reset clock', err);
    }
  }

  async function handleSelectPack(packId: string) {
    try {
      const res = await fetch(`/api/packs/${packId}`, { method: 'POST' });
      if (!res.ok) {
        console.error('Failed to switch pack: HTTP', res.status);
        return;
      }
      const data = await res.json();
      const newPack = data.activePack || data.pack;
      if (newPack) {
        setActivePack(newPack);
        setActivePackIdState(packId);
        fetchCases();
      }
    } catch (err) {
      console.error('Failed to switch pack', err);
    }
  }

  function handleQuickAction(caseItem: Case, actionType: string) {
    fetchCaseDetail(caseItem.id);
  }

  // Calculate live badge counts
  const counts = useMemo(() => {
    const critical = cases.filter((c) => c.urgency === 'CRITICAL' && c.currentState !== 'CLOSED').length;
    const overdue = cases.filter((c) => c.isOverdue && c.currentState !== 'CLOSED').length;
    const dueSoon = cases.filter((c) => !c.isOverdue && (c.slaWorkingDaysRemaining ?? 0) <= 5 && c.currentState !== 'CLOSED').length;
    const referrals = cases.filter(
      (c) =>
        c.milestones?.referralCreatedAt ||
        c.currentState === 'REFERRAL_SENT' ||
        c.currentState === 'REFERRAL_ACCEPTED' ||
        c.currentState === 'REJECTED'
    ).length;

    return {
      today: critical + overdue + dueSoon,
      worklist: critical + overdue + cases.filter((c) => !c.milestones?.acknowledgedAt && c.currentState !== 'CLOSED').length,
      referrals,
      outreach: cases.filter((c) => !c.milestones?.acknowledgedAt && c.currentState !== 'CLOSED').length,
      aiQueue: aiQueueCount,
      critical,
    };
  }, [cases, aiQueueCount]);

  const isRtl = lang === 'ar';

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="flex h-screen overflow-hidden bg-cl-page-bg text-cl-ink font-sans selection:bg-cl-mist selection:text-cl-deep-teal"
    >
      {/* 232px Navy Sidebar (fixed, independent scroll) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeRole={activeRole}
        setActiveRole={setActiveRole}
        packs={packs}
        activePack={activePack}
        onSelectPack={handleSelectPack}
        demoClock={demoClockState}
        onAdvanceClock={handleAdvanceClock}
        onResetClock={handleResetClock}
        counts={counts}
      />

      {/* Main Content Area (separate scrolling) */}
      <div className="flex-1 h-screen flex flex-col min-w-0 overflow-visible">
        {/* Top Bar with Cmd/Ctrl-K Search, Demo Pill & Language Toggle */}
        <TopBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          lang={lang}
          setLang={setLang}
        />

        {/* Dynamic Route Content - Scrolls underneath TopBar */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          <main className="p-6 max-w-7xl w-full mx-auto">
          {activeTab === 'today' && (
            <TodayView
              cases={cases}
              activePack={activePack}
              activeRole={activeRole}
              onOpenCaseModal={(c) => fetchCaseDetail(c.id)}
              onQuickAction={handleQuickAction}
              searchQuery={searchQuery}
            />
          )}

          {activeTab === 'worklist' && (
            <WorklistView
              cases={cases}
              activePack={activePack}
              activeRole={activeRole}
              onOpenCaseModal={(c) => fetchCaseDetail(c.id)}
              onQuickAction={handleQuickAction}
            />
          )}

          {activeTab === 'referrals' && (
            <ReferralsView
              cases={cases}
              activePack={activePack}
              onOpenCaseModal={(c) => fetchCaseDetail(c.id)}
              onQuickAction={handleQuickAction}
            />
          )}

          {activeTab === 'outreach' && (
            <OutreachView
              attempts={outreachAttempts}
              activePack={activePack}
              loading={outreachLoading}
              error={outreachError}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsView activePack={activePack} />
          )}

          {activeTab === 'aiQueue' && (
            <AiApprovalsView
              activeRole={activeRole}
              onRefreshCounts={fetchAiQueueCount}
            />
          )}

          {activeTab === 'simulation' && <SimulationView />}

          {activeTab === 'pitchMode' && (
            <PitchModeView
              onAdvanceClock={handleAdvanceClock}
              onResetClock={handleResetClock}
            />
          )}

          {activeTab === 'import' && (
            <CsvImportView onImportComplete={fetchCases} />
          )}

          {activeTab === 'provenance' && <AuditTrailView activePackId={activePackId} />}
        </main>
        </div>
      </div>

      {/* Full Case Detail Modal */}
      {selectedCaseDetail && (
        <CaseDetailModal
          caseDetail={selectedCaseDetail}
          onClose={() => setSelectedCaseDetail(null)}
          activeRole={activeRole}
          activePack={activePack}
          onRefreshCase={(id) => {
            fetchCaseDetail(id);
            fetchCases();
          }}
        />
      )}
    </div>
  );
}
