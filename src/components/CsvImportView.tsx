import React, { useState } from 'react';

interface CsvImportViewProps {
  onImportComplete?: () => void;
}

export function CsvImportView({ onImportComplete }: CsvImportViewProps) {
  const [csvText, setCsvText] = useState<string>(
    `external_patient_id,result_id,full_name,date_of_birth,gender,language,nationality_group,emirate,phone,screening_type,screening_date,pathway_id,urgency\nDOH-99001,RES-99001,Rashid Al-Falasi,1973-04-18,MALE,ar,EMIRATI,Abu Dhabi,+15559998877,FIT_POSITIVE,2026-08-10,colorectal-uae,ROUTINE\nDOH-99002,RES-99002,Emily Watson,1981-11-05,FEMALE,en,WESTERN_EXPAT,Abu Dhabi,+15558887766,MAMMOGRAPHY_SUSPICIOUS,2026-08-11,breast-abudhabi,CRITICAL`
  );
  const [importReport, setImportReport] = useState<any>(null);
  const [importing, setImporting] = useState<boolean>(false);

  async function handleImport() {
    setImporting(true);
    setImportReport(null);
    try {
      const res = await fetch('/api/import/csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvText }),
      });
      const data = await res.json();
      setImportReport(data);
      onImportComplete?.();
    } catch (err) {
      console.error('Import failed', err);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-cl-ink tracking-tight">
          Batch CSV Screening Result Ingestion
        </h2>
        <p className="text-sm text-cl-muted">
          Import laboratory and ambulatory clinic screening rosters. Validates columns against active pack schemas and initiates tracking.
        </p>
      </div>

      <div className="bg-white p-5 rounded-cl-md border border-cl-border shadow-sm space-y-4">
        <div>
          <label className="text-xs font-bold text-cl-muted uppercase tracking-wider block mb-1">
            CSV Input (Synthetic Laboratory Feed)
          </label>
          <textarea
            rows={8}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            className="w-full p-3 font-mono text-xs bg-cl-page-bg border border-cl-border rounded-cl-sm text-cl-ink focus:outline-none focus:ring-1 focus:ring-cl-teal"
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-cl-muted">
            Header must include: <code className="font-mono text-cl-ink font-semibold">external_patient_id, screening_type, pathway_id, urgency</code>
          </span>
          <button
            onClick={handleImport}
            disabled={importing || !csvText.trim()}
            className="px-4 py-2 bg-cl-deep-teal hover:bg-cl-teal text-white rounded-cl-sm font-bold text-xs transition-colors shadow-sm disabled:opacity-50"
          >
            {importing ? 'Processing & Validating...' : 'Ingest Batch Records'}
          </button>
        </div>
      </div>

      {importReport && (
        <div className="bg-white p-5 rounded-cl-md border border-cl-border shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-cl-border pb-2">
            <h3 className="text-sm font-extrabold text-cl-ink">
              Batch Ingestion Report
            </h3>
            <span
              className={`px-2 py-0.5 rounded text-xs font-bold ${
                importReport.success
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-cl-alert-tint text-cl-alert-text'
              }`}
            >
              {importReport.importedCases?.length || 0} Cases Ingested
            </span>
          </div>

          {importReport.errors?.length > 0 && (
            <div className="p-3 bg-cl-alert-tint rounded-cl-sm text-xs text-cl-alert-text space-y-1">
              <div className="font-bold">Validation Errors:</div>
              {importReport.errors.map((err: string, i: number) => (
                <div key={i}>• {err}</div>
              ))}
            </div>
          )}

          {importReport.importedCases?.length > 0 && (
            <div className="space-y-1 text-xs">
              <div className="font-semibold text-cl-ink">Ingested Case Numbers:</div>
              <div className="font-mono text-cl-muted truncate">
                {importReport.importedCases.map((c: any) => c.caseNumber).join(', ')}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

