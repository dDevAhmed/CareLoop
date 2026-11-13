import rawTemplates from './patientTemplates.json';

export interface UnderstandingQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  plainExplanation: string;
}

export interface PatientResultTemplate {
  id: string;
  pathwayId: string;
  language: string;
  approvedBy: string;
  verified: boolean;
  testDisplayName: string;
  headline: string;
  plainExplanation: string;
  actionNeeded: string;
  criticalAlert?: string;
  simplifiedWording: string;
  understandingQuestions: UnderstandingQuestion[];
}

export const SYNTHETIC_DEMO_FOOTER = "Synthetic demo content, not clinically reviewed.";

export function getPatientResultTemplate(pathwayId: string, language: string = 'en'): PatientResultTemplate {
  const templates: PatientResultTemplate[] = rawTemplates.templates;

  // Exact match by pathway and language
  const exact = templates.find(
    (t) => t.pathwayId === pathwayId && t.language === language
  );
  if (exact) return exact;

  // Match by pathway with English fallback
  const pathwayEn = templates.find(
    (t) => t.pathwayId === pathwayId && t.language === 'en'
  );
  if (pathwayEn) return pathwayEn;

  // Match pathway prefix (e.g. colorectal, breast)
  if (pathwayId.includes('colorectal') || pathwayId.includes('fobt')) {
    const crc = templates.find((t) => t.pathwayId === 'colorectal-uae' && t.language === language);
    if (crc) return crc;
    return templates.find((t) => t.pathwayId === 'colorectal-uae' && t.language === 'en')!;
  }

  if (pathwayId.includes('breast') || pathwayId.includes('womens') || pathwayId.includes('cervical')) {
    const brc = templates.find((t) => t.pathwayId === 'breast-abudhabi' && t.language === language);
    if (brc) return brc;
    return templates.find((t) => t.pathwayId === 'breast-abudhabi' && t.language === 'en')!;
  }

  // Generic fallback
  return templates.find((t) => t.pathwayId === 'default')!;
}
