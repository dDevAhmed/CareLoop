import { JurisdictionPack, jurisdictionPackSchema } from '../types/pack';
import abuDhabiRaw from './abu-dhabi.json';
import whoRefRaw from './who-reference.json';
import lowResourceRaw from './low-resource.json';

// Validate each pack at runtime using Zod
const ABU_DHABI_PACK: JurisdictionPack = jurisdictionPackSchema.parse(abuDhabiRaw) as JurisdictionPack;
const WHO_REFERENCE_PACK: JurisdictionPack = jurisdictionPackSchema.parse(whoRefRaw) as JurisdictionPack;
const LOW_RESOURCE_PACK: JurisdictionPack = jurisdictionPackSchema.parse(lowResourceRaw) as JurisdictionPack;

export const JURISDICTION_PACKS: Record<string, JurisdictionPack> = {
  'abu-dhabi': ABU_DHABI_PACK,
  'who-reference': WHO_REFERENCE_PACK,
  'low-resource': LOW_RESOURCE_PACK,
};

export const DEFAULT_PACK_ID = 'abu-dhabi';

export function getJurisdictionPack(id?: string | null): JurisdictionPack {
  if (id && JURISDICTION_PACKS[id]) {
    return JURISDICTION_PACKS[id];
  }
  return JURISDICTION_PACKS[DEFAULT_PACK_ID];
}

export function getAllJurisdictionPacks(): JurisdictionPack[] {
  return Object.values(JURISDICTION_PACKS);
}

export function validateJurisdictionPack(data: unknown): JurisdictionPack {
  return jurisdictionPackSchema.parse(data) as JurisdictionPack;
}

export function getDefaultJurisdictionPack(): JurisdictionPack {
  return JURISDICTION_PACKS[DEFAULT_PACK_ID];
}

