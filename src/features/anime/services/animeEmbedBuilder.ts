import type {
  AnimeAudioMode,
  AnimeIdentifiers,
  AnimePlayServer,
} from '../types/anime.types';

export interface AnimeServerOption {
  id: string;
  label: string;
  badge: string;
  supportsDub: boolean;
  buildUrl: (ep: number, mode: AnimeAudioMode) => string;
}

/**
 * Multi-Server Anime Embed Engine (2025/2026 Verified Working Endpoints)
 * Supports Sub (مترجم) & Dub (مدبلج) switching across MAL, AniList, TMDB, and IMDb IDs.
 */
export function buildAnimeSources({
  ids,
  courEpisode,
  mode,
  isMovie = false,
}: {
  ids: AnimeIdentifiers;
  courEpisode: number;
  mode: AnimeAudioMode;
  isMovie?: boolean;
}): AnimePlayServer[] {
  const ep = Math.max(1, Math.floor(courEpisode || 1));
  const season = Math.max(1, Math.floor(ids.resolvedSeason || 1));
  const isDub = mode === 'dub';
  const subOrDub = isDub ? 'dub' : 'sub';

  const servers: AnimePlayServer[] = [];

  // 1. VidLink Anime (Requires MAL ID)
  if (ids.malId) {
    servers.push({
      id: `anime-vidlink-${subOrDub}`,
      label: `VidLink Anime (${isDub ? 'Dub' : 'Sub'})`,
      host: 'vidlink.pro',
      url: `https://vidlink.pro/anime/${ids.malId}/${ep}/${subOrDub}?fallback=true&primaryColor=dc2626&autoplay=true&nextbutton=true`,
      mode,
      quality: '1080p HLS',
      timeoutMs: 12000,
    });
  }

  // 2. VidPlus Anime (Requires AniList ID)
  if (ids.anilistId) {
    servers.push({
      id: `anime-vidplus-${subOrDub}`,
      label: `VidPlus Anime (${isDub ? 'Dub' : 'Sub'})`,
      host: 'player.vidplus.to',
      url: `https://player.vidplus.to/embed/anime/${ids.anilistId}/${ep}?dub=${isDub ? 'true' : 'false'}&autoplay=true&autonext=true`,
      mode,
      quality: '1080p',
      timeoutMs: 12000,
    });
  }

  // 3. Videasy Anime (Requires AniList ID)
  if (ids.anilistId) {
    servers.push({
      id: `anime-videasy-${subOrDub}`,
      label: `Videasy Anime (${isDub ? 'Dub' : 'Sub'})`,
      host: 'player.videasy.net',
      url: `https://player.videasy.net/anime/${ids.anilistId}/${ep}?dub=${isDub ? 'true' : 'false'}`,
      mode,
      quality: '1080p',
      timeoutMs: 12000,
    });
  }

  // 4. VidSrc.icu Anime (Requires AniList ID: 0 = sub, 1 = dub)
  if (ids.anilistId) {
    servers.push({
      id: `anime-vidsrc-icu-${subOrDub}`,
      label: `VidSrc Anime (${isDub ? 'Dub' : 'Sub'})`,
      host: 'vidsrc.icu',
      url: `https://vidsrc.icu/embed/anime/${ids.anilistId}/${ep}/${isDub ? 1 : 0}`,
      mode,
      quality: '1080p',
      timeoutMs: 12000,
    });
  }

  // 5. Official YouTube Anime Fallback (Muse Asia / Ani-One / TMS Official playlist when matched)
  if (ids.youtubePlaylistId) {
    servers.push({
      id: 'anime-youtube-official',
      label: 'Official YouTube Anime',
      host: 'www.youtube-nocookie.com',
      url: `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(ids.youtubePlaylistId)}&index=${Math.max(0, ep - 1)}&autoplay=1&rel=0`,
      mode,
      quality: '1080p',
      timeoutMs: 12000,
    });
  }

  // Only include Videasy TMDB fallback if BOTH malId and anilistId are completely unavailable
  if (!ids.malId && !ids.anilistId && ids.tmdbId) {
    servers.push({
      id: `anime-videasy-tmdb-${subOrDub}`,
      label: `Videasy Anime (${isDub ? 'Dub' : 'Sub'})`,
      host: 'player.videasy.net',
      url: isMovie
        ? `https://player.videasy.net/movie/${ids.tmdbId}`
        : `https://player.videasy.net/tv/${ids.tmdbId}/${season}/${ep}?nextEpisode=true&episodeSelector=true`,
      mode,
      quality: '1080p',
      timeoutMs: 12000,
    });
  }

  if (servers.length === 0) {
    const fallbackId = ids.malId || ids.anilistId || 21;
    servers.push({
      id: 'anime-vidlink-fallback',
      label: `VidLink Anime (${subOrDub.toUpperCase()})`,
      host: 'vidlink.pro',
      url: `https://vidlink.pro/anime/${fallbackId}/${ep}/${subOrDub}?fallback=true&autoplay=true`,
      mode,
      quality: '1080p',
      timeoutMs: 12000,
    });
  }

  return servers;
}

export function buildAnimeServerList(
  ids: AnimeIdentifiers,
  episodeNumber: number,
  audioMode: AnimeAudioMode,
): AnimeServerOption[] {
  const sources = buildAnimeSources({
    ids,
    courEpisode: episodeNumber,
    mode: audioMode,
  });
  return sources.map((srv) => ({
    id: srv.id,
    label: srv.label,
    badge: srv.quality || 'HD',
    supportsDub: true,
    buildUrl: (e, m) => {
      const rebuilt = buildAnimeSources({
        ids,
        courEpisode: e,
        mode: m,
      }).find((x) => x.host === srv.host);
      return rebuilt ? rebuilt.url : srv.url;
    },
  }));
}
