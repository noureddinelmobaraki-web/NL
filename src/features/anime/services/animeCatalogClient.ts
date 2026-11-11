/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Anime Catalog & Scene Search Client
 * - Jikan REST API v4 (MAL)
 * - AniList GraphQL API (Ultra-HD banners & airing schedules)
 * - Kitsu API (Fast fallback)
 * - trace.moe API (Reverse image scene search)
 */

import type { AnimeItem, TraceMoeMatch } from '../types/anime.types';

const JIKAN_BASE = 'https://api.jikan.moe/v4';
const ANILIST_GQL = 'https://graphql.anilist.co';
const KITSU_BASE = 'https://kitsu.io/api/edge';
const TRACE_MOE_URL = 'https://api.trace.moe/search';

const CATALOG_CACHE = new Map<string, { ts: number; data: AnimeItem[] }>();
const CACHE_TTL_MS = 1000 * 60 * 15;

export const CURATED_ARABIC_DUB_ANIME: AnimeItem[] = [
  {
    id: 'mal-21',
    malId: 21,
    anilistId: 21,
    tmdbId: 37854,
    imdbId: 'tt0388629',
    title: 'One Piece',
    titleAr: 'ون بيس',
    titleRomaji: 'One Piece',
    synopsis: 'Follows the adventures of Monkey D. Luffy and his pirate crew in order to find the greatest treasure ever left by the legendary Pirate, Gold Roger.',
    synopsisAr: 'مغامرات مونكي دي لوفي وطاقم قبعة القش في البحث عن كنز ون بيس الأسطوري ليصبح ملك القراصنة.',
    posterUrl: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx21-YCDoj1EkAxFn.jpg',
    bannerUrl: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/21-wf37VakJmZqs.jpg',
    trailerYoutubeId: 'MCb13lbVGE0',
    score: 8.72,
    episodesCount: 1122,
    status: 'AIRING',
    format: 'TV',
    year: 1999,
    studios: ['Toei Animation'],
    genres: ['Action', 'Adventure', 'Fantasy'],
    hasSub: true,
    hasDub: true,
    hasArabicDub: true,
  },
  {
    id: 'mal-16498',
    malId: 16498,
    anilistId: 16498,
    tmdbId: 1429,
    imdbId: 'tt2560140',
    title: 'Attack on Titan',
    titleAr: 'هجوم العمالقة',
    titleRomaji: 'Shingeki no Kyojin',
    synopsis: 'After his hometown is destroyed and his mother is killed, young Eren Jaeger vows to cleanse the earth of the giant humanoid Titans.',
    synopsisAr: 'بعد تدمير مسقط رأسه، يقسم إيرين ييغر على تطهير الأرض من العمالقة العملاقة وكشف أسرار الأسوار.',
    posterUrl: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx16498-73IhOXpJZiMF.jpg',
    bannerUrl: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/16498-8jpFCOcDmneX.jpg',
    trailerYoutubeId: 'LHtdKWJdif4',
    score: 8.55,
    episodesCount: 25,
    status: 'FINISHED',
    format: 'TV',
    year: 2013,
    studios: ['Wit Studio', 'MAPPA'],
    genres: ['Action', 'Drama', 'Suspense'],
    hasSub: true,
    hasDub: true,
    hasArabicDub: true,
  },
  {
    id: 'mal-11061',
    malId: 11061,
    anilistId: 11061,
    tmdbId: 46298,
    imdbId: 'tt2098220',
    title: 'Hunter x Hunter (2011)',
    titleAr: 'القناص هانتر × هانتر',
    titleRomaji: 'Hunter x Hunter (2011)',
    synopsis: 'Gon Freecss aspires to become a Hunter, an exceptional being capable of greatness, to find his father who left him when he was young.',
    synopsisAr: 'رحلة غون فريكس ليصبح صياداً محترفاً برفقة كيلوا وكورابيكا وليوريو للعثور على والده الأسطوري.',
    posterUrl: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx11061-sIpBprNRfzCe.png',
    bannerUrl: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/11061-8WkkTZ6duKpq.jpg',
    trailerYoutubeId: 'd6kBeJjTGnY',
    score: 9.03,
    episodesCount: 148,
    status: 'FINISHED',
    format: 'TV',
    year: 2011,
    studios: ['Madhouse'],
    genres: ['Action', 'Adventure', 'Fantasy'],
    hasSub: true,
    hasDub: true,
    hasArabicDub: true,
  },
  {
    id: 'mal-38000',
    malId: 38000,
    anilistId: 101922,
    tmdbId: 85937,
    imdbId: 'tt9335498',
    title: 'Demon Slayer: Kimetsu no Yaiba',
    titleAr: 'قاتل الشياطين',
    titleRomaji: 'Kimetsu no Yaiba',
    synopsis: 'A family is attacked by demons and only two members survive - Tanjiro and his sister Nezuko, who is turning into a demon slowly.',
    synopsisAr: 'ينطلق تانجيرو كامادو في رحلة محفوفة بالمخاطر لإنقاذ أخته نيزوكو وإعادتها إلى هيئتها البشرية.',
    posterUrl: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx101922-PEn1CTc93blC.jpg',
    bannerUrl: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/101922-YfZhKBUDDS6L.jpg',
    trailerYoutubeId: 'VQGCKyvzIM4',
    score: 8.45,
    episodesCount: 26,
    status: 'FINISHED',
    format: 'TV',
    year: 2019,
    studios: ['ufotable'],
    genres: ['Action', 'Supernatural'],
    hasSub: true,
    hasDub: true,
    hasArabicDub: true,
  },
  {
    id: 'mal-40748',
    malId: 40748,
    anilistId: 113415,
    tmdbId: 95479,
    imdbId: 'tt12343534',
    title: 'Jujutsu Kaisen',
    titleAr: 'جوجوتسو كايسن',
    titleRomaji: 'Jujutsu Kaisen',
    synopsis: 'A boy swallows a cursed talisman - the finger of a demon - and becomes cursed himself. He enters a shaman school to be able to locate the demon other body parts.',
    synopsisAr: 'ينضم يوجي إيتادوري إلى أكاديمية مستعملي الجوجوتسو لمواجهة اللعنات القاتلة وحماية البشر.',
    posterUrl: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx113415-bbBWj4pEFseh.jpg',
    bannerUrl: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/113415-jQBSkxWAAk83.jpg',
    trailerYoutubeId: '4A_X-Dvl0ws',
    score: 8.61,
    episodesCount: 24,
    status: 'FINISHED',
    format: 'TV',
    year: 2020,
    studios: ['MAPPA'],
    genres: ['Action', 'Supernatural'],
    hasSub: true,
    hasDub: true,
    hasArabicDub: true,
  },
  {
    id: 'mal-52991',
    malId: 52991,
    anilistId: 154587,
    tmdbId: 209867,
    imdbId: 'tt22248376',
    title: 'Frieren: Beyond Journey’s End',
    titleAr: 'فريرين: ما وراء نهاية الرحلة',
    titleRomaji: 'Sousou no Frieren',
    synopsis: 'After the party of heroes defeated the Demon King, the elf mage Frieren embarks on a new journey to understand humanity and the meaning of time.',
    synopsisAr: 'بعد هزيمة ملك الشياطين، تنطلق الساحرة فريرين في رحلة تأملية لفهم البشر ومعنى الذكريات والزمن.',
    posterUrl: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx154587-n1fmjRv4JQUd.jpg',
    bannerUrl: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/154587-ivXNJ23SM1xB.jpg',
    trailerYoutubeId: 'Iwr1aLEDpe4',
    score: 9.32,
    episodesCount: 28,
    status: 'FINISHED',
    format: 'TV',
    year: 2023,
    studios: ['Madhouse'],
    genres: ['Adventure', 'Drama', 'Fantasy'],
    hasSub: true,
    hasDub: true,
    hasArabicDub: true,
  },
];

