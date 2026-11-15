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

/**
 * Fast Incremental Museum Loader:
 * - On initial load (`page === 1`), fetches ONLY 2 ultra-fast IIIF sources (Chicago + V&A, 14 items total)
 *   so the initial grid renders in < 400ms instead of waiting for 9 concurrent museum APIs (~250 items).
 * - On subsequent scroll pages (`page = 2, 3, 4...`), rotates through the remaining museum vaults
 *   in lightweight batches of 12–16 items per scroll step.
 */
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
  const apiRound = Math.max(1, Math.ceil(page / 4));
  const bucket = (page - 1) % 4; // 0 = fast initial pair, 1 = Cleveland+Picsum/LOC, 2 = Met+IA-Met, 3 = Smithsonian+Wiki+Openverse

  if (q.length > 0) {
    let batch: ArtMuseumPiece[] = [];
    if (bucket === 0) {
      const [chicago, vam] = await Promise.all([
        fetchChicagoArtworks(q, 8, apiRound),
        fetchVamMuseumArtworks(q, apiRound),
      ]);
      batch = [...chicago, ...vam];
    } else if (bucket === 1) {
      const [cleveland, loc] = await Promise.all([
        fetchClevelandArtworks(q, 8, apiRound),
        fetchLocPrintsAndPhotographs(q, apiRound),
      ]);
      batch = [...cleveland, ...loc];
    } else if (bucket === 2) {
      const [met, iaMet] = await Promise.all([
        fetchMetMuseumArtworks(q, apiRound),
        fetchArchiveMetGalleryArtworks(q, apiRound),
      ]);
      batch = [...met, ...iaMet];
    } else {
      const [smithsonian, wiki, openverse] = await Promise.all([
        fetchSmithsonianNgaOpenverse(q, apiRound),
        fetchWikimediaCommonsArtworks(q, apiRound),
        fetchOpenverseArtworks(q, apiRound),
      ]);
      batch = [...smithsonian, ...wiki, ...openverse];
    }
    const combined = deduplicateArtworks(batch);
    if (combined.length > 0) {
      galleryCache.set(cacheKey, combined);
    }
    return combined;
  }

  let results: ArtMuseumPiece[] = [];

  switch (category) {
    case 'paintings': {
      if (bucket === 0) {
        const [chicago, vam] = await Promise.all([
          fetchChicagoArtworks('oil painting masterpiece impressionism', 8, apiRound),
          fetchVamMuseumArtworks('oil painting Turner Constable', apiRound),
        ]);
        results = [...chicago, ...vam];
      } else if (bucket === 1) {
        const [cleveland, wiki] = await Promise.all([
          fetchClevelandArtworks('oil on canvas painting', 8, apiRound),
          fetchWikimediaCommonsArtworks('Featured pictures of paintings', apiRound),
        ]);
        results = [...cleveland, ...wiki];
      } else if (bucket === 2) {
        const [met, iaMet] = await Promise.all([
          fetchMetMuseumArtworks('Van Gogh Monet Rembrandt Vermeer Cezanne', apiRound),
          fetchArchiveMetGalleryArtworks('painting', apiRound),
        ]);
        results = [...met, ...iaMet];
      } else {
        const [smithsonian, openverse] = await Promise.all([
          fetchSmithsonianNgaOpenverse('oil painting masterpiece', apiRound),
          fetchOpenverseArtworks('fine art oil painting', apiRound),
        ]);
        results = [...smithsonian, ...openverse];
      }
      break;
    }

    case 'photography': {
      if (bucket === 0) {
        const [chicagoPhotos, picsumPhotos] = await Promise.all([
          fetchChicagoArtworks('photograph landscape portrait', 8, apiRound),
          fetchPicsumGalleryPieces(apiRound, 8),
        ]);
        results = [...chicagoPhotos, ...picsumPhotos];
      } else if (bucket === 1) {
        const [clevelandPhotos, locPhotos] = await Promise.all([
          fetchClevelandArtworks('photograph', 8, apiRound),
          fetchLocPrintsAndPhotographs('historic photograph landscape', apiRound),
        ]);
        results = [...clevelandPhotos, ...locPhotos];
      } else {
        const [wikiPhotos, openversePhotos] = await Promise.all([
          fetchWikimediaCommonsArtworks('Featured pictures of landscapes photography', apiRound),
          fetchOpenverseArtworks('fine art photography landscape', apiRound),
        ]);
        results = [...wikiPhotos, ...openversePhotos];
      }
      break;
    }

    case 'picsum': {
      const [p1, wikiPhotos] = await Promise.all([
        fetchPicsumGalleryPieces(page, 10),
        fetchWikimediaCommonsArtworks('Featured pictures of nature architecture', page),
      ]);
      results = [...p1, ...wikiPhotos];
      break;
    }

    case 'japanese': {
      if (bucket === 0) {
        const [chicagoJp, vamJp] = await Promise.all([
          fetchChicagoArtworks('Hokusai Hiroshige ukiyo-e woodblock print', 8, apiRound),
          fetchVamMuseumArtworks('Japanese woodblock print ukiyo-e', apiRound),
        ]);
        results = [...chicagoJp, ...vamJp];
      } else {
        const [clevelandJp, metJp, wikiJp] = await Promise.all([
          fetchClevelandArtworks('Japanese woodblock print Edo', 6, apiRound),
          fetchMetMuseumArtworks('Hokusai Hiroshige Utamaro Japanese print', apiRound),
          fetchWikimediaCommonsArtworks('Ukiyo-e Hokusai Hiroshige', apiRound),
        ]);
        results = [...clevelandJp, ...metJp, ...wikiJp];
      }
      break;
    }

    case 'illustrations': {
      if (bucket === 0) {
        const [chicagoPrints, vamIll] = await Promise.all([
          fetchChicagoArtworks('watercolor illustration drawing poster', 8, apiRound),
          fetchVamMuseumArtworks('illustration poster design', apiRound),
        ]);
        results = [...chicagoPrints, ...vamIll];
      } else {
        const [concepts, locPosters] = await Promise.all([
          fetchConceptIllustrationArtworks(apiRound),
          fetchLocPrintsAndPhotographs('vintage poster illustration', apiRound),
        ]);
        results = [...concepts, ...locPosters];
      }
      break;
    }

    case 'sculpture': {
      if (bucket === 0) {
        const [chicagoSculpt, vamSculpt] = await Promise.all([
          fetchChicagoArtworks('marble bronze sculpture statue', 8, apiRound),
          fetchVamMuseumArtworks('marble sculpture statue', apiRound),
        ]);
        results = [...chicagoSculpt, ...vamSculpt];
      } else {
        const [clevelandSculpt, metSculpt, iaMetSculpt, wikiSculpt] =
          await Promise.all([
            fetchClevelandArtworks('sculpture marble bronze', 6, apiRound),
            fetchMetMuseumArtworks('Greek Roman Renaissance marble sculpture', apiRound),
            fetchArchiveMetGalleryArtworks('sculpture', apiRound),
            fetchWikimediaCommonsArtworks('Featured pictures of sculptures', apiRound),
          ]);
        results = [...clevelandSculpt, ...metSculpt, ...iaMetSculpt, ...wikiSculpt];
      }
      break;
    }

    case 'manuscripts': {
      if (bucket === 0) {
        const [chicagoMs, vamMs] = await Promise.all([
          fetchChicagoArtworks('manuscript calligraphy miniature', 8, apiRound),
          fetchVamMuseumArtworks('illuminated manuscript calligraphy', apiRound),
        ]);
        results = [...chicagoMs, ...vamMs];
      } else {
        const [clevelandMs, metMs, wikiMs] = await Promise.all([
          fetchClevelandArtworks('illuminated manuscript calligraphy', 6, apiRound),
          fetchMetMuseumArtworks('Islamic calligraphy illuminated manuscript', apiRound),
          fetchWikimediaCommonsArtworks('Illuminated manuscripts calligraphy', apiRound),
        ]);
        results = [...clevelandMs, ...metMs, ...wikiMs];
      }
      break;
    }

    case 'all':
    default: {
      if (bucket === 0) {
        // Page 1: Only 2 ultra-fast IIIF sources (14 artworks total -> < 400ms render)
        const [chicago, vam] = await Promise.all([
          fetchChicagoArtworks('impressionism masterpiece painting', 8, apiRound),
          fetchVamMuseumArtworks('painting renaissance baroque', apiRound),
        ]);
        results = [...chicago, ...vam];
      } else if (bucket === 1) {
        const [cleveland, picsum] = await Promise.all([
          fetchClevelandArtworks('painting masterpiece', 8, apiRound),
          fetchPicsumGalleryPieces(apiRound, 6),
        ]);
        results = [...cleveland, ...picsum];
      } else if (bucket === 2) {
        const [met, iaMet, loc] = await Promise.all([
          fetchMetMuseumArtworks('Monet Van Gogh Vermeer', apiRound),
          fetchArchiveMetGalleryArtworks('', apiRound),
          fetchLocPrintsAndPhotographs('masterpiece fine art print', apiRound),
        ]);
        results = [...met, ...iaMet, ...loc];
      } else {
        const [smithsonian, wiki] = await Promise.all([
          fetchSmithsonianNgaOpenverse('painting portrait landscape', apiRound),
          fetchWikimediaCommonsArtworks('Featured pictures of paintings', apiRound),
        ]);
        results = [...smithsonian, ...wiki];
      }
      break;
    }
  }

  const finalItems = deduplicateArtworks(results);
  if (finalItems.length === 0) {
    return fetchPicsumGalleryPieces(page, 12);
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
