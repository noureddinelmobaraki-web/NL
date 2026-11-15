import type { CinemaItem } from '../../../components/Movies/moviesDataClient';
import type { PlaySource } from '../../../components/Movies/MovieSourcesModal';
import type { AnimeItem, AnimeAudioMode } from '../types/anime.types';

export type UnifiedAnimeItem = AnimeItem & { titleEn?: string };

const OFFICIAL_YOUTUBE_PLAYLIST_BY_MAL_ID: Record<number, string> = {
  38000: 'PLwLSw1_eDZl1ADcL2231c9tPH1u7W6d3G',
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
  const isMovie = anime.format === 'MOVIE';
  const sources: PlaySource[] = [];
  const malId = anime.malId;
  const anilistId = anime.anilistId;
  const tmdbId = anime.tmdbId;
  const imdbId = anime.imdbId;
  const preferredId = imdbId || (tmdbId ? String(tmdbId) : '');
  const youtubePlaylistId =
    anime.youtubePlaylistId ||
    (malId ? OFFICIAL_YOUTUBE_PLAYLIST_BY_MAL_ID[malId] : undefined);

  // 1. Server 7 (streamimdb.ru — #1 Priority with 10s watchdog)
  if (preferredId) {
    sources.push({
      id: 'server-7',
      label: 'Server 7 — StreamIMDb',
      url: isMovie
        ? `https://streamimdb.ru/embed/movie/${encodeURIComponent(preferredId)}`
        : `https://streamimdb.ru/embed/tv/${encodeURIComponent(preferredId)}/${s}/${ep}`,
      host: 'streamimdb.ru',
      origins: ['https://streamimdb.ru', 'https://player.imdb.su'],
      timeoutMs: 10000,
    });
  }

  // 2. VidLink HD (TMDB)
  if (tmdbId) {
    sources.push({
      id: 'vidlink-tmdb',
      label: 'VidLink HD — TMDB',
      url: isMovie
        ? `https://vidlink.pro/movie/${tmdbId}?primaryColor=dc2626&autoplay=true`
        : `https://vidlink.pro/tv/${tmdbId}/${s}/${ep}?primaryColor=dc2626&autoplay=true&nextbutton=true`,
      host: 'vidlink.pro',
      origins: ['https://vidlink.pro', 'https://player.vidlink.pro'],
      timeoutMs: 10000,
    });
  }

  // 3. VidLink Anime Sub/Dub (MAL ID endpoint)
  if (malId && !isMovie) {
    sources.push({
      id: 'vidlink-anime-sub',
      label: 'VidLink Anime (Sub)',
      url: `https://vidlink.pro/anime/${malId}/${ep}/sub?fallback=true&primaryColor=dc2626&autoplay=true&nextbutton=true`,
      host: 'vidlink.pro',
      origins: ['https://vidlink.pro'],
      timeoutMs: 10000,
    });
    sources.push({
      id: 'vidlink-anime-dub',
      label: 'VidLink Anime (Dub)',
      url: `https://vidlink.pro/anime/${malId}/${ep}/dub?fallback=true&primaryColor=dc2626&autoplay=true&nextbutton=true`,
      host: 'vidlink.pro',
      origins: ['https://vidlink.pro'],
      timeoutMs: 10000,
    });
  }

  // 4. Videasy HD (TMDB)
  if (tmdbId) {
    sources.push({
      id: 'videasy-tmdb',
      label: 'Videasy HD — TMDB',
      url: isMovie
        ? `https://player.videasy.net/movie/${tmdbId}`
        : `https://player.videasy.net/tv/${tmdbId}/${s}/${ep}?nextEpisode=true&episodeSelector=true`,
      host: 'player.videasy.net',
      origins: ['https://player.videasy.net'],
      timeoutMs: 10000,
    });
  }

  // 5. VidPlus HD (TMDB)
  if (tmdbId) {
    sources.push({
      id: 'vidplus-tmdb',
      label: 'VidPlus HD',
      url: isMovie
        ? `https://player.vidplus.to/embed/movie/${tmdbId}?autoplay=true`
        : `https://player.vidplus.to/embed/tv/${tmdbId}/${s}/${ep}?autoplay=true&autonext=true`,
      host: 'player.vidplus.to',
      origins: ['https://player.vidplus.to'],
      timeoutMs: 10000,
    });
  }

  // 6. Server 1 (2Embed)
  if (preferredId) {
    sources.push({
      id: 'server-1',
      label: 'Server 1 — 2Embed',
      url: isMovie
        ? `https://www.2embed.cc/embed/${encodeURIComponent(preferredId)}`
        : `https://www.2embed.cc/embedtv/${encodeURIComponent(preferredId)}&s=${s}&e=${ep}`,
      host: '2embed.cc',
      origins: ['https://www.2embed.cc', 'https://2embed.cc', 'https://2vcdn.skin'],
      timeoutMs: 10000,
    });
  }

  // 7. Server 6 (MultiEmbed)
  if (preferredId) {
    const queryBase = imdbId ? `video_id=${encodeURIComponent(imdbId)}` : `video_id=${tmdbId}&tmdb=1`;
    sources.push({
      id: 'server-6',
      label: 'Server 6 — MultiEmbed',
      url: isMovie
        ? `https://multiembed.mov/?${queryBase}`
        : `https://multiembed.mov/?${queryBase}&s=${s}&e=${ep}`,
      host: 'multiembed.mov',
      origins: ['https://multiembed.mov', 'https://streamingnow.mov'],
      timeoutMs: 10000,
    });
  }

  // 8. VidSrc HD
  if (preferredId) {
    sources.push({
      id: 'server-vidsrc',
      label: 'VidSrc HD',
      url: isMovie
        ? `https://vidsrcme.ru/embed/movie/${encodeURIComponent(preferredId)}`
        : `https://vidsrcme.ru/embed/tv/${encodeURIComponent(preferredId)}/${s}/${ep}?autonext=1`,
      host: 'vidsrcme.ru',
      origins: ['https://vidsrcme.ru'],
      timeoutMs: 10000,
    });
  }

  // 9. Videasy & VidSrc.icu Anime Sub/Dub (AniList ID)
  if (anilistId) {
    sources.push(
      {
        id: 'videasy-anime-sub',
        label: 'Videasy Anime (Sub)',
        url: `https://player.videasy.net/anime/${anilistId}/${ep}?dub=false`,
        host: 'player.videasy.net',
        origins: ['https://player.videasy.net'],
        timeoutMs: 10000,
      },
      {
        id: 'videasy-anime-dub',
        label: 'Videasy Anime (Dub)',
        url: `https://player.videasy.net/anime/${anilistId}/${ep}?dub=true`,
        host: 'player.videasy.net',
        origins: ['https://player.videasy.net'],
        timeoutMs: 10000,
      },
      {
        id: 'vidsrc-icu-sub',
        label: 'VidSrc Anime (Sub)',
        url: `https://vidsrc.icu/embed/anime/${anilistId}/${ep}/0`,
        host: 'vidsrc.icu',
        origins: ['https://vidsrc.icu'],
        timeoutMs: 10000,
      },
      {
        id: 'vidsrc-icu-dub',
        label: 'VidSrc Anime (Dub)',
        url: `https://vidsrc.icu/embed/anime/${anilistId}/${ep}/1`,
        host: 'vidsrc.icu',
        origins: ['https://vidsrc.icu'],
        timeoutMs: 10000,
      },
    );
  }

  // 10. Official YouTube Anime Fallback
  if (youtubePlaylistId) {
    sources.push({
      id: 'youtube-anime-official',
      label: 'Official YouTube Anime',
      url: `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(youtubePlaylistId)}&index=${Math.max(0, ep - 1)}&autoplay=1&rel=0`,
      host: 'www.youtube-nocookie.com',
      origins: ['https://www.youtube-nocookie.com', 'https://www.youtube.com'],
      timeoutMs: 10000,
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
  const topPrimary = all.filter((s) => s.id === 'server-7' || s.id === 'vidlink-tmdb');
  const rest = all.filter((s) => s.id !== 'server-7' && s.id !== 'vidlink-tmdb');
  const preferredTag = audioMode === 'dub' ? '-dub' : '-sub';
  const secondaryTag = audioMode === 'dub' ? '-sub' : '-dub';

  const modeMatched = rest.filter((s) => s.id.endsWith(preferredTag));
  const universal = rest.filter((s) => !s.id.endsWith('-sub') && !s.id.endsWith('-dub'));
  const modeFallback = rest.filter((s) => s.id.endsWith(secondaryTag));

  return [...topPrimary, ...modeMatched, ...universal, ...modeFallback];
}
