'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Case,
  CaseState,
  Urgency,
  UserRole,
  Language,
  BarrierReason,
  ClosureType,
  AuthorisedAlternativeReason,
  OutreachChannel,
  OutreachOutcome,
  JurisdictionPack,
  ConsultMessage,
} from '@/types';

// Translation dictionary
const I18N: Record<string, any> = {
  en: {
    appTitle: 'CareLoop',
    appSubtitle: 'Closed-Loop Screening-to-Care Platform | Abu Dhabi Innovation Challenge',
    syntheticBanner: 'PROTOTYPE DEMONSTRATION: Synthetic data only. No real patient data. Not approved for clinical diagnosis.',
    tabCases: 'Active Cases & Outreach',
    tabNavigatorWorklist: 'Navigator Worklist',
    tabAnalytics: 'Analytics & Attrition',
    tabImport: 'CSV Batch Import',
    tabAiQueue: 'AI Approval Queue',
    tabProvenance: 'Audit Trail & Provenance',
    filterPathway: 'Pathway',
    allPathways: 'All Pathways',
    filterUrgency: 'Urgency',
    allUrgencies: 'All Urgencies',
    filterState: 'State',
    allStates: 'All States',
    searchPlaceholder: 'Search by case ID, patient name, or result ID...',
    overdueOnly: 'Overdue Cases Only',
    totalCases: 'Total Filtered Cases',
    roleLabel: 'Active Role Simulation:',
    switchLang: 'العربية (RTL)',
    colCaseId: 'Case #',
    colPatient: 'Patient (Synthetic)',
    colPathway: 'Pathway',
    colState: 'Current State',
    colUrgency: 'Urgency',
    colDeadline: 'Clinical Deadline',
    colSlaDays: 'Working Days Left',
    colActions: 'Action',
    viewDetails: 'Inspect Case',
    closeCase: 'Close Case',
    recordOutreach: 'Log Outreach',
    criticalBadge: 'CRITICAL',
    urgentBadge: 'URGENT',
    routineBadge: 'ROUTINE',
    overdueBadge: 'OVERDUE',
    unassignedBadge: 'UNASSIGNED',
    generateAiDraft: 'Generate Bilingual AI Draft',
    patientPwaBtn: '📱 Open Patient PWA Companion',
    demoClockTitle: 'DEMO CLOCK SIMULATION',
    advance1Day: '+1 Day',
    advance3Days: '+3 Days',
    advance7Days: '+7 Days',
    advance14Days: '+14 Days',
    advance30Days: '+30 Days',
    resetClock: 'Reset Clock',
    clockAdvancedToast: 'Advanced engine clock. SLAs recomputed across all active cases.',
  },
  ar: {
    appTitle: 'كير لوب (CareLoop)',
    appSubtitle: 'منصة المتابعة المغلقة من الفحص إلى الرعاية | تحدي الابتكار الصحي في أبوظبي',
    syntheticBanner: 'نموذج تجريبي: بيانات اصطناعية بالكامل. خالية من أي بيانات مرضى حقيقية. غير مخصصة للتشخيص السريري المباشر.',
    tabCases: 'الحالات النشطة والتواصل',
    tabNavigatorWorklist: 'قائمة مهام المنسق الصحي',
    tabAnalytics: 'التحليلات ومعدلات الانقطاع',
    tabImport: 'استيراد الدفعات (CSV)',
    tabAiQueue: 'قائمة مراجعة الذكاء الاصطناعي',
    tabProvenance: 'سلسلة التدقيق ومصادر البيانات',
    filterPathway: 'المسار الصحي',
    allPathways: 'جميع المسارات',
    filterUrgency: 'درجة الاستعجال',
    allUrgencies: 'جميع الدرجات',
    filterState: 'حالة المسار',
    allStates: 'جميع الحالات',
    searchPlaceholder: 'البحث برقم الحالة، اسم المريض، أو رقم النتيجة...',
    overdueOnly: 'الحالات المتأخرة فقط',
    totalCases: 'إجمالي الحالات المفلترة',
    roleLabel: 'دور المستخدم الحالي:',
    switchLang: 'English (LTR)',
    colCaseId: 'رقم الحالة',
    colPatient: 'المريض (اصطناعي)',
    colPathway: 'المسار الطبي',
    colState: 'الحالة الراهنة',
    colUrgency: 'الأولوية',
    colDeadline: 'الموعد السريري النهائي',
    colSlaDays: 'أيام العمل المتبقية',
    colActions: 'الإجراء',
    viewDetails: 'تفاصيل الحالة',
    closeCase: 'إغلاق الحالة',
    recordOutreach: 'تسجيل تواصل',
    criticalBadge: 'حرج للغاية',
    urgentBadge: 'عاجل',
    routineBadge: 'روتيني',
    overdueBadge: 'متأخر عن الموعد',
    unassignedBadge: 'غير مسند',
    generateAiDraft: 'إنشاء مسودة بالذكاء الاصطناعي',
    patientPwaBtn: '📱 تطبيق المريض التفاعلي (PWA)',
    demoClockTitle: 'محاكي الساعة التجريبية للمنظومة',
    advance1Day: '+1 يوم',
    advance3Days: '+3 أيام',
    advance7Days: '+7 أيام',
    advance14Days: '+14 يوماً',
    advance30Days: '+30 يوماً',
    resetClock: 'إعادة ضبط الساعة',
    clockAdvancedToast: 'تم تقديم الساعة وإعادة احتساب اتفاقيات مستوى الخدمة لجميع الحالات.',
  },
};

