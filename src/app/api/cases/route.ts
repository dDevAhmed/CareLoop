import { NextRequest, NextResponse } from 'next/server';
import { getStore, logAuditEvent } from '@/services/caseRepository';
import { Case, UserRole } from '@/types';
import { computeMetricSummary } from '@/engine/metricsEngine';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const pathway = searchParams.get('pathway');
  const state = searchParams.get('state');
  const urgency = searchParams.get('urgency');
  const overdueOnly = searchParams.get('overdue') === 'true';
  const search = searchParams.get('search')?.toLowerCase().trim();
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const packId = searchParams.get('pack') || undefined;

  const store = getStore(packId);
  let caseList = Array.from(store.cases.values());

  // Attach populated patient
  caseList = caseList.map((c) => ({
    ...c,
    patient: store.patients.get(c.patientId) || c.patient,
  }));

  // Filter by pathway
  if (pathway && pathway !== 'all') {
    caseList = caseList.filter((c) => c.pathwayId === pathway);
  }

  // Filter by state
  if (state && state !== 'all') {
    caseList = caseList.filter((c) => c.currentState === state);
  }

  // Filter by urgency
  if (urgency && urgency !== 'all') {
    caseList = caseList.filter((c) => c.urgency === urgency);
  }

  // Filter by overdue
  if (overdueOnly) {
    caseList = caseList.filter((c) => c.isOverdue);
  }

  // Filter by search query
  if (search) {
    caseList = caseList.filter((c) => {
      const matchCaseNumber = c.caseNumber.toLowerCase().includes(search);
      const matchResultId = c.screeningResultId.toLowerCase().includes(search);
      const patient = c.patient;
      const matchPatientName = patient?.fullName.toLowerCase().includes(search);
      const matchPatientArabic = patient?.fullNameArabic?.includes(search);
      const matchExternalId = patient?.externalPatientId.toLowerCase().includes(search);
      return matchCaseNumber || matchResultId || matchPatientName || matchPatientArabic || matchExternalId;
    });
  }

  const total = caseList.length;
  const startIndex = (page - 1) * limit;
  const paginatedCases = caseList.slice(startIndex, startIndex + limit);

  // Compute summary for this filtered cohort
  const metrics = computeMetricSummary(caseList);

  return NextResponse.json({
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    metrics,
    cases: paginatedCases,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const store = getStore();

    const actorId = (request.headers.get('x-user-id') || body.actorId || 'SYS-API') as string;
    const actorRole = (request.headers.get('x-user-role') || body.actorRole || 'NAVIGATOR') as UserRole;

    const newCase: Case = {
      ...body.caseItem,
      id: body.caseItem.id || `CASE-${Date.now()}`,
      synthetic: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.cases.set(newCase.id, newCase);

    if (body.patient) {
      store.patients.set(body.patient.id, body.patient);
    }

    logAuditEvent(actorId, actorRole, 'MANUAL_CASE_INGESTED', 'Case', newCase.id, {
      caseNumber: newCase.caseNumber,
      pathwayId: newCase.pathwayId,
    });

    return NextResponse.json({ success: true, case: newCase }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

