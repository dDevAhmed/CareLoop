/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'cl-teal': 'var(--color-teal)',
        'cl-deep-teal': 'var(--color-deep-teal)',
        'cl-text-teal': 'var(--color-text-teal)',
        'cl-navy': 'var(--color-navy)',
        'cl-ink': 'var(--color-deep-slate-ink)',
        'cl-coral': 'var(--color-coral)',
        'cl-warm-coral': 'var(--color-warm-coral)',
        'cl-alert-text': 'var(--color-alert-text)',
        'cl-alert-tint': 'var(--color-alert-tint)',
        'cl-page-bg': 'var(--color-page-bg)',
        'cl-mist': 'var(--color-mist)',
        'cl-calm-mist': 'var(--color-calm-mist)',
        'cl-border': 'var(--color-border)',
        'cl-muted': 'var(--color-muted-text)',
        'cl-neutral-chip': 'var(--color-neutral-chip)',
      },
      fontFamily: {
        sans: ['var(--font-manrope)', 'sans-serif'],
      },
      borderRadius: {
        'cl-sm': '12px',
        'cl-md': '16px',
        'cl-lg': '20px',
      },
      width: {
        'cl-sidebar': '232px',
        'cl-drawer': '360px',
      },
    },
  },
  plugins: [],
};