export default function CareLoopDashboard() {
  const [lang, setLang] = useState<Language>('en');
  const [activeRole, setActiveRole] = useState<UserRole>('NAVIGATOR');
  const [activeTab, setActiveTab] = useState<'cases' | 'navigatorWorklist' | 'analytics' | 'import' | 'aiQueue' | 'provenance'>('cases');

  // Jurisdiction Pack state
  const [packs, setPacks] = useState<JurisdictionPack[]>([]);
  const [activePackId, setActivePackIdState] = useState<string>('abu-dhabi');
  const [activePack, setActivePack] = useState<JurisdictionPack | null>(null);

  // Demo Clock state
  const [demoClockState, setDemoClockState] = useState<{
    simulatedNow: string;
    realNow: string;
    offsetDays: number;
    isAdvanced: boolean;
  } | null>(null);
  const [clockToast, setClockToast] = useState<string | null>(null);

  // Case Filter state
  const [selectedPathway, setSelectedPathway] = useState<string>('all');
  const [selectedState, setSelectedState] = useState<string>('all');
  const [selectedUrgency, setSelectedUrgency] = useState<string>('all');
  const [overdueOnly, setOverdueOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);

  // Data state
  const [cases, setCases] = useState<Case[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [metricsSummary, setMetricsSummary] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Navigator Worklist state
  const [worklistTasks, setWorklistTasks] = useState<any[]>([]);
  const [worklistLoading, setWorklistLoading] = useState<boolean>(false);

  // Selected Case for Detail Drawer
  const [selectedCaseDetail, setSelectedCaseDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [activeModalTab, setActiveModalTab] = useState<'overview' | 'actions' | 'consult' | 'timeline'>('overview');

  // Case Actions State
  const [assigneeId, setAssigneeId] = useState<string>('CLINICIAN-01');
  const [assigneeName, setAssigneeName] = useState<string>('Dr. Fatima Al-Zahra');
  const [assigneeRole, setAssigneeRole] = useState<UserRole>('CLINICIAN');

  // Referral Action State
  const [referralFacility, setReferralFacility] = useState<string>('Central Endoscopy & Diagnostic Center');
  const [referralSpecialty, setReferralSpecialty] = useState<string>('Diagnostic Gastroenterology');
  const [referralSummary, setReferralSummary] = useState<string>('Positive screening result requires confirmatory diagnostic colonoscopy.');
  const [referralError, setReferralError] = useState<string | null>(null);
  const [referralSuccess, setReferralSuccess] = useState<string | null>(null);

  // Facility Action (Accept/Reject)
  const [facilityActionType, setFacilityActionType] = useState<'ACCEPT' | 'REJECT'>('ACCEPT');
  const [facilityRejectionReason, setFacilityRejectionReason] = useState<string>('CLINICAL_CAPACITY_EXCEEDED');

  // Appointment & Attendance
  const [appointmentDate, setAppointmentDate] = useState<string>('2026-09-01T09:00:00Z');
  const [appointmentFacility, setAppointmentFacility] = useState<string>('Central Diagnostic Hospital - Suite 4B');

  // Diagnostic Report Upload
  const [diagnosticProcedure, setDiagnosticProcedure] = useState<string>('Colonoscopy with Polypectomy');
  const [diagnosticFindings, setDiagnosticFindings] = useState<string>('12mm sessile polyp identified in sigmoid colon. Complete snare polypectomy performed with clear margins.');
  const [diagnosticDisposition, setDiagnosticDisposition] = useState<string>('TUBULAR_ADENOMA_EXCISED_SURVEILLANCE_3YR');
  const [specimenId, setSpecimenId] = useState<string>('PATH-2026-SIG-8819');

  // Transition form modal
  const [transitionTarget, setTransitionTarget] = useState<CaseState | ''>('');
  const [closureType, setClosureType] = useState<ClosureType>('CLINICAL_RESOLUTION');
  const [authorisedReason, setAuthorisedReason] = useState<AuthorisedAlternativeReason>('INFORMED_REFUSAL');
  const [clinicalEvidenceRef, setClinicalEvidenceRef] = useState<string>('COLONOSCOPY-REPORT-DOH-2026');
  const [closureNote, setClosureNote] = useState<string>('Diagnostic endoscopy completed and documented.');
  const [transitionError, setTransitionError] = useState<string | null>(null);

  // Consult Message Form
  const [consultScope, setConsultScope] = useState<'PATIENT_TO_CLINICIAN' | 'CLINICIAN_TO_CLINICIAN'>('CLINICIAN_TO_CLINICIAN');
  const [consultText, setConsultText] = useState<string>('');
  const [consultSending, setConsultSending] = useState<boolean>(false);

  // Outreach attempt form
  const [outreachChannel, setOutreachChannel] = useState<OutreachChannel>('SMS');
  const [outreachOutcome, setOutreachOutcome] = useState<OutreachOutcome>('ACKNOWLEDGED');
  const [barrierReason, setBarrierReason] = useState<BarrierReason | ''>('');
  const [outreachNotes, setOutreachNotes] = useState<string>('Patient confirmed appointment details.');

  // Analytics tab state
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  // CSV Import tab state
  const [csvText, setCsvText] = useState<string>(
    `external_patient_id,result_id,full_name,date_of_birth,gender,language,nationality_group,emirate,phone,screening_type,screening_date,pathway_id,urgency\nDOH-99001,RES-99001,Rashid Al-Falasi,1973-04-18,MALE,ar,EMIRATI,Abu Dhabi,+971509998877,FIT_POSITIVE,2026-08-10,colorectal-uae,ROUTINE\nDOH-99002,RES-99002,Emily Watson,1981-11-05,FEMALE,en,WESTERN_EXPAT,Abu Dhabi,+971508887766,MAMMOGRAPHY_SUSPICIOUS,2026-08-11,breast-abudhabi,CRITICAL`
  );
  const [importReport, setImportReport] = useState<any>(null);
  const [importing, setImporting] = useState<boolean>(false);

  // AI Approval Queue state
  const [aiQueueItems, setAiQueueItems] = useState<any[]>([]);
  const [aiGenerating, setAiGenerating] = useState<boolean>(false);

  // Audit chain verification
  const [auditData, setAuditData] = useState<any>(null);
  const [auditLoading, setAuditLoading] = useState<boolean>(false);

  const t = I18N[lang] || I18N.en;
  const isRtl = lang === 'ar';

  // Load packs & clock on mount
  useEffect(() => {
    fetchPacks();
    fetchDemoClock();
  }, []);

  async function fetchPacks() {
    try {
      const res = await fetch('/api/packs');
      const data = await res.json();
      if (data.packs) {
        setPacks(data.packs);
        const curId = data.activePackId || 'abu-dhabi';
        setActivePackIdState(curId);
        const current = data.packs.find((p: any) => p.id === curId) || data.packs[0];
        setActivePack(current);
      }
    } catch (err) {
      console.error('Failed to load packs', err);
    }
  }

  async function fetchDemoClock() {
    try {
      const res = await fetch('/api/demo-clock');
      const data = await res.json();
      if (data.success) {
        setDemoClockState(data.clock);
      }
    } catch (err) {
      console.error('Failed to fetch demo clock', err);
    }
  }

  async function handleAdvanceClock(days: number) {
    try {
      const res = await fetch('/api/demo-clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ advanceDays: days }),
      });
      const data = await res.json();
      if (data.success) {
        setDemoClockState(data.clock);
        const toast = `Clock advanced by +${days} days. ${data.casesUpdated} cases updated; ${data.newlyOverdueCases} newly overdue cases auto-escalated to triage lead.`;
        setClockToast(toast);
        setTimeout(() => setClockToast(null), 6000);
        fetchCases();
        if (selectedCaseDetail) {
          fetchCaseDetail(selectedCaseDetail.case.id);
        }
      }
    } catch (err) {
      console.error('Failed to advance clock', err);
    }
  }

  async function handleResetClock() {
    try {
      const res = await fetch('/api/demo-clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reset: true }),
      });
      const data = await res.json();
      if (data.success) {
        setDemoClockState(data.clock);
        setClockToast('Demo clock reset to real-time synchronization.');
        setTimeout(() => setClockToast(null), 4000);
        fetchCases();
        if (selectedCaseDetail) {
          fetchCaseDetail(selectedCaseDetail.case.id);
        }
      }
    } catch (err) {
      console.error('Failed to reset clock', err);
    }
  }

  function updateCsvTemplate(pack: JurisdictionPack) {
    if (pack.id === 'abu-dhabi') {
      setCsvText(
        `external_patient_id,result_id,full_name,date_of_birth,gender,language,nationality_group,emirate,phone,screening_type,screening_date,pathway_id,urgency\nDOH-99001,RES-99001,Rashid Al-Falasi,1973-04-18,MALE,ar,EMIRATI,Abu Dhabi,+971509998877,FIT_POSITIVE,2026-08-10,colorectal-uae,ROUTINE\nDOH-99002,RES-99002,Emily Watson,1981-11-05,FEMALE,en,WESTERN_EXPAT,Abu Dhabi,+971508887766,MAMMOGRAPHY_SUSPICIOUS,2026-08-11,breast-abudhabi,CRITICAL`
      );
    } else if (pack.id === 'who-reference') {
      setCsvText(
        `external_patient_id,result_id,full_name,date_of_birth,gender,language,residencyStatus,phone,screening_type,screening_date,pathway_id,urgency\nREF-10001,RES-10001,Maria Santos,1985-06-20,FEMALE,en,PERMANENT_RESIDENT,+15551234567,CERVICAL_HPV_POSITIVE,2026-08-10,cervical-who,ROUTINE\nREF-10002,RES-10002,David Chen,1970-02-14,MALE,en,CITIZEN,+15552345678,FIT_POSITIVE,2026-08-11,colorectal-ontario,URGENT`
      );
    } else {
      setCsvText(
        `external_patient_id,result_id,full_name,date_of_birth,gender,language,clinicDistrict,contactAccessibility,phone,screening_type,screening_date,pathway_id,urgency\nCOM-20001,RES-20001,Kwame Osei,1968-09-12,MALE,en,DISTRICT_NORTH,PERSONAL_PHONE,+15553456789,COMM_FOBT_POSITIVE,2026-08-10,community-fobt,ROUTINE\nCOM-20002,RES-20002,Amina Diallo,1983-12-01,FEMALE,en,RURAL_MOBILE,CHW_LIAISON,+15554567890,CERVICAL_VIA_POSITIVE,2026-08-11,community-womens-health,CRITICAL`
      );
    }
  }

  async function handlePackSwitch(newPackId: string) {
    try {
      const res = await fetch('/api/packs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId: newPackId }),
      });
      const data = await res.json();
      if (data.success) {
        setActivePackIdState(newPackId);
        setActivePack(data.pack);
        setSelectedPathway('all');
        setPage(1);

        const packLangs = data.pack.languages.map((l: any) => l.code);
        if (!packLangs.includes(lang)) {
          setLang(data.pack.defaultLanguage as Language);
        }

        updateCsvTemplate(data.pack);
        fetchCases(newPackId, 'all');
        if (activeTab === 'analytics') {
          fetchAnalytics(newPackId, 'all');
        } else if (activeTab === 'navigatorWorklist') {
          fetchNavigatorWorklist(newPackId);
        }
      }
    } catch (err) {
      console.error('Failed to switch jurisdiction pack', err);
    }
  }

  // Fetch Cases List
  useEffect(() => {
    fetchCases();
  }, [selectedPathway, selectedState, selectedUrgency, overdueOnly, searchQuery, page, activePackId]);

  // Tab change reactions
  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchAnalytics();
    } else if (activeTab === 'aiQueue') {
      fetchAiQueue();
    } else if (activeTab === 'navigatorWorklist') {
      fetchNavigatorWorklist();
    } else if (activeTab === 'provenance') {
      fetchAuditData();
    }
  }, [activeTab, activePackId]);

  async function fetchCases(overridePackId?: string, overridePathway?: string) {
    setLoading(true);
    try {
      const targetPack = overridePackId || activePackId;
      const targetPathway = overridePathway !== undefined ? overridePathway : selectedPathway;
      const params = new URLSearchParams({
        pack: targetPack,
        pathway: targetPathway,
        state: selectedState,
        urgency: selectedUrgency,
        overdue: overdueOnly ? 'true' : 'false',
        search: searchQuery,
        page: page.toString(),
        limit: '25',
      });
      const res = await fetch(`/api/cases?${params.toString()}`);
      const data = await res.json();
      setCases(data.cases || []);
      setTotalCount(data.total || 0);
      setMetricsSummary(data.metrics || null);
    } catch (err) {
      console.error('Failed to fetch cases', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchNavigatorWorklist(overridePackId?: string) {
    setWorklistLoading(true);
    try {
      const targetPack = overridePackId || activePackId;
      const res = await fetch(`/api/navigator/worklist?pack=${targetPack}`, {
        headers: { 'x-user-role': activeRole },
      });
      const data = await res.json();
      setWorklistTasks(data.tasks || []);
    } catch (err) {
      console.error('Failed to fetch worklist', err);
    } finally {
      setWorklistLoading(false);
    }
  }

  async function fetchAuditData(overridePackId?: string) {
    setAuditLoading(true);
    try {
      const targetPack = overridePackId || activePackId;
      const res = await fetch(`/api/audit?pack=${targetPack}`);
      const data = await res.json();
      setAuditData(data);
    } catch (err) {
      console.error('Failed to fetch audit data', err);
    } finally {
      setAuditLoading(false);
    }
  }

  async function handleSimulateTamper() {
    setAuditLoading(true);
    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pack: activePackId, simulateTamper: true }),
      });
      const data = await res.json();
      setAuditData((prev: any) => ({
        ...prev,
        verification: data.verification,
        simulationNote: 'Tamper injection simulated on historical entry. Cryptographic chain immediately detected corruption!',
      }));
    } catch (err) {
      console.error('Tamper simulation error', err);
    } finally {
      setAuditLoading(false);
    }
  }

  async function fetchCaseDetail(id: string) {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/cases/${id}`, {
        headers: {
          'x-user-role': activeRole,
          'x-user-id': `USER-${activeRole}`,
        },
      });
      const data = await res.json();
      setSelectedCaseDetail(data);
      setTransitionTarget('');
      setTransitionError(null);
      setReferralError(null);
      setReferralSuccess(null);
    } catch (err) {
      console.error('Failed to fetch case detail', err);
    } finally {
      setDetailLoading(false);
    }
  }

  // Action: Assign Owner
  async function handleAssignOwner() {
    if (!selectedCaseDetail) return;
    try {
      const res = await fetch(`/api/cases/${selectedCaseDetail.case.id}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': `USER-${activeRole}`,
          'x-user-role': activeRole,
        },
        body: JSON.stringify({
          ownerId: assigneeId,
          ownerName: assigneeName,
          ownerRole: assigneeRole,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(`Error: ${data.error}`);
      } else {
        await fetchCaseDetail(selectedCaseDetail.case.id);
        fetchCases();
      }
    } catch (err) {
      console.error('Assign failed', err);
    }
  }

  // Action: Send Structured Referral
  async function handleSendReferral() {
    if (!selectedCaseDetail) return;
    setReferralError(null);
    setReferralSuccess(null);

    try {
      const res = await fetch(`/api/cases/${selectedCaseDetail.case.id}/referral`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': `USER-${activeRole}`,
          'x-user-role': activeRole,
          'x-user-name': `${activeRole} Specialist`,
        },
        body: JSON.stringify({
          receivingFacilityName: referralFacility,
          specialty: referralSpecialty,
          clinicalSummary: referralSummary,
          urgency: selectedCaseDetail.case.urgency,
          reason: `Urgent Diagnostic Referral: ${selectedCaseDetail.case.screeningTestType}`,
          attachments: ['Screening_Lab_Result.pdf', 'Clinical_Summary.pdf'],
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setReferralError(data.error);
      } else {
        setReferralSuccess('Structured referral successfully dispatched to receiving facility.');
        await fetchCaseDetail(selectedCaseDetail.case.id);
        fetchCases();
      }
    } catch (err: any) {
      setReferralError(err.message);
    }
  }

  // Action: Facility Accept or Reject
  async function handleFacilityAction() {
    if (!selectedCaseDetail) return;
    try {
      const res = await fetch(`/api/cases/${selectedCaseDetail.case.id}/referral/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'USER-FACILITY-CHIEF',
          'x-user-role': 'CLINICIAN',
          'x-user-name': 'Receiving Facility Intake Triage',
        },
        body: JSON.stringify({
          action: facilityActionType,
          rejectionReason: facilityActionType === 'REJECT' ? facilityRejectionReason : undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(`Facility Error: ${data.error}`);
      } else {
        await fetchCaseDetail(selectedCaseDetail.case.id);
        fetchCases();
      }
    } catch (err) {
      console.error('Facility action error', err);
    }
  }

  // Action: Record Appointment
  async function handleRecordAppointment() {
    if (!selectedCaseDetail) return;
    try {
      const res = await fetch(`/api/cases/${selectedCaseDetail.case.id}/appointment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': `USER-${activeRole}`,
          'x-user-role': activeRole,
        },
        body: JSON.stringify({
          appointmentDate,
          facilityName: appointmentFacility,
          providerName: 'Consultant Endoscopist / Surgeon',
        }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(`Error: ${data.error}`);
      } else {
        await fetchCaseDetail(selectedCaseDetail.case.id);
        fetchCases();
      }
    } catch (err) {
      console.error('Appointment error', err);
    }
  }

  // Action: Mark Attended
  async function handleMarkAttended() {
    if (!selectedCaseDetail) return;
    try {
      const res = await fetch(`/api/cases/${selectedCaseDetail.case.id}/attend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': `USER-${activeRole}`,
          'x-user-role': activeRole,
        },
      });
      const data = await res.json();
      if (!data.success) {
        alert(`Error: ${data.error}`);
      } else {
        await fetchCaseDetail(selectedCaseDetail.case.id);
        fetchCases();
      }
    } catch (err) {
      console.error('Attend error', err);
    }
  }

  // Action: Upload Diagnostic Report
  async function handleUploadDiagnosticReport() {
    if (!selectedCaseDetail) return;
    try {
      const res = await fetch(`/api/cases/${selectedCaseDetail.case.id}/diagnostic-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': `USER-${activeRole}`,
          'x-user-role': activeRole,
        },
        body: JSON.stringify({
          procedureName: diagnosticProcedure,
          findings: diagnosticFindings,
          disposition: diagnosticDisposition,
          specimenId,
          conclusion: 'Diagnostic disposition verified. Clinical intervention completed with histological documentation.',
        }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(`Error: ${data.error}`);
      } else {
        await fetchCaseDetail(selectedCaseDetail.case.id);
        fetchCases();
      }
    } catch (err) {
      console.error('Diagnostic report error', err);
    }
  }

  // Action: Close Case (Clinical Resolution or Authorised Alternative)
  async function handleCloseCase(mode: 'CLINICAL' | 'REQUEST_ALTERNATIVE' | 'AUTHORISE_ALTERNATIVE') {
    if (!selectedCaseDetail) return;
    try {
      let body: any = {};
      if (mode === 'CLINICAL') {
        body = {
          action: 'CLINICAL_RESOLUTION',
          clinicalEvidenceRef: clinicalEvidenceRef || selectedCaseDetail.case.diagnosticReport?.reportId,
          closureNote,
        };
      } else if (mode === 'REQUEST_ALTERNATIVE') {
        body = {
          action: 'REQUEST_AUTHORISED_ALTERNATIVE',
          reason: authorisedReason,
          closureNote,
          requesterId: `USER-${activeRole}`,
          requesterName: `${activeRole} Navigator`,
          requesterRole: activeRole,
        };
      } else if (mode === 'AUTHORISE_ALTERNATIVE') {
        body = {
          action: 'AUTHORISE_ALTERNATIVE',
        };
      }

      const res = await fetch(`/api/cases/${selectedCaseDetail.case.id}/close`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': `USER-${activeRole}`,
          'x-user-role': activeRole,
          'x-user-name': `${activeRole} Officer`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) {
        alert(`Closure Rejected: ${data.error}`);
      } else {
        alert(
          mode === 'REQUEST_ALTERNATIVE'
            ? 'Alternative closure requested. Awaiting independent clinician authorization.'
            : 'Case closed and cryptographically recorded.'
        );
        await fetchCaseDetail(selectedCaseDetail.case.id);
        fetchCases();
      }
    } catch (err) {
      console.error('Close error', err);
    }
  }

  // Action: Send Consult Message
  async function handleSendConsultMessage() {
    if (!selectedCaseDetail || !consultText.trim()) return;
    setConsultSending(true);
    try {
      const res = await fetch(`/api/cases/${selectedCaseDetail.case.id}/consult`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': `USER-${activeRole}`,
          'x-user-role': activeRole,
          'x-user-name': `${activeRole} Specialist`,
        },
        body: JSON.stringify({
          content: consultText.trim(),
          scope: consultScope,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(`Consult Error: ${data.error}`);
      } else {
        setConsultText('');
        await fetchCaseDetail(selectedCaseDetail.case.id);
      }
    } catch (err) {
      console.error('Consult send error', err);
    } finally {
      setConsultSending(false);
    }
  }

  async function handleExecuteTransition() {
    if (!selectedCaseDetail || !transitionTarget) return;
    setTransitionError(null);

    const payload: any = {
      targetState: transitionTarget,
      trigger: `MANUAL_ACTION_BY_${activeRole}`,
      actorId: `USER-${activeRole}`,
      actorRole: activeRole,
      actorName: `${activeRole} Operator`,
    };

    if (transitionTarget === 'CLOSED') {
      payload.closureDetails = {
        closureType,
        authorisedReason: closureType === 'AUTHORISED_ALTERNATIVE' ? authorisedReason : undefined,
        clinicalEvidenceRef: closureType === 'CLINICAL_RESOLUTION' ? clinicalEvidenceRef : undefined,
        closureNote,
      };
    }

    try {
      const res = await fetch(`/api/cases/${selectedCaseDetail.case.id}/transition`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': `USER-${activeRole}`,
          'x-user-role': activeRole,
        },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!result.success) {
        setTransitionError(result.error || 'Transition rejected');
      } else {
        await fetchCaseDetail(selectedCaseDetail.case.id);
        fetchCases();
      }
    } catch (err: any) {
      setTransitionError(err.message);
    }
  }

  async function handleRecordOutreach() {
    if (!selectedCaseDetail) return;
    try {
      const res = await fetch(`/api/cases/${selectedCaseDetail.case.id}/outreach`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': `USER-${activeRole}`,
          'x-user-role': activeRole,
        },
        body: JSON.stringify({
          channel: outreachChannel,
          outcome: outreachOutcome,
          barrierReason: barrierReason || undefined,
          notes: outreachNotes,
        }),
      });
      const result = await res.json();
      if (!result.success) {
        alert(`Error: ${result.error}`);
      } else {
        await fetchCaseDetail(selectedCaseDetail.case.id);
        fetchCases();
        if (activeTab === 'navigatorWorklist') {
          fetchNavigatorWorklist();
        }
      }
    } catch (err) {
      console.error('Failed to record outreach', err);
    }
  }

  async function handleGenerateAiDraft(caseId: string) {
    setAiGenerating(true);
    try {
      const res = await fetch('/api/ai/approval-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId, language: lang }),
      });
      const data = await res.json();
      if (data.success) {
        alert(
          lang === 'ar'
            ? 'تم إنشاء مسودة الإشعار وإرسالها إلى قائمة المراجعة البشرية للموافقة السريرية قبل الإرسال للمريض.'
            : 'AI notification draft created and queued for human approval before patient dispatch.'
        );
        setActiveTab('aiQueue');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAiGenerating(false);
    }
  }

  async function fetchAnalytics(overridePackId?: string, overridePathway?: string) {
    try {
      const targetPack = overridePackId || activePackId;
      const targetPathway = overridePathway !== undefined ? overridePathway : selectedPathway;
      const params = new URLSearchParams({
        pack: targetPack,
        pathway: targetPathway,
      });
      const res = await fetch(`/api/metrics?${params.toString()}`);
      const data = await res.json();
      setAnalyticsData(data);
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchAiQueue() {
    try {
      const res = await fetch('/api/ai/approval-queue');
      const data = await res.json();
      setAiQueueItems(data.items || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleApproveAiItem(id: string, modifiedContent?: string) {
    try {
      const res = await fetch(`/api/ai/approval-queue/${id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': `USER-${activeRole}`,
          'x-user-role': activeRole,
        },
        body: JSON.stringify({
          modifiedContent,
          reviewNotes: 'Clinical supervisor verified message clarity and empathy.',
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchAiQueue();
        fetchCases();
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleRejectAiItem(id: string) {
    try {
      const res = await fetch(`/api/ai/approval-queue/${id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': `USER-${activeRole}`,
          'x-user-role': activeRole,
        },
        body: JSON.stringify({ reason: 'Clinical supervisor requested direct phone call instead of text notification.' }),
      });
      const data = await res.json();
      if (data.success) {
        fetchAiQueue();
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleCsvImport() {
    setImporting(true);
    setImportReport(null);
    try {
      const res = await fetch(`/api/import/csv?pack=${activePackId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/csv' },
        body: csvText,
      });
      const data = await res.json();
      if (data.success) {
        setImportReport(data.report);
        fetchCases();
      } else {
        alert(`Import Error: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Top Banner: Synthetic Data & Safety Notice */}
      <div className="bg-amber-600 text-white px-4 py-2 text-xs font-semibold flex flex-wrap items-center justify-between shadow-sm gap-2">
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          <span className="bg-amber-800 px-2 py-0.5 rounded text-[10px] tracking-wide uppercase font-mono">
            {activePack ? activePack.id.toUpperCase() : 'CARELOOP'}
          </span>
          <span>{t.syntheticBanner}</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/patient"
            className="bg-amber-800 hover:bg-amber-900 px-3 py-1 rounded text-xs font-bold transition-colors flex items-center gap-1 shadow-sm"
          >
            {t.patientPwaBtn}
          </Link>
          {activePack && activePack.languages.length > 1 && (
            <button
              onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
              className="bg-amber-700 hover:bg-amber-800 px-3 py-1 rounded text-xs transition-colors"
            >
              {t.switchLang}
            </button>
          )}
        </div>
      </div>

      {/* DEMO CLOCK CONTROL BAR (Admin / Evaluator Control) */}
      <div className="bg-indigo-900 text-white px-6 py-2.5 text-xs shadow-inner flex flex-wrap items-center justify-between gap-3 border-b border-indigo-950">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold tracking-wider uppercase text-[11px] text-indigo-200">
              {t.demoClockTitle}:
            </span>
          </div>
          {demoClockState && (
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span className="bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-700 text-indigo-100">
                Simulated: <strong>{demoClockState.simulatedNow.substring(0, 10)}</strong>
              </span>
              <span className="text-indigo-300">
                (Advanced: <strong className="text-amber-300">+{demoClockState.offsetDays}d</strong>)
              </span>
              <span className="text-indigo-400 hidden md:inline">
                Real Clock: {demoClockState.realNow.substring(0, 10)}
              </span>
            </div>
          )}
        </div>

        {/* Demo Clock Buttons */}
        <div className="flex items-center gap-1.5 font-mono text-xs">
          <span className="text-[10px] text-indigo-300 mr-1 hidden sm:inline">Advance by:</span>
          {[1, 3, 7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => handleAdvanceClock(d)}
              className="bg-indigo-700 hover:bg-indigo-600 active:bg-indigo-800 px-2.5 py-1 rounded text-xs font-semibold transition-colors border border-indigo-600 shadow-sm"
            >
              +{d}d
            </button>
          ))}
          <button
            onClick={handleResetClock}
            className="bg-rose-700 hover:bg-rose-600 active:bg-rose-800 px-3 py-1 rounded text-xs font-semibold ml-2 rtl:ml-0 rtl:mr-2 transition-colors border border-rose-600 shadow-sm"
          >
            {t.resetClock}
          </button>
        </div>
      </div>

      {/* Clock Advancement Toast Notification */}
      {clockToast && (
        <div className="bg-teal-700 text-white px-6 py-2 text-xs font-medium flex items-center justify-between transition-all">
          <div className="flex items-center gap-2">
            <span>⏰</span>
            <span>{clockToast}</span>
          </div>
          <button onClick={() => setClockToast(null)} className="text-teal-200 hover:text-white">✕</button>
        </div>
      )}

      {/* Main Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold text-xl shadow">
                CL
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t.appTitle}</h1>
                <p className="text-xs text-slate-500">
                  {activePack ? `Closed-Loop Screening-to-Care Platform | ${activePack.name}` : t.appSubtitle}
                </p>
              </div>
            </div>
          </div>

          {/* Controls: Pack Switcher & Role Simulation */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Jurisdiction Pack Selector */}
            <div className="flex items-center gap-2 bg-teal-50 p-1.5 rounded-lg border border-teal-200 text-xs">
              <span className="font-bold text-teal-800 px-1">
                {isRtl ? 'حزمة التشريع:' : 'Jurisdiction Pack:'}
              </span>
              <select
                value={activePackId}
                onChange={(e) => handlePackSwitch(e.target.value)}
                className="bg-white border border-teal-300 text-teal-900 font-semibold rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
              >
                {packs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.id === 'abu-dhabi' ? '⭐ (Hero)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Role Simulation Switcher (RBAC) */}
            <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-lg border border-slate-200 text-xs">
              <span className="font-medium text-slate-600 px-2">{t.roleLabel}</span>
              {(['NAVIGATOR', 'CLINICIAN', 'PROGRAMME_ANALYST'] as UserRole[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setActiveRole(r)}
                  className={`px-3 py-1 rounded-md font-medium transition-all ${
                    activeRole === r ? 'bg-teal-700 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto flex gap-6 mt-6 border-b border-slate-100 text-sm font-medium overflow-x-auto">
          {[
            { id: 'cases', label: t.tabCases, badge: totalCount },
            { id: 'navigatorWorklist', label: t.tabNavigatorWorklist, badge: worklistTasks.length || undefined },
            { id: 'analytics', label: t.tabAnalytics },
            { id: 'import', label: t.tabImport },
            { id: 'aiQueue', label: t.tabAiQueue, badge: aiQueueItems.filter((i) => i.status === 'PENDING_REVIEW').length || undefined },
            { id: 'provenance', label: t.tabProvenance },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 relative transition-colors whitespace-nowrap ${
                activeTab === tab.id ? 'text-teal-700 font-semibold border-b-2 border-teal-600' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
              {tab.badge !== undefined && (
                <span className="ml-2 rtl:ml-0 rtl:mr-2 px-2 py-0.5 text-xs bg-slate-200 text-slate-700 rounded-full font-mono">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* Active Jurisdiction Pack & Rules Verification Banner */}
        {activePack && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3 mb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 rounded-md text-xs font-bold font-mono tracking-wide bg-teal-100 text-teal-800 border border-teal-200">
                  JURISDICTION PACK: {activePack.id.toUpperCase()}
                </span>
                <h2 className="text-sm font-bold text-slate-900">{activePack.name}</h2>
                <span className="text-xs text-slate-500 hidden sm:inline">• {activePack.description}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-600">
                <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  Calendar: {activePack.workingDayCalendar.weekendDays.length === 1 ? 'Sunday-Only Weekend' : 'Sat & Sun Weekend'}
                </span>
                <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  Channels: {activePack.enabledChannels.join(', ')}
                </span>
              </div>
            </div>

            {/* Pathway Rules & Verification Status Badges */}
            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Configured Clinical Pathways & Verification Status:
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {activePack.pathways.map((pw) => (
                  <div key={pw.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1.5">
                    <div className="flex items-start justify-between gap-1">
                      <span className="font-bold text-slate-900">{pw.name}</span>
                      {pw.verified ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          ✓ Verified Rule
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          ⚠ Unverified Standard
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-600 flex items-center justify-between">
                      <span>Clinical Target: <strong>{pw.clinicalDeadlineWorkingDays} working days</strong></span>
                      {pw.referenceOnly && <span className="text-indigo-600 font-semibold">[Reference Only]</span>}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 bg-white p-1.5 rounded border border-slate-200 truncate" title={pw.sourceRef}>
                      Source: {pw.sourceRef}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: CASES BOARD */}
        {activeTab === 'cases' && (
          <div className="space-y-6">
            {/* Quick Metrics Bar */}
            {metricsSummary && (
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                  <div className="text-xs text-slate-500 uppercase">{isRtl ? 'إجمالي الحالات' : 'Total Cases'}</div>
                  <div className="text-xl font-bold text-slate-900 font-mono">{metricsSummary.totalCases}</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                  <div className="text-xs text-slate-500 uppercase">{isRtl ? 'نسبة الإخطار' : 'Notification Rate'}</div>
                  <div className="text-xl font-bold text-teal-600 font-mono">{metricsSummary.notificationRate}%</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                  <div className="text-xs text-slate-500 uppercase">{isRtl ? 'نسبة التأكيد' : 'Acknowledged'}</div>
                  <div className="text-xl font-bold text-blue-600 font-mono">{metricsSummary.acknowledgementRate}%</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                  <div className="text-xs text-slate-500 uppercase">{isRtl ? 'حضور الموعد' : 'Attendance'}</div>
                  <div className="text-xl font-bold text-indigo-600 font-mono">{metricsSummary.appointmentAttendanceRate}%</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                  <div className="text-xs text-slate-500 uppercase">{isRtl ? 'الحل السريري' : 'Clinical Resolution'}</div>
                  <div className="text-xl font-bold text-emerald-600 font-mono">{metricsSummary.clinicalResolutionRate}%</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                  <div className="text-xs text-slate-500 uppercase">{isRtl ? 'وسيط المدة' : 'Median Resolution'}</div>
                  <div className="text-xl font-bold text-slate-700 font-mono">
                    {metricsSummary.medianDaysToResolution !== null ? `${metricsSummary.medianDaysToResolution}d` : 'N/A'}
                  </div>
                </div>
              </div>
            )}

            {/* Filter Controls */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center justify-between">
              <div className="flex flex-wrap gap-3 items-center">
                {/* Search */}
                <input
                  type="text"
                  placeholder={t.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm w-72 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />

                {/* Pathway */}
                <select
                  value={selectedPathway}
                  onChange={(e) => setSelectedPathway(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value="all">{t.allPathways}</option>
                  {activePack?.pathways.map((pw) => (
                    <option key={pw.id} value={pw.id}>
                      {isRtl && pw.nameLocalized ? pw.nameLocalized : pw.name} ({pw.clinicalDeadlineWorkingDays}d)
                    </option>
                  ))}
                </select>

                {/* Urgency */}
                <select
                  value={selectedUrgency}
                  onChange={(e) => setSelectedUrgency(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value="all">{t.allUrgencies}</option>
                  <option value="CRITICAL">{t.criticalBadge}</option>
                  <option value="URGENT">{t.urgentBadge}</option>
                  <option value="ROUTINE">{t.routineBadge}</option>
                </select>

                {/* State */}
                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value="all">{t.allStates}</option>
                  <option value="RESULT_ISSUED">RESULT_ISSUED</option>
                  <option value="PATIENT_NOTIFIED">PATIENT_NOTIFIED</option>
                  <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
                  <option value="REFERRAL_SENT">REFERRAL_SENT</option>
                  <option value="REFERRAL_ACCEPTED">REFERRAL_ACCEPTED</option>
                  <option value="APPOINTMENT_BOOKED">APPOINTMENT_BOOKED</option>
                  <option value="ATTENDED">ATTENDED</option>
                  <option value="DIAGNOSTIC_DISPOSITION_DOCUMENTED">DIAGNOSTIC_DISPOSITION_DOCUMENTED</option>
                  <option value="CLOSED">CLOSED</option>
                  <option value="ESCALATED">ESCALATED</option>
                  <option value="REJECTED">REJECTED</option>
                </select>

                {/* Overdue Checkbox */}
                <label className="flex items-center gap-2 text-xs font-medium text-red-700 bg-red-50 px-3 py-2 rounded-lg border border-red-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={overdueOnly}
                    onChange={(e) => setOverdueOnly(e.target.checked)}
                    className="rounded text-red-600 focus:ring-red-500"
                  />
                  <span>{t.overdueOnly}</span>
                </label>
              </div>

              <div className="text-xs text-slate-500 font-mono">
                {t.totalCases}: <strong className="text-slate-900">{totalCount}</strong>
              </div>
            </div>

            {/* Cases Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left rtl:text-right text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">{t.colCaseId}</th>
                      <th className="px-4 py-3">{t.colPatient}</th>
                      <th className="px-4 py-3">{t.colPathway}</th>
                      <th className="px-4 py-3">{t.colState}</th>
                      <th className="px-4 py-3">{t.colUrgency}</th>
                      <th className="px-4 py-3">{t.colDeadline}</th>
                      <th className="px-4 py-3">{t.colSlaDays}</th>
                      <th className="px-4 py-3 text-right rtl:text-left">{t.colActions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                          {isRtl ? 'جاري تحميل الحالات...' : 'Loading screening cases...'}
                        </td>
                      </tr>
                    ) : cases.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                          {isRtl ? 'لا توجد حالات مطابقة لمعايير البحث' : 'No screening cases match criteria.'}
                        </td>
                      </tr>
                    ) : (
                      cases.map((c) => {
                        const isOverdue = c.isOverdue;
                        const patient = c.patient;
                        return (
                          <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-4 py-3 font-mono font-bold text-teal-700">
                              {c.caseNumber}
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-slate-900">
                                {isRtl && patient?.fullNameArabic ? patient.fullNameArabic : patient?.fullName}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                {patient?.nationalityGroup || patient?.residencyStatus || 'Standard'} • {patient?.language?.toUpperCase()} • {patient?.region || patient?.emirate || 'Central'}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                                {activePack?.pathways.find((p) => p.id === c.pathwayId)?.name || c.pathwayId}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                  c.currentState === 'CLOSED'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : c.currentState === 'ESCALATED'
                                    ? 'bg-red-100 text-red-800'
                                    : c.currentState === 'REJECTED'
                                    ? 'bg-slate-200 text-slate-700'
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {c.currentState}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${
                                  c.urgency === 'CRITICAL'
                                    ? 'bg-red-600 text-white'
                                    : c.urgency === 'URGENT'
                                    ? 'bg-amber-500 text-white'
                                    : 'bg-slate-200 text-slate-700'
                                }`}
                              >
                                {c.urgency}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono text-[11px] text-slate-600">
                              {c.clinicalDeadline.substring(0, 10)}
                            </td>
                            <td className="px-4 py-3 font-mono font-bold">
                              {isOverdue ? (
                                <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded text-[11px] border border-red-200">
                                  {t.overdueBadge}
                                </span>
                              ) : (
                                <span className="text-slate-700 text-[11px]">
                                  {c.currentState === 'CLOSED' ? 'Resolved' : 'Active'}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right rtl:text-left">
                              <button
                                onClick={() => fetchCaseDetail(c.id)}
                                className="px-3 py-1 bg-teal-50 text-teal-700 border border-teal-200 rounded-md hover:bg-teal-100 text-xs font-medium transition-colors"
                              >
                                {t.viewDetails}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1 border border-slate-300 rounded bg-white disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="font-mono text-slate-600">
                  Page {page} of {Math.max(1, Math.ceil(totalCount / 25))}
                </span>
                <button
                  disabled={page >= Math.ceil(totalCount / 25)}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1 border border-slate-300 rounded bg-white disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: NAVIGATOR WORKLIST */}
        {activeTab === 'navigatorWorklist' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 mb-1">
                  {isRtl ? 'قائمة مهام المنسق الصحي الميداني' : 'Due Outreach & Navigation Worklist'}
                </h2>
                <p className="text-xs text-slate-500">
                  {isRtl
                    ? 'الحالات التي تتطلب تدخلاً فورياً (حالات حرجة، مكالمات توضيحية لتعثر الفهم، أو تجاوزت المهل المحددة)'
                    : 'Actionable outreach ladder queue prioritizing CRITICAL cases, understanding test remediation calls, and overdue cases.'}
                </p>
              </div>
              <button
                onClick={() => fetchNavigatorWorklist()}
                className="px-4 py-2 bg-teal-50 text-teal-700 border border-teal-200 rounded-lg text-xs font-bold hover:bg-teal-100"
              >
                ↻ Refresh Worklist
              </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left rtl:text-right text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Priority / Urgency</th>
                      <th className="px-4 py-3">Case #</th>
                      <th className="px-4 py-3">Patient</th>
                      <th className="px-4 py-3">Pathway & State</th>
                      <th className="px-4 py-3">Required Outreach Action</th>
                      <th className="px-4 py-3">Assigned Role</th>
                      <th className="px-4 py-3 text-right rtl:text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {worklistLoading ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                          Loading due outreach actions...
                        </td>
                      </tr>
                    ) : worklistTasks.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                          ✓ No outstanding outreach actions due at this time.
                        </td>
                      </tr>
                    ) : (
                      worklistTasks.map((task) => (
                        <tr key={task.caseId} className="hover:bg-slate-50/80">
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                task.urgency === 'CRITICAL'
                                  ? 'bg-red-600 text-white'
                                  : task.isOverdue
                                  ? 'bg-rose-500 text-white'
                                  : 'bg-amber-500 text-white'
                              }`}
                            >
                              {task.urgency === 'CRITICAL' ? 'CRITICAL PINNED' : task.isOverdue ? 'OVERDUE' : 'DUE'}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-teal-700">
                            {task.caseNumber}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-900">{task.patient?.fullName}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{task.patient?.phone}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-800">{task.pathwayName}</div>
                            <div className="text-[10px] font-mono text-slate-500">{task.currentState}</div>
                          </td>
                          <td className="px-4 py-3 max-w-xs">
                            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                              <span className="px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 text-[10px] font-mono font-bold">
                                {task.nextAction.channel}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-600 mt-0.5">{task.nextAction.actionDescription}</div>
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-600">
                            {task.nextAction.assignedRole}
                          </td>
                          <td className="px-4 py-3 text-right rtl:text-left">
                            <button
                              onClick={() => fetchCaseDetail(task.caseId)}
                              className="px-3 py-1 bg-teal-600 text-white rounded hover:bg-teal-700 text-xs font-semibold shadow-sm"
                            >
                              Open Case
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: POPULATION ANALYTICS & HEALTH EQUITY */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-1">
                {isRtl ? 'تحليلات الأداء ومسار الانقطاع الشامل' : 'Closed-Loop Pathway Attrition Funnel'}
              </h2>
              <p className="text-xs text-slate-500 mb-6">
                {isRtl
                  ? 'قياس انتقال الحالات عبر كل مرحلة سريرية لكشف الثغرات والحد من الانقطاع'
                  : 'Stage-by-stage progression tracking drop-offs from initial screening result to verified clinical resolution.'}
              </p>

              {/* Funnel Visualisation */}
              {analyticsData && (
                <div className="space-y-3">
                  {analyticsData.attrition.map((step: any, idx: number) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium text-slate-700">
                        <span>{isRtl ? step.stageNameArabic : step.stage}</span>
                        <span className="font-mono">
                          {step.count} ({step.retentionPercentOfTotal}%)
                          {step.dropOffFromPreviousPercent > 0 && (
                            <span className="text-red-500 ml-2 rtl:ml-0 rtl:mr-2">
                              ▼ -{step.dropOffFromPreviousPercent}% drop-off
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-teal-600 h-3 rounded-full transition-all duration-500"
                          style={{ width: `${step.retentionPercentOfTotal}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Health Equity & Disparity Breakdown */}
            {analyticsData && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Barrier Reasons Count */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="text-base font-bold text-slate-900 mb-4">
                    {isRtl ? 'تحليل العوائق الموثقة (Barrier Breakdown)' : 'Identified Patient Barriers'}
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(analyticsData.barrierCounts).map(([barrier, count]: any) => (
                      <div key={barrier} className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded">
                        <span className="font-mono text-slate-700">{barrier}</span>
                        <span className="font-bold text-slate-900 font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Disparity by Nationality & Language */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="text-base font-bold text-slate-900 mb-1">
                    {isRtl ? 'مؤشرات العدالة الصحية (Health Disparity Matrix)' : 'Demographic Stratification & Equity Gaps'}
                  </h3>
                  <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded mb-4">
                    {isRtl
                      ? 'ملاحظة الخصوصية: يتم حجب المجموعات التي يقل عدد حالاتها عن 10 لحماية الخصوصية وضمان الدقة الإحصائية.'
                      : 'Statistical Policy: Subgroups with fewer than 10 cases are suppressed for privacy protection.'}
                  </p>

                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">By Preferred Language</h4>
                      <div className="space-y-2">
                        {analyticsData.disparity.byLanguage.map((grp: any) => (
                          <div key={grp.groupId} className="p-2 border border-slate-100 rounded text-xs bg-slate-50">
                            <div className="flex justify-between font-medium">
                              <span>{grp.groupLabel}</span>
                              <span className="font-mono">{grp.totalCases} cases</span>
                            </div>
                            {grp.suppressed ? (
                              <span className="text-slate-400 italic text-[11px]">{grp.suppressionReason}</span>
                            ) : (
                              <div className="flex gap-4 mt-1 text-[11px] text-slate-600">
                                <span>Ack: {grp.acknowledgementRate}%</span>
                                <span>Resolution: {grp.clinicalResolutionRate}%</span>
                                <span>Median Time: {grp.medianDaysToResolution}d</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Dynamic Pack Patient Group Fields */}
                    {activePack?.patientGroupFields.map((field) => {
                      const groupBreakdown =
                        analyticsData.disparity?.byGroupField?.[field.id] ||
                        (field.id === 'nationalityGroup' ? analyticsData.disparity?.byNationalityGroup : []) ||
                        [];
                      if (!groupBreakdown || groupBreakdown.length === 0) return null;
                      return (
                        <div key={field.id}>
                          <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">
                            By {field.label}
                          </h4>
                          <div className="space-y-2">
                            {groupBreakdown.map((grp: any) => (
                              <div key={grp.groupId} className="p-2 border border-slate-100 rounded text-xs bg-slate-50">
                                <div className="flex justify-between font-medium">
                                  <span>{grp.groupLabel}</span>
                                  <span className="font-mono">{grp.totalCases} cases</span>
                                </div>
                                {grp.suppressed ? (
                                  <span className="text-slate-400 italic text-[11px]">{grp.suppressionReason}</span>
                                ) : (
                                  <div className="flex gap-4 mt-1 text-[11px] text-slate-600">
                                    <span>Ack: {grp.acknowledgementRate}%</span>
                                    <span>Resolution: {grp.clinicalResolutionRate}%</span>
                                    {grp.medianDaysToResolution !== undefined && (
                                      <span>Median: {grp.medianDaysToResolution}d</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: CSV BATCH IMPORT */}
        {activeTab === 'import' && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">
                {isRtl ? 'استيراد نتائج الفحص بالدفعات (CSV Batch Ingestion)' : 'Non-EHR Clinic CSV Batch Ingestion'}
              </h2>
              <p className="text-xs text-slate-500">
                {isRtl
                  ? 'مخصص للمراكز الأولية والعيادات المتنقلة التي تفتقر للربط المباشر مع الملف الطبي الإلكتروني، مع التحقق من الحقول واكتشاف التكرار التلقائي.'
                  : 'Engineered for community screening clinics without EHR integration. Supports duplicate rejection on patient ID + result ID.'}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">CSV Payload Text / File Content:</label>
              <textarea
                rows={8}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                className="w-full p-3 font-mono text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                disabled={importing}
                onClick={handleCsvImport}
                className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg shadow-sm disabled:opacity-50 transition-colors"
              >
                {importing ? (isRtl ? 'جاري الفحص والاستيراد...' : 'Validating & Importing...') : isRtl ? 'بدء فحص واستيراد الدفعة' : 'Validate & Import Batch'}
              </button>
            </div>

            {/* Import Report */}
            {importReport && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                <h3 className="text-sm font-bold text-slate-900">
                  {isRtl ? 'تقرير نتائج الاستيراد (Import Audit Summary)' : 'Import Audit Summary Report'}
                </h3>
                <div className="grid grid-cols-4 gap-4 text-xs font-mono">
                  <div className="bg-white p-2 rounded border">
                    <span className="text-slate-500">Total Rows:</span> <strong className="text-slate-900">{importReport.totalRows}</strong>
                  </div>
                  <div className="bg-white p-2 rounded border">
                    <span className="text-emerald-600">Successfully Ingested:</span> <strong className="text-emerald-700">{importReport.successfulCount}</strong>
                  </div>
                  <div className="bg-white p-2 rounded border">
                    <span className="text-amber-600">Duplicates Detected:</span> <strong className="text-amber-700">{importReport.duplicateCount}</strong>
                  </div>
                  <div className="bg-white p-2 rounded border">
                    <span className="text-red-600">Invalid Rows:</span> <strong className="text-red-700">{importReport.invalidCount}</strong>
                  </div>
                </div>

                {importReport.duplicates.length > 0 && (
                  <div className="text-xs text-amber-800 bg-amber-50 p-2 rounded border border-amber-200">
                    <strong>Duplicates Flagged:</strong>
                    {importReport.duplicates.map((d: any, i: number) => (
                      <div key={i} className="font-mono">
                        Row {d.rowNumber}: Patient {d.externalPatientId} | Result {d.resultId} (Already registered)
                      </div>
                    ))}
                  </div>
                )}

                {importReport.errors.length > 0 && (
                  <div className="text-xs text-red-800 bg-red-50 p-2 rounded border border-red-200">
                    <strong>Validation Errors:</strong>
                    {importReport.errors.map((e: any, i: number) => (
                      <div key={i} className="font-mono">
                        Row {e.rowNumber}: {e.reason}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: AI HUMAN APPROVAL QUEUE */}
        {activeTab === 'aiQueue' && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">
                {isRtl ? 'قائمة المراجعة البشرية الإلزامية لمخرجات الذكاء الاصطناعي' : 'Mandatory Human Approval Queue for AI Outputs'}
              </h2>
              <p className="text-xs text-slate-500">
                {isRtl
                  ? 'بموجب حوكمة المرحلة الأولى: لا يتم إرسال أي إشعار أو رسالة تم إنشاؤها بالذكاء الاصطناعي إلى المريض دون مراجعة واعتماد بشري صريح.'
                  : 'Phase 1 Safety Constraint: No AI communication reaches a patient without affirmative human clinician/navigator review.'}
              </p>
            </div>

            {aiQueueItems.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                {isRtl
                  ? 'لا توجد مسودات حالياً في قائمة الانتظار. يمكنك إنشاء مسودة من داخل بطاقة أي حالة نشطة.'
                  : 'No items awaiting review. Generate a notification draft from any active case details modal.'}
              </div>
            ) : (
              <div className="space-y-4">
                {aiQueueItems.map((item) => (
                  <div
                    key={item.id}
                    className={`p-4 rounded-xl border ${
                      item.status === 'PENDING_REVIEW'
                        ? 'border-amber-300 bg-amber-50/50'
                        : item.status === 'APPROVED' || item.status === 'MODIFIED_AND_APPROVED'
                        ? 'border-emerald-200 bg-emerald-50/30'
                        : 'border-red-200 bg-red-50/30'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-mono font-bold text-slate-700">{item.id}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-200 text-slate-700">
                          Case {item.caseId}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-teal-100 text-teal-800">
                          {item.language === 'ar' ? 'Arabic' : 'English'}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${
                          item.status === 'PENDING_REVIEW'
                            ? 'bg-amber-500 text-white'
                            : item.status === 'REJECTED'
                            ? 'bg-red-600 text-white'
                            : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    {/* Content Preview */}
                    <div className="my-3 p-3 bg-white rounded border border-slate-200 font-sans text-xs text-slate-800 whitespace-pre-line leading-relaxed">
                      {item.draftContent}
                    </div>

                    {item.status === 'PENDING_REVIEW' ? (
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleRejectAiItem(item.id)}
                          className="px-3 py-1.5 bg-red-100 text-red-700 rounded text-xs font-semibold hover:bg-red-200"
                        >
                          Reject Draft
                        </button>
                        <button
                          onClick={() => handleApproveAiItem(item.id)}
                          className="px-4 py-1.5 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-700 shadow-sm"
                        >
                          Approve & Dispatch to Patient
                        </button>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-500 font-mono">
                        Reviewed by {item.reviewerRole} ({item.reviewerId}) at {item.reviewedAt?.substring(0, 16)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: DATA PROVENANCE & AUDIT CHAIN */}
        {activeTab === 'provenance' && (
          <div className="space-y-6">
            {/* Cryptographic Hash Chain Verification */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {isRtl ? 'سلسلة التدقيق المشفرة (Cryptographic Hash Chain)' : 'Cryptographic Hash-Chained Audit Trail'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {isRtl
                      ? 'ترتبط كل حركة في النظام تشفيرياً بتجزئة SHA-256 للمدخل السابق مع تسجيل التوقيت الحقيقي والتوقيت التجريبي.'
                      : 'Every case transition, outreach event, referral, and closure records a continuous SHA-256 hash link with both real wall-clock and simulated demo timestamps.'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={auditLoading}
                    onClick={() => fetchAuditData()}
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg text-xs font-bold hover:bg-teal-700 shadow-sm disabled:opacity-50"
                  >
                    {auditLoading ? 'Verifying...' : 'Verify Audit Chain Integrity'}
                  </button>
                  <button
                    disabled={auditLoading}
                    onClick={handleSimulateTamper}
                    className="px-3 py-2 bg-rose-50 text-rose-700 border border-rose-300 rounded-lg text-xs font-bold hover:bg-rose-100 disabled:opacity-50"
                  >
                    Simulate Tamper Test
                  </button>
                </div>
              </div>

              {auditData && (
                <div className="space-y-3">
                  <div
                    className={`p-4 rounded-lg border text-xs ${
                      auditData.verification?.valid
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        : 'bg-rose-50 border-rose-300 text-rose-900'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-2 text-sm">
                      <span>{auditData.verification?.valid ? '✓' : '✗'}</span>
                      <span>
                        {auditData.verification?.valid
                          ? 'Cryptographic Chain Integrity Verified: Zero Tampering Detected'
                          : 'TAMPER DETECTED: Hash chain continuity breach!'}
                      </span>
                    </div>
                    {!auditData.verification?.valid && (
                      <div className="mt-1 font-mono text-[11px] text-rose-800">
                        {auditData.verification?.reason}
                      </div>
                    )}
                    {auditData.simulationNote && (
                      <div className="mt-1 font-medium text-amber-800 text-[11px]">
                        ℹ {auditData.simulationNote}
                      </div>
                    )}
                    <div className="mt-2 text-[11px] font-mono text-slate-600">
                      Total Ledger Blocks: <strong>{auditData.totalEntries}</strong> • Head Hash:{' '}
                      <span className="font-mono">{auditData.latestHash?.substring(0, 24)}...</span>
                    </div>
                  </div>

                  {/* Recent Audit Entries Table */}
                  {auditData.recentEntries && (
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <div className="bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700">
                        Latest Audit Ledger Entries (Showing Real & Simulated Timestamps)
                      </div>
                      <div className="max-h-60 overflow-y-auto">
                        <table className="w-full text-left rtl:text-right text-[11px]">
                          <thead className="bg-slate-50 text-slate-500 border-b">
                            <tr>
                              <th className="p-2 font-mono">Seq</th>
                              <th className="p-2">Action</th>
                              <th className="p-2">Resource</th>
                              <th className="p-2">Actor (Role)</th>
                              <th className="p-2 font-mono">Demo Timestamp</th>
                              <th className="p-2 font-mono">Real Wall-Clock</th>
                              <th className="p-2 font-mono">Entry Hash</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-mono text-[10px]">
                            {auditData.recentEntries.map((e: any) => (
                              <tr key={e.id} className="hover:bg-slate-50">
                                <td className="p-2 font-bold text-slate-900">#{e.sequenceNumber}</td>
                                <td className="p-2 font-sans font-semibold text-slate-800">{e.action}</td>
                                <td className="p-2 text-slate-600">{e.resourceType}:{e.resourceId}</td>
                                <td className="p-2 text-slate-700">{e.actorRole} ({e.actorId})</td>
                                <td className="p-2 text-teal-700">{e.timestamp?.substring(0, 16)}</td>
                                <td className="p-2 text-indigo-700">{e.realTimestamp?.substring(0, 16) || 'N/A'}</td>
                                <td className="p-2 text-slate-400" title={e.hash}>{e.hash?.substring(0, 12)}...</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Evidence Literature Table */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 mb-2">
                {isRtl ? 'بيان مصادر البيانات التجريبية والمحددات' : 'Data Provenance Manifest & Clinical Literature Sources'}
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                All patient profiles are synthetic with fixed seed = 42. Empirical rates and escalation multipliers are parameterized from published peer-reviewed studies.
              </p>

              <div className="overflow-x-auto text-xs">
                <table className="w-full border-collapse border border-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="border p-2 text-left">Source ID</th>
                      <th className="border p-2 text-left">Study Title</th>
                      <th className="border p-2 text-left">Year</th>
                      <th className="border p-2 text-left">Empirical Finding</th>
                      <th className="border p-2 text-left">Simulated CareLoop Parameter</th>
                      <th className="border p-2 text-left">Limitation</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border p-2 font-mono">SRC-2023-US-RCT</td>
                      <td className="border p-2">Multicomponent EHR-Based Outreach & Navigation Cluster RCT</td>
                      <td className="border p-2">2023</td>
                      <td className="border p-2">22.9% usual care vs 31.4% with navigation (120 days)</td>
                      <td className="border p-2">Baseline unassisted follow-up vs navigator uplift</td>
                      <td className="border p-2">US health safety-net; underinsured context</td>
                    </tr>
                    <tr>
                      <td className="border p-2 font-mono">SRC-2020-TZA-SMS</td>
                      <td className="border p-2">Mobile Phone Text Messaging Screening Follow-up RCT</td>
                      <td className="border p-2">2020</td>
                      <td className="border p-2">24.0% SMS arm vs 23.8% control arm (no SMS effect alone)</td>
                      <td className="border p-2">Validates why SMS alone does not drive follow-up without active ladder</td>
                      <td className="border p-2">Rural East African basic mobile phone cohort</td>
                    </tr>
                    <tr>
                      <td className="border p-2 font-mono">SRC-2025-CMR-TEL</td>
                      <td className="border p-2">Interactive Telephone Navigation vs Routine Notification RCT</td>
                      <td className="border p-2">2025</td>
                      <td className="border p-2">25.6% diagnostic resolution with phone call vs 6.1% routine</td>
                      <td className="border p-2">Calibrates phone call step-up efficacy parameter</td>
                      <td className="border p-2">Low-resource standard of care baseline</td>
                    </tr>
                    <tr>
                      <td className="border p-2 font-mono">SRC-2024-META-CERV</td>
                      <td className="border p-2">Meta-Analysis on Multicomponent Screening Follow-up</td>
                      <td className="border p-2">2024</td>
                      <td className="border p-2">Multicomponent outreach OR = 3.01 vs single OR = 1.56</td>
                      <td className="border p-2">Escalation ladder cumulative boost factor</td>
                      <td className="border p-2">Heterogeneous study designs and screening intervals</td>
                    </tr>
                    <tr>
                      <td className="border p-2 font-mono">SRC-2020-FIT-SURVEY</td>
                      <td className="border p-2">International FIT Colorectal Screening Follow-up Survey</td>
                      <td className="border p-2">2020</td>
                      <td className="border p-2">Mean 79% colonoscopy at 6mo (organised 81% vs opportunistic 57%)</td>
                      <td className="border p-2">Referral target benchmark &gt;= 90%</td>
                      <td className="border p-2">Cross-national endoscopy capacity variations</td>
                    </tr>
                    <tr>
                      <td className="border p-2 font-mono">SRC-2015-AUH-EMIR</td>
                      <td className="border p-2">Abu Dhabi Emirati Screening & Follow-Up Audit</td>
                      <td className="border p-2">2016</td>
                      <td className="border p-2">23.5% FOBT uptake; 13.5% follow-up colonoscopy completion</td>
                      <td className="border p-2">Historical Abu Dhabi baseline gap for closed-loop navigation</td>
                      <td className="border p-2">Historic (2015-16) cohort limited to UAE Nationals prior to Malaffi</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Case Details Drawer / Modal */}
      {selectedCaseDetail && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-3xl bg-white h-full shadow-2xl overflow-y-auto flex flex-col">
            {/* Modal Header */}
            <div className="p-6 bg-slate-900 text-white flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl font-bold font-mono text-teal-400">
                    {selectedCaseDetail.case.caseNumber}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      selectedCaseDetail.case.urgency === 'CRITICAL'
                        ? 'bg-red-600 text-white'
                        : selectedCaseDetail.case.urgency === 'URGENT'
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-700 text-slate-200'
                    }`}
                  >
                    {selectedCaseDetail.case.urgency}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-900 text-teal-200 border border-teal-700">
                    {selectedCaseDetail.case.currentState}
                  </span>
                  {selectedCaseDetail.case.isOverdue && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white">
                      OVERDUE
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 font-mono">
                  Result ID: {selectedCaseDetail.case.screeningResultId} • Test: {selectedCaseDetail.case.screeningTestType} • Primary Owner: {selectedCaseDetail.case.assignedOwner?.name || selectedCaseDetail.case.primaryOwnerId} ({selectedCaseDetail.case.primaryOwnerRole})
                </p>
              </div>
              <button
                onClick={() => setSelectedCaseDetail(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"
              >
                ✕
              </button>
            </div>

            {/* Modal Subtabs */}
            <div className="bg-slate-100 border-b border-slate-200 px-6 flex gap-4 text-xs font-semibold">
              {[
                { id: 'overview', label: 'Overview & Milestones' },
                { id: 'actions', label: 'Clinical Actions (RBAC)' },
                { id: 'consult', label: `Consult Thread (${selectedCaseDetail.consultMessages?.length || 0})` },
                { id: 'timeline', label: `Timeline (${selectedCaseDetail.events?.length || 0})` },
              ].map((mTab) => (
                <button
                  key={mTab.id}
                  onClick={() => setActiveModalTab(mTab.id as any)}
                  className={`py-3 border-b-2 transition-colors ${
                    activeModalTab === mTab.id
                      ? 'border-teal-600 text-teal-800 font-bold'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {mTab.label}
                </button>
              ))}
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 flex-1 text-xs">
              {/* SUBTAB 1: OVERVIEW & MILESTONES */}
              {activeModalTab === 'overview' && (
                <div className="space-y-6">
                  {/* Patient Synthetic Demographic Card */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-slate-900 text-sm">
                        {isRtl && selectedCaseDetail.patient?.fullNameArabic
                          ? selectedCaseDetail.patient.fullNameArabic
                          : selectedCaseDetail.patient?.fullName}
                      </h4>
                      <span className="font-mono text-teal-700 font-bold">
                        {selectedCaseDetail.patient?.externalPatientId}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-slate-600 font-mono text-[11px]">
                      <div>DOB: {selectedCaseDetail.patient?.dateOfBirth}</div>
                      <div>Gender: {selectedCaseDetail.patient?.gender}</div>
                      <div>Group: {selectedCaseDetail.patient?.nationalityGroup || selectedCaseDetail.patient?.residencyStatus || 'Standard'}</div>
                      <div>Language: {selectedCaseDetail.patient?.language?.toUpperCase()}</div>
                      <div>Phone: {selectedCaseDetail.patient?.phone}</div>
                      <div>Region: {selectedCaseDetail.patient?.region || selectedCaseDetail.patient?.emirate || 'Central'}</div>
                      <div>SMS Consent: {selectedCaseDetail.patient?.consentFlags?.smsConsent ? '✓ Yes' : '✗ No'}</div>
                      <div className={selectedCaseDetail.patient?.consentFlags?.dataSharingConsent ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                        Data-Sharing: {selectedCaseDetail.patient?.consentFlags?.dataSharingConsent ? '✓ Yes' : '✗ Denied'}
                      </div>
                    </div>
                  </div>

                  {/* 8 Distinct Milestones Grid */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wide text-slate-500">
                      8 Closed-Loop Pathway Milestones (Timestamped Audit)
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                      <div className={`p-2 rounded border ${selectedCaseDetail.case.milestones.notificationDeliveredAt ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-slate-50 text-slate-400'}`}>
                        1. Notification Delivered: {selectedCaseDetail.case.milestones.notificationDeliveredAt?.substring(0, 16) || 'Pending'}
                      </div>
                      <div className={`p-2 rounded border ${selectedCaseDetail.case.milestones.acknowledgedAt ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-slate-50 text-slate-400'}`}>
                        2. Acknowledged: {selectedCaseDetail.case.milestones.acknowledgedAt?.substring(0, 16) || 'Pending'}
                      </div>
                      <div className={`p-2 rounded border ${selectedCaseDetail.case.milestones.understandingConfirmedAt ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-slate-50 text-slate-400'}`}>
                        3. Understanding Confirmed: {selectedCaseDetail.case.milestones.understandingConfirmedAt?.substring(0, 16) || 'Pending'}
                      </div>
                      <div className={`p-2 rounded border ${selectedCaseDetail.case.milestones.referralCreatedAt ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-slate-50 text-slate-400'}`}>
                        4. Referral Sent: {selectedCaseDetail.case.milestones.referralCreatedAt?.substring(0, 16) || 'Pending'}
                      </div>
                      <div className={`p-2 rounded border ${selectedCaseDetail.case.milestones.referralAcceptedAt ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-slate-50 text-slate-400'}`}>
                        5. Referral Accepted: {selectedCaseDetail.case.milestones.referralAcceptedAt?.substring(0, 16) || 'Pending'}
                      </div>
                      <div className={`p-2 rounded border ${selectedCaseDetail.case.milestones.appointmentBookedAt ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-slate-50 text-slate-400'}`}>
                        6. Appointment Booked: {selectedCaseDetail.case.milestones.appointmentBookedAt?.substring(0, 16) || 'Pending'}
                      </div>
                      <div className={`p-2 rounded border ${selectedCaseDetail.case.milestones.attendedAt ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-slate-50 text-slate-400'}`}>
                        7. Attended: {selectedCaseDetail.case.milestones.attendedAt?.substring(0, 16) || 'Pending'}
                      </div>
                      <div className={`p-2 rounded border ${selectedCaseDetail.case.milestones.diagnosticDispositionDocumentedAt ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-slate-50 text-slate-400'}`}>
                        8. Disposition Documented: {selectedCaseDetail.case.milestones.diagnosticDispositionDocumentedAt?.substring(0, 16) || 'Pending'}
                      </div>
                    </div>
                  </div>

                  {/* Closure Details (if closed) */}
                  {selectedCaseDetail.case.closure && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 space-y-1">
                      <div className="font-bold">
                        Case Closed: {selectedCaseDetail.case.closure.closureType}
                      </div>
                      <div className="text-[11px]">
                        Authorised by: {selectedCaseDetail.case.closure.authoriserName} ({selectedCaseDetail.case.closure.authoriserRole})
                      </div>
                      {selectedCaseDetail.case.closure.requesterName && (
                        <div className="text-[11px] text-teal-800">
                          Requested by: {selectedCaseDetail.case.closure.requesterName} ({selectedCaseDetail.case.closure.requesterRole})
                        </div>
                      )}
                      {selectedCaseDetail.case.closure.clinicalEvidenceRef && (
                        <div className="text-[11px] font-mono">
                          Evidence Ref: {selectedCaseDetail.case.closure.clinicalEvidenceRef}
                        </div>
                      )}
                      <div className="text-[11px] italic">
                        Note: "{selectedCaseDetail.case.closure.closureNote}"
                      </div>
                    </div>
                  )}

                  {/* Pending Alternative Closure Request Banner */}
                  {selectedCaseDetail.case.pendingAlternativeClosure && (
                    <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <span>⏳</span> Pending Authorised Alternative Closure Request
                      </div>
                      <div className="text-[11px]">
                        Requested by: <strong>{selectedCaseDetail.case.pendingAlternativeClosure.requesterName}</strong> ({selectedCaseDetail.case.pendingAlternativeClosure.requesterRole})
                      </div>
                      <div className="text-[11px]">
                        Reason Code: <strong>{selectedCaseDetail.case.pendingAlternativeClosure.reason}</strong>
                      </div>
                      <div className="text-[11px] italic">
                        Note: "{selectedCaseDetail.case.pendingAlternativeClosure.note}"
                      </div>
                      {activeRole === 'CLINICIAN' && (
                        <div className="pt-2">
                          <button
                            onClick={() => handleCloseCase('AUTHORISE_ALTERNATIVE')}
                            className="px-3 py-1 bg-amber-700 text-white rounded text-xs font-bold hover:bg-amber-800"
                          >
                            Affirm & Authorise Alternative Closure (Clinician Role)
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Next Outreach Recommendation */}
                  {selectedCaseDetail.nextOutreachRecommendation && (
                    <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg space-y-1">
                      <div className="font-bold text-teal-900">
                        Next Recommended Outreach Action (Ladder Step {selectedCaseDetail.nextOutreachRecommendation.stepNumber})
                      </div>
                      <div className="text-[11px] text-teal-800">
                        Channel: <strong>{selectedCaseDetail.nextOutreachRecommendation.channel}</strong> | Assignee: <strong>{selectedCaseDetail.nextOutreachRecommendation.assignedRole}</strong>
                      </div>
                      <div className="text-[11px] text-teal-700">
                        {selectedCaseDetail.nextOutreachRecommendation.description}
                      </div>
                    </div>
                  )}

                  {/* Log Outreach Attempt Form */}
                  <div className="p-4 border border-slate-200 rounded-xl space-y-3 bg-white">
                    <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wide text-slate-500">
                      Log New Outreach Attempt
                    </h4>
                    <div className="grid grid-cols-3 gap-2">
                      <select
                        value={outreachChannel}
                        onChange={(e) => setOutreachChannel(e.target.value as OutreachChannel)}
                        className="p-1.5 border border-slate-300 rounded text-xs bg-white"
                      >
                        <option value="SMS">SMS</option>
                        <option value="WHATSAPP">WHATSAPP</option>
                        <option value="CALL">VOICE CALL</option>
                        <option value="NAVIGATOR_VISIT">NAVIGATOR VISIT</option>
                        <option value="CLINICIAN">CLINICIAN</option>
                      </select>

                      <select
                        value={outreachOutcome}
                        onChange={(e) => setOutreachOutcome(e.target.value as OutreachOutcome)}
                        className="p-1.5 border border-slate-300 rounded text-xs bg-white"
                      >
                        <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
                        <option value="DELIVERED">DELIVERED (NO RESPONSE)</option>
                        <option value="NO_ANSWER">NO ANSWER</option>
                        <option value="DECLINED">DECLINED</option>
                        <option value="WRONG_NUMBER">WRONG NUMBER</option>
                      </select>

                      <select
                        value={barrierReason}
                        onChange={(e) => setBarrierReason(e.target.value as BarrierReason)}
                        className="p-1.5 border border-slate-300 rounded text-xs bg-white"
                      >
                        <option value="">No Barrier Documented</option>
                        <option value="FEAR_ANXIETY">FEAR_ANXIETY</option>
                        <option value="APPOINTMENT_UNAVAILABLE">APPOINTMENT_UNAVAILABLE</option>
                        <option value="COMPETING_PRIORITIES">COMPETING_PRIORITIES</option>
                        <option value="COST_INSURANCE">COST_INSURANCE</option>
                        <option value="LOW_HEALTH_LITERACY">LOW_HEALTH_LITERACY</option>
                        <option value="COMMUNICATION_FAILURE">COMMUNICATION_FAILURE</option>
                        <option value="TRANSPORT">TRANSPORT</option>
                        <option value="UNREACHABLE">UNREACHABLE</option>
                        <option value="OTHER">OTHER</option>
                      </select>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={outreachNotes}
                        onChange={(e) => setOutreachNotes(e.target.value)}
                        placeholder="Outreach notes..."
                        className="flex-1 p-1.5 border border-slate-300 rounded text-xs"
                      />
                      <button
                        onClick={handleRecordOutreach}
                        className="px-3 py-1.5 bg-slate-800 text-white rounded text-xs font-semibold hover:bg-slate-700"
                      >
                        Log Attempt
                      </button>
                    </div>

                    {/* Generate AI Draft Button */}
                    <div className="pt-2 border-t border-slate-100 flex justify-end">
                      <button
                        disabled={aiGenerating}
                        onClick={() => handleGenerateAiDraft(selectedCaseDetail.case.id)}
                        className="px-3 py-1.5 bg-teal-50 text-teal-700 border border-teal-200 rounded text-xs font-semibold hover:bg-teal-100 disabled:opacity-50"
                      >
                        {aiGenerating ? 'Generating...' : t.generateAiDraft}
                      </button>
                    </div>
                  </div>

                  {/* Outreach History */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wide text-slate-500">
                      Outreach Attempts History ({selectedCaseDetail.outreachAttempts.length})
                    </h4>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {selectedCaseDetail.outreachAttempts.map((o: any) => (
                        <div key={o.id} className="p-2 bg-slate-50 rounded border text-[11px] flex justify-between">
                          <div>
                            <span className="font-bold">{o.channel}</span> • <span className="font-mono">{o.outcome}</span>
                            {o.barrierReason && <span className="text-red-600 ml-2">[{o.barrierReason}]</span>}
                            {o.notes && <div className="text-slate-500 text-[10px] italic">{o.notes}</div>}
                          </div>
                          <span className="text-slate-400 font-mono text-[10px]">{o.attemptedAt.substring(0, 16)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* SUBTAB 2: CLINICAL ACTIONS (RBAC Enforced) */}
              {activeModalTab === 'actions' && (
                <div className="space-y-6">
                  {activeRole === 'PROGRAMME_ANALYST' && (
                    <div className="p-3 bg-amber-50 border border-amber-300 text-amber-900 rounded-lg text-xs font-semibold">
                      🔒 Read-Only Governance: Programme Analyst role cannot perform clinical mutations or status changes.
                    </div>
                  )}

                  {/* 1. Assign Owner */}
                  <div className="p-4 border border-slate-200 rounded-xl space-y-3 bg-white">
                    <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wide text-slate-500">
                      1. Assign Case Owner
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={assigneeId}
                        onChange={(e) => setAssigneeId(e.target.value)}
                        placeholder="Owner User ID"
                        className="p-1.5 border border-slate-300 rounded text-xs font-mono"
                      />
                      <input
                        type="text"
                        value={assigneeName}
                        onChange={(e) => setAssigneeName(e.target.value)}
                        placeholder="Owner Full Name"
                        className="p-1.5 border border-slate-300 rounded text-xs"
                      />
                      <select
                        value={assigneeRole}
                        onChange={(e) => setAssigneeRole(e.target.value as UserRole)}
                        className="p-1.5 border border-slate-300 rounded text-xs bg-white"
                      >
                        <option value="CLINICIAN">CLINICIAN</option>
                        <option value="NAVIGATOR">NAVIGATOR</option>
                      </select>
                    </div>
                    <button
                      disabled={activeRole === 'PROGRAMME_ANALYST'}
                      onClick={handleAssignOwner}
                      className="px-4 py-1.5 bg-teal-600 text-white rounded text-xs font-bold hover:bg-teal-700 disabled:opacity-40"
                    >
                      Assign Case Owner
                    </button>
                  </div>

                  {/* 2. Send Structured Referral (With Data-Sharing Consent Verification) */}
                  <div className="p-4 border border-slate-200 rounded-xl space-y-3 bg-white">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wide text-slate-500">
                        2. Send Structured Referral to Specialist
                      </h4>
                      {selectedCaseDetail.patient?.consentFlags?.dataSharingConsent ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          ✓ Data-Sharing Consent Granted
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                          ✗ Data-Sharing Consent Missing (Blocks Dispatch)
                        </span>
                      )}
                    </div>

                    {!selectedCaseDetail.patient?.consentFlags?.dataSharingConsent && (
                      <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-[11px]">
                        <strong>Governance Gate:</strong> Referral cannot be dispatched because the patient has not consented to external facility data sharing. Switch to the Patient PWA or obtain verbal authorization.
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-500 font-semibold">Receiving Facility:</label>
                        <input
                          type="text"
                          value={referralFacility}
                          onChange={(e) => setReferralFacility(e.target.value)}
                          className="w-full p-1.5 border border-slate-300 rounded text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 font-semibold">Specialty:</label>
                        <input
                          type="text"
                          value={referralSpecialty}
                          onChange={(e) => setReferralSpecialty(e.target.value)}
                          className="w-full p-1.5 border border-slate-300 rounded text-xs"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-semibold">Clinical Summary & Reason:</label>
                      <input
                        type="text"
                        value={referralSummary}
                        onChange={(e) => setReferralSummary(e.target.value)}
                        className="w-full p-1.5 border border-slate-300 rounded text-xs"
                      />
                    </div>

                    {referralError && (
                      <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 rounded text-xs">
                        {referralError}
                      </div>
                    )}
                    {referralSuccess && (
                      <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded text-xs">
                        {referralSuccess}
                      </div>
                    )}

                    <button
                      disabled={activeRole === 'PROGRAMME_ANALYST' || !selectedCaseDetail.patient?.consentFlags?.dataSharingConsent}
                      onClick={handleSendReferral}
                      className="px-4 py-2 bg-teal-600 text-white rounded text-xs font-bold hover:bg-teal-700 disabled:opacity-40 shadow-sm"
                    >
                      Dispatch Structured Referral
                    </button>
                  </div>

                  {/* 3. Facility Action (Accept or Reject) */}
                  <div className="p-4 border border-slate-200 rounded-xl space-y-3 bg-white">
                    <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wide text-slate-500">
                      3. Receiving Facility Response (Accept / Reject Simulation)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Simulates the receiving diagnostic clinic triaging the referral. If rejected, the case returns to the owner as ESCALATED.
                    </p>
                    <div className="flex gap-4 items-center">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="facAction"
                          checked={facilityActionType === 'ACCEPT'}
                          onChange={() => setFacilityActionType('ACCEPT')}
                        />
                        <span className="font-bold text-emerald-700">Accept Referral</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="facAction"
                          checked={facilityActionType === 'REJECT'}
                          onChange={() => setFacilityActionType('REJECT')}
                        />
                        <span className="font-bold text-rose-700">Reject Referral (Escalates)</span>
                      </label>
                    </div>

                    {facilityActionType === 'REJECT' && (
                      <div>
                        <label className="text-[10px] text-slate-500 font-semibold">Rejection Reason Code:</label>
                        <select
                          value={facilityRejectionReason}
                          onChange={(e) => setFacilityRejectionReason(e.target.value)}
                          className="w-full p-1.5 border border-slate-300 rounded text-xs bg-white"
                        >
                          <option value="CLINICAL_CAPACITY_EXCEEDED">CLINICAL_CAPACITY_EXCEEDED</option>
                          <option value="OUT_OF_CATCHMENT_AREA">OUT_OF_CATCHMENT_AREA</option>
                          <option value="INSUFFICIENT_CLINICAL_INFORMATION">INSUFFICIENT_CLINICAL_INFORMATION</option>
                          <option value="SPECIALTY_MISMATCH">SPECIALTY_MISMATCH</option>
                        </select>
                      </div>
                    )}

                    <button
                      disabled={activeRole === 'PROGRAMME_ANALYST'}
                      onClick={handleFacilityAction}
                      className="px-4 py-1.5 bg-slate-800 text-white rounded text-xs font-bold hover:bg-slate-700 disabled:opacity-40"
                    >
                      Record Facility Triage Decision
                    </button>
                  </div>

                  {/* 4. Book & Attend Appointment */}
                  <div className="p-4 border border-slate-200 rounded-xl space-y-3 bg-white">
                    <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wide text-slate-500">
                      4. Appointment Scheduling & Attendance
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-500 font-semibold">Appointment Date & Time:</label>
                        <input
                          type="text"
                          value={appointmentDate}
                          onChange={(e) => setAppointmentDate(e.target.value)}
                          className="w-full p-1.5 border border-slate-300 rounded text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 font-semibold">Location / Clinic Suite:</label>
                        <input
                          type="text"
                          value={appointmentFacility}
                          onChange={(e) => setAppointmentFacility(e.target.value)}
                          className="w-full p-1.5 border border-slate-300 rounded text-xs"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        disabled={activeRole === 'PROGRAMME_ANALYST'}
                        onClick={handleRecordAppointment}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 disabled:opacity-40"
                      >
                        Record Appointment Booked
                      </button>
                      <button
                        disabled={activeRole === 'PROGRAMME_ANALYST'}
                        onClick={handleMarkAttended}
                        className="px-3 py-1.5 bg-indigo-600 text-white rounded text-xs font-bold hover:bg-indigo-700 disabled:opacity-40"
                      >
                        Mark Patient Attended
                      </button>
                    </div>
                  </div>

                  {/* 5. Upload Diagnostic Report (Sets DIAGNOSTIC_DISPOSITION_DOCUMENTED) */}
                  <div className="p-4 border border-slate-200 rounded-xl space-y-3 bg-white">
                    <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wide text-slate-500">
                      5. Upload Synthetic Diagnostic Report & Document Disposition
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-500 font-semibold">Procedure Name:</label>
                        <input
                          type="text"
                          value={diagnosticProcedure}
                          onChange={(e) => setDiagnosticProcedure(e.target.value)}
                          className="w-full p-1.5 border border-slate-300 rounded text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 font-semibold">Specimen / Pathology ID:</label>
                        <input
                          type="text"
                          value={specimenId}
                          onChange={(e) => setSpecimenId(e.target.value)}
                          className="w-full p-1.5 border border-slate-300 rounded text-xs font-mono"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-semibold">Clinical Findings:</label>
                      <input
                        type="text"
                        value={diagnosticFindings}
                        onChange={(e) => setDiagnosticFindings(e.target.value)}
                        className="w-full p-1.5 border border-slate-300 rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-semibold">Diagnostic Disposition:</label>
                      <input
                        type="text"
                        value={diagnosticDisposition}
                        onChange={(e) => setDiagnosticDisposition(e.target.value)}
                        className="w-full p-1.5 border border-slate-300 rounded text-xs font-mono"
                      />
                    </div>
                    <button
                      disabled={activeRole === 'PROGRAMME_ANALYST'}
                      onClick={handleUploadDiagnosticReport}
                      className="px-4 py-2 bg-purple-600 text-white rounded text-xs font-bold hover:bg-purple-700 disabled:opacity-40 shadow-sm"
                    >
                      Document Disposition & Attach Report
                    </button>
                  </div>

                  {/* 6. Case Closure (Clinical Resolution vs Authorised Alternative) */}
                  <div className="p-4 border border-slate-200 rounded-xl space-y-3 bg-white">
                    <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wide text-slate-500">
                      6. Case Closure Governance (Clinical Resolution or Authorised Alternative)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Strict Gate: A case can reach CLOSED only with completed diagnostic disposition evidence OR an explicit human-authorised alternative. For alternatives, navigator requests and clinician authorises (requester $\neq$ authoriser).
                    </p>

                    <div className="flex gap-2">
                      <button
                        disabled={activeRole === 'PROGRAMME_ANALYST'}
                        onClick={() => handleCloseCase('CLINICAL')}
                        className="px-4 py-2 bg-emerald-600 text-white rounded text-xs font-bold hover:bg-emerald-700 disabled:opacity-40 shadow-sm"
                      >
                        Close via CLINICAL_RESOLUTION (Requires Evidence)
                      </button>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 mt-2">
                      <label className="text-[10px] text-slate-600 font-bold uppercase">
                        Or Request Authorised Alternative Closure:
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <select
                          value={authorisedReason}
                          onChange={(e) => setAuthorisedReason(e.target.value as AuthorisedAlternativeReason)}
                          className="p-1.5 border border-slate-300 rounded text-xs bg-white"
                        >
                          <option value="INFORMED_REFUSAL">INFORMED_REFUSAL</option>
                          <option value="TRANSFERRED_CARE">TRANSFERRED_CARE</option>
                          <option value="UNREACHABLE_AFTER_CONFIGURED_ATTEMPTS">UNREACHABLE_AFTER_CONFIGURED_ATTEMPTS</option>
                          <option value="DECEASED">DECEASED</option>
                          <option value="OTHER">OTHER</option>
                        </select>
                        <input
                          type="text"
                          value={closureNote}
                          onChange={(e) => setClosureNote(e.target.value)}
                          placeholder="Mandatory explanatory note..."
                          className="p-1.5 border border-slate-300 rounded text-xs"
                        />
                      </div>
                      <div className="flex justify-between items-center pt-1">
                        <button
                          disabled={activeRole === 'PROGRAMME_ANALYST'}
                          onClick={() => handleCloseCase('REQUEST_ALTERNATIVE')}
                          className="px-3 py-1.5 bg-amber-600 text-white rounded text-xs font-bold hover:bg-amber-700 disabled:opacity-40"
                        >
                          Submit Alternative Closure Request
                        </button>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Requester: USER-{activeRole}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SUBTAB 3: CONSULT THREAD */}
              {activeModalTab === 'consult' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wide text-slate-500">
                      Bimodal Consult Thread
                    </h4>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConsultScope('PATIENT_TO_CLINICIAN')}
                        className={`px-2.5 py-1 rounded text-xs font-semibold ${
                          consultScope === 'PATIENT_TO_CLINICIAN'
                            ? 'bg-teal-700 text-white'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        Patient-to-Clinician
                      </button>
                      <button
                        onClick={() => setConsultScope('CLINICIAN_TO_CLINICIAN')}
                        className={`px-2.5 py-1 rounded text-xs font-semibold ${
                          consultScope === 'CLINICIAN_TO_CLINICIAN'
                            ? 'bg-teal-700 text-white'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        Clinician-to-Clinician (Internal)
                      </button>
                    </div>
                  </div>

                  {consultScope === 'PATIENT_TO_CLINICIAN' && (
                    <div className="p-2.5 bg-amber-50 border border-amber-300 text-amber-900 rounded-lg text-xs font-medium">
                      ⚠️ EMERGENCY NOTICE: This thread is for non-urgent care navigation only. In emergencies, patients are instructed to call emergency services immediately.
                    </div>
                  )}

                  {/* Message History */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 max-h-72 overflow-y-auto">
                    {(!selectedCaseDetail.consultMessages || selectedCaseDetail.consultMessages.length === 0) ? (
                      <div className="text-center py-6 text-slate-400 text-xs">
                        No messages recorded in this consultation thread yet.
                      </div>
                    ) : (
                      selectedCaseDetail.consultMessages
                        .filter((m: any) => (m.scope || m.threadType) === consultScope)
                        .map((msg: ConsultMessage) => (
                          <div
                            key={msg.id}
                            className={`p-3 rounded-lg border text-xs max-w-lg ${
                              msg.senderRole === activeRole
                                ? 'bg-teal-50 border-teal-200 ms-auto text-teal-950'
                                : 'bg-white border-slate-200 me-auto text-slate-900'
                            }`}
                          >
                            <div className="flex justify-between items-center mb-1 text-[10px] text-slate-500 font-mono">
                              <span className="font-bold text-slate-800">{msg.senderName} ({msg.senderRole})</span>
                              <span>{msg.timestamp.substring(11, 16)}</span>
                            </div>
                            <p className="whitespace-pre-line leading-relaxed">{msg.content}</p>
                          </div>
                        ))
                    )}
                  </div>

                  {/* Input form */}
                  {activeRole !== 'PROGRAMME_ANALYST' ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={consultText}
                        onChange={(e) => setConsultText(e.target.value)}
                        placeholder={`Type message to ${consultScope === 'PATIENT_TO_CLINICIAN' ? 'patient' : 'colleague'}...`}
                        className="flex-1 p-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500"
                      />
                      <button
                        disabled={consultSending || !consultText.trim()}
                        onClick={handleSendConsultMessage}
                        className="px-4 py-2 bg-teal-600 text-white rounded-lg text-xs font-bold hover:bg-teal-700 disabled:opacity-40 shadow-sm"
                      >
                        Send
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 italic">
                      Programme Analyst role is read-only.
                    </div>
                  )}
                </div>
              )}

              {/* SUBTAB 4: TIMELINE */}
              {activeModalTab === 'timeline' && (
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wide text-slate-500">
                    Append-Only Case Event Log ({selectedCaseDetail.events.length})
                  </h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {selectedCaseDetail.events.map((evt: any) => (
                      <div key={evt.id} className="p-3 bg-white rounded-lg border border-slate-200 text-xs space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-mono font-bold text-teal-700">
                            {evt.fromState} → {evt.toState}
                          </span>
                          <span className="text-slate-400 font-mono text-[10px]">{evt.timestamp.substring(0, 16)}</span>
                        </div>
                        <div className="text-slate-700 text-[11px]">
                          Trigger: <strong>{evt.trigger}</strong> • Actor: <strong>{evt.actorName || evt.actorId}</strong> ({evt.actorRole})
                        </div>
                        {evt.note && <div className="text-slate-500 text-[10px] italic">Note: "{evt.note}"</div>}
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex justify-between text-xs font-mono text-teal-700">
                    <a
                      href={`/api/fhir/r4/Task/${selectedCaseDetail.case.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline flex items-center gap-1"
                    >
                      ↗ View as FHIR R4 Task Resource (JSON)
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
