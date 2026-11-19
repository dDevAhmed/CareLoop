import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center">
      <h2 className="text-2xl font-bold text-cl-ink">Page Not Found</h2>
      <p className="text-sm text-cl-muted mt-2">Could not find requested resource</p>
      <Link
        href="/"
        className="mt-4 px-4 py-2 bg-cl-navy text-white text-sm font-semibold rounded-cl-sm hover:bg-cl-deep-teal transition-colors"
      >
        Return Home
      </Link>
    </div>
  );
}
