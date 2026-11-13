import { PathwayConfig } from '../types';
import { getJurisdictionPack, getAllJurisdictionPacks } from '../packs';

export function getPathwayConfig(pathwayId: string, packId?: string): PathwayConfig | undefined {
  if (packId) {
    const pack = getJurisdictionPack(packId);
    const found = pack.pathways.find((p) => p.id === pathwayId);
    if (found) return found as unknown as PathwayConfig;
  }

  // Search across all packs
  for (const pack of getAllJurisdictionPacks()) {
    const match = pack.pathways.find((p) => p.id === pathwayId);
    if (match) return match as unknown as PathwayConfig;
  }

  return undefined;
}

export function getAllPathways(packId?: string): PathwayConfig[] {
  if (packId) {
    return getJurisdictionPack(packId).pathways as unknown as PathwayConfig[];
  }
  return getAllJurisdictionPacks().flatMap((p) => p.pathways as unknown as PathwayConfig[]);
}

export function getActivePathways(packId?: string): PathwayConfig[] {
  return getAllPathways(packId).filter((p) => !p.referenceOnly);
}
