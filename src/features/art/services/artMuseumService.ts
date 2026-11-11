import type { ArtMuseumPiece, MuseumSourceId } from '../types/art.types';
import {
  fetchChicagoArtworks,
  fetchClevelandArtworks,
  fetchMetMuseumArtworks,
} from './museumApisClient';

export type ArtGalleryCategory =
  | 'all'
  | 'chicago'
  | 'met'
  | 'cleveland'
  | 'islamic'
  | 'impressionism'
  | 'renaissance'
  | 'japanese';

const CATEGORY_DEFAULT_QUERIES: Record<ArtGalleryCategory, string> = {
  all: 'masterpiece painting landscape portrait',
  chicago: 'impressionism monet van gogh',
  met: 'european paintings Vermeer Rembrandt',
  cleveland: 'renaissance portrait landscape',
  islamic: 'Islamic calligraphy arabesque manuscript',
  impressionism: 'Impressionism Claude Monet Renoir Degas',
  renaissance: 'Renaissance Leonardo Raphael Botticelli',
  japanese: 'Ukiyo-e Hokusai Hiroshige woodblock',
};

export async function fetchUnifiedArtGallery(
  category: ArtGalleryCategory,
  searchQuery: string
): Promise<ArtMuseumPiece[]> {
  const effectiveQuery = searchQuery.trim() || CATEGORY_DEFAULT_QUERIES[category] || 'masterpiece';

  if (category === 'chicago') {
    return fetchChicagoArtworks(effectiveQuery);
  }
  if (category === 'met') {
    return fetchMetMuseumArtworks(effectiveQuery);
  }
  if (category === 'cleveland') {
    return fetchClevelandArtworks(effectiveQuery);
  }

  const [chicagoRes, clevelandRes, metRes] = await Promise.allSettled([
    fetchChicagoArtworks(effectiveQuery),
    fetchClevelandArtworks(effectiveQuery),
    fetchMetMuseumArtworks(effectiveQuery),
  ]);

  const combined: ArtMuseumPiece[] = [];
  if (chicagoRes.status === 'fulfilled') combined.push(...chicagoRes.value);
  if (clevelandRes.status === 'fulfilled') combined.push(...clevelandRes.value);
  if (metRes.status === 'fulfilled') combined.push(...metRes.value);

  const seen = new Set<string>();
  return combined.filter((item) => {
    if (!item.imageUrl) return false;
    const key = item.title.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function getMuseumBadgeLabel(source: MuseumSourceId): string {
  switch (source) {
    case 'chicago':
      return 'Art Institute of Chicago';
    case 'met':
      return 'The Met Museum (NY)';
    case 'cleveland':
      return 'Cleveland Museum of Art';
    default:
      return 'Global Open Access Museum';
  }
}
