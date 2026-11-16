import { NextRequest, NextResponse } from 'next/server';
import { getJurisdictionPack } from '@/packs';
import { setActivePackId } from '@/services/caseRepository';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const pack = getJurisdictionPack(id);
    return NextResponse.json({ success: true, pack });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 404 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const pack = getJurisdictionPack(id);
    setActivePackId(pack.id);
    return NextResponse.json({
      success: true,
      activePackId: pack.id,
      activePack: pack,
      pack,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
