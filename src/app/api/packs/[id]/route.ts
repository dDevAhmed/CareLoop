import { NextRequest, NextResponse } from 'next/server';
import { getJurisdictionPack } from '@/packs';

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

