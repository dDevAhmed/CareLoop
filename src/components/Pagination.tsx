'use client';

import React, { useState } from 'react';

export type PaginationItem = number | '...';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  delta?: number;
  showGoTo?: boolean;
  totalItems?: number;
  pageSize?: number;
  className?: string;
  size?: 'sm' | 'md';
}

/**
 * Calculates page numbers and ellipsis indicators around currentPage.
 * Default delta = 2 provides 2 pages back and 2 pages forward.
 */
export function getPaginationItems(
  currentPage: number,
  totalPages: number,
  delta: number = 2
): PaginationItem[] {
  if (totalPages <= 0) return [];
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const windowSize = 2 * delta + 1;
  let start = currentPage - delta;
  let end = currentPage + delta;

  if (start < 1) {
    start = 1;
    end = Math.min(totalPages, windowSize);
  }
  if (end > totalPages) {
    end = totalPages;
    start = Math.max(1, totalPages - windowSize + 1);
  }

  const items: PaginationItem[] = [];

  // Always show first page
  if (start > 1) {
    items.push(1);
    if (start > 2) {
      items.push('...');
    }
  }

  // Window around active page
  for (let i = start; i <= end; i++) {
    items.push(i);
  }

  // Always show last page
  if (end < totalPages) {
    if (end < totalPages - 1) {
      items.push('...');
    }
    items.push(totalPages);
  }

  return items;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  delta = 2,
  showGoTo = true,
  totalItems,
  pageSize,
  className = '',
  size = 'md',
}: PaginationProps) {
  const [goToInput, setGoToInput] = useState<string>('');

  if (totalPages <= 0) return null;

  const items = getPaginationItems(currentPage, totalPages, delta);
  const canPrev = currentPage > 1;
  const canNext = currentPage < totalPages;

  const handlePrev = () => {
    if (canPrev) onPageChange(currentPage - 1);
  };

  const handleNext = () => {
    if (canNext) onPageChange(currentPage + 1);
  };

  const handleGoTo = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const parsed = parseInt(goToInput.trim(), 10);
    if (isNaN(parsed)) return;
    const clamped = Math.max(1, Math.min(totalPages, parsed));
    onPageChange(clamped);
    setGoToInput('');
  };

  // Dimensions based on size prop
  const heightClass = size === 'sm' ? 'h-[30px]' : 'h-[38px]';
  const minWidthClass = size === 'sm' ? 'min-w-[30px]' : 'min-w-[38px]';
  const textClass = size === 'sm' ? 'text-xs' : 'text-sm';
  const paddingXClass = size === 'sm' ? 'px-2' : 'px-3.5';

  return (
    <nav
      role="navigation"
      aria-label="Pagination Navigation"
      className={`flex items-center gap-2 select-none flex-nowrap ${className}`}
    >
      {/* Primary pagination controls */}
      <div className="flex items-center space-x-1 flex-nowrap">
        {/* Previous Button */}
        <button
          type="button"
          onClick={handlePrev}
          disabled={!canPrev}
          aria-label="Previous Page"
          className={`flex items-center space-x-1 ${paddingXClass} ${heightClass} ${textClass} font-semibold rounded-lg border border-cl-border transition-colors ${
            canPrev
              ? 'bg-white text-cl-ink hover:bg-cl-mist hover:text-cl-deep-teal hover:border-cl-deep-teal/40 shadow-xs'
              : 'bg-cl-page-bg text-cl-muted opacity-50 cursor-not-allowed pointer-events-none'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
          <span>Prev</span>
        </button>

        {/* Page items */}
        {items.map((item, index) => {
          if (item === '...') {
            return (
              <span
                key={`ellipsis-${index}`}
                aria-hidden="true"
                className={`flex items-center justify-center ${minWidthClass} ${heightClass} ${textClass} font-semibold rounded-lg border border-cl-border bg-white text-cl-muted cursor-default px-1.5`}
              >
                ...
              </span>
            );
          }

          const isCurrent = item === currentPage;

          return (
            <button
              key={`page-${item}`}
              type="button"
              onClick={() => onPageChange(item)}
              aria-label={`Page ${item}`}
              aria-current={isCurrent ? 'page' : undefined}
              className={`flex items-center justify-center ${minWidthClass} ${heightClass} ${textClass} px-2 font-semibold rounded-lg border transition-colors shadow-xs ${
                isCurrent
                  ? 'bg-cl-deep-teal text-white border-cl-deep-teal font-bold shadow-sm'
                  : 'bg-white text-cl-ink border-cl-border hover:bg-cl-mist hover:text-cl-deep-teal hover:border-cl-deep-teal/40'
              }`}
            >
              {item}
            </button>
          );
        })}

        {/* Next Button */}
        <button
          type="button"
          onClick={handleNext}
          disabled={!canNext}
          aria-label="Next Page"
          className={`flex items-center space-x-1 ${paddingXClass} ${heightClass} ${textClass} font-semibold rounded-lg border border-cl-border transition-colors ${
            canNext
              ? 'bg-white text-cl-ink hover:bg-cl-mist hover:text-cl-deep-teal hover:border-cl-deep-teal/40 shadow-xs'
              : 'bg-cl-page-bg text-cl-muted opacity-50 cursor-not-allowed pointer-events-none'
          }`}
        >
          <span>Next</span>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* "Go to page..." Section */}
      {showGoTo && totalPages > 1 && (
        <form
          onSubmit={handleGoTo}
          className="flex items-center space-x-1.5 pl-2 border-l border-cl-border flex-nowrap flex-shrink-0"
        >
          <span className={`${textClass} font-medium text-cl-muted whitespace-nowrap`}>
            Go to
          </span>
          <input
            type="number"
            min={1}
            max={totalPages}
            value={goToInput}
            onChange={(e) => setGoToInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleGoTo();
              }
            }}
            placeholder={String(currentPage)}
            aria-label="Target page number"
            className={`w-11 sm:w-12 ${heightClass} px-1.5 text-center ${textClass} font-semibold rounded-lg border border-cl-border bg-white text-cl-ink focus:border-cl-deep-teal focus:ring-1 focus:ring-cl-deep-teal outline-none transition-colors shadow-xs`}
          />
          <button
            type="button"
            onClick={handleGoTo}
            disabled={!goToInput.trim()}
            className={`flex items-center space-x-1 px-2.5 ${heightClass} ${textClass} font-semibold rounded-lg border border-cl-border transition-colors ${
              goToInput.trim()
                ? 'bg-white text-cl-ink hover:bg-cl-mist hover:text-cl-deep-teal hover:border-cl-deep-teal/40 shadow-xs'
                : 'bg-cl-page-bg text-cl-muted opacity-50 cursor-not-allowed pointer-events-none'
            }`}
          >
            <span>Go</span>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </form>
      )}
    </nav>
  );
}

