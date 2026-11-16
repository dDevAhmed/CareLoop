import React, { useEffect, useRef } from 'react';
import { Language } from '../types';

interface TopBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  lang: Language;
  setLang: (lang: Language) => void;
}

export function TopBar({
  searchQuery,
  setSearchQuery,
  lang,
  setLang,
}: TopBarProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Global Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="h-16 min-h-[64px] max-h-[64px] bg-white border-b border-cl-border px-6 flex items-center justify-between select-none flex-shrink-0 sticky top-0 z-20">
      {/* Global Search with Cmd/Ctrl-K */}
      <div className="flex-1 max-w-md relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-cl-muted">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by case #, patient name, or result ID..."
          className="w-full pl-9 pr-16 py-2 text-sm bg-cl-page-bg border border-cl-border rounded-cl-sm text-cl-ink placeholder-cl-muted focus:outline-none focus:border-cl-teal focus:ring-1 focus:ring-cl-teal transition-all"
        />
        <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
          <kbd className="px-1.5 py-0.5 text-[10px] font-semibold text-cl-muted bg-white border border-cl-border rounded shadow-sm">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right Actions: Synthetic Data Pill & Language Switcher */}
      <div className="flex items-center space-x-3">
        {/* Synthetic Demo Data Pill */}
        <div className="hidden sm:inline-flex items-center px-2.5 py-1 bg-cl-mist border border-cl-border rounded-full text-xs font-semibold text-cl-text-teal">
          <span className="w-1.5 h-1.5 rounded-full bg-cl-teal mr-1.5 animate-pulse"></span>
          <span>Synthetic Demo Data Only</span>
        </div>

        {/* Language Switcher */}
        <div className="flex items-center border border-cl-border rounded-cl-sm p-0.5 bg-cl-page-bg text-xs font-semibold">
          <button
            onClick={() => setLang('en')}
            className={`px-2.5 py-1 rounded transition-colors ${
              lang === 'en'
                ? 'bg-white text-cl-ink shadow-sm'
                : 'text-cl-muted hover:text-cl-ink'
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setLang('ar')}
            className={`px-2.5 py-1 rounded transition-colors font-medium ${
              lang === 'ar'
                ? 'bg-white text-cl-ink shadow-sm'
                : 'text-cl-muted hover:text-cl-ink'
            }`}
          >
            عربي
          </button>
        </div>
      </div>
    </header>
  );
}

