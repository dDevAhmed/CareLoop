import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CareLoop | Abu Dhabi Closed-Loop Screening-to-Care Platform',
  description:
    'Future Health Digital Innovation Challenge prototype: Active tracking, outreach ladder, navigation, and closed-loop diagnostic resolution.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}

