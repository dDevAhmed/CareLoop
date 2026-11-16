import React, { useState, useRef, useEffect } from 'react';

export interface DropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface CustomDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  label?: string; // Optional prefix label
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md';
  disabled?: boolean;
  align?: 'left' | 'right';
  width?: string;
}

export function CustomDropdown({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  label,
  className = '',
  buttonClassName = '',
  menuClassName = '',
  variant = 'light',
  size = 'md',
  disabled = false,
  align = 'left',
  width = 'w-auto',
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen]);

  const isDark = variant === 'dark';
  const isSm = size === 'sm';

  const baseButtonStyles = isDark
    ? 'bg-white/10 border-white/20 text-white hover:bg-white/15'
    : 'bg-cl-mist border-cl-border text-cl-ink hover:bg-cl-page-bg';

  const menuStyles = isDark
    ? 'bg-cl-navy border-white/20 text-white shadow-2xl'
    : 'bg-white border-cl-border text-cl-ink shadow-xl shadow-cl-navy/15';

  return (
    <div
      ref={containerRef}
      className={`relative inline-block text-left ${width} ${className}`}
    >
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`flex items-center justify-between border rounded-cl-sm font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-cl-teal ${
          isSm ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-xs'
        } ${baseButtonStyles} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${
          width === 'w-full' ? 'w-full' : ''
        } ${buttonClassName}`}
      >
        <span className="truncate flex items-center space-x-1.5">
          {label && (
            <span className={isDark ? 'text-white/60 font-semibold' : 'text-cl-muted font-semibold'}>
              {label}
            </span>
          )}
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>
        <svg
          className={`w-3.5 h-3.5 ml-1.5 flex-shrink-0 transition-transform ${
            isOpen ? 'rotate-180' : ''
          } ${isDark ? 'text-white/70' : 'text-cl-muted'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Popover Options List */}
      {isOpen && (
        <div
          className={`absolute mt-1 min-w-[140px] max-h-60 overflow-y-auto border rounded-cl-sm py-1 z-50 ${
            align === 'right' ? 'right-0' : 'left-0'
          } ${menuStyles} ${width === 'w-full' ? 'w-full' : ''} ${menuClassName}`}
        >
          {options.length === 0 ? (
            <div className={`px-3 py-2 text-xs ${isDark ? 'text-white/50' : 'text-cl-muted'}`}>
              No options available
            </div>
          ) : (
            options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={option.disabled}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center justify-between ${
                    option.disabled
                      ? 'opacity-40 cursor-not-allowed'
                      : isDark
                      ? isSelected
                        ? 'bg-cl-deep-teal text-white font-bold'
                        : 'hover:bg-white/10 text-white/90'
                      : isSelected
                      ? 'bg-cl-mist text-cl-deep-teal font-bold'
                      : 'hover:bg-cl-page-bg text-cl-ink'
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected && (
                    <svg
                      className={`w-3.5 h-3.5 ml-2 flex-shrink-0 ${
                        isDark ? 'text-white' : 'text-cl-teal'
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
