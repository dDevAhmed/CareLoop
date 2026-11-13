import React, { useState } from 'react';
import {
  Case,
  CaseState,
  UserRole,
  ClosureType,
  AuthorisedAlternativeReason,
  OutreachChannel,
  OutreachOutcome,
  BarrierReason,
  JurisdictionPack,
} from '../types';
import { formatHumanLabel } from '../utils/formatters';
import { CustomDropdown } from './CustomDropdown';

interface CaseDetailModalProps {
  caseDetail: any;
  onClose: () => void;
  activeRole: UserRole;
  activePack: JurisdictionPack | null;
  onRefreshCase: (caseId: string) => void;
}

export function CaseDetailModal({
  caseDetail,
  onClose,
  activeRole,
  activePack,
  onRefreshCase,
}: CaseDetailModalProps) {
  const [activeModalTab, setActiveModalTab] = useState<'overview' | 'actions' | 'consult' | 'timeline'>('overview');

  // Outreach attempt form state
  const [outreachChannel, setOutreachChannel] = useState<OutreachChannel>('CALL');
  const [outreachOutcome, setOutreachOutcome] = useState<OutreachOutcome>('ACKNOWLEDGED');
  const [barrierReason, setBarrierReason] = useState<BarrierReason | ''>('');
  const [outreachNotes, setOutreachNotes] = useState<string>('Patient confirmed appointment logistics.');
  const [outreachSaving, setOutreachSaving] = useState<boolean>(false);

  // Referral action state
  const [referralFacility, setReferralFacility] = useState<string>('Central Endoscopy & Diagnostic Center');
  const [referralSpecialty, setReferralSpecialty] = useState<string>('Diagnostic Gastroenterology');
  const [referralSummary, setReferralSummary] = useState<string>('Positive screening result requires confirmatory diagnostic colonoscopy.');

  // Facility Action
  const [facilityActionType, setFacilityActionType] = useState<'ACCEPT' | 'REJECT'>('ACCEPT');
  const [facilityRejectionReason, setFacilityRejectionReason] = useState<string>('CLINICAL_CAPACITY_EXCEEDED');

  // Appointment & Attendance
  const [appointmentDate, setAppointmentDate] = useState<string>('2026-09-01T09:00:00Z');
  const [appointmentFacility, setAppointmentFacility] = useState<string>('Central Diagnostic Hospital - Suite 4B');

  // Diagnostic Report
  const [diagnosticProcedure, setDiagnosticProcedure] = useState<string>('Colonoscopy with Polypectomy');
  const [diagnosticFindings, setDiagnosticFindings] = useState<string>('12mm sessile polyp identified in sigmoid colon. Complete snare polypectomy performed with clear margins.');
  const [diagnosticDisposition, setDiagnosticDisposition] = useState<string>('TUBULAR_ADENOMA_EXCISED_SURVEILLANCE_3YR');
  const [specimenId, setSpecimenId] = useState<string>('PATH-2026-SIG-8819');

  // Closure Form
  const [closureType, setClosureType] = useState<ClosureType>('CLINICAL_RESOLUTION');
  const [authorisedReason, setAuthorisedReason] = useState<AuthorisedAlternativeReason>('INFORMED_REFUSAL');
  const [clinicalEvidenceRef, setClinicalEvidenceRef] = useState<string>('COLONOSCOPY-REPORT-DOH-2026');
  const [closureNote, setClosureNote] = useState<string>('Diagnostic endoscopy completed and documented.');

  // Consult Message Form
  const [consultScope, setConsultScope] = useState<'PATIENT_TO_CLINICIAN' | 'CLINICIAN_TO_CLINICIAN'>('CLINICIAN_TO_CLINICIAN');
  const [consultText, setConsultText] = useState<string>('');
  const [consultSending, setConsultSending] = useState<boolean>(false);

  // Action feedback
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const c: Case = caseDetail.case;
  const p = caseDetail.patient;

  async function handleLogOutreach() {
    setOutreachSaving(true);
    setActionNotice(null);
    setActionError(null);
    try {
      const res = await fetch(`/api/cases/${c.id}/outreach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: outreachChannel,
          outcome: outreachOutcome,
          barrierReason: barrierReason || undefined,
          notes: outreachNotes,
          byUserId: activeRole === 'CLINICIAN' ? 'DR-FATIMA-01' : 'NAV-LAYLA-02',
          byRole: activeRole,
        }),
      });
      if (res.ok) {
        setActionNotice('Outreach attempt recorded and milestones updated.');
        onRefreshCase(c.id);
      } else {
        const err = await res.json();
        setActionError(err.error || 'Failed to record outreach');
      }
    } catch (e: any) {
      setActionError(e.message);
    } finally {
      setOutreachSaving(false);
    }
  }

  async function handleSendReferral() {
    setActionNotice(null);
    setActionError(null);
    try {
      const res = await fetch(`/api/cases/${c.id}/referral`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientFacility: referralFacility,
          specialty: referralSpecialty,
          clinicalSummary: referralSummary,
          requestedBy: activeRole === 'CLINICIAN' ? 'DR-FATIMA-01' : 'NAV-LAYLA-02',
          requestedRole: activeRole,
        }),
      });
      if (res.ok) {
        setActionNotice('Specialist referral sent successfully.');
        onRefreshCase(c.id);
      } else {
        const err = await res.json();
        setActionError(err.error || 'Failed to send referral');
      }
    } catch (e: any) {
      setActionError(e.message);
    }
  }

  async function handleFacilityAction() {
    setActionNotice(null);
    setActionError(null);
    try {
      const res = await fetch(`/api/cases/${c.id}/referral/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: facilityActionType,
          rejectionReason: facilityActionType === 'REJECT' ? facilityRejectionReason : undefined,
          actorId: 'FACILITY-COORD-01',
          actorRole: 'CLINICIAN',
        }),
      });
      if (res.ok) {
        setActionNotice(`Facility action ${facilityActionType} processed.`);
        onRefreshCase(c.id);
      } else {
        const err = await res.json();
        setActionError(err.error || 'Failed to process facility action');
      }
    } catch (e: any) {
      setActionError(e.message);
    }
  }

  async function handleBookAppointment() {
    setActionNotice(null);
    setActionError(null);
    try {
      const res = await fetch(`/api/cases/${c.id}/appointment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduledDate: appointmentDate,
          facilityName: appointmentFacility,
          bookedBy: activeRole === 'CLINICIAN' ? 'DR-FATIMA-01' : 'NAV-LAYLA-02',
          bookedRole: activeRole,
        }),
      });
      if (res.ok) {
        setActionNotice('Procedural appointment booked.');
        onRefreshCase(c.id);
      } else {
        const err = await res.json();
        setActionError(err.error || 'Failed to book appointment');
      }
    } catch (e: any) {
      setActionError(e.message);
    }
  }

  async function handleMarkAttended() {
    setActionNotice(null);
    setActionError(null);
    try {
      const res = await fetch(`/api/cases/${c.id}/attend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendedAt: new Date().toISOString(),
          actorId: activeRole === 'CLINICIAN' ? 'DR-FATIMA-01' : 'NAV-LAYLA-02',
          actorRole: activeRole,
        }),
      });
      if (res.ok) {
        setActionNotice('Patient attendance confirmed.');
        onRefreshCase(c.id);
      } else {
        const err = await res.json();
        setActionError(err.error || 'Failed to mark attendance');
      }
    } catch (e: any) {
      setActionError(e.message);
    }
  }

  async function handleUploadDiagnosticReport() {
    setActionNotice(null);
    setActionError(null);
    try {
      const res = await fetch(`/api/cases/${c.id}/diagnostic-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          procedureName: diagnosticProcedure,
          findings: diagnosticFindings,
          diagnosticDisposition,
          specimenId,
          documentedBy: 'DR-FATIMA-01',
          documentedRole: 'CLINICIAN',
        }),
      });
      if (res.ok) {
        setActionNotice('Diagnostic report and disposition documented.');
        onRefreshCase(c.id);
      } else {
        const err = await res.json();
        setActionError(err.error || 'Failed to document diagnostic report');
      }
    } catch (e: any) {
      setActionError(e.message);
    }
  }

  async function handleCloseCase(closureAction: 'CLINICAL' | 'AUTHORISE_ALTERNATIVE' | 'REQUEST_ALTERNATIVE') {
    setActionNotice(null);
    setActionError(null);
    try {
      let body: any = {};
      if (closureAction === 'CLINICAL') {
        body = {
          closureType: 'CLINICAL_RESOLUTION',
          clinicalEvidenceRef,
          closureNote,
          authoriserId: 'DR-FATIMA-01',
          authoriserRole: 'CLINICIAN',
          authoriserName: 'Dr. Fatima Al-Zahra',
        };
      } else if (closureAction === 'AUTHORISE_ALTERNATIVE') {
        body = {
          closureType: 'AUTHORISED_ALTERNATIVE',
          authorisedReason,
          closureNote,
          authoriserId: 'DR-FATIMA-01',
          authoriserRole: 'CLINICIAN',
          authoriserName: 'Dr. Fatima Al-Zahra',
        };
      } else {
        body = {
          requestOnly: true,
          requestedReason: authorisedReason,
          requestedNote: closureNote,
          requesterId: 'NAV-LAYLA-02',
          requesterRole: 'NAVIGATOR',
          requesterName: 'Navigator Layla',
        };
      }

      const res = await fetch(`/api/cases/${c.id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setActionNotice(
          closureAction === 'REQUEST_ALTERNATIVE'
            ? 'Alternative closure request queued for Clinician authorization.'
            : 'Case officially closed with documented evidence.'
        );
        onRefreshCase(c.id);
      } else {
        const err = await res.json();
        setActionError(err.error || 'Closure failed');
      }
    } catch (e: any) {
      setActionError(e.message);
    }
  }

  async function handleSendConsult() {
    if (!consultText.trim()) return;
    setConsultSending(true);
    try {
      const res = await fetch(`/api/cases/${c.id}/consult`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderRole: activeRole,
          senderName: activeRole === 'CLINICIAN' ? 'Dr. Fatima' : 'Navigator Layla',
          scope: consultScope,
          messageText: consultText,
        }),
      });
      if (res.ok) {
        setConsultText('');
        onRefreshCase(c.id);
      }
    } catch (err) {
      console.error('Failed to send consult', err);
    } finally {
      setConsultSending(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-cl-navy/60 backdrop-blur-sm z-50 flex justify-end">
      <div className="w-full max-w-3xl bg-white h-full shadow-drawer overflow-y-auto flex flex-col">
        {/* Modal Header */}
        <div className="p-5 bg-cl-navy text-white flex justify-between items-start">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-mono font-extrabold text-white">
                {c.caseNumber}
              </span>
              {c.urgency === 'CRITICAL' && (
                <span className="px-2 py-0.5 rounded bg-cl-coral text-white text-[10px] font-extrabold">
                  CRITICAL
                </span>
              )}
              <span className="px-2 py-0.5 rounded bg-cl-mist text-cl-deep-teal text-[10px] font-bold">
                {formatHumanLabel(c.currentState, activePack)}
              </span>
              {c.isOverdue && (
                <span className="px-2 py-0.5 rounded bg-cl-alert-text text-white text-[10px] font-bold">
                  OVERDUE
                </span>
              )}
            </div>
            <p className="text-xs text-cl-border mt-1 font-mono">
              Result ID: {c.screeningResultId} • Test: {c.screeningTestType} • Deadline: {new Date(c.clinicalDeadline).toLocaleDateString()}
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-sm"
          >
            ✕
          </button>
        </div>

        {/* Modal Subtabs */}
        <div className="bg-cl-page-bg border-b border-cl-border px-6 flex space-x-4 text-xs font-semibold">
          {[
            { id: 'overview', label: 'Overview & Milestones' },
            { id: 'actions', label: 'Clinical Actions (RBAC)' },
            { id: 'consult', label: `Consult Thread (${caseDetail.consultMessages?.length || 0})` },
            { id: 'timeline', label: `Timeline (${caseDetail.events?.length || 0})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveModalTab(tab.id as any)}
              className={`py-3 border-b-2 transition-colors ${
                activeModalTab === tab.id
                  ? 'border-cl-deep-teal text-cl-deep-teal font-extrabold'
                  : 'border-transparent text-cl-muted hover:text-cl-ink'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Action Notice & Error Banners */}
        {actionNotice && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-cl-sm">
            ✓ {actionNotice}
          </div>
        )}
        {actionError && (
          <div className="mx-6 mt-4 p-3 bg-cl-alert-tint border border-cl-coral/30 text-cl-alert-text text-xs font-semibold rounded-cl-sm">
            ⚠ {actionError}
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 space-y-6 flex-1 text-xs">
          {/* SUBTAB 1: OVERVIEW & MILESTONES */}
          {activeModalTab === 'overview' && (
            <div className="space-y-6">
              {/* Patient Card */}
              <div className="p-4 bg-cl-page-bg border border-cl-border rounded-cl-sm space-y-2">
                <div className="flex justify-between items-center">
                  <h4 dir="auto" className="font-extrabold text-cl-ink text-sm">
                    {p?.fullNameArabic && p.language === 'ar' ? p.fullNameArabic : p?.fullName}
                  </h4>
                  <span className="font-mono text-cl-deep-teal font-bold">{p?.externalPatientId}</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-cl-muted text-[11px]">
                  <div>DOB: {p?.dateOfBirth}</div>
                  <div>Gender: {p?.gender}</div>
                  <div>Language: {p?.language?.toUpperCase()}</div>
                  <div>Phone: {p?.phone}</div>
                  <div>SMS Consent: {p?.consentFlags?.smsConsent ? '✓ Yes' : '✗ No'}</div>
                  <div>Data-Sharing: {p?.consentFlags?.dataSharingConsent ? '✓ Yes' : '✗ Denied'}</div>
                </div>
              </div>

              {/* 8 Closed-Loop Milestones */}
              <div className="space-y-2">
                <h4 className="font-bold text-cl-muted uppercase text-[11px] tracking-wide">
                  8 Closed-Loop Pathway Milestones (Timestamped Audit)
                </h4>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className={`p-2 rounded border ${c.milestones.notificationDeliveredAt ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-cl-page-bg text-cl-muted border-cl-border'}`}>
                    1. Notification Delivered: {c.milestones.notificationDeliveredAt?.substring(0, 16) || 'Pending'}
                  </div>
                  <div className={`p-2 rounded border ${c.milestones.acknowledgedAt ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-cl-page-bg text-cl-muted border-cl-border'}`}>
                    2. Acknowledged: {c.milestones.acknowledgedAt?.substring(0, 16) || 'Pending'}
                  </div>
                  <div className={`p-2 rounded border ${c.milestones.understandingConfirmedAt ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-cl-page-bg text-cl-muted border-cl-border'}`}>
                    3. Understanding Confirmed: {c.milestones.understandingConfirmedAt?.substring(0, 16) || 'Pending'}
                  </div>
                  <div className={`p-2 rounded border ${c.milestones.referralCreatedAt ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-cl-page-bg text-cl-muted border-cl-border'}`}>
                    4. Referral Sent: {c.milestones.referralCreatedAt?.substring(0, 16) || 'Pending'}
                  </div>
                  <div className={`p-2 rounded border ${c.milestones.referralAcceptedAt ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-cl-page-bg text-cl-muted border-cl-border'}`}>
                    5. Referral Accepted: {c.milestones.referralAcceptedAt?.substring(0, 16) || 'Pending'}
                  </div>
                  <div className={`p-2 rounded border ${c.milestones.appointmentBookedAt ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-cl-page-bg text-cl-muted border-cl-border'}`}>
                    6. Appointment Booked: {c.milestones.appointmentBookedAt?.substring(0, 16) || 'Pending'}
                  </div>
                  <div className={`p-2 rounded border ${c.milestones.attendedAt ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-cl-page-bg text-cl-muted border-cl-border'}`}>
                    7. Attended: {c.milestones.attendedAt?.substring(0, 16) || 'Pending'}
                  </div>
                  <div className={`p-2 rounded border ${c.milestones.diagnosticDispositionDocumentedAt ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-cl-page-bg text-cl-muted border-cl-border'}`}>
                    8. Disposition Documented: {c.milestones.diagnosticDispositionDocumentedAt?.substring(0, 16) || 'Pending'}
                  </div>
                </div>
              </div>

              {/* Log Outreach Form */}
              <div className="p-4 border border-cl-border rounded-cl-sm space-y-3 bg-white">
                <h4 className="font-bold text-cl-muted uppercase text-[11px] tracking-wide">
                  Log New Navigator Outreach Attempt
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <CustomDropdown
                    value={outreachChannel}
                    onChange={(val) => setOutreachChannel(val as OutreachChannel)}
                    options={[
                      { value: 'CALL', label: 'Telephone Call' },
                      { value: 'SMS', label: 'SMS Text' },
                      { value: 'WHATSAPP', label: 'WhatsApp' },
                      { value: 'CLINICIAN', label: 'Clinician Direct' },
                    ]}
                    variant="light"
                    size="sm"
                    width="w-full"
                  />

                  <CustomDropdown
                    value={outreachOutcome}
                    onChange={(val) => setOutreachOutcome(val as OutreachOutcome)}
                    options={[
                      { value: 'ACKNOWLEDGED', label: 'Acknowledged' },
                      { value: 'DELIVERED', label: 'Delivered (No Answer)' },
                      { value: 'NO_ANSWER', label: 'No Answer' },
                      { value: 'FAILED', label: 'Failed / Wrong Number' },
                    ]}
                    variant="light"
                    size="sm"
                    width="w-full"
                  />

                  <CustomDropdown
                    value={barrierReason}
                    onChange={(val) => setBarrierReason(val as BarrierReason)}
                    options={[
                      { value: '', label: 'No Barrier Encountered' },
                      { value: 'FEAR_ANXIETY', label: 'Fear / Anxiety' },
                      { value: 'APPOINTMENT_UNAVAILABLE', label: 'Appointment Unavailable' },
                      { value: 'TRANSPORT', label: 'Transport Difficulties' },
                      { value: 'LOW_HEALTH_LITERACY', label: 'Low Health Literacy' },
                      { value: 'COMMUNICATION_FAILURE', label: 'Communication / Language' },
                      { value: 'COST_INSURANCE', label: 'Insurance / Cost' },
                      { value: 'COMPETING_PRIORITIES', label: 'Work / Priorities' },
                    ]}
                    variant="light"
                    size="sm"
                    width="w-full"
                  />
                </div>

                <input
                  type="text"
                  value={outreachNotes}
                  onChange={(e) => setOutreachNotes(e.target.value)}
                  placeholder="Notes on conversation..."
                  className="w-full p-2 border border-cl-border rounded text-xs bg-cl-page-bg text-cl-ink"
                />

                <button
                  onClick={handleLogOutreach}
                  disabled={outreachSaving}
                  className="px-4 py-2 bg-cl-deep-teal hover:bg-cl-teal text-white rounded text-xs font-bold transition-colors"
                >
                  {outreachSaving ? 'Recording...' : 'Save Outreach Attempt'}
                </button>
              </div>
            </div>
          )}

          {/* SUBTAB 2: CLINICAL ACTIONS (RBAC) */}
          {activeModalTab === 'actions' && (
            <div className="space-y-6">
              {/* Action 1: Send Specialist Referral */}
              <div className="p-4 border border-cl-border rounded-cl-sm bg-white space-y-3">
                <h4 className="font-bold text-cl-ink text-sm">1. Specialist Referral Dispatch</h4>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={referralFacility}
                    onChange={(e) => setReferralFacility(e.target.value)}
                    placeholder="Receiving Facility..."
                    className="p-2 border border-cl-border rounded text-xs text-cl-ink"
                  />
                  <input
                    type="text"
                    value={referralSpecialty}
                    onChange={(e) => setReferralSpecialty(e.target.value)}
                    placeholder="Specialty..."
                    className="p-2 border border-cl-border rounded text-xs text-cl-ink"
                  />
                </div>
                <button
                  onClick={handleSendReferral}
                  className="px-4 py-1.5 bg-cl-navy text-white rounded text-xs font-bold hover:bg-cl-deep-teal"
                >
                  Dispatch Referral
                </button>
              </div>

              {/* Action 2: Simulate Receiving Facility Action */}
              <div className="p-4 border border-cl-border rounded-cl-sm bg-cl-page-bg space-y-3">
                <h4 className="font-bold text-cl-ink text-sm">2. Facility Coordination (Accept / Reject)</h4>
                <div className="flex items-center space-x-3">
                  <label className="flex items-center space-x-1 font-semibold text-cl-ink">
                    <input
                      type="radio"
                      checked={facilityActionType === 'ACCEPT'}
                      onChange={() => setFacilityActionType('ACCEPT')}
                    />
                    <span>Accept Referral</span>
                  </label>
                  <label className="flex items-center space-x-1 font-semibold text-cl-alert-text">
                    <input
                      type="radio"
                      checked={facilityActionType === 'REJECT'}
                      onChange={() => setFacilityActionType('REJECT')}
                    />
                    <span>Reject Referral (Capacity Exceeded)</span>
                  </label>
                </div>
                <button
                  onClick={handleFacilityAction}
                  className="px-4 py-1.5 bg-cl-deep-teal text-white rounded text-xs font-bold hover:bg-cl-teal"
                >
                  Submit Facility Decision
                </button>
              </div>

              {/* Action 3: Appointment Booking & Attendance */}
              <div className="p-4 border border-cl-border rounded-cl-sm bg-white space-y-3">
                <h4 className="font-bold text-cl-ink text-sm">3. Procedural Appointment &amp; Attendance</h4>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={appointmentFacility}
                    onChange={(e) => setAppointmentFacility(e.target.value)}
                    placeholder="Facility Suite..."
                    className="p-2 border border-cl-border rounded text-xs text-cl-ink"
                  />
                  <input
                    type="datetime-local"
                    value={appointmentDate.substring(0, 16)}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                    className="p-2 border border-cl-border rounded text-xs text-cl-ink"
                  />
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={handleBookAppointment}
                    className="px-3 py-1.5 bg-cl-navy text-white rounded text-xs font-bold hover:bg-cl-deep-teal"
                  >
                    Book Appointment
                  </button>
                  <button
                    onClick={handleMarkAttended}
                    className="px-3 py-1.5 bg-emerald-700 text-white rounded text-xs font-bold hover:bg-emerald-800"
                  >
                    Mark Attended
                  </button>
                </div>
              </div>

              {/* Action 4: Diagnostic Report Upload */}
              <div className="p-4 border border-cl-border rounded-cl-sm bg-white space-y-3">
                <h4 className="font-bold text-cl-ink text-sm">4. Diagnostic Report &amp; Disposition Filing</h4>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={diagnosticProcedure}
                    onChange={(e) => setDiagnosticProcedure(e.target.value)}
                    placeholder="Procedure Name..."
                    className="p-2 border border-cl-border rounded text-xs text-cl-ink"
                  />
                  <input
                    type="text"
                    value={specimenId}
                    onChange={(e) => setSpecimenId(e.target.value)}
                    placeholder="Specimen ID..."
                    className="p-2 border border-cl-border rounded text-xs text-cl-ink"
                  />
                </div>
                <textarea
                  rows={2}
                  value={diagnosticFindings}
                  onChange={(e) => setDiagnosticFindings(e.target.value)}
                  placeholder="Procedure findings..."
                  className="w-full p-2 border border-cl-border rounded text-xs text-cl-ink"
                />
                <button
                  onClick={handleUploadDiagnosticReport}
                  className="px-4 py-1.5 bg-cl-deep-teal text-white rounded text-xs font-bold hover:bg-cl-teal"
                >
                  File Diagnostic Report
                </button>
              </div>

              {/* Action 5: Case Closure */}
              <div className="p-4 border border-cl-border rounded-cl-sm bg-cl-page-bg space-y-3">
                <h4 className="font-bold text-cl-ink text-sm">5. Closed-Loop Case Closure</h4>
                <div className="space-y-2">
                  <div className="flex space-x-3">
                    <label className="flex items-center space-x-1 font-semibold text-cl-ink">
                      <input
                        type="radio"
                        checked={closureType === 'CLINICAL_RESOLUTION'}
                        onChange={() => setClosureType('CLINICAL_RESOLUTION')}
                      />
                      <span>Clinical Resolution (Requires Report)</span>
                    </label>
                    <label className="flex items-center space-x-1 font-semibold text-cl-ink">
                      <input
                        type="radio"
                        checked={closureType === 'AUTHORISED_ALTERNATIVE'}
                        onChange={() => setClosureType('AUTHORISED_ALTERNATIVE')}
                      />
                      <span>Authorised Alternative</span>
                    </label>
                  </div>

                  {closureType === 'CLINICAL_RESOLUTION' ? (
                    <input
                      type="text"
                      value={clinicalEvidenceRef}
                      onChange={(e) => setClinicalEvidenceRef(e.target.value)}
                      placeholder="Evidence Document Reference..."
                      className="w-full p-2 border border-cl-border rounded text-xs bg-white text-cl-ink"
                    />
                  ) : (
                    <CustomDropdown
                      value={authorisedReason}
                      onChange={(val) => setAuthorisedReason(val as any)}
                      options={[
                        { value: 'INFORMED_REFUSAL', label: 'Informed Refusal' },
                        { value: 'TRANSFERRED_CARE', label: 'Transferred Care' },
                        { value: 'DECEASED', label: 'Deceased' },
                        { value: 'OTHER', label: 'Other Authorised Cause' },
                      ]}
                      variant="light"
                      size="sm"
                      width="w-full"
                    />
                  )}

                  <input
                    type="text"
                    value={closureNote}
                    onChange={(e) => setClosureNote(e.target.value)}
                    placeholder="Closure clinical notes..."
                    className="w-full p-2 border border-cl-border rounded text-xs bg-white text-cl-ink"
                  />

                  <div className="pt-2">
                    {activeRole === 'CLINICIAN' ? (
                      <button
                        onClick={() => handleCloseCase(closureType === 'CLINICAL_RESOLUTION' ? 'CLINICAL' : 'AUTHORISE_ALTERNATIVE')}
                        className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-bold"
                      >
                        Authorise &amp; Close Case (Clinician Authority)
                      </button>
                    ) : (
                      <button
                        onClick={() => handleCloseCase('REQUEST_ALTERNATIVE')}
                        className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded text-xs font-bold"
                      >
                        Request Alternative Closure (Requires Clinician Sign-off)
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SUBTAB 3: CONSULT THREAD */}
          {activeModalTab === 'consult' && (
            <div className="space-y-4">
              <div className="p-3 bg-cl-alert-tint text-cl-alert-text rounded-cl-sm text-xs font-semibold">
                Emergency notice: In a life-threatening medical emergency, call emergency services directly.
              </div>

              <div className="space-y-3 max-h-80 overflow-y-auto">
                {caseDetail.consultMessages?.map((msg: any) => (
                  <div key={msg.id} className="p-3 bg-cl-page-bg border border-cl-border rounded-cl-sm space-y-1">
                    <div className="flex justify-between items-center text-[10px] text-cl-muted">
                      <span className="font-bold text-cl-ink">{msg.senderName} ({msg.senderRole})</span>
                      <span>{new Date(msg.sentAt).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-xs text-cl-ink">{msg.messageText}</p>
                  </div>
                ))}
              </div>

              <div className="flex space-x-2 pt-2">
                <input
                  type="text"
                  value={consultText}
                  onChange={(e) => setConsultText(e.target.value)}
                  placeholder="Type message to care team..."
                  className="flex-1 p-2 border border-cl-border rounded text-xs bg-cl-page-bg text-cl-ink"
                />
                <button
                  onClick={handleSendConsult}
                  disabled={consultSending}
                  className="px-4 py-2 bg-cl-deep-teal text-white rounded text-xs font-bold hover:bg-cl-teal"
                >
                  Send
                </button>
              </div>
            </div>
          )}

          {/* SUBTAB 4: TIMELINE */}
          {activeModalTab === 'timeline' && (
            <div className="space-y-3">
              <h4 className="font-bold text-cl-muted uppercase text-[11px] tracking-wide">
                Append-Only State Transition History
              </h4>
              <div className="space-y-2">
                {caseDetail.events?.map((evt: any) => (
                  <div key={evt.id} className="p-3 bg-cl-page-bg border border-cl-border rounded-cl-sm space-y-1 text-xs">
                    <div className="flex justify-between font-mono text-[10px] text-cl-muted">
                      <span>{evt.trigger}</span>
                      <span>{new Date(evt.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center space-x-2 font-semibold text-cl-ink">
                      <span>{formatHumanLabel(evt.fromState, activePack)}</span>
                      <span>→</span>
                      <span className="text-cl-deep-teal font-extrabold">{formatHumanLabel(evt.toState, activePack)}</span>
                    </div>
                    <div className="text-[10px] text-cl-muted">
                      Actor: {evt.ownerRole} ({evt.ownerId})
                      {evt.barrierReason && ` • Barrier: ${formatHumanLabel(evt.barrierReason, activePack)}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

