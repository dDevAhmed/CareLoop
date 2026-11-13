'use client';

import React, { useState, useEffect } from 'react';
import {
  Patient,
  Case,
  ConsultMessage,
  Language,
} from '@/types';
import { PatientResultTemplate, SYNTHETIC_DEMO_FOOTER } from '@/config/patientTemplates';
import { CustomDropdown } from '@/components/CustomDropdown';

export default function PatientPwaPage() {
  const [token, setToken] = useState<string>('');
  const [patient, setPatient] = useState<Patient | null>(null);
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [caseDetail, setCaseDetail] = useState<{
    case: Case;
    patient: Patient;
    template: PatientResultTemplate;
    referral: any;
    appointment: any;
    messages: ConsultMessage[];
    nextStep: { title: string; explanation: string };
    criticalInstruction?: string | null;
  } | null>(null);

  const [samplePatients, setSamplePatients] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'result' | 'tracker' | 'consult' | 'consent' | 'lowbw'>('result');

  // Understanding Quiz state
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);
  const [quizResult, setQuizResult] = useState<{
    passed: boolean;
    score: number;
    total: number;
    attemptNumber: number;
    simplifiedWording?: string | null;
    navigatorCallTaskCreated?: boolean;
    barrierReason?: string;
  } | null>(null);

  // Consult message state
  const [consultInput, setConsultInput] = useState<string>('');
  const [consultMessages, setConsultMessages] = useState<ConsultMessage[]>([]);
  const [sendingMessage, setSendingMessage] = useState<boolean>(false);

  // Consent form state
  const [consentFlags, setConsentFlags] = useState<{
    smsConsent: boolean;
    whatsappConsent: boolean;
    callConsent: boolean;
    dataSharingConsent: boolean;
  }>({
    smsConsent: true,
    whatsappConsent: true,
    callConsent: true,
    dataSharingConsent: true,
  });
  const [consentSavedNotice, setConsentSavedNotice] = useState<string | null>(null);

  // Low bandwidth state
  const [lowBwData, setLowBwData] = useState<any>(null);
  const [smsReplyInput, setSmsReplyInput] = useState<string>('1');
  const [escalationNotice, setEscalationNotice] = useState<string | null>(null);

  // Language & Directionality
  const [lang, setLang] = useState<Language>('en');
  const isRtl = lang === 'ar';

  useEffect(() => {
    fetchInitialAuth();
  }, []);

  async function fetchInitialAuth() {
    setLoading(true);
    try {
      const res = await fetch('/api/patient/auth');
      const data = await res.json();
      if (data.samplePatients && data.samplePatients.length > 0) {
        setSamplePatients(data.samplePatients);
        // Auto-login with first patient for seamless demo
        const first = data.samplePatients[0];
        loginWithPatient(first.token, first.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loginWithPatient(patientToken: string, patientId?: string) {
    setLoading(true);
    try {
      const res = await fetch('/api/patient/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId }),
      });
      const data = await res.json();
      if (data.success) {
        setToken(data.token);
        setPatient(data.patient);
        setCases(data.cases || []);
        if (data.patient.language) {
          setLang(data.patient.language);
        }
        if (data.patient.consentFlags) {
          setConsentFlags({
            smsConsent: data.patient.consentFlags.smsConsent,
            whatsappConsent: data.patient.consentFlags.whatsappConsent,
            callConsent: data.patient.consentFlags.callConsent,
            dataSharingConsent: data.patient.consentFlags.dataSharingConsent,
          });
        }
        if (data.cases && data.cases.length > 0) {
          setSelectedCaseId(data.cases[0].id);
          fetchCaseDetail(data.cases[0].id, data.token);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCaseDetail(caseId: string, currentToken?: string) {
    try {
      const tok = currentToken || token;
      const res = await fetch(`/api/patient/cases/${caseId}`, {
        headers: { 'x-patient-token': tok },
      });
      const data = await res.json();
      if (data.success) {
        setCaseDetail(data);
        setConsultMessages(data.messages || []);
        setSelectedAnswers({});
        setQuizSubmitted(false);
        setQuizResult(null);
        fetchLowBwData(caseId, tok);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleAcknowledge() {
    if (!selectedCaseId) return;
    try {
      const res = await fetch(`/api/patient/cases/${selectedCaseId}/acknowledge`, {
        method: 'POST',
        headers: { 'x-patient-token': token },
      });
      const data = await res.json();
      if (data.success) {
        fetchCaseDetail(selectedCaseId);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleQuizSubmit() {
    if (!caseDetail) return;
    const questions = caseDetail.template.understandingQuestions;
    const answersArray = questions.map((_, i) => selectedAnswers[i] ?? -1);

    try {
      const res = await fetch(`/api/patient/cases/${selectedCaseId}/understanding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-patient-token': token,
        },
        body: JSON.stringify({ answers: answersArray }),
      });
      const data = await res.json();
      if (data.success) {
        setQuizSubmitted(true);
        setQuizResult(data);
        fetchCaseDetail(selectedCaseId);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSendConsultMessage() {
    if (!consultInput.trim() || !selectedCaseId) return;
    setSendingMessage(true);
    try {
      const res = await fetch(`/api/patient/cases/${selectedCaseId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-patient-token': token,
        },
        body: JSON.stringify({ content: consultInput.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setConsultMessages((prev) => [...prev, data.message]);
        setConsultInput('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSendingMessage(false);
    }
  }

  async function handleSaveConsent() {
    if (!selectedCaseId) return;
    try {
      const res = await fetch(`/api/patient/cases/${selectedCaseId}/consent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-patient-token': token,
        },
        body: JSON.stringify(consentFlags),
      });
      const data = await res.json();
      if (data.success) {
        setConsentSavedNotice(
          isRtl ? 'تم حفظ خيارات الموافقة بنجاح.' : 'Consent preferences saved successfully.'
        );
        setTimeout(() => setConsentSavedNotice(null), 4000);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchLowBwData(caseId: string, tok: string) {
    try {
      const res = await fetch(`/api/patient/cases/${caseId}/low-bandwidth`, {
        headers: { 'x-patient-token': tok },
      });
      const data = await res.json();
      if (data.success) {
        setLowBwData(data);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSimulateSmsReply() {
    if (!selectedCaseId) return;
    try {
      const res = await fetch(`/api/patient/cases/${selectedCaseId}/low-bandwidth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-patient-token': token,
        },
        body: JSON.stringify({ action: 'REPLY_SMS', replyText: smsReplyInput }),
      });
      const data = await res.json();
      if (data.success) {
        fetchCaseDetail(selectedCaseId);
        fetchLowBwData(selectedCaseId, token);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSimulateUnacknowledgedWindowExpiry() {
    if (!selectedCaseId) return;
    try {
      const res = await fetch(`/api/patient/cases/${selectedCaseId}/low-bandwidth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-patient-token': token,
        },
        body: JSON.stringify({ action: 'ESCALATE_MISSING_ACKNOWLEDGEMENT' }),
      });
      const data = await res.json();
      if (data.success) {
        setEscalationNotice(data.message);
        fetchLowBwData(selectedCaseId, token);
        fetchCaseDetail(selectedCaseId);
      }
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="min-h-screen bg-slate-100 flex flex-col items-center p-2 sm:p-6"
    >
      {/* Mobile Shell Frame */}
      <div className="w-full max-w-md bg-white min-h-[92vh] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* PWA App Bar */}
        <header className="bg-slate-900 text-white p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-teal-500 text-slate-900 font-bold flex items-center justify-center text-xs">
                CL
              </span>
              <div>
                <h1 className="text-sm font-bold tracking-tight">CareLoop Patient Portal</h1>
                <p className="text-[10px] text-teal-400 font-mono">PWA Mobile Companion</p>
              </div>
            </div>
            {/* Language Switcher */}
            <button
              onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
              className="text-xs bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-md text-teal-300 font-medium"
            >
              {lang === 'en' ? 'العربية (RTL)' : 'English (LTR)'}
            </button>
          </div>

          {/* Quick Mock Patient Switcher */}
          <div className="bg-slate-800/80 p-2 rounded-xl flex items-center justify-between text-xs">
            <div className="truncate">
              <span className="text-slate-400 text-[10px] block">Active Patient Session:</span>
              <strong className="text-white text-xs truncate">
                {isRtl && patient?.fullNameArabic ? patient.fullNameArabic : patient?.fullName || 'Selecting...'}
              </strong>
            </div>
            <CustomDropdown
              value={patient?.id || ''}
              onChange={(val) => {
                const selected = samplePatients.find((p) => p.id === val);
                if (selected) loginWithPatient(selected.token, selected.id);
              }}
              options={samplePatients.map((p) => ({
                value: p.id,
                label: `${p.fullName} (${p.language.toUpperCase()})`,
              }))}
              variant="dark"
              size="sm"
              align="right"
            />
          </div>
        </header>

        {/* Navigation Tabs */}
        <nav
          aria-label="Patient portal navigation tabs"
          className="flex border-b border-slate-200 bg-slate-50 text-[11px] font-semibold"
        >
          <button
            onClick={() => setActiveTab('result')}
            className={`flex-1 py-2.5 text-center transition-colors border-b-2 ${
              activeTab === 'result' ? 'border-teal-600 text-teal-700 bg-white font-bold' : 'border-transparent text-slate-500'
            }`}
          >
            {isRtl ? 'النتيجة والفهم' : 'Result & Quiz'}
          </button>
          <button
            onClick={() => setActiveTab('tracker')}
            className={`flex-1 py-2.5 text-center transition-colors border-b-2 ${
              activeTab === 'tracker' ? 'border-teal-600 text-teal-700 bg-white font-bold' : 'border-transparent text-slate-500'
            }`}
          >
            {isRtl ? 'المسار التالي' : 'Next Steps'}
          </button>
          <button
            onClick={() => setActiveTab('consult')}
            className={`flex-1 py-2.5 text-center transition-colors border-b-2 ${
              activeTab === 'consult' ? 'border-teal-600 text-teal-700 bg-white font-bold' : 'border-transparent text-slate-500'
            }`}
          >
            {isRtl ? 'اسأل الطبيب' : 'Ask Clinician'}
          </button>
          <button
            onClick={() => setActiveTab('consent')}
            className={`flex-1 py-2.5 text-center transition-colors border-b-2 ${
              activeTab === 'consent' ? 'border-teal-600 text-teal-700 bg-white font-bold' : 'border-transparent text-slate-500'
            }`}
          >
            {isRtl ? 'الموافقات' : 'Consent'}
          </button>
          <button
            onClick={() => setActiveTab('lowbw')}
            className={`flex-1 py-2.5 text-center transition-colors border-b-2 ${
              activeTab === 'lowbw' ? 'border-teal-600 text-teal-700 bg-white font-bold' : 'border-transparent text-slate-500'
            }`}
          >
            {isRtl ? 'الرسائل النصية' : 'SMS / Low-BW'}
          </button>
        </nav>

        {/* Tab 1: Result & Understanding Check */}
        {activeTab === 'result' && caseDetail && (
          <div className="flex-1 p-4 space-y-4 overflow-y-auto text-xs">
            {/* Urgent / Critical Contact Instruction */}
            {caseDetail.case.urgency === 'CRITICAL' && (
              <div className="p-3 bg-red-50 border-2 border-red-500 rounded-2xl space-y-2 text-red-900 shadow-sm animate-pulse">
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wide text-red-700">
                  <span>🚨</span> Urgent Priority Clinical Notification
                </div>
                <p className="text-xs font-semibold leading-relaxed">
                  {caseDetail.criticalInstruction ||
                    'Immediate Clinical Attention Required: Our designated screening navigation clinician is attempting to reach you by phone today.'}
                </p>
                <div className="bg-white p-2 rounded-xl border border-red-200 text-[11px] text-red-800">
                  Dedicated Direct Line: <strong>+971 2 555 0199</strong> (CareLoop Urgent Triage)
                </div>
              </div>
            )}

            {/* Clinician-Approved Result Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between items-start">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 uppercase font-mono">
                  {caseDetail.template.testDisplayName}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  ID: {caseDetail.case.screeningResultId}
                </span>
              </div>

              <h2 className="text-sm font-bold text-slate-900 leading-snug">
                {caseDetail.template.headline}
              </h2>

              <p className="text-slate-600 leading-relaxed text-[11px]">
                {caseDetail.template.plainExplanation}
              </p>

              <div className="p-2.5 bg-white border border-teal-200 rounded-xl text-teal-900 text-[11px]">
                <strong>{isRtl ? 'الخطوة المطلوبة منك:' : 'Recommended Action:'}</strong>{' '}
                {caseDetail.template.actionNeeded}
              </div>

              {/* Template Governance & Verified Status Badge */}
              <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-500 space-y-0.5">
                <div>
                  Approved By: <strong>{caseDetail.template.approvedBy}</strong>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-semibold text-[9px]">
                    verified: {String(caseDetail.template.verified)}
                  </span>
                  <span>(Standard clinical template pending legal circular sign-off)</span>
                </div>
              </div>
            </div>

            {/* Step A: Acknowledge Button */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-800">1. Acknowledge Receipt</span>
                {caseDetail.case.milestones.acknowledgedAt && (
                  <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    ✓ {caseDetail.case.milestones.acknowledgedAt.substring(0, 16)}
                  </span>
                )}
              </div>

              <p className="text-[11px] text-slate-500">
                {isRtl
                  ? 'يؤكد الضغط على الزر استلامك للإشعار واطلاعك على محتواه.'
                  : 'Tapping confirm tells your healthcare team you have safely received this notification.'}
              </p>

              <button
                disabled={Boolean(caseDetail.case.milestones.acknowledgedAt)}
                onClick={handleAcknowledge}
                className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-sm disabled:bg-emerald-600 disabled:opacity-90 transition-all text-xs"
              >
                {caseDetail.case.milestones.acknowledgedAt
                  ? isRtl ? '✓ تم تأكيد استلام النتيجة' : '✓ Receipt Confirmed'
                  : isRtl ? 'اضغط هنا لتأكيد استلام النتيجة' : 'Tap to Acknowledge Receipt'}
              </button>
            </div>

            {/* Step B: Understanding Check (3 Questions) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-800">2. Understanding Check (3 Questions)</span>
                {caseDetail.case.milestones.understandingConfirmedAt && (
                  <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    ✓ Confirmed
                  </span>
                )}
              </div>

              {/* Show rewritten wording if patient failed attempt 1 */}
              {quizResult?.simplifiedWording && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl space-y-1 text-amber-900">
                  <span className="font-bold text-xs uppercase tracking-wider block text-amber-800">
                    Simplified Clarification:
                  </span>
                  <p className="text-[11px] leading-relaxed">{quizResult.simplifiedWording}</p>
                </div>
              )}

              {/* Show navigator call alert if failed twice */}
              {quizResult?.navigatorCallTaskCreated && (
                <div className="p-3 bg-indigo-50 border border-indigo-300 rounded-xl space-y-1 text-indigo-900">
                  <span className="font-bold text-xs uppercase tracking-wider block text-indigo-800">
                    📞 Navigator Phone Call Scheduled:
                  </span>
                  <p className="text-[11px] leading-relaxed">
                    We want to ensure complete clarity. A clinical navigator will call you today to explain these results in plain language and answer all your questions.
                  </p>
                  <span className="text-[10px] font-mono bg-white px-1.5 py-0.5 rounded border border-indigo-200 inline-block mt-1">
                    Barrier Reason Documented: COMMUNICATION_FAILURE / LOW_HEALTH_LITERACY
                  </span>
                </div>
              )}

              {/* Question list */}
              <div className="space-y-4 pt-1">
                {caseDetail.template.understandingQuestions.map((q, qIndex) => (
                  <div key={q.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <p className="font-semibold text-slate-900 text-xs">
                      {qIndex + 1}. {q.question}
                    </p>
                    <div className="space-y-1.5">
                      {q.options.map((opt, optIndex) => (
                        <label
                          key={optIndex}
                          className={`flex items-start gap-2 p-2 rounded-lg border text-[11px] cursor-pointer transition-all ${
                            selectedAnswers[qIndex] === optIndex
                              ? 'bg-teal-50 border-teal-500 font-medium text-teal-900'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`quiz-q-${qIndex}`}
                            checked={selectedAnswers[qIndex] === optIndex}
                            onChange={() =>
                              setSelectedAnswers((prev) => ({ ...prev, [qIndex]: optIndex }))
                            }
                            className="mt-0.5 accent-teal-600"
                          />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}

                <button
                  onClick={handleQuizSubmit}
                  className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-sm transition-all text-xs"
                >
                  {isRtl ? 'إرسال إجابات الفهم' : 'Submit Answers'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Tracker ("What Happens Next") */}
        {activeTab === 'tracker' && caseDetail && (
          <div className="flex-1 p-4 space-y-4 overflow-y-auto text-xs">
            <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl space-y-1">
              <h3 className="font-bold text-teal-900 text-sm">{caseDetail.nextStep.title}</h3>
              <p className="text-[11px] text-teal-800 leading-relaxed">
                {caseDetail.nextStep.explanation}
              </p>
            </div>

            {/* Journey Milestones Timeline */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4">
              <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wide text-slate-500">
                Care Journey Milestones
              </h4>

              <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 rtl:before:left-auto rtl:before:right-3.5 before:w-0.5 before:bg-slate-200">
                {[
                  {
                    title: '1. Notification Delivered',
                    time: caseDetail.case.milestones.notificationDeliveredAt,
                    done: Boolean(caseDetail.case.milestones.notificationDeliveredAt),
                  },
                  {
                    title: '2. Result Acknowledged',
                    time: caseDetail.case.milestones.acknowledgedAt,
                    done: Boolean(caseDetail.case.milestones.acknowledgedAt),
                  },
                  {
                    title: '3. Understanding Confirmed',
                    time: caseDetail.case.milestones.understandingConfirmedAt,
                    done: Boolean(caseDetail.case.milestones.understandingConfirmedAt),
                  },
                  {
                    title: '4. Diagnostic Referral Created',
                    time: caseDetail.case.milestones.referralCreatedAt,
                    done: Boolean(caseDetail.case.milestones.referralCreatedAt),
                    detail: caseDetail.referral?.receivingFacilityName,
                  },
                  {
                    title: '5. Referral Accepted by Facility',
                    time: caseDetail.case.milestones.referralAcceptedAt,
                    done: Boolean(caseDetail.case.milestones.referralAcceptedAt),
                  },
                  {
                    title: '6. Confirmatory Appointment Booked',
                    time: caseDetail.case.milestones.appointmentBookedAt,
                    done: Boolean(caseDetail.case.milestones.appointmentBookedAt),
                    detail: caseDetail.appointment?.appointmentDate,
                  },
                  {
                    title: '7. Clinical Appointment Attended',
                    time: caseDetail.case.milestones.attendedAt,
                    done: Boolean(caseDetail.case.milestones.attendedAt),
                  },
                  {
                    title: '8. Diagnostic Disposition Documented',
                    time: caseDetail.case.milestones.diagnosticDispositionDocumentedAt,
                    done: Boolean(caseDetail.case.milestones.diagnosticDispositionDocumentedAt),
                  },
                  {
                    title: '9. Care Loop Closed',
                    time: caseDetail.case.closure?.closedAt,
                    done: caseDetail.case.currentState === 'CLOSED',
                    detail: caseDetail.case.closure?.closureType,
                  },
                ].map((step, idx) => (
                  <div key={idx} className="flex items-start gap-3 relative">
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        step.done
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {step.done ? '✓' : idx + 1}
                    </span>
                    <div className="flex-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div className="font-semibold text-slate-900">{step.title}</div>
                      {step.time && (
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {step.time.substring(0, 16)}
                        </div>
                      )}
                      {step.detail && (
                        <div className="text-[10px] text-teal-700 font-medium mt-0.5">
                          {step.detail}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Consult ("Ask a Clinician") */}
        {activeTab === 'consult' && (
          <div className="flex-1 p-4 flex flex-col space-y-3 overflow-hidden text-xs">
            {/* Emergency Notice Banner */}
            <div className="p-3 bg-red-50 border border-red-300 rounded-2xl text-[11px] text-red-900 leading-relaxed shrink-0">
              <strong className="block font-bold uppercase tracking-wider mb-0.5 text-red-800">
                ⚠️ Emergency Notice
              </strong>
              If you have severe sudden symptoms (heavy bleeding, acute pain, shortness of breath), call 999 or go to the nearest emergency department immediately. This thread is for routine questions only.
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto space-y-2.5 p-2 bg-slate-50 rounded-2xl border border-slate-200">
              {consultMessages.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  {isRtl ? 'لا توجد رسائل سابقة. اكتب استفسارك وسيجيبك الطبيب أو المنسق.' : 'No messages yet. Ask a question and your care coordinator will respond.'}
                </div>
              ) : (
                consultMessages.map((m) => {
                  const isPatientSender = m.senderRole === 'PATIENT';
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${
                        isPatientSender ? 'items-end' : 'items-start'
                      }`}
                    >
                      <div
                        className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                          isPatientSender
                            ? 'bg-teal-600 text-white rounded-br-none'
                            : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm'
                        }`}
                      >
                        <div className="text-[10px] opacity-80 mb-0.5 font-medium">
                          {m.senderName} ({m.senderRole})
                        </div>
                        <p>{m.content}</p>
                        <div className="text-[9px] opacity-70 mt-1 text-end font-mono">
                          {m.timestamp.substring(11, 16)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Input Bar */}
            <div className="flex gap-2 shrink-0">
              <input
                type="text"
                placeholder={isRtl ? 'اكتب سؤالك هنا للطبيب...' : 'Type your question for the doctor...'}
                value={consultInput}
                onChange={(e) => setConsultInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendConsultMessage();
                }}
                className="flex-1 p-3 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button
                disabled={sendingMessage || !consultInput.trim()}
                onClick={handleSendConsultMessage}
                className="px-4 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl disabled:opacity-50 text-xs"
              >
                {sendingMessage ? '...' : isRtl ? 'إرسال' : 'Send'}
              </button>
            </div>
          </div>
        )}

        {/* Tab 4: Consent Preferences */}
        {activeTab === 'consent' && (
          <div className="flex-1 p-4 space-y-4 overflow-y-auto text-xs">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <h3 className="font-bold text-slate-900 text-sm">
                Communication & Clinical Data-Sharing Consents
              </h3>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                You control how we reach you and whether your screening details can be securely transmitted to diagnostic endoscopy or radiology centres.
              </p>
            </div>

            {consentSavedNotice && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-semibold text-xs text-center">
                ✓ {consentSavedNotice}
              </div>
            )}

            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
              {[
                {
                  key: 'smsConsent',
                  label: 'SMS Text Notifications',
                  desc: 'Receive automated reminder messages and appointment alerts.',
                },
                {
                  key: 'whatsappConsent',
                  label: 'WhatsApp Secure Channel',
                  desc: 'Receive bilingual updates via verified WhatsApp business API.',
                },
                {
                  key: 'callConsent',
                  label: 'Voice Phone Calls',
                  desc: 'Permit patient navigators and nurses to call regarding appointments.',
                },
                {
                  key: 'dataSharingConsent',
                  label: 'Diagnostic Facility Data Sharing (Mandatory for External Referral)',
                  desc: 'Authorize transfer of your screening result to the hospital performing your diagnostic examination.',
                },
              ].map((item) => (
                <label
                  key={item.key}
                  className="flex items-start justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer"
                >
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-900 block text-xs">{item.label}</span>
                    <span className="text-slate-500 text-[11px] leading-tight block">{item.desc}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={(consentFlags as any)[item.key]}
                    onChange={(e) =>
                      setConsentFlags((prev) => ({ ...prev, [item.key]: e.target.checked }))
                    }
                    className="w-5 h-5 accent-teal-600 rounded shrink-0 mt-0.5"
                  />
                </label>
              ))}

              <button
                onClick={handleSaveConsent}
                className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-sm text-xs transition-all"
              >
                Save Consent Preferences
              </button>
            </div>
          </div>
        )}

        {/* Tab 5: Low-Bandwidth Mode (Simulated SMS Conversation) */}
        {activeTab === 'lowbw' && (
          <div className="flex-1 p-4 space-y-4 overflow-y-auto text-xs">
            <div className="p-3 bg-slate-900 text-white rounded-2xl space-y-1 font-mono text-[11px]">
              <span className="text-teal-400 font-bold block uppercase tracking-wider">
                Low-Bandwidth Mode: SMS Outbox & Simulator
              </span>
              <p className="text-slate-300">
                Simulates plain text mobile messaging without smartphone web connection. Proves the core tenet: <strong>SMS alone is not sufficient</strong>.
              </p>
            </div>

            {escalationNotice && (
              <div className="p-3 bg-red-50 border border-red-300 rounded-xl text-red-900 font-semibold text-xs">
                ⚠️ {escalationNotice}
              </div>
            )}

            {/* Simulated SMS Conversation Bubble */}
            <div className="bg-slate-100 p-4 rounded-2xl border border-slate-300 space-y-3 font-mono text-[11px]">
              {lowBwData?.smsTranscript?.map((msg: any, i: number) => (
                <div
                  key={i}
                  className={`flex flex-col ${
                    msg.direction === 'INBOUND' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[90%] p-2.5 rounded-xl ${
                      msg.direction === 'INBOUND'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white text-slate-900 border border-slate-300'
                    }`}
                  >
                    <div className="text-[9px] opacity-70 mb-0.5">
                      {msg.direction === 'INBOUND' ? 'To: CareLoop' : 'From: CareLoop-Screening'}
                    </div>
                    <p>{msg.text}</p>
                    <div className="text-[9px] opacity-60 text-end mt-0.5">
                      {msg.sentAt?.substring(11, 16)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Interactive Reply Simulator */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
              <span className="font-bold text-slate-800 block text-xs">
                Simulate Patient SMS Reply:
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={smsReplyInput}
                  onChange={(e) => setSmsReplyInput(e.target.value)}
                  placeholder="Type 1 to confirm receipt"
                  className="flex-1 p-2.5 border rounded-xl font-mono text-xs"
                />
                <button
                  onClick={handleSimulateSmsReply}
                  className="px-4 py-2.5 bg-teal-600 text-white font-bold rounded-xl text-xs"
                >
                  Send SMS Reply
                </button>
              </div>

              {/* Demonstrate Failure of Standalone SMS */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  onClick={handleSimulateUnacknowledgedWindowExpiry}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition-colors"
                >
                  Simulate Missing Acknowledgement & Escalation to Call Task
                </button>
                <p className="text-[10px] text-slate-500 mt-1 text-center">
                  Demonstrates why text alerts escalate to human voice outreach when unacknowledged.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer Requirement */}
        <footer className="p-3 bg-slate-50 border-t border-slate-200 text-center text-[10px] text-slate-400 font-mono">
          {SYNTHETIC_DEMO_FOOTER}
        </footer>
      </div>
    </div>
  );
}

