import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@/services/caseRepository';
import { verifyAuditChain, calculateAuditEntryHash } from '@/engine/auditChain';

export async function GET(req: NextRequest) {
  try {
    const pack = req.nextUrl.searchParams.get('pack') || undefined;
    const store = getStore(pack);
    const verification = verifyAuditChain(store.auditLogs);

    // Return the latest 50 entries for inspection
    const recent = store.auditLogs.slice(-50).reverse();

    return NextResponse.json({
      success: true,
      totalEntries: store.auditLogs.length,
      latestHash: store.lastAuditHash,
      verification,
      recentEntries: recent,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const pack = body.pack || undefined;
    const store = getStore(pack);

    if (body.simulateTamper) {
      // Create a shallow copy with one corrupted entry to test detection
      const tamperedLogs = store.auditLogs.map((entry, index) => {
        if (index === Math.floor(store.auditLogs.length / 2)) {
          return {
            ...entry,
            details: { ...entry.details, TAMPERED_FIELD: 'UNAUTHORIZED_MUTATION' },
          };
        }
        return entry;
      });

      const verification = verifyAuditChain(tamperedLogs);
      return NextResponse.json({
        success: true,
        simulation: 'TAMPER_INJECTED',
        verification,
      });
    }

    const verification = verifyAuditChain(store.auditLogs);
    return NextResponse.json({
      success: true,
      totalEntries: store.auditLogs.length,
      latestHash: store.lastAuditHash,
      verification,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

