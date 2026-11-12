import type { ArtMuseumPiece, MuseumSourceId } from '../types/art.types';
import {
  fetchChicagoArtworks,
  fetchClevelandArtworks,
  fetchConceptIllustrationArtworks,
  fetchMetMuseumArtworks,
  fetchOpenverseArtworks,
  fetchVamMuseumArtworks,
  fetchWikimediaCommonsArtworks,
} from './museumApisClient';
import {
  fetchPicsumPhotography,
  getNlLensPhotography,
} from './photographyClient';

export type ArtGalleryCategory =
  | 'all'
  | 'chicago'
  | 'met'
  | 'cleveland'
  | 'vam'
  | 'wikimedia'
  | 'openverse'
  | 'concept-art'
  | 'islamic'
  | 'impressionism'
  | 'renaissance'
  | 'japanese';

const CATEGORY_DEFAULT_QUERIES: Record<ArtGalleryCategory, string> = {
  all: 'masterpiece painting landscape portrait',
  chicago: 'impressionism monet van gogh',
  met: 'european paintings Vermeer Rembrandt',
  cleveland: 'renaissance portrait landscape',
  vam: 'royal design textile sculpture painting',
  wikimedia: 'oil painting museum masterpiece',
  openverse: 'fine art photography architecture',
  'concept-art': 'anime digital illustration concept',
  islamic: 'Islamic calligraphy arabesque manuscript',
  impressionism: 'Impressionism Claude Monet Renoir Degas',
  renaissance: 'Renaissance Leonardo Raphael Botticelli',
  japanese: 'Ukiyo-e Hokusai Hiroshige woodblock',
};

async function withPhotographyFallback(
  items: ArtMuseumPiece[],
): Promise<ArtMuseumPiece[]> {
  if (items.length > 0) return items;
  const picsum = await fetchPicsumPhotography(1);
  return [...getNlLensPhotography(), ...picsum.slice(0, 16)];
}

export async function fetchUnifiedArtGallery(
  category: ArtGalleryCategory,
  searchQuery: string
): Promise<ArtMuseumPiece[]> {
  const effectiveQuery =
    searchQuery.trim() || CATEGORY_DEFAULT_QUERIES[category] || 'masterpiece';

  let rawResults: ArtMuseumPiece[] = [];

  if (category === 'chicago') {
    rawResults = await fetchChicagoArtworks(effectiveQuery);
  } else if (category === 'met') {
    rawResults = await fetchMetMuseumArtworks(effectiveQuery);
  } else if (category === 'cleveland') {
    rawResults = await fetchClevelandArtworks(effectiveQuery);
  } else if (category === 'vam') {
    rawResults = await fetchVamMuseumArtworks(effectiveQuery);
  } else if (category === 'wikimedia') {
    rawResults = await fetchWikimediaCommonsArtworks(effectiveQuery);
  } else if (category === 'openverse') {
    rawResults = await fetchOpenverseArtworks(effectiveQuery);
  } else if (category === 'concept-art') {
    rawResults = await fetchConceptIllustrationArtworks();
  } else {
    const settled = await Promise.allSettled([
      fetchChicagoArtworks(effectiveQuery),
      fetchClevelandArtworks(effectiveQuery),
      fetchMetMuseumArtworks(effectiveQuery),
      fetchVamMuseumArtworks(effectiveQuery),
      fetchWikimediaCommonsArtworks(effectiveQuery),
      fetchOpenverseArtworks(effectiveQuery),
    ]);

    for (const res of settled) {
      if (res.status === 'fulfilled') {
        rawResults.push(...res.value);
      }
    }
  }

  const seen = new Set<string>();
  const merged = rawResults.filter((item) => {
    if (!item.imageUrl) return false;
    const key = `${item.source}:${item.title.toLowerCase().trim()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (merged.length === 0) {
    return withPhotographyFallback([]);
  }
  return merged;
}

export async function fetchCuratedArtworksFeed(
  category: ArtGalleryCategory = 'all',
): Promise<ArtMuseumPiece[]> {
  return fetchUnifiedArtGallery(category, '');
}

export async function searchGlobalArtworks(
  query: string,
): Promise<ArtMuseumPiece[]> {
  return fetchUnifiedArtGallery('all', query);
}

export function getMuseumBadgeLabel(source: MuseumSourceId): string {
  switch (source) {
    case 'chicago':
      return 'Art Institute of Chicago';
    case 'met':
      return 'The Met Museum (NY)';
    case 'cleveland':
      return 'Cleveland Museum of Art';
    case 'vam':
      return 'Victoria & Albert Museum';
    case 'wikimedia':
      return 'Wikimedia Commons';
    case 'openverse':
      return 'Openverse CC';
    case 'concept-art':
      return 'Digital Concept Art';
    default:
      return 'Global Open Access Museum';
  }
}
