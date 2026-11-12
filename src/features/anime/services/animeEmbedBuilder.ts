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
  const globalEp = Math.max(1, Math.floor((ids.episodeOffset || 0) + ep));
  const isDub = mode === 'dub';
  const subOrDub = isDub ? 'dub' : 'sub';

  const servers: AnimePlayServer[] = [];

  // 1. VidLink Pro Anime (Uses MAL ID — Primary fast HLS server)
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

  // 2. VidPlus Anime (Uses AniList ID — High-availability Sub/Dub)
  if (ids.anilistId) {
    servers.push({
      id: `anime-vidplus-${subOrDub}`,
      label: `VidPlus Pro (${isDub ? 'Dub' : 'Sub'})`,
      host: 'player.vidplus.to',
      url: `https://player.vidplus.to/embed/anime/${ids.anilistId}/${ep}?dub=${isDub ? 'true' : 'false'}&autoplay=true&autonext=true`,
      mode,
      quality: '1080p',
      timeoutMs: 12000,
    });
  }

  // 3. VidSrc.icu Anime (Uses AniList ID: 0 = sub, 1 = dub)
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

  // 4. Videasy Anime (Uses AniList ID or TMDB ID)
  if (ids.anilistId || ids.tmdbId) {
    servers.push({
      id: `anime-videasy-${subOrDub}`,
      label: `Videasy Anime (${isDub ? 'Dub' : 'Sub'})`,
      host: 'player.videasy.net',
      url: ids.anilistId
        ? `https://player.videasy.net/anime/${ids.anilistId}/${ep}?dub=${isDub ? 'true' : 'false'}`
        : isMovie
          ? `https://player.videasy.net/movie/${ids.tmdbId}`
          : `https://player.videasy.net/tv/${ids.tmdbId}/${season}/${ep}?nextEpisode=true&episodeSelector=true`,
      mode,
      quality: '1080p',
      timeoutMs: 12000,
    });
  }

  // 5. VidSrcMe (Uses IMDb or TMDB ID)
  if (ids.imdbId || ids.tmdbId) {
    const preferredId = ids.imdbId || ids.tmdbId;
    servers.push({
      id: 'anime-vidsrcme',
      label: 'VidSrcMe Multi',
      host: 'vidsrcme.ru',
      url: isMovie
        ? `https://vidsrcme.ru/embed/movie/${preferredId}`
        : `https://vidsrcme.ru/embed/tv/${preferredId}/${season}/${ep}?autonext=1`,
      mode,
      quality: 'HD',
      timeoutMs: 12000,
    });
  }

  // 6. AutoEmbed (Uses TMDB or IMDb ID)
  if (ids.tmdbId || ids.imdbId) {
    const preferredId = ids.tmdbId || ids.imdbId;
    servers.push({
      id: 'anime-autoembed',
      label: 'AutoEmbed Pro',
      host: 'player.autoembed.cc',
      url: isMovie
        ? `https://player.autoembed.cc/embed/movie/${preferredId}`
        : `https://player.autoembed.cc/embed/tv/${preferredId}/${season}/${ep}`,
      mode,
      quality: 'HD',
      timeoutMs: 12000,
    });
  }

  // 7. MultiEmbed VIP (Uses IMDb or TMDB ID)
  if (ids.imdbId || ids.tmdbId) {
    const isTmdb = !ids.imdbId && Boolean(ids.tmdbId);
    const idParam = ids.imdbId
      ? `video_id=${ids.imdbId}`
      : `video_id=${ids.tmdbId}&tmdb=1`;
    servers.push({
      id: 'anime-multiembed',
      label: 'MultiEmbed VIP',
      host: 'multiembed.mov',
      url: isMovie
        ? `https://multiembed.mov/directstream.php?${idParam}`
        : `https://multiembed.mov/directstream.php?${idParam}&s=${season}&e=${ isTmdb ? ep : globalEp }`,
      mode,
      quality: 'HD',
      timeoutMs: 12000,
    });
  }

  // 8. 2Embed TV (Uses IMDb or TMDB ID)
  if (ids.imdbId || ids.tmdbId) {
    const preferredId = ids.imdbId || ids.tmdbId;
    servers.push({
      id: 'anime-2embed',
      label: '2Embed Global',
      host: '2embed.cc',
      url: isMovie
        ? `https://www.2embed.cc/embed/${preferredId}`
        : `https://www.2embed.cc/embedtv/${preferredId}&s=${season}&e=${ep}`,
      mode,
      quality: 'HD',
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
