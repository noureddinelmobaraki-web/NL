import type { CinemaItem } from '../../../components/Movies/moviesDataClient';
import type { PlaySource } from '../../../components/Movies/MovieSourcesModal';
import type { AnimeItem, AnimeAudioMode } from '../types/anime.types';

export type UnifiedAnimeItem = AnimeItem & { titleEn?: string };

const OFFICIAL_YOUTUBE_PLAYLIST_BY_MAL_ID: Record<number, string> = {
  38000: 'PLwLSw1_eDZl1ADcL2231c9tPH1u7W6d3G', // Muse Asia Official
  40748: 'PLwLSw1_eDZl0a8K5k2e_vA1hG7x6V8m3R',
};

export function getAnimeNumericId(anime: AnimeItem, index: number): number {
  const base =
    anime.anilistId ||
    anime.malId ||
    anime.kitsuId ||
    anime.tmdbId ||
    index + 1;
  return 10_000_000 + Number(base);
}

export function adaptAnimeItemToCinemaItem(anime: AnimeItem, index: number): CinemaItem {
  return {
    id: getAnimeNumericId(anime, index),
    hub: 'anime',
    tmdbId: anime.tmdbId,
    malId: anime.malId,
    anilistId: anime.anilistId,
    kitsuId: anime.kitsuId,
    mediaType: anime.format === 'MOVIE' ? 'movie' : 'tv',
    title: anime.title || anime.titleRomaji || 'Anime',
    overview:
      anime.synopsis ||
      anime.synopsisAr ||
      'Japanese Anime streaming in HD with Sub & Dub.',
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
  const youtubePlaylistId =
    anime.youtubePlaylistId ||
    (malId ? OFFICIAL_YOUTUBE_PLAYLIST_BY_MAL_ID[malId] : undefined);

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

  // 2. VidPlus Anime (Official AniList ID endpoint — requires AniList ID)
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

  // 3. Videasy Anime (Requires AniList ID)
  if (anilistId) {
    sources.push({
      id: 'videasy-anime-sub',
      label: 'Videasy Anime (Sub)',
      url: `https://player.videasy.net/anime/${anilistId}/${ep}?dub=false`,
      host: 'player.videasy.net',
      origins: ['https://player.videasy.net'],
      timeoutMs: 12000,
    });
    sources.push({
      id: 'videasy-anime-dub',
      label: 'Videasy Anime (Dub)',
      url: `https://player.videasy.net/anime/${anilistId}/${ep}?dub=true`,
      host: 'player.videasy.net',
      origins: ['https://player.videasy.net'],
      timeoutMs: 12000,
    });
  }

  // 4. VidSrc.icu Anime (Official AniList ID endpoint: 0 = sub, 1 = dub)
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

  // 5. Official YouTube Anime Fallback (Muse Asia / Ani-One / TMS Official playlist when matched)
  if (youtubePlaylistId) {
    sources.push({
      id: 'youtube-anime-official',
      label: 'Official YouTube Anime',
      url: `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(youtubePlaylistId)}&index=${Math.max(0, ep - 1)}&autoplay=1&rel=0`,
      host: 'www.youtube-nocookie.com',
      origins: ['https://www.youtube-nocookie.com', 'https://www.youtube.com'],
      timeoutMs: 12000,
    });
  }

  // Only include Videasy TMDB fallback if BOTH malId and anilistId are completely unavailable
  if (!malId && !anilistId && tmdbId) {
    sources.push({
      id: 'videasy-tmdb',
      label: 'Videasy Anime (TMDB)',
      url: `https://player.videasy.net/tv/${tmdbId}/${s}/${ep}`,
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

