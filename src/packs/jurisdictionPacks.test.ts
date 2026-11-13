import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { getJurisdictionPack, getAllJurisdictionPacks, validateJurisdictionPack } from './index';
import { computeCaseSla, addWorkingDays, isWeekend } from '../engine/slaEngine';
import { computeDisparityAnalysis } from '../engine/metricsEngine';
import { Case, Patient } from '../types';

describe('CareLoop Jurisdiction-Agnostic Engine & Pack Architecture', () => {
  it('strictly enforces that src/engine contains no hard-coded pack-specific strings ("UAE", "Abu Dhabi", or "Emirati")', () => {
    const engineDir = path.join(process.cwd(), 'src', 'engine');
    const files = fs.readdirSync(engineDir).filter((f) => f.endsWith('.ts'));

    const forbiddenRegex = /\b(UAE|Abu Dhabi|Emirati)\b/i;
    const violations: Array<{ file: string; line: number; content: string }> = [];

    for (const file of files) {
      const fullPath = path.join(engineDir, file);
      const content = fs.readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, idx) => {
        if (forbiddenRegex.test(line)) {
          violations.push({ file, line: idx + 1, content: line.trim() });
        }
      });
    }

    if (violations.length > 0) {
      console.error('Found prohibited jurisdiction strings in src/engine:', violations);
    }

    expect(violations).toEqual([]);
  });

  it('successfully loads and validates all 3 runtime packs with Zod schema', () => {
    const packs = getAllJurisdictionPacks();
    expect(packs.length).toBe(3);

    const packIds = packs.map((p) => p.id);
    expect(packIds).toContain('abu-dhabi');
    expect(packIds).toContain('who-reference');
    expect(packIds).toContain('low-resource');

    // Re-verify runtime validation function
    for (const p of packs) {
      const validated = validateJurisdictionPack(p);
      expect(validated.id).toBe(p.id);
      expect(validated.pathways.length).toBeGreaterThanOrEqual(2);
      expect(validated.languages.length).toBeGreaterThanOrEqual(1);
      expect(validated.patientGroupFields.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('yields different due dates and overdue flags for the same case sequence under different packs', () => {
    const abuDhabiPack = getJurisdictionPack('abu-dhabi');
    const whoPack = getJurisdictionPack('who-reference');
    const lowResourcePack = getJurisdictionPack('low-resource');

    // Colorectal pathway comparison:
    // Abu Dhabi FIT pathway: 31 working days
    // Ontario FIT pathway (WHO reference pack): 40 working days
    // Low-resource community FOBT pathway: 45 working days
    const crcAbuDhabi = abuDhabiPack.pathways.find((p) => p.id.includes('colorectal'))!;
    const crcOntario = whoPack.pathways.find((p) => p.id.includes('colorectal'))!;
    const crcLowResource = lowResourcePack.pathways.find((p) => p.id.includes('fobt'))!;

    const baseScreeningDate = '2026-08-03T08:00:00Z'; // Monday

    const slaAbuDhabi = computeCaseSla(
      baseScreeningDate,
      crcAbuDhabi as any,
      'ROUTINE',
      '2026-09-20T08:00:00Z',
      abuDhabiPack.workingDayCalendar
    );

    const slaOntario = computeCaseSla(
      baseScreeningDate,
      crcOntario as any,
      'ROUTINE',
      '2026-09-20T08:00:00Z',
      whoPack.workingDayCalendar
    );

    const slaLowResource = computeCaseSla(
      baseScreeningDate,
      crcLowResource as any,
      'ROUTINE',
      '2026-09-20T08:00:00Z',
      lowResourcePack.workingDayCalendar
    );

    // Under Abu Dhabi pack (31 working days, 5 days/wk), the case is overdue by 2026-09-20
    expect(slaAbuDhabi.isOverdue).toBe(true);
    expect(slaAbuDhabi.workingDaysRemaining).toBeLessThan(0);

    // Under Ontario pack (40 working days, 5 days/wk), the case is NOT overdue by 2026-09-20
    expect(slaOntario.isOverdue).toBe(false);
    expect(slaOntario.workingDaysRemaining).toBeGreaterThan(0);

    // Under Low Resource pack (45 working days, 6 days/wk [Sunday only]), different deadline
    expect(slaLowResource.clinicalDeadline).not.toBe(slaAbuDhabi.clinicalDeadline);
    expect(slaLowResource.clinicalDeadline).not.toBe(slaOntario.clinicalDeadline);
  });

  it('calculates working days differently using each pack calendar (e.g. low-resource Sunday-only vs standard Saturday/Sunday)', () => {
    const abuDhabiPack = getJurisdictionPack('abu-dhabi');
    const lowResourcePack = getJurisdictionPack('low-resource');

    // On Saturday 2026-08-08:
    // Abu Dhabi pack considers Saturday a non-working weekend day
    const satDate = new Date('2026-08-08T10:00:00Z');
    expect(isWeekend(satDate, abuDhabiPack.workingDayCalendar)).toBe(true);

    // Low-resource pack has weekendDays = [0] (Sunday only); Saturday is a working day
    expect(isWeekend(satDate, lowResourcePack.workingDayCalendar)).toBe(false);

    // Therefore, adding 5 working days from Friday yields an earlier completion in low-resource pack
    const startFriday = new Date('2026-08-07T08:00:00Z');
    const adTarget = addWorkingDays(startFriday, 5, abuDhabiPack.workingDayCalendar);
    const lrTarget = addWorkingDays(startFriday, 5, lowResourcePack.workingDayCalendar);

    // Low resource finishes earlier because Saturday was counted as a working day
    expect(lrTarget.getTime()).toBeLessThan(adTarget.getTime());
  });

  it('dynamically adapts fairness group analysis based on the active pack patientGroupFields', () => {
    const whoPack = getJurisdictionPack('who-reference');

    const cases: Case[] = [];
    const patientsMap = new Map<string, Patient>();

    // Seed 12 cases with residencyStatus (from WHO pack)
    for (let i = 1; i <= 12; i++) {
      const pid = `WHO-PAT-${i}`;
      patientsMap.set(pid, {
        id: pid,
        externalPatientId: `EXT-WHO-${i}`,
        synthetic: true,
        fullName: `Patient ${i}`,
        dateOfBirth: '1975-01-01',
        gender: 'FEMALE',
        language: 'en',
        residencyStatus: 'PERMANENT_RESIDENT',
        phone: '+1555000000',
        consentFlags: {
          smsConsent: true,
          whatsappConsent: false,
          callConsent: true,
          navigatorOutreachConsent: true,
          dataSharingConsent: true,
          lastUpdated: '2026-08-01T00:00:00Z',
        },
        createdAt: '2026-08-01T00:00:00Z',
        updatedAt: '2026-08-01T00:00:00Z',
      });

      cases.push({
        id: `WHO-CASE-${i}`,
        caseNumber: `CL-WHO-${i}`,
        synthetic: true,
        patientId: pid,
        pathwayId: 'cervical-who',
        currentState: 'CLOSED',
        previousState: 'DIAGNOSTIC_DISPOSITION_DOCUMENTED',
        urgency: 'ROUTINE',
        screeningResultId: `RES-WHO-${i}`,
        screeningTestType: 'HPV_DNA_POSITIVE',
        screeningTestDate: '2026-08-01T00:00:00Z',
        milestones: {
          notificationDeliveredAt: '2026-08-01T08:00:00Z',
          acknowledgedAt: '2026-08-02T08:00:00Z',
          attendedAt: '2026-08-10T08:00:00Z',
        },
        clinicalDeadline: '2026-09-15T00:00:00Z',
        platformSlaDueDate: '2026-08-05T00:00:00Z',
        isOverdue: false,
        closure: {
          closureType: 'CLINICAL_RESOLUTION',
          authoriserId: 'CLN-01',
          authoriserName: 'Dr. Clinician',
          authoriserRole: 'CLINICIAN',
          clinicalEvidenceRef: `COLPO-REF-${i}`,
          closureNote: 'Treatment documented',
          closedAt: '2026-08-15T00:00:00Z',
        },
        createdAt: '2026-08-01T00:00:00Z',
        updatedAt: '2026-08-15T00:00:00Z',
      });
    }

    const disparity = computeDisparityAnalysis(cases, patientsMap, whoPack.patientGroupFields);
    expect(disparity.byGroupField['residencyStatus']).toBeDefined();
    const permRes = disparity.byGroupField['residencyStatus'].find((g) => g.groupId === 'PERMANENT_RESIDENT');
    expect(permRes?.totalCases).toBe(12);
    expect(permRes?.groupLabel).toBe('Permanent Resident');
    expect(permRes?.suppressed).toBe(false);
  });
});
