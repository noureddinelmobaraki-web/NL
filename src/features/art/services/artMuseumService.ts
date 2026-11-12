import type { ArtMuseumPiece, MuseumSourceId } from '../types/art.types';
import {
  fetchChicagoArtworks,
  fetchClevelandArtworks,
  fetchMetMuseumArtworks,
  fetchVamMuseumArtworks,
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
    const [chicago, cleveland, met, vam, wiki, openverse] = await Promise.all([
      fetchChicagoArtworks(q, 32, page),
      fetchClevelandArtworks(q, 32, page),
      fetchMetMuseumArtworks(q, page),
      fetchVamMuseumArtworks(q, page),
      fetchWikimediaCommonsArtworks(q, page),
      fetchOpenverseArtworks(q, page),
    ]);
    const combined = deduplicateArtworks([
      ...chicago,
      ...cleveland,
      ...met,
      ...vam,
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
      const [chicago, cleveland, met, vam, wiki, openverse] = await Promise.all([
        fetchChicagoArtworks('oil painting masterpiece impressionism', 36, page),
        fetchClevelandArtworks('oil on canvas painting', 36, page),
        fetchMetMuseumArtworks('Van Gogh Monet Rembrandt Vermeer Cezanne', page),
        fetchVamMuseumArtworks('oil painting Turner Constable', page),
        fetchWikimediaCommonsArtworks('Featured pictures of paintings', page),
        fetchOpenverseArtworks('masterpiece oil painting museum', page),
      ]);
      results = [...chicago, ...cleveland, ...met, ...vam, ...wiki, ...openverse];
      break;
    }

    case 'photography': {
      const [chicagoPhotos, clevelandPhotos, wikiPhotos, openversePhotos, picsumPhotos] =
        await Promise.all([
          fetchChicagoArtworks('photograph landscape portrait', 32, page),
          fetchClevelandArtworks('photograph', 32, page),
          fetchWikimediaCommonsArtworks(
            'Featured pictures of landscapes photography',
            page,
          ),
          fetchOpenverseArtworks('fine art photography landscape', page),
          fetchPicsumGalleryPieces(page, 30),
        ]);
      results = [
        ...chicagoPhotos,
        ...clevelandPhotos,
        ...wikiPhotos,
        ...openversePhotos,
        ...picsumPhotos,
      ];
      break;
    }

    case 'picsum': {
      const [p1, p2, wikiPhotos] = await Promise.all([
        fetchPicsumGalleryPieces(page * 2 - 1, 30),
        fetchPicsumGalleryPieces(page * 2, 30),
        fetchWikimediaCommonsArtworks('Featured pictures of nature architecture', page),
      ]);
      results = [...p1, ...p2, ...wikiPhotos];
      break;
    }

    case 'japanese': {
      const [chicagoJp, clevelandJp, metJp, vamJp, wikiJp] = await Promise.all([
        fetchChicagoArtworks('Hokusai Hiroshige ukiyo-e woodblock print', 32, page),
        fetchClevelandArtworks('Japanese woodblock print Edo', 32, page),
        fetchMetMuseumArtworks('Hokusai Hiroshige Utamaro Japanese print', page),
        fetchVamMuseumArtworks('Japanese woodblock print ukiyo-e', page),
        fetchWikimediaCommonsArtworks('Ukiyo-e Hokusai Hiroshige', page),
      ]);
      results = [...chicagoJp, ...clevelandJp, ...metJp, ...vamJp, ...wikiJp];
      break;
    }

    case 'illustrations': {
      const [concepts, chicagoPrints, vamIll] = await Promise.all([
        fetchConceptIllustrationArtworks(page),
        fetchChicagoArtworks('watercolor illustration drawing poster', 32, page),
        fetchVamMuseumArtworks('illustration poster design', page),
      ]);
      results = [...concepts, ...chicagoPrints, ...vamIll];
      break;
    }

    case 'sculpture': {
      const [chicagoSculpt, clevelandSculpt, metSculpt, vamSculpt, wikiSculpt] =
        await Promise.all([
          fetchChicagoArtworks('marble bronze sculpture statue', 32, page),
          fetchClevelandArtworks('sculpture marble bronze', 32, page),
          fetchMetMuseumArtworks('Greek Roman Renaissance marble sculpture', page),
          fetchVamMuseumArtworks('marble sculpture statue', page),
          fetchWikimediaCommonsArtworks('Featured pictures of sculptures', page),
        ]);
      results = [
        ...chicagoSculpt,
        ...clevelandSculpt,
        ...metSculpt,
        ...vamSculpt,
        ...wikiSculpt,
      ];
      break;
    }

    case 'manuscripts': {
      const [clevelandMs, chicagoMs, metMs, vamMs, wikiMs] = await Promise.all([
        fetchClevelandArtworks('illuminated manuscript calligraphy', 32, page),
        fetchChicagoArtworks('manuscript calligraphy miniature', 32, page),
        fetchMetMuseumArtworks('Islamic calligraphy illuminated manuscript', page),
        fetchVamMuseumArtworks('illuminated manuscript calligraphy', page),
        fetchWikimediaCommonsArtworks('Illuminated manuscripts calligraphy', page),
      ]);
      results = [...clevelandMs, ...chicagoMs, ...metMs, ...vamMs, ...wikiMs];
      break;
    }

    case 'all':
    default: {
      const [chicago, cleveland, met, vam, wiki, openverse, picsum, concepts] =
        await Promise.all([
          fetchChicagoArtworks('impressionism masterpiece painting', 36, page),
          fetchClevelandArtworks('painting masterpiece', 36, page),
          fetchMetMuseumArtworks('Monet Van Gogh Vermeer', page),
          fetchVamMuseumArtworks('painting renaissance baroque', page),
          fetchWikimediaCommonsArtworks('Featured pictures of paintings', page),
          fetchOpenverseArtworks('fine art painting museum', page),
          fetchPicsumGalleryPieces(page, 24),
          fetchConceptIllustrationArtworks(page),
        ]);
      results = [
        ...chicago,
        ...cleveland,
        ...met,
        ...vam,
        ...wiki,
        ...openverse,
        ...picsum,
        ...concepts,
      ];
      break;
    }
  }

  const finalItems = deduplicateArtworks(results);
  if (finalItems.length === 0) {
    return fetchPicsumGalleryPieces(page, 30);
  }
  galleryCache.set(cacheKey, finalItems);
  return finalItems;
}

export function getMuseumBadgeLabel(source: MuseumSourceId): string {
  switch (source) {
    case 'chicago':
      return 'معهد شيكاغو للفنون (AIC)';
    case 'met':
      return 'متحف المتروبوليتان (The Met)';
    case 'cleveland':
      return 'متحف كليفلاند للفنون (CMA)';
    case 'vam':
      return 'متحف فيكتوريا وألبرت لندن (V&A)';
    case 'wikimedia':
      return 'ويكيميديا كومنز التراثية';
    case 'openverse':
      return 'مؤسسة سميثسونيان و Openverse';
    case 'concept-art':
      return 'معرض رسوم الكونسبت والأنمي';
    case 'picsum':
    default:
      return 'أرشيف التصوير الفوتوغرافي العالمي';
  }
}