function mapJikanToAnimeItem(raw: any): AnimeItem {
  const malId = Number(raw?.mal_id) || undefined;
  const poster =
    raw?.images?.webp?.large_image_url ||
    raw?.images?.jpg?.large_image_url ||
    raw?.images?.webp?.image_url ||
    '';
  const banner = raw?.trailer?.images?.maximum_image_url || poster;
  const formatRaw = String(raw?.type || 'TV').toUpperCase();
  const format = (['TV', 'MOVIE', 'OVA', 'ONA', 'SPECIAL'].includes(formatRaw)
    ? formatRaw
    : 'TV') as AnimeItem['format'];

  return {
    id: malId ? `mal-${malId}` : `jikan-${Math.random().toString(36).slice(2, 9)}`,
    malId,
    title: raw?.title_english || raw?.title || 'Unknown Anime',
    titleRomaji: raw?.title || undefined,
    titleNative: raw?.title_japanese || undefined,
    synopsis: raw?.synopsis || 'No synopsis available.',
    posterUrl: poster,
    bannerUrl: banner,
    trailerYoutubeId: raw?.trailer?.youtube_id || undefined,
    score: Number(raw?.score) || 8.1,
    episodesCount: Number(raw?.episodes) || (format === 'MOVIE' ? 1 : 12),
    status: raw?.airing ? 'AIRING' : 'FINISHED',
    format,
    year: Number(raw?.year || raw?.aired?.prop?.from?.year) || 2024,
    season: raw?.season || undefined,
    studios: Array.isArray(raw?.studios)
      ? raw.studios.map((s: any) => s.name).filter(Boolean)
      : [],
    genres: Array.isArray(raw?.genres)
      ? raw.genres.map((g: any) => g.name).filter(Boolean)
      : [],
    hasSub: true,
    hasDub: true,
  };
}

