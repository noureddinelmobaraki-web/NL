import type { ArtMuseumPiece, MuseumSourceId } from '../types/art.types';
import {
  fetchChicagoArtworks,
  fetchClevelandArtworks,
  fetchMetMuseumArtworks,
  fetchArchiveMetGalleryArtworks,
  fetchVamMuseumArtworks,
  fetchLocPrintsAndPhotographs,
  fetchSmithsonianNgaOpenverse,
  fetchWikimediaCommonsArtworks,
  fetchOpenverseArtworks,
  fetchConceptIllustrationArtworks,
  fetchPicsumGalleryPieces,
} from './museumApisClient';

const galleryCache = new Map<string, ArtMuseumPiece[]>();

function deduplicateArtworks(items: ArtMuseumPiece[]): ArtMuseumPiece[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (!item.imageUrl || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export async function fetchUnifiedArtGallery(
  category: string,
  searchQuery = '',
  page = 1,
): Promise<ArtMuseumPiece[]> {
  const cacheKey = `${category}::${searchQuery.trim().toLowerCase()}::p${page}`;
  const cached = galleryCache.get(cacheKey);
  if (cached && cached.length > 0) {
    return cached;
  }

  const q = searchQuery.trim();

  if (q.length > 0) {
    const [chicago, cleveland, met, iaMet, vam, loc, smithsonian, wiki, openverse] =
      await Promise.all([
        fetchChicagoArtworks(q, 24, page),
        fetchClevelandArtworks(q, 24, page),
        fetchMetMuseumArtworks(q, page),
        fetchArchiveMetGalleryArtworks(q, page),
        fetchVamMuseumArtworks(q, page),
        fetchLocPrintsAndPhotographs(q, page),
        fetchSmithsonianNgaOpenverse(q, page),
        fetchWikimediaCommonsArtworks(q, page),
        fetchOpenverseArtworks(q, page),
      ]);
    const combined = deduplicateArtworks([
      ...chicago,
      ...cleveland,
      ...met,
      ...iaMet,
      ...vam,
      ...loc,
      ...smithsonian,
      ...wiki,
      ...openverse,
    ]);
    if (combined.length > 0) {
      galleryCache.set(cacheKey, combined);
    }
    return combined;
  }

  let results: ArtMuseumPiece[] = [];

  switch (category) {
    case 'paintings': {
      const [chicago, cleveland, met, iaMet, vam, smithsonian, wiki] =
        await Promise.all([
          fetchChicagoArtworks('oil painting masterpiece impressionism', 28, page),
          fetchClevelandArtworks('oil on canvas painting', 28, page),
          fetchMetMuseumArtworks('Van Gogh Monet Rembrandt Vermeer Cezanne', page),
          fetchArchiveMetGalleryArtworks('painting', page),
          fetchVamMuseumArtworks('oil painting Turner Constable', page),
          fetchSmithsonianNgaOpenverse('oil painting masterpiece', page),
          fetchWikimediaCommonsArtworks('Featured pictures of paintings', page),
        ]);
      results = [...chicago, ...cleveland, ...met, ...iaMet, ...vam, ...smithsonian, ...wiki];
      break;
    }

    case 'photography': {
      const [chicagoPhotos, clevelandPhotos, locPhotos, wikiPhotos, openversePhotos, picsumPhotos] =
        await Promise.all([
          fetchChicagoArtworks('photograph landscape portrait', 24, page),
          fetchClevelandArtworks('photograph', 24, page),
          fetchLocPrintsAndPhotographs('historic photograph landscape', page),
          fetchWikimediaCommonsArtworks(
            'Featured pictures of landscapes photography',
            page,
          ),
          fetchOpenverseArtworks('fine art photography landscape', page),
          fetchPicsumGalleryPieces(page, 24),
        ]);
      results = [
        ...chicagoPhotos,
        ...clevelandPhotos,
        ...locPhotos,
        ...wikiPhotos,
        ...openversePhotos,
        ...picsumPhotos,
      ];
      break;
    }

    case 'picsum': {
      const [p1, p2, wikiPhotos] = await Promise.all([
        fetchPicsumGalleryPieces(page * 2 - 1, 24),
        fetchPicsumGalleryPieces(page * 2, 24),
        fetchWikimediaCommonsArtworks('Featured pictures of nature architecture', page),
      ]);
      results = [...p1, ...p2, ...wikiPhotos];
      break;
    }

    case 'japanese': {
      const [chicagoJp, clevelandJp, metJp, vamJp, wikiJp] = await Promise.all([
        fetchChicagoArtworks('Hokusai Hiroshige ukiyo-e woodblock print', 24, page),
        fetchClevelandArtworks('Japanese woodblock print Edo', 24, page),
        fetchMetMuseumArtworks('Hokusai Hiroshige Utamaro Japanese print', page),
        fetchVamMuseumArtworks('Japanese woodblock print ukiyo-e', page),
        fetchWikimediaCommonsArtworks('Ukiyo-e Hokusai Hiroshige', page),
      ]);
      results = [...chicagoJp, ...clevelandJp, ...metJp, ...vamJp, ...wikiJp];
      break;
    }

    case 'illustrations': {
      const [concepts, chicagoPrints, locPosters, vamIll] = await Promise.all([
        fetchConceptIllustrationArtworks(page),
        fetchChicagoArtworks('watercolor illustration drawing poster', 24, page),
        fetchLocPrintsAndPhotographs('vintage poster illustration', page),
        fetchVamMuseumArtworks('illustration poster design', page),
      ]);
      results = [...concepts, ...chicagoPrints, ...locPosters, ...vamIll];
      break;
    }

    case 'sculpture': {
      const [chicagoSculpt, clevelandSculpt, metSculpt, iaMetSculpt, vamSculpt, wikiSculpt] =
        await Promise.all([
          fetchChicagoArtworks('marble bronze sculpture statue', 24, page),
          fetchClevelandArtworks('sculpture marble bronze', 24, page),
          fetchMetMuseumArtworks('Greek Roman Renaissance marble sculpture', page),
          fetchArchiveMetGalleryArtworks('sculpture', page),
          fetchVamMuseumArtworks('marble sculpture statue', page),
          fetchWikimediaCommonsArtworks('Featured pictures of sculptures', page),
        ]);
      results = [
        ...chicagoSculpt,
        ...clevelandSculpt,
        ...metSculpt,
        ...iaMetSculpt,
        ...vamSculpt,
        ...wikiSculpt,
      ];
      break;
    }

    case 'manuscripts': {
      const [clevelandMs, chicagoMs, metMs, vamMs, wikiMs] = await Promise.all([
        fetchClevelandArtworks('illuminated manuscript calligraphy', 24, page),
        fetchChicagoArtworks('manuscript calligraphy miniature', 24, page),
        fetchMetMuseumArtworks('Islamic calligraphy illuminated manuscript', page),
        fetchVamMuseumArtworks('illuminated manuscript calligraphy', page),
        fetchWikimediaCommonsArtworks('Illuminated manuscripts calligraphy', page),
      ]);
      results = [...clevelandMs, ...chicagoMs, ...metMs, ...vamMs, ...wikiMs];
      break;
    }

    case 'all':
    default: {
      const [chicago, cleveland, met, iaMet, vam, loc, smithsonian, wiki, picsum] =
        await Promise.all([
          fetchChicagoArtworks('impressionism masterpiece painting', 24, page),
          fetchClevelandArtworks('painting masterpiece', 24, page),
          fetchMetMuseumArtworks('Monet Van Gogh Vermeer', page),
          fetchArchiveMetGalleryArtworks('', page),
          fetchVamMuseumArtworks('painting renaissance baroque', page),
          fetchLocPrintsAndPhotographs('masterpiece fine art print', page),
          fetchSmithsonianNgaOpenverse('painting portrait landscape', page),
          fetchWikimediaCommonsArtworks('Featured pictures of paintings', page),
          fetchPicsumGalleryPieces(page, 18),
        ]);
      results = [
        ...chicago,
        ...cleveland,
        ...met,
        ...iaMet,
        ...vam,
        ...loc,
        ...smithsonian,
        ...wiki,
        ...picsum,
      ];
      break;
    }
  }

  const finalItems = deduplicateArtworks(results);
  if (finalItems.length === 0) {
    return fetchPicsumGalleryPieces(page, 24);
  }
  galleryCache.set(cacheKey, finalItems);
  return finalItems;
}

export function getMuseumBadgeLabel(source: MuseumSourceId): string {
  switch (source) {
    case 'chicago':
      return 'Art Institute of Chicago (AIC)';
    case 'met':
      return 'The Metropolitan Museum of Art (The Met)';
    case 'ia-met':
      return 'Internet Archive Met Gallery';
    case 'cleveland':
      return 'Cleveland Museum of Art (CMA)';
    case 'vam':
      return 'Victoria and Albert Museum (V&A)';
    case 'loc':
      return 'Library of Congress Prints & Photos';
    case 'smithsonian':
      return 'Smithsonian & National Gallery (CC0)';
    case 'wikimedia':
      return 'Wikimedia Commons Featured';
    case 'openverse':
      return 'Openverse Global Commons';
    case 'concept-art':
      return 'Digital Concept & Anime Studio';
    case 'picsum':
    default:
      return 'High-Resolution Lens Archive';
  }
}
