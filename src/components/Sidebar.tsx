import React, { useState } from 'react';
import Link from 'next/link';
import { UserRole, JurisdictionPack } from '../types';
import { CustomDropdown } from './CustomDropdown';

export type MainTab =
  | 'today'
  | 'worklist'
  | 'referrals'
  | 'outreach'
  | 'analytics'
  | 'aiQueue'
  | 'simulation'
  | 'pitchMode'
  | 'import'
  | 'provenance';

interface SidebarProps {
  activeTab: MainTab;
  setActiveTab: (tab: MainTab) => void;
  activeRole: UserRole;
  setActiveRole: (role: UserRole) => void;
  packs: JurisdictionPack[];
  activePack: JurisdictionPack | null;
  onSelectPack: (packId: string) => void;
  demoClock: {
    simulatedNow: string;
    offsetDays: number;
    isAdvanced: boolean;
  } | null;
  onAdvanceClock: (days: number) => void;
  onResetClock: () => void;
  counts: {
    today: number;
    worklist: number;
    referrals: number;
    outreach: number;
    aiQueue: number;
    critical: number;
  };
}

export function Sidebar({
  activeTab,
  setActiveTab,
  activeRole,
  setActiveRole,
  packs,
  activePack,
  onSelectPack,
  demoClock,
  onAdvanceClock,
  onResetClock,
  counts,
}: SidebarProps) {
  const [demoControlsOpen, setDemoControlsOpen] = useState(true);

  // Count unverified pathway rules in active pack
  const unverifiedRulesCount = activePack
    ? activePack.pathways.filter((p) => !p.verified).length
    : 0;

  const navItems: { id: MainTab; label: string; count?: number; icon: React.ReactNode }[] = [
    {
      id: 'today',
      label: 'Today',
      count: counts.today,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: 'worklist',
      label: 'Worklist',
      count: counts.worklist,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      id: 'referrals',
      label: 'Referrals',
      count: counts.referrals,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      ),
    },
    {
      id: 'outreach',
      label: 'Outreach',
      count: counts.outreach,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      ),
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      id: 'aiQueue',
      label: 'AI Approvals',
      count: counts.aiQueue,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
    {
      id: 'simulation',
      label: 'Simulation',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      id: 'pitchMode',
      label: 'Pitch Mode',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: 'import',
      label: 'CSV Import',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
      ),
    },
    {
      id: 'provenance',
      label: 'Audit Trail',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
    },
  ];

  return (
    <aside className="w-[232px] min-w-[232px] max-w-[232px] h-screen bg-cl-navy text-white flex flex-col border-r border-white/10 select-none flex-shrink-0 sticky top-0 z-30 overflow-hidden">
      {/* Brand Header */}
      <div className="h-16 px-4 border-b border-white/10 flex items-center flex-shrink-0">
        <img
          src="/careloop_glyph.png"
          alt="CareLoop Mark"
          className="w-8 h-8 rounded-cl-sm mr-2.5 flex-shrink-0"
        />
        <div className="overflow-hidden">
          <div className="font-extrabold text-base tracking-tight text-white leading-tight">
            CareLoop
          </div>
          <div className="text-[11px] text-cl-border font-medium truncate">
            Every result, followed through.
          </div>
        </div>
      </div>

      {/* Navigation Links with independent scroll */}
      <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto min-h-0">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-cl-sm transition-colors text-left ${
                isActive
                  ? 'bg-cl-deep-teal text-white shadow-sm'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-2.5 truncate">
                <span className="flex-shrink-0">{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </div>
              {item.count !== undefined && item.count > 0 && (
                <span
                  className={`ml-2 px-1.5 py-0.5 text-xs font-semibold rounded-full flex-shrink-0 ${
                    item.id === 'today' && counts.critical > 0
                      ? 'bg-cl-coral text-white'
                      : isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-white/10 text-white/90'
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Collapsible Demo Controls */}
      <div className="p-2 border-t border-white/10">
        <div className="bg-white/5 rounded-cl-sm p-2.5 text-xs">
          <button
            onClick={() => setDemoControlsOpen(!demoControlsOpen)}
            className="w-full flex items-center justify-between font-semibold text-white/90 pb-1"
          >
            <span className="flex items-center space-x-1.5">
              <span>⏱ Demo Controls</span>
            </span>
            <svg
              className={`w-3.5 h-3.5 transition-transform ${demoControlsOpen ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {demoControlsOpen && (
            <div className="mt-2 space-y-2 pt-2 border-t border-white/10">
              {/* Simulated Clock */}
              <div>
                <div className="text-[10px] text-white/60 uppercase tracking-wider font-semibold">
                  Simulated Time
                </div>
                <div className="text-xs font-medium text-white truncate">
                  {demoClock
                    ? new Date(demoClock.simulatedNow).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : 'System Now'}
                  {demoClock?.offsetDays ? ` (+${demoClock.offsetDays}d)` : ''}
                </div>
                <div className="grid grid-cols-4 gap-1 mt-1.5">
                  <button
                    onClick={() => onAdvanceClock(1)}
                    className="px-1.5 py-1 bg-white/10 hover:bg-white/20 text-white text-[10px] font-semibold rounded"
                    title="Advance +1 day"
                  >
                    +1d
                  </button>
                  <button
                    onClick={() => onAdvanceClock(7)}
                    className="px-1.5 py-1 bg-white/10 hover:bg-white/20 text-white text-[10px] font-semibold rounded"
                    title="Advance +7 days"
                  >
                    +7d
                  </button>
                  <button
                    onClick={() => onAdvanceClock(30)}
                    className="px-1.5 py-1 bg-white/10 hover:bg-white/20 text-white text-[10px] font-semibold rounded"
                    title="Advance +30 days"
                  >
                    +30d
                  </button>
                  <button
                    onClick={onResetClock}
                    className="px-1.5 py-1 bg-white/10 hover:bg-white/20 text-white text-[10px] font-semibold rounded"
                    title="Reset to today"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Active Pack */}
              <div className="pt-1.5 border-t border-white/10">
                <div className="text-[10px] text-white/60 uppercase tracking-wider font-semibold mb-1">
                  Jurisdiction Pack
                </div>
                <CustomDropdown
                  value={activePack?.id || 'abu-dhabi'}
                  onChange={onSelectPack}
                  options={packs.map((p) => ({ value: p.id, label: p.name }))}
                  variant="dark"
                  size="sm"
                  width="w-full"
                  direction="auto"
                />

                {/* Unverified Rules Badge */}
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-amber-200 bg-amber-900/30 px-1.5 py-0.5 rounded">
                  <span>Rules verification:</span>
                  <span className="font-bold">
                    {unverifiedRulesCount > 0
                      ? `⚠ ${unverifiedRulesCount} unverified`
                      : '✓ All verified'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* User Chip & Patient PWA Link */}
      <div className="p-3 border-t border-white/10 space-y-2 flex-shrink-0">
        <Link
          href="/patient"
          target="_blank"
          className="w-full flex items-center justify-center space-x-1.5 py-1.5 px-2 bg-cl-mist text-cl-deep-teal font-semibold text-xs rounded-cl-sm hover:bg-white transition-colors"
        >
          <span>📱</span>
          <span>Open Patient PWA</span>
        </Link>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center space-x-2 truncate">
            <div className="w-7 h-7 rounded-full bg-cl-deep-teal flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {activeRole === 'CLINICIAN' ? 'DR' : activeRole === 'NAVIGATOR' ? 'NL' : 'PA'}
            </div>
            <div className="truncate text-left">
              <div className="text-xs font-semibold text-white leading-tight truncate">
                {activeRole === 'CLINICIAN'
                  ? 'Dr. Fatima'
                  : activeRole === 'NAVIGATOR'
                  ? 'Layla (Navigator)'
                  : 'Programme Analyst'}
              </div>
              <div className="text-[10px] text-white/60 capitalize">
                {activeRole.toLowerCase()}
              </div>
            </div>
          </div>

          <CustomDropdown
            value={activeRole}
            onChange={(val) => setActiveRole(val as UserRole)}
            options={[
              { value: 'NAVIGATOR', label: 'Navigator' },
              { value: 'CLINICIAN', label: 'Clinician' },
              { value: 'PROGRAMME_ANALYST', label: 'Analyst' },
            ]}
            variant="dark"
            size="sm"
            align="right"
            direction="up"
          />
        </div>
      </div>
    </aside>
  );
}