function mapAniListToAnimeItem(media: any): AnimeItem {
  const anilistId = Number(media?.id) || undefined;
  const malId = Number(media?.idMal) || undefined;
  const poster = media?.coverImage?.extraLarge || media?.coverImage?.large || '';
  const banner = media?.bannerImage || poster;
  const rawScore = Number(media?.averageScore);
  const score = Number.isFinite(rawScore) && rawScore > 0 ? Number((rawScore / 10).toFixed(2)) : 8.2;
  const cleanDesc = String(media?.description || '')
    .replace(/<[^>]+>/g, '')
    .trim();

  return {
    id: malId ? `mal-${malId}` : `al-${anilistId}`,
    malId,
    anilistId,
    title: media?.title?.english || media?.title?.romaji || 'Anime',
    titleRomaji: media?.title?.romaji || undefined,
    titleNative: media?.title?.native || undefined,
    synopsis: cleanDesc || 'No synopsis available.',
    posterUrl: poster,
    bannerUrl: banner,
    trailerYoutubeId:
      media?.trailer?.site === 'youtube' ? media?.trailer?.id : undefined,
    score,
    episodesCount: Number(media?.episodes || media?.nextAiringEpisode?.episode - 1) || 12,
    status: media?.status === 'RELEASING' ? 'AIRING' : 'FINISHED',
    format: media?.format === 'MOVIE' ? 'MOVIE' : 'TV',
    year: Number(media?.seasonYear || media?.startDate?.year) || 2024,
    season: media?.season || undefined,
    studios: Array.isArray(media?.studios?.nodes)
      ? media.studios.nodes.map((s: any) => s.name).filter(Boolean)
      : [],
    genres: Array.isArray(media?.genres) ? media.genres : [],
    hasSub: true,
    hasDub: true,
    nextAiring: media?.nextAiringEpisode
      ? {
          episode: Number(media.nextAiringEpisode.episode),
          airingAt: Number(media.nextAiringEpisode.airingAt),
          timeUntilAiring: Number(media.nextAiringEpisode.timeUntilAiring),
        }
      : null,
  };
}

export async function fetchAniListCatalog(
  sort: 'TRENDING_DESC' | 'SCORE_DESC' | 'POPULARITY_DESC' = 'TRENDING_DESC',
  format?: 'MOVIE',
): Promise<AnimeItem[]> {
  const cacheKey = `anilist_${sort}_${format || 'ALL'}`;
  const cached = CATALOG_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data;

  const query = `
    query ($sort: [MediaSort], $format: MediaFormat) {
      Page(page: 1, perPage: 24) {
        media(type: ANIME, isAdult: false, sort: $sort, format: $format) {
          id
          idMal
          title { romaji english native }
          description(asHtml: false)
          coverImage { extraLarge large }
          bannerImage
          averageScore
          episodes
          status
          format
          season
          seasonYear
          startDate { year }
          genres
          studios(isMain: true) { nodes { name } }
          trailer { id site }
          nextAiringEpisode { episode airingAt timeUntilAiring }
        }
      }
    }
  `;

  try {
    const res = await fetch(ANILIST_GQL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        query,
        variables: { sort: [sort], ...(format ? { format } : {}) },
      }),
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) throw new Error(`AniList HTTP ${res.status}`);
    const json = await res.json();
    const list = Array.isArray(json?.data?.Page?.media)
      ? json.data.Page.media.map(mapAniListToAnimeItem)
      : [];
    if (list.length > 0) {
      CATALOG_CACHE.set(cacheKey, { ts: Date.now(), data: list });
    }
    return list;
  } catch {
    return [];
  }
}

