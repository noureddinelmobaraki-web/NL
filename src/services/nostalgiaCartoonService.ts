import type { SpacetoonPlanetId, CartoonSeriesItem } from '../features/cartoon/types/cartoon.types';
import { SPACETOON_ARCHIVE_REGISTRY } from '../features/cartoon/services/spacetoonArchiveRegistry';
import { SPACETOON_PLANET_ORBS } from '../features/cartoon/components/planets/spacetoonPlanetTextures';

export interface NostalgiaPlanetSummary {
  id: SpacetoonPlanetId;
  nameAr: string;
  subtitleAr: string;
  seriesCount: number;
}

export function getNostalgiaPlanetsSummary(): NostalgiaPlanetSummary[] {
  return SPACETOON_PLANET_ORBS.map((orb) => ({
    id: orb.id,
    nameAr: orb.nameAr,
    subtitleAr: orb.subtitleAr,
    seriesCount:
      orb.id === 'all'
        ? SPACETOON_ARCHIVE_REGISTRY.length
        : SPACETOON_ARCHIVE_REGISTRY.filter((s: CartoonSeriesItem) => s.planet === orb.id).length,
  }));
}

export function getClassicCartoonCatalogByPlanet(
  planetId: SpacetoonPlanetId = 'all'
): CartoonSeriesItem[] {
  if (planetId === 'all') return SPACETOON_ARCHIVE_REGISTRY;
  return SPACETOON_ARCHIVE_REGISTRY.filter((s: CartoonSeriesItem) => s.planet === planetId);
}
