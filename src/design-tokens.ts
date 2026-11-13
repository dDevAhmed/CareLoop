/**
 * CareLoop Design Tokens
 * Single source of truth for branding, typography, spacing, and accessibility.
 * All application styling references these tokens or their mapped CSS custom properties.
 */

export const DESIGN_TOKENS = {
  colors: {
    // Primary Brand
    teal: '#087F83',
    deepTeal: '#0F5E63',
    textTeal: '#066468',

    // Ink & Dark Surfaces
    navy: '#142747',
    deepSlateInk: '#10282B',

    // Accents & Alerts (Fills only, never light text on white)
    coral: '#E98278',
    warmCoral: '#E8684A',
    alertText: '#A8321F',
    alertTint: '#FCE4E1',

    // Surfaces & Backgrounds
    pageBg: '#F2F8F7',
    mist: '#EAF4F3',
    calmMist: '#F4F8F7',
    white: '#FFFFFF',

    // Borders & Dividers
    border: '#DCE7E6',

    // Neutrals & Chips
    mutedText: '#55657B',
    neutralChip: '#E8EEF5',
  },

  typography: {
    fontFamily: "'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    weights: {
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    },
    sizes: {
      meta: '12px', // Minimum meta / secondary label
      body: '14px', // Minimum body text for WCAG AA compliance
      bodyLg: '16px',
      h3: '18px',
      h2: '20px',
      h1: '24px',
      display: '28px',
    },
    lineHeights: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.625,
    },
  },

  radius: {
    sm: '12px',
    md: '16px',
    lg: '20px',
    full: '9999px',
  },

  layout: {
    sidebarWidth: '232px',
    previewDrawerWidth: '360px',
  },

  shadows: {
    sm: '0 1px 2px 0 rgba(16, 40, 43, 0.05)',
    card: '0 2px 8px -2px rgba(16, 40, 43, 0.08), 0 1px 4px -1px rgba(16, 40, 43, 0.04)',
    drawer: '-4px 0 24px -4px rgba(20, 39, 71, 0.15)',
    modal: '0 20px 40px -15px rgba(20, 39, 71, 0.25)',
  },
} as const;

export type DesignTokens = typeof DESIGN_TOKENS;

