import React from 'react';
import { Case, JurisdictionPack } from '../types';
import { formatHumanLabel } from '../utils/formatters';

interface ReferralsViewProps {
  cases: Case[];
  activePack: JurisdictionPack | null;
  onOpenCaseModal: (caseItem: Case) => void;
  onQuickAction: (caseItem: Case, actionType: string) => void;
}

export function ReferralsView({
  cases,
  activePack,
  onOpenCaseModal,
  onQuickAction,
}: ReferralsViewProps) {
  // Cases with active referrals
  const referralCases = cases.filter(
    (c) =>
      c.milestones?.referralCreatedAt ||
      c.currentState === 'REFERRAL_SENT' ||
      c.currentState === 'REFERRAL_ACCEPTED' ||
      c.currentState === 'REJECTED'
  );

  const rejectedCases = referralCases.filter((c) => c.currentState === 'REJECTED');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-cl-ink tracking-tight">
            Specialist Referral &amp; Diagnostic Transfer Management
          </h2>
          <p className="text-sm text-cl-muted">
            Monitors end-to-end referral dispatch, receiving facility acceptance, and instant interception of rejections.
          </p>
        </div>
      </div>

      {/* Rejected Referral Interception Alert */}
      {rejectedCases.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-cl-md flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-base">⚠</span>
            <div>
              <span className="font-extrabold text-amber-900">
                {rejectedCases.length} Referrals Require Immediate Reassignment!
              </span>
              <p className="text-amber-800 mt-0.5">
                Receiving diagnostic centers rejected these referrals due to capacity constraints. CareLoop has intercepted these drop-offs.
              </p>
            </div>
          </div>
          <button
            onClick={() => onQuickAction(rejectedCases[0], 'REASSIGN')}
            className="px-3 py-1.5 bg-amber-800 text-white rounded-cl-sm font-bold hover:bg-amber-900 transition-colors"
          >
            Reassign First Case
          </button>
        </div>
      )}

      {/* Referrals Table */}
      <div className="bg-white rounded-cl-md border border-cl-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-cl-border bg-cl-page-bg font-semibold text-cl-muted uppercase tracking-wider">
                <th className="py-3 px-3">Patient</th>
                <th className="py-3 px-3">Case #</th>
                <th className="py-3 px-3">Pathway</th>
                <th className="py-3 px-3">Diagnostic Target</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Sent Milestone</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cl-border">
              {referralCases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-cl-muted text-sm">
                    No active referrals found in the selected cohort.
                  </td>
                </tr>
              ) : (
                referralCases.slice(0, 20).map((c) => {
                  const isRejected = c.currentState === 'REJECTED';
                  const isAccepted = !!c.milestones?.referralAcceptedAt;

                  return (
                    <tr key={c.id} className="hover:bg-cl-page-bg/50 transition-colors">
                      <td className="py-3 px-3 font-semibold text-cl-ink">
                        <div dir="auto">
                          {c.patient?.fullNameArabic && c.patient.language === 'ar'
                            ? c.patient.fullNameArabic
                            : c.patient?.fullName}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono text-cl-muted">{c.caseNumber}</td>
                      <td className="py-3 px-3 text-cl-muted">
                        {formatHumanLabel(c.pathwayId, activePack)}
                      </td>
                      <td className="py-3 px-3 text-cl-ink">
                        Central Endoscopy &amp; Diagnostic Pavilion
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            isRejected
                              ? 'bg-cl-alert-tint text-cl-alert-text'
                              : isAccepted
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isRejected
                            ? 'REJECTED (CAPACITY)'
                            : isAccepted
                            ? 'ACCEPTED'
                            : 'PENDING ACCEPTANCE'}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-cl-muted">
                        {c.milestones?.referralCreatedAt
                          ? new Date(c.milestones.referralCreatedAt).toLocaleDateString()
                          : 'In queue'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => onOpenCaseModal(c)}
                          className="px-2.5 py-1 bg-cl-mist text-cl-deep-teal font-semibold rounded-cl-sm hover:bg-cl-teal hover:text-white transition-colors"
                        >
                          {isRejected ? 'Reassign Facility' : 'Manage'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