export async function fetchJikanEndpoint(path: string): Promise<AnimeItem[]> {
  const cacheKey = `jikan_${path}`;
  const cached = CATALOG_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data;

  try {
    const res = await fetch(`${JIKAN_BASE}${path}`, {
      signal: AbortSignal.timeout(7500),
    });
    if (!res.ok) throw new Error(`Jikan HTTP ${res.status}`);
    const json = await res.json();
    const items = Array.isArray(json?.data)
      ? json.data.map(mapJikanToAnimeItem)
      : [];
    if (items.length > 0) {
      CATALOG_CACHE.set(cacheKey, { ts: Date.now(), data: items });
    }
    return items;
  } catch {
    return [];
  }
}

export async function searchAnimeMultiSource(query: string): Promise<AnimeItem[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const encoded = encodeURIComponent(trimmed);

  // 1. Primary Jikan v4 search
  const jikanResults = await fetchJikanEndpoint(`/anime?q=${encoded}&sfw=true&limit=24`);
  if (jikanResults.length > 0) return jikanResults;

  // 2. Fallback Kitsu API
  try {
    const res = await fetch(`${KITSU_BASE}/anime?filter[text]=${encoded}&page[limit]=20`, {
      signal: AbortSignal.timeout(6500),
    });
    if (!res.ok) return [];
    const json = await res.json();
    if (!Array.isArray(json?.data)) return [];
    return json.data.map((item: any): AnimeItem => {
      const attr = item?.attributes || {};
      const kitsuId = Number(item?.id) || undefined;
      return {
        id: `kitsu-${kitsuId}`,
        kitsuId,
        title: attr?.titles?.en || attr?.canonicalTitle || 'Anime',
        titleRomaji: attr?.titles?.en_jp || attr?.canonicalTitle,
        titleNative: attr?.titles?.ja_jp,
        synopsis: attr?.synopsis || '',
        posterUrl: attr?.posterImage?.large || attr?.posterImage?.original || '',
        bannerUrl: attr?.coverImage?.large || attr?.posterImage?.large || '',
        score: attr?.averageRating ? Number((Number(attr.averageRating) / 10).toFixed(1)) : 8.0,
        episodesCount: Number(attr?.episodeCount) || 12,
        status: attr?.status === 'current' ? 'AIRING' : 'FINISHED',
        format: attr?.subtype === 'movie' ? 'MOVIE' : 'TV',
        year: Number(String(attr?.startDate || '2024').slice(0, 4)) || 2024,
        studios: [],
        genres: [],
        hasSub: true,
        hasDub: true,
      };
    });
  } catch {
    return [];
  }
}

export async function searchAnimeSceneByImage(imageUrlOrFile: string | File): Promise<TraceMoeMatch[]> {
  try {
    let res: Response;
    if (typeof imageUrlOrFile === 'string') {
      res = await fetch(`${TRACE_MOE_URL}?anilistInfo&url=${encodeURIComponent(imageUrlOrFile)}`, {
        signal: AbortSignal.timeout(10000),
      });
    } else {
      const formData = new FormData();
      formData.append('image', imageUrlOrFile);
      res = await fetch(`${TRACE_MOE_URL}?anilistInfo`, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(12000),
      });
    }
    if (!res.ok) return [];
    const json = await res.json();
    if (!Array.isArray(json?.result)) return [];
    return json.result.slice(0, 5).map((r: any): TraceMoeMatch => ({
      anilistId: Number(r?.anilist?.id || r?.anilist) || 0,
      malId: Number(r?.anilist?.idMal) || undefined,
      title:
        r?.anilist?.title?.english ||
        r?.anilist?.title?.romaji ||
        r?.filename ||
        'Anime Match',
      episode: r?.episode ? Number(r.episode) : null,
      fromSec: Number(r?.from) || 0,
      toSec: Number(r?.to) || 0,
      similarity: Number(r?.similarity) || 0,
      videoPreviewUrl: r?.video || undefined,
      imagePreviewUrl: r?.image || undefined,
    }));
  } catch {
    return [];
  }
}
