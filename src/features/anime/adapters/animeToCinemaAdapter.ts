import type { CinemaItem } from '../../../components/Movies/moviesDataClient';
import type { PlaySource } from '../../../components/Movies/MovieSourcesModal';
import type { AnimeItem, AnimeAudioMode } from '../types/anime.types';

export type UnifiedAnimeItem = AnimeItem & { titleEn?: string };

export function getAnimeNumericId(anime: AnimeItem, index: number): number {
  return anime.tmdbId || anime.malId || anime.anilistId || anime.kitsuId || 700000 + index;
}

export function adaptAnimeItemToCinemaItem(anime: AnimeItem, index: number): CinemaItem {
  return {
    id: getAnimeNumericId(anime, index),
    mediaType: anime.format === 'MOVIE' ? 'movie' : 'tv',
    title: anime.titleAr || anime.title || anime.titleRomaji || 'Anime',
    overview:
      anime.synopsisAr ||
      anime.synopsis ||
      'أنمي ياباني مترجم ومدبلج بجودة عالية عبر سيرفرات البث المباشر وسيدكس.',
    posterPath: anime.posterUrl,
    backdropPath: anime.bannerUrl || anime.posterUrl,
    rating: anime.score > 0 ? anime.score : 8.4,
    year: String(anime.year || 2025),
    genreIds: [16],
    genreNames: anime.genres?.length ? anime.genres : ['Anime', 'Animation'],
    seasons: 1,
    episodes: anime.episodesCount || 24,
    trailerKey: anime.trailerYoutubeId || '',
    imdbId: anime.imdbId,
    productionCompanies: (anime.studios?.length ? anime.studios : ['Japan Animation Studio']).map(
      (name, idx) => ({ id: idx + 1, name, logoPath: '' })
    ),
    cast: [],
    similar: [],
  };
}

export function buildAnimePlaySources(
  anime: UnifiedAnimeItem,
  season = 1,
  episode = 1,
): PlaySource[] {
  const ep = Math.max(1, episode);
  const s = Math.max(1, season);
  const sources: PlaySource[] = [];
  const malId = anime.malId || anime.anilistId;
  const anilistId = anime.anilistId || anime.malId;
  const slug = (anime.titleEn || anime.title || anime.titleRomaji || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  if (malId) {
    sources.push({
      id: 'vidlink-anime-sub',
      label: 'VidLink Anime (Sub)',
      url: `https://vidlink.pro/anime/${malId}/${ep}/sub`,
      host: 'vidlink.pro',
      origins: ['https://vidlink.pro'],
      timeoutMs: 12000,
    });
    sources.push({
      id: 'vidlink-anime-dub',
      label: 'VidLink Anime (Dub)',
      url: `https://vidlink.pro/anime/${malId}/${ep}/dub`,
      host: 'vidlink.pro',
      origins: ['https://vidlink.pro'],
      timeoutMs: 12000,
    });
    sources.push({
      id: 'vidplus-anime-sub',
      label: 'VidPlus Anime (Sub)',
      url: `https://player.vidplus.to/embed/anime/${malId}/${ep}?dub=false`,
      host: 'player.vidplus.to',
      origins: ['https://player.vidplus.to'],
      timeoutMs: 12000,
    });
    sources.push({
      id: 'vidplus-anime-dub',
      label: 'VidPlus Anime (Dub)',
      url: `https://player.vidplus.to/embed/anime/${malId}/${ep}?dub=true`,
      host: 'player.vidplus.to',
      origins: ['https://player.vidplus.to'],
      timeoutMs: 12000,
    });
  }

  if (anilistId) {
    sources.push({
      id: 'vidsrc-icu-sub',
      label: 'VidSrc Anime (Sub)',
      url: `https://vidsrc.icu/embed/anime/${anilistId}/${ep}/0`,
      host: 'vidsrc.icu',
      origins: ['https://vidsrc.icu'],
      timeoutMs: 12000,
    });
    sources.push({
      id: 'vidsrc-icu-dub',
      label: 'VidSrc Anime (Dub)',
      url: `https://vidsrc.icu/embed/anime/${anilistId}/${ep}/1`,
      host: 'vidsrc.icu',
      origins: ['https://vidsrc.icu'],
      timeoutMs: 12000,
    });
  }

  if (slug) {
    sources.push({
      id: '2embed-anime',
      label: '2Embed Anime',
      url: `https://www.2embed.cc/embedanime/${slug}-episode-${ep}`,
      host: '2embed.cc',
      origins: ['https://www.2embed.cc', 'https://2embed.cc'],
      timeoutMs: 12000,
    });
  }

  // Only include TMDB-based anime embeds if anime.tmdbId is genuinely resolved:
  if (anime.tmdbId) {
    sources.push({
      id: 'videasy-anime',
      label: 'Videasy HD',
      url: `https://player.videasy.net/tv/${anime.tmdbId}/${s}/${ep}`,
      host: 'player.videasy.net',
      origins: ['https://player.videasy.net'],
      timeoutMs: 12000,
    });
  }

  return sources;
}

export function buildAnimeCinemaPlaySources(
  anime: AnimeItem | undefined,
  episodeNumber: number,
  audioMode: AnimeAudioMode,
  seasonNumber = 1,
): PlaySource[] {
  if (!anime) return [];
  const all = buildAnimePlaySources(anime, seasonNumber, episodeNumber);
  if (audioMode === 'dub') {
    const dubFirst = all.filter((s) => s.id.endsWith('-dub'));
    const rest = all.filter((s) => !s.id.endsWith('-dub'));
    return [...dubFirst, ...rest];
  }
  return all;
}
