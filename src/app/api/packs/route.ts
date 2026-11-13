import { NextRequest, NextResponse } from 'next/server';
import { getAllJurisdictionPacks, getJurisdictionPack } from '@/packs';
import { getActivePackId, setActivePackId } from '@/services/caseRepository';

export async function GET() {
  const activePackId = getActivePackId();
  const packs = getAllJurisdictionPacks();
  return NextResponse.json({
    activePackId,
    packs,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { packId } = body;
    if (!packId || typeof packId !== 'string') {
      return NextResponse.json({ success: false, error: 'packId is required' }, { status: 400 });
    }

    const pack = getJurisdictionPack(packId);
    setActivePackId(pack.id);

    return NextResponse.json({
      success: true,
      activePackId: pack.id,
      pack,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

