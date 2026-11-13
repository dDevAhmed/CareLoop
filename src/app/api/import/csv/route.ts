import { NextRequest, NextResponse } from 'next/server';
import { getStore, getActivePackId, logAuditEvent } from '@/services/caseRepository';
import { getJurisdictionPack } from '@/packs';
import { importScreeningResultsCsv } from '@/engine/csvImporter';
import { UserRole } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const packId = request.nextUrl.searchParams.get('pack') || getActivePackId();
    const store = getStore(packId);
    const pack = getJurisdictionPack(packId);
    const contentType = request.headers.get('content-type') || '';

    let csvContent = '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      if (!file) {
        return NextResponse.json({ error: 'No file provided in form-data' }, { status: 400 });
      }
      csvContent = await file.text();
    } else {
      csvContent = await request.text();
    }

    if (!csvContent || csvContent.trim().length === 0) {
      return NextResponse.json({ error: 'Empty CSV payload' }, { status: 400 });
    }

    // Build set of existing composite keys (externalPatientId:resultId)
    const existingPairs = new Set<string>();
    for (const c of store.cases.values()) {
      const p = store.patients.get(c.patientId);
      if (p) {
        existingPairs.add(`${p.externalPatientId}:${c.screeningResultId}`);
      }
    }

    const defaultPathwayId = pack.pathways[0]?.id;
    const report = importScreeningResultsCsv(csvContent, existingPairs, { defaultPathwayId });

    const actorId = (request.headers.get('x-user-id') || 'SYS-IMPORT') as string;
    const actorRole = (request.headers.get('x-user-role') || 'PROGRAMME_ANALYST') as UserRole;

    // Persist valid records to in-memory store
    for (const item of report.validRecords) {
      store.patients.set(item.patient.id, item.patient);
      store.cases.set(item.caseItem.id, item.caseItem);

      logAuditEvent(actorId, actorRole, 'CSV_CASE_INGESTED', 'Case', item.caseItem.id, {
        externalPatientId: item.patient.externalPatientId,
        screeningResultId: item.caseItem.screeningResultId,
        pathwayId: item.caseItem.pathwayId,
      }, packId);
    }

    return NextResponse.json({
      success: true,
      report: {
        totalRows: report.totalRows,
        successfulCount: report.successfulCount,
        duplicateCount: report.duplicateCount,
        invalidCount: report.invalidCount,
        duplicates: report.duplicates,
        errors: report.errors,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
