import { NextRequest, NextResponse } from 'next/server';
import { getStore, getActivePackId } from '@/services/caseRepository';
import { generateMockPatientToken, getPatientFromToken } from '@/services/patientAuth';

export async function GET(request: NextRequest) {
  const token = request.headers.get('x-patient-token') || request.nextUrl.searchParams.get('token');
  const packId = request.nextUrl.searchParams.get('pack') || getActivePackId();

  if (!token) {
    // Provide a list of sample synthetic patients for easy demo switching
    const store = getStore(packId);
    const samplePatients = Array.from(store.patients.values()).slice(0, 10).map((p) => ({
      id: p.id,
      externalPatientId: p.externalPatientId,
      fullName: p.fullName,
      fullNameArabic: p.fullNameArabic,
      gender: p.gender,
      language: p.language,
      token: generateMockPatientToken(p),
      caseCount: Array.from(store.cases.values()).filter((c) => c.patientId === p.id).length,
    }));

    return NextResponse.json({
      authenticated: false,
      samplePatients,
    });
  }

  const patient = getPatientFromToken(token, packId);
  if (!patient) {
    return NextResponse.json({ authenticated: false, error: 'Invalid or expired patient token' }, { status: 401 });
  }

  const store = getStore(packId);
  const patientCases = Array.from(store.cases.values()).filter((c) => c.patientId === patient.id);

  return NextResponse.json({
    authenticated: true,
    patient,
    token: generateMockPatientToken(patient),
    cases: patientCases,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { externalPatientId, patientId, pack } = body;
    const packId = pack || getActivePackId();
    const store = getStore(packId);

    let patient = null;
    if (patientId) {
      patient = store.patients.get(patientId);
    } else if (externalPatientId) {
      patient = Array.from(store.patients.values()).find(
        (p) => p.externalPatientId.toLowerCase() === externalPatientId.toLowerCase().trim()
      );
    }

    if (!patient) {
      // Pick first available patient if demo requested without specific ID
      patient = Array.from(store.patients.values())[0];
    }

    if (!patient) {
      return NextResponse.json({ success: false, error: 'Patient not found in repository' }, { status: 404 });
    }

    const token = generateMockPatientToken(patient);
    const patientCases = Array.from(store.cases.values()).filter((c) => c.patientId === patient.id);

    return NextResponse.json({
      success: true,
      token,
      patient,
      cases: patientCases,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
