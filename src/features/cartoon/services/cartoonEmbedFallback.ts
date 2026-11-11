/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Builds the 4-Tier Failover Playback Options for CartoonPage:
 * 1. Archive.org Primary CDN (.ia.mp4 direct HTML5 stream)
 * 2. Archive.org Mirror CDN (d2 direct stream without redirect)
 * 3. Official YouTube Playlist Embed
 * 4. TMDB / IMDb Embed Servers (VidLink, VidSrc, Server 7, 2Embed)
 */

import type {
  CartoonEpisodeStream,
  CartoonPlayOption,
  CartoonSeriesItem,
} from '../types/cartoon.types';

export function buildCartoonPlayOptions(
  series: CartoonSeriesItem,
  episodeNumber: number,
  matchedArchiveStream?: CartoonEpisodeStream | null,
): CartoonPlayOption[] {
  const options: CartoonPlayOption[] = [];
  const ep = Math.max(1, episodeNumber || 1);

  // Tier 1: Archive.org Primary Direct MP4 Stream
  if (matchedArchiveStream?.streamUrl) {
    options.push({
      id: 'archive-primary',
      label: 'بث مباشر سبيستون (Archive MP4)',
      kind: 'archive-primary',
      url: matchedArchiveStream.streamUrl,
      downloadUrl: matchedArchiveStream.downloadUrl,
      sizeMegabytes: matchedArchiveStream.sizeMegabytes,
    });
  }

  // Tier 2: Archive.org Mirror CDN (d2)
  if (matchedArchiveStream?.mirrorUrl) {
    options.push({
      id: 'archive-mirror',
      label: 'سيرفر المرآة السريع (Archive Mirror)',
      kind: 'archive-mirror',
      url: matchedArchiveStream.mirrorUrl,
      downloadUrl: matchedArchiveStream.downloadUrl,
      sizeMegabytes: matchedArchiveStream.sizeMegabytes,
    });
  }

  // Tier 3: YouTube Official Playlist Fallback
  if (series.youtubePlaylistIds && series.youtubePlaylistIds.length > 0) {
    series.youtubePlaylistIds.forEach((plId, idx) => {
      options.push({
        id: `yt-playlist-${idx}`,
        label: idx === 0 ? 'قائمة يوتيوب الرسمية' : `قائمة يوتيوب ${idx + 1}`,
        kind: 'youtube-playlist',
        url: `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(plId)}&index=${Math.max(0, ep - 1)}&autoplay=1`,
      });
    });
  }

  // Tier 4: TMDB / IMDb Embed Servers
  const tmdb = series.tmdbId ? String(series.tmdbId) : '';
  const imdb = series.imdbId || '';
  const preferred = imdb || tmdb;

  if (tmdb) {
    options.push({
      id: 'cartoon-vidlink',
      label: 'VidLink HD',
      kind: 'embed-server',
      url:
        series.mediaType === 'movie'
          ? `https://vidlink.pro/movie/${tmdb}?primaryColor=f59e0b&autoplay=true`
          : `https://vidlink.pro/tv/${tmdb}/1/${ep}?primaryColor=f59e0b&autoplay=true&nextbutton=true`,
    });

    options.push({
      id: 'cartoon-vidsrc',
      label: 'VidSrc Pro',
      kind: 'embed-server',
      url:
        series.mediaType === 'movie'
          ? `https://vidsrcme.ru/embed/movie/${tmdb}`
          : `https://vidsrcme.ru/embed/tv/${tmdb}/1/${ep}?autonext=1`,
    });

    options.push({
      id: 'cartoon-videasy',
      label: 'Videasy Player',
      kind: 'embed-server',
      url:
        series.mediaType === 'movie'
          ? `https://player.videasy.net/movie/${tmdb}`
          : `https://player.videasy.net/tv/${tmdb}/1/${ep}?nextEpisode=true`,
    });
  }

  if (preferred) {
    options.push({
      id: 'cartoon-server7',
      label: 'Server 7',
      kind: 'embed-server',
      url:
        series.mediaType === 'movie'
          ? `https://streamimdb.ru/embed/movie/${preferred}`
          : `https://streamimdb.ru/embed/tv/${preferred}/1/${ep}`,
    });

    options.push({
      id: 'cartoon-2embed',
      label: '2Embed',
      kind: 'embed-server',
      url:
        series.mediaType === 'movie'
          ? `https://www.2embed.cc/embed/${preferred}`
          : `https://www.2embed.cc/embedtv/${preferred}&s=1&e=${ep}`,
    });
  }

  return options;
}
