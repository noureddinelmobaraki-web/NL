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
      (name, idx) => ({ id: idx + 1, name, logoPath: '' }),
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
  const malId = anime.malId;
  const anilistId = anime.anilistId;
  const tmdbId = anime.tmdbId;
  const imdbId = anime.imdbId;

  // 1. VidLink Anime (Official MAL ID endpoint with built-in fallback)
  if (malId) {
    sources.push({
      id: 'vidlink-anime-sub',
      label: 'VidLink Anime (Sub)',
      url: `https://vidlink.pro/anime/${malId}/${ep}/sub?fallback=true&primaryColor=dc2626&autoplay=true&nextbutton=true`,
      host: 'vidlink.pro',
      origins: ['https://vidlink.pro'],
      timeoutMs: 12000,
    });
    sources.push({
      id: 'vidlink-anime-dub',
      label: 'VidLink Anime (Dub)',
      url: `https://vidlink.pro/anime/${malId}/${ep}/dub?fallback=true&primaryColor=dc2626&autoplay=true&nextbutton=true`,
      host: 'vidlink.pro',
      origins: ['https://vidlink.pro'],
      timeoutMs: 12000,
    });
  }

  // 2. VidPlus Anime (Official AniList ID endpoint — requires AniList ID, NOT MAL ID)
  if (anilistId) {
    sources.push({
      id: 'vidplus-anime-sub',
      label: 'VidPlus Anime (Sub)',
      url: `https://player.vidplus.to/embed/anime/${anilistId}/${ep}?dub=false&autoplay=true&autonext=true`,
      host: 'player.vidplus.to',
      origins: ['https://player.vidplus.to'],
      timeoutMs: 12000,
    });
    sources.push({
      id: 'vidplus-anime-dub',
      label: 'VidPlus Anime (Dub)',
      url: `https://player.vidplus.to/embed/anime/${anilistId}/${ep}?dub=true&autoplay=true&autonext=true`,
      host: 'player.vidplus.to',
      origins: ['https://player.vidplus.to'],
      timeoutMs: 12000,
    });
  }

  // 3. VidSrc.icu Anime (Official AniList ID endpoint: 0 = sub, 1 = dub)
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

  // 4. Videasy Anime (Supports AniList ID directly or TMDB ID)
  if (anilistId) {
    sources.push({
      id: 'videasy-anime-sub',
      label: 'Videasy Anime HD (Sub)',
      url: `https://player.videasy.net/anime/${anilistId}/${ep}?dub=false`,
      host: 'player.videasy.net',
      origins: ['https://player.videasy.net'],
      timeoutMs: 12000,
    });
    sources.push({
      id: 'videasy-anime-dub',
      label: 'Videasy Anime HD (Dub)',
      url: `https://player.videasy.net/anime/${anilistId}/${ep}?dub=true`,
      host: 'player.videasy.net',
      origins: ['https://player.videasy.net'],
      timeoutMs: 12000,
    });
  } else if (tmdbId) {
    sources.push({
      id: 'videasy-tmdb',
      label: 'Videasy HD',
      url: `https://player.videasy.net/tv/${tmdbId}/${s}/${ep}`,
      host: 'player.videasy.net',
      origins: ['https://player.videasy.net'],
      timeoutMs: 12000,
    });
  }

  // 5. VidSrcMe / VidSrc.xyz (Works with IMDb or TMDB ID)
  if (imdbId || tmdbId) {
    const preferredId = imdbId || tmdbId;
    sources.push({
      id: 'vidsrcme-anime',
      label: 'VidSrcMe HD',
      url: `https://vidsrcme.ru/embed/tv/${preferredId}/${s}/${ep}?autonext=1`,
      host: 'vidsrcme.ru',
      origins: ['https://vidsrcme.ru'],
      timeoutMs: 12000,
    });
  }

  // 6. AutoEmbed Pro (Works with TMDB or IMDb ID)
  if (tmdbId || imdbId) {
    sources.push({
      id: 'autoembed-anime',
      label: 'AutoEmbed Multi',
      url: `https://player.autoembed.cc/embed/tv/${tmdbId || imdbId}/${s}/${ep}`,
      host: 'player.autoembed.cc',
      origins: ['https://player.autoembed.cc'],
      timeoutMs: 12000,
    });
  }

  // 7. MultiEmbed / SuperEmbed (Works with IMDb or TMDB ID)
  if (imdbId || tmdbId) {
    const query = imdbId
      ? `video_id=${imdbId}&s=${s}&e=${ep}`
      : `video_id=${tmdbId}&tmdb=1&s=${s}&e=${ep}`;
    sources.push({
      id: 'multiembed-anime',
      label: 'MultiEmbed VIP',
      url: `https://multiembed.mov/directstream.php?${query}`,
      host: 'multiembed.mov',
      origins: ['https://multiembed.mov', 'https://streamingnow.mov'],
      timeoutMs: 12000,
    });
  }

  // 8. 2Embed TV (Works with IMDb or TMDB ID)
  if (imdbId || tmdbId) {
    const preferredId = imdbId || tmdbId;
    sources.push({
      id: '2embed-tv-anime',
      label: '2Embed Multi',
      url: `https://www.2embed.cc/embedtv/${preferredId}&s=${s}&e=${ep}`,
      host: '2embed.cc',
      origins: ['https://www.2embed.cc', 'https://2embed.cc'],
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
    const dubSpecific = all.filter((s) => s.id.endsWith('-dub'));
    const universal = all.filter((s) => !s.id.endsWith('-sub') && !s.id.endsWith('-dub'));
    const subFallback = all.filter((s) => s.id.endsWith('-sub'));
    return [...dubSpecific, ...universal, ...subFallback];
  }
  const subSpecific = all.filter((s) => s.id.endsWith('-sub'));
  const universal = all.filter((s) => !s.id.endsWith('-sub') && !s.id.endsWith('-dub'));
  const dubFallback = all.filter((s) => s.id.endsWith('-dub'));
  return [...subSpecific, ...universal, ...dubFallback];
}
