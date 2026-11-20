import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@/services/caseRepository';

/**
 * Return the audit-backed outreach attempts for the selected jurisdiction pack.
 * The pack is resolved explicitly so this endpoint does not depend on whichever
 * pack happens to be globally active in the server process.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const packId = searchParams.get('pack') || undefined;
  const store = getStore(packId);

  const attempts = [...store.outreachAttempts].sort(
    (a, b) => new Date(b.attemptedAt).getTime() - new Date(a.attemptedAt).getTime()
  );

  return NextResponse.json({
    total: attempts.length,
    attempts,
  });
}
