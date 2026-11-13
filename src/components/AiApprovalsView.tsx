import React, { useState, useEffect } from 'react';
import { AiApprovalQueueItem, UserRole } from '../types';

interface AiApprovalsViewProps {
  activeRole: UserRole;
  onRefreshCounts?: () => void;
}

export function AiApprovalsView({ activeRole, onRefreshCounts }: AiApprovalsViewProps) {
  const [queue, setQueue] = useState<AiApprovalQueueItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchQueue();
  }, []);

  async function fetchQueue() {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/approval-queue');
      const data = await res.json();
      if (data.items) {
        setQueue(data.items);
        if (data.items.length > 0 && !selectedItemId) {
          setSelectedItemId(data.items[0].id);
          setEditingContent(data.items[0].draftContent);
        }
      }
    } catch (err) {
      console.error('Failed to load AI approval queue', err);
    } finally {
      setLoading(false);
    }
  }

  const selectedItem = queue.find((i) => i.id === selectedItemId) || queue[0];

  async function handleApprove(isEdited: boolean) {
    if (!selectedItem) return;
    try {
      const reviewerId = activeRole === 'CLINICIAN' ? 'DR-FATIMA-01' : 'NAV-LAYLA-02';
      const res = await fetch(`/api/ai/approval-queue/${selectedItem.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewerId,
          reviewerRole: activeRole,
          modifiedContent: isEdited ? editingContent : undefined,
          reviewNotes: isEdited ? 'Clinician modified draft wording prior to dispatch.' : 'Clinician approved standard template draft.',
        }),
      });

      if (res.ok) {
        setActionSuccess(`Approved communication item ${selectedItem.id} for patient dispatch.`);
        setTimeout(() => setActionSuccess(null), 4000);
        fetchQueue();
        onRefreshCounts?.();
      }
    } catch (err) {
      console.error('Failed to approve AI item', err);
    }
  }

  async function handleReject() {
    if (!selectedItem || !rejectionReason.trim()) return;
    try {
      const reviewerId = activeRole === 'CLINICIAN' ? 'DR-FATIMA-01' : 'NAV-LAYLA-02';
      const res = await fetch(`/api/ai/approval-queue/${selectedItem.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewerId,
          reviewerRole: activeRole,
          rejectionReason,
        }),
      });

      if (res.ok) {
        setActionSuccess(`Rejected communication item ${selectedItem.id}. Automated dispatch halted.`);
        setShowRejectModal(false);
        setRejectionReason('');
        setTimeout(() => setActionSuccess(null), 4000);
        fetchQueue();
        onRefreshCounts?.();
      }
    } catch (err) {
      console.error('Failed to reject AI item', err);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header & Safety Notice */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-cl-ink tracking-tight">
            Mandatory AI Human Approval Queue
          </h2>
          <p className="text-sm text-cl-muted">
            All AI-drafted patient communications and clinical summaries require human verification before transmission.
          </p>
        </div>

        <span className="px-3 py-1 bg-cl-alert-tint text-cl-alert-text rounded-full text-xs font-bold border border-cl-coral/30">
          Safety Rule: AI CAN NEVER CLOSE A CASE
        </span>
      </div>

      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-cl-sm text-xs font-semibold">
          ✓ {actionSuccess}
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-cl-muted text-sm">
          Loading pending AI communications queue...
        </div>
      ) : queue.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-cl-md border border-cl-border text-cl-muted space-y-2">
          <div className="text-3xl">✓</div>
          <div className="text-sm font-bold text-cl-ink">Approval Queue is Clear</div>
          <p className="text-xs">No pending AI communications require human clinician review at this time.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Queue List (4 cols) */}
          <div className="lg:col-span-4 bg-white rounded-cl-md border border-cl-border shadow-sm divide-y divide-cl-border overflow-hidden">
            <div className="p-3 bg-cl-page-bg text-xs font-bold text-cl-muted uppercase tracking-wider flex items-center justify-between">
              <span>Pending Review ({queue.length})</span>
              <span className="text-cl-deep-teal font-extrabold">Require Sign-off</span>
            </div>

            <div className="divide-y divide-cl-border max-h-[600px] overflow-y-auto">
              {queue.map((item) => {
                const isSelected = selectedItem?.id === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedItemId(item.id);
                      setEditingContent(item.draftContent);
                    }}
                    className={`p-3.5 cursor-pointer transition-colors text-xs space-y-1 ${
                      isSelected ? 'bg-cl-mist/70 border-l-4 border-cl-deep-teal' : 'hover:bg-cl-page-bg/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-cl-ink">{item.id}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cl-neutral-chip text-cl-ink uppercase">
                        {item.language}
                      </span>
                    </div>
                    <div className="font-semibold text-cl-ink truncate">
                      Case: {item.caseId}
                    </div>
                    <div className="text-cl-muted text-[11px] truncate">
                      Model: {item.generatedByModel}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Side-by-Side Review & Action Panel (8 cols) */}
          {selectedItem && (
            <div className="lg:col-span-8 bg-white rounded-cl-md border border-cl-border shadow-sm p-5 space-y-5">
              <div className="flex items-center justify-between border-b border-cl-border pb-3">
                <div>
                  <h3 className="text-base font-extrabold text-cl-ink">
                    Review Communication Draft: {selectedItem.id}
                  </h3>
                  <p className="text-xs text-cl-muted">
                    Associated Case: <span className="font-mono font-bold text-cl-ink">{selectedItem.caseId}</span> • Target Language: <span className="uppercase font-bold">{selectedItem.language}</span>
                  </p>
                </div>
                <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full">
                  Pending Human Review
                </span>
              </div>

              {/* Side-by-Side: Source Clinical Facts vs Generated Draft */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Source Clinical Facts */}
                <div className="bg-cl-page-bg p-3.5 rounded-cl-sm border border-cl-border space-y-2">
                  <div className="text-xs font-bold text-cl-muted uppercase tracking-wider">
                    Source Clinical Grounding Facts
                  </div>
                  <div className="text-xs text-cl-ink space-y-1">
                    <div>• Screening Test: Confirmed actionable abnormal result</div>
                    <div>• Indicated Confirmatory Procedure: Diagnostic Endoscopy / Mammography</div>
                    <div>• Target SLA: Within jurisdiction clinical deadline</div>
                    <div>• Verified Clinical Grounding: No fabricated findings; plain-language reassurance</div>
                    <div>• Emergency Banner Included: Yes (Static emergency hotline)</div>
                  </div>
                </div>

                {/* Draft Content (Editable by Human Reviewer) */}
                <div className="bg-white p-3.5 rounded-cl-sm border border-cl-border space-y-2">
                  <div className="text-xs font-bold text-cl-muted uppercase tracking-wider flex items-center justify-between">
                    <span>Generated Draft (Human Editable)</span>
                    <span className="text-[10px] text-cl-teal font-medium">Bilingual Template</span>
                  </div>
                  <textarea
                    rows={8}
                    dir={selectedItem.language === 'ar' ? 'rtl' : 'ltr'}
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                    className="w-full p-2.5 bg-cl-page-bg border border-cl-border rounded-cl-sm text-xs font-sans text-cl-ink focus:outline-none focus:ring-1 focus:ring-cl-teal leading-relaxed"
                  />
                </div>
              </div>

              {/* Human Approval Action Controls */}
              <div className="border-t border-cl-border pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="text-xs text-cl-muted">
                  Approving reviewer recorded as: <span className="font-bold text-cl-ink">{activeRole}</span>
                </div>

                <div className="flex items-center space-x-2">
                  {/* Reject Button */}
                  <button
                    onClick={() => setShowRejectModal(true)}
                    className="px-3 py-2 bg-cl-alert-tint text-cl-alert-text hover:bg-red-200 text-xs font-bold rounded-cl-sm transition-colors"
                  >
                    Reject Draft
                  </button>

                  {/* Approve With Edits */}
                  <button
                    onClick={() => handleApprove(true)}
                    className="px-3 py-2 bg-white border border-cl-border text-cl-ink hover:bg-cl-page-bg text-xs font-bold rounded-cl-sm transition-colors"
                  >
                    Edit & Approve
                  </button>

                  {/* Approve As-Is */}
                  <button
                    onClick={() => handleApprove(false)}
                    className="px-4 py-2 bg-cl-deep-teal hover:bg-cl-teal text-white text-xs font-bold rounded-cl-sm transition-colors shadow-sm"
                  >
                    Approve As-Is
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reject Modal with Mandatory Reason */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-cl-navy/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-cl-md border border-cl-border shadow-modal max-w-md w-full p-5 space-y-4">
            <h3 className="text-base font-extrabold text-cl-ink">
              Reject AI Communication Draft
            </h3>
            <p className="text-xs text-cl-muted">
              Please document the clinical or communication rationale for rejection. This is permanently recorded in the cryptographic audit chain.
            </p>

            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Tone too clinical; patient requires direct telephone contact rather than text."
              className="w-full p-2.5 bg-cl-page-bg border border-cl-border rounded-cl-sm text-xs text-cl-ink focus:outline-none focus:ring-1 focus:ring-cl-teal"
            />

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-3 py-1.5 bg-white border border-cl-border text-cl-muted text-xs font-semibold rounded-cl-sm hover:bg-cl-page-bg"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectionReason.trim()}
                className="px-3 py-1.5 bg-cl-alert-text text-white text-xs font-bold rounded-cl-sm hover:opacity-90 disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

