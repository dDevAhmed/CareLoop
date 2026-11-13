import { z } from 'zod';
import { OutreachChannel, UserRole } from './index';

export interface WorkingDayCalendar {
  weekendDays: number[]; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  holidays: string[]; // ISO YYYY-MM-DD
}

export interface PatientGroupOption {
  id: string;
  label: string;
  labelLocalized?: string;
}

export interface PatientGroupField {
  id: string;
  label: string;
  labelLocalized?: string;
  options: PatientGroupOption[];
}

export interface PackLanguage {
  code: string;
  name: string;
  nameLocalized?: string;
  isRtl: boolean;
}

export interface PackUrgencyClass {
  id: 'ROUTINE' | 'URGENT' | 'CRITICAL';
  label: string;
  labelLocalized?: string;
  bypassRoutineSla: boolean;
  targetHours?: number;
}

export interface PackEscalationStep {
  step: number;
  delayWorkingDays: number;
  channel: OutreachChannel;
  assignedRole: UserRole;
  description: string;
  descriptionLocalized?: string;
}

export interface PackPathwayConfig {
  id: string;
  name: string;
  nameLocalized?: string;
  jurisdiction: string;
  sourceRef: string;
  sourceUrl?: string;
  verified: boolean;
  referenceOnly?: boolean;
  clinicalDeadlineWorkingDays: number;
  referralTargetPercent: number;
  urgencyClasses: PackUrgencyClass[];
  platformSlaHours: {
    ingestMaxHours: number;
    acknowledgementMaxHours: number;
    referralAcceptanceWorkingDays: number;
    closureDocumentationWorkingDays: number;
  };
  escalationLadder: PackEscalationStep[];
  codes: {
    screeningCode: string;
    screeningDisplay: string;
    confirmatoryCode: string;
    confirmatoryDisplay: string;
  };
}

export interface JurisdictionPack {
  id: string;
  name: string;
  nameLocalized?: string;
  description: string;
  version: string;
  workingDayCalendar: WorkingDayCalendar;
  languages: PackLanguage[];
  defaultLanguage: string;
  patientGroupFields: PatientGroupField[];
  enabledChannels: OutreachChannel[];
  terminologyPlaceholders: {
    screeningCodeSystemName: string;
    confirmatoryCodeSystemName: string;
    licenseNotice: string;
  };
  dataGovernanceNotes: string;
  pathways: PackPathwayConfig[];
}

// Zod Validation Schemas
export const workingDayCalendarSchema = z.object({
  weekendDays: z.array(z.number().min(0).max(6)),
  holidays: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
});

export const patientGroupOptionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  labelLocalized: z.string().optional(),
});

export const patientGroupFieldSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  labelLocalized: z.string().optional(),
  options: z.array(patientGroupOptionSchema).min(1),
});

export const packLanguageSchema = z.object({
  code: z.string().min(2),
  name: z.string().min(1),
  nameLocalized: z.string().optional(),
  isRtl: z.boolean(),
});

export const packUrgencyClassSchema = z.object({
  id: z.enum(['ROUTINE', 'URGENT', 'CRITICAL']),
  label: z.string().min(1),
  labelLocalized: z.string().optional(),
  bypassRoutineSla: z.boolean(),
  targetHours: z.number().optional(),
});

export const packEscalationStepSchema = z.object({
  step: z.number().int().positive(),
  delayWorkingDays: z.number().int().nonnegative(),
  channel: z.enum(['SMS', 'WHATSAPP', 'CALL', 'NAVIGATOR_VISIT', 'CLINICIAN']),
  assignedRole: z.enum(['PATIENT', 'CLINICIAN', 'NAVIGATOR', 'PROGRAMME_ANALYST']),
  description: z.string().min(1),
  descriptionLocalized: z.string().optional(),
});

export const packPathwayConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  nameLocalized: z.string().optional(),
  jurisdiction: z.string().min(1),
  sourceRef: z.string().min(1),
  sourceUrl: z.string().url().optional(),
  verified: z.boolean(),
  referenceOnly: z.boolean().optional(),
  clinicalDeadlineWorkingDays: z.number().int().positive(),
  referralTargetPercent: z.number().min(0).max(100),
  urgencyClasses: z.array(packUrgencyClassSchema).min(1),
  platformSlaHours: z.object({
    ingestMaxHours: z.number().positive(),
    acknowledgementMaxHours: z.number().positive(),
    referralAcceptanceWorkingDays: z.number().positive(),
    closureDocumentationWorkingDays: z.number().positive(),
  }),
  escalationLadder: z.array(packEscalationStepSchema).min(1),
  codes: z.object({
    screeningCode: z.string().min(1),
    screeningDisplay: z.string().min(1),
    confirmatoryCode: z.string().min(1),
    confirmatoryDisplay: z.string().min(1),
  }),
});

export const jurisdictionPackSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  nameLocalized: z.string().optional(),
  description: z.string().min(1),
  version: z.string().min(1),
  workingDayCalendar: workingDayCalendarSchema,
  languages: z.array(packLanguageSchema).min(1),
  defaultLanguage: z.string().min(2),
  patientGroupFields: z.array(patientGroupFieldSchema).min(1),
  enabledChannels: z.array(z.enum(['SMS', 'WHATSAPP', 'CALL', 'NAVIGATOR_VISIT', 'CLINICIAN'])).min(1),
  terminologyPlaceholders: z.object({
    screeningCodeSystemName: z.string().min(1),
    confirmatoryCodeSystemName: z.string().min(1),
    licenseNotice: z.string().min(1),
  }),
  dataGovernanceNotes: z.string().min(1),
  pathways: z.array(packPathwayConfigSchema).min(1),
});

