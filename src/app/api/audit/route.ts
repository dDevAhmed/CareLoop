import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@/services/caseRepository';
import { verifyAuditChain } from '@/engine/auditChain';

export async function GET(req: NextRequest) {
  try {
    const pack = req.nextUrl.searchParams.get('pack') || undefined;
    const store = getStore(pack);
    const verification = verifyAuditChain(store.auditLogs);

    const pageParam = req.nextUrl.searchParams.get('page');
    const limitParam = req.nextUrl.searchParams.get('limit');
    const actionFilter = req.nextUrl.searchParams.get('action');
    const roleFilter = req.nextUrl.searchParams.get('actorRole');
    const dateFilter = req.nextUrl.searchParams.get('date');
    const searchFilter = req.nextUrl.searchParams.get('search');

    const page = pageParam ? Math.max(1, parseInt(pageParam, 10)) : 1;
    const limit = limitParam ? Math.max(1, parseInt(limitParam, 10)) : 15;

    // Filter audit logs
    let filtered = [...store.auditLogs];

    if (actionFilter && actionFilter !== 'all') {
      filtered = filtered.filter((e) => e.action === actionFilter);
    }

    if (roleFilter && roleFilter !== 'all') {
      filtered = filtered.filter((e) => e.actorRole === roleFilter);
    }

    if (dateFilter) {
      filtered = filtered.filter((e) => e.timestamp?.startsWith(dateFilter));
    }

    if (searchFilter && searchFilter.trim()) {
      const q = searchFilter.trim().toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.sequenceNumber?.toString().includes(q) ||
          e.resourceId?.toLowerCase().includes(q) ||
          e.resourceType?.toLowerCase().includes(q) ||
          e.actorId?.toLowerCase().includes(q) ||
          e.action?.toLowerCase().includes(q) ||
          e.hash?.toLowerCase().includes(q)
      );
    }

    // Newest first (descending sequence number)
    filtered.reverse();

    const filteredTotal = filtered.length;
    const totalPages = Math.ceil(filteredTotal / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginatedEntries = filtered.slice(startIndex, startIndex + limit);

    // Collect distinct actions and roles from full audit store for frontend filter dropdowns
    const availableActions = Array.from(new Set(store.auditLogs.map((e) => e.action))).sort();
    const availableRoles = Array.from(new Set(store.auditLogs.map((e) => e.actorRole))).sort();

    return NextResponse.json({
      success: true,
      totalEntries: store.auditLogs.length,
      filteredTotal,
      totalPages,
      currentPage: page,
      limit,
      latestHash: store.lastAuditHash,
      verification,
      verified: verification.valid,
      recentEntries: paginatedEntries,
      availableActions,
      availableRoles,
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
      verified: verification.valid,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
