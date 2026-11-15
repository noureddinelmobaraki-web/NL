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

  // Tier 1: Direct Storage Node .ia.mp4 (streamUrl is now direct node https://${d2}${dir}/${file})
  if (matchedArchiveStream?.streamUrl) {
    options.push({
      id: 'archive-primary',
      label: `سيرفر الأرشيف المباشر السريع (الحلقة ${ep})`,
      kind: 'archive-primary',
      url: matchedArchiveStream.streamUrl,
      downloadUrl: matchedArchiveStream.downloadUrl,
      sizeMegabytes: matchedArchiveStream.sizeMegabytes,
    });
  }

  // Tier 2: Primary Archive CDN .ia.mp4 (https://archive.org/download/${archiveId}/${file})
  if (matchedArchiveStream?.mirrorUrl) {
    options.push({
      id: 'archive-mirror',
      label: `بث أرشيف سبيستون الاحتياطي (الحلقة ${ep})`,
      kind: 'archive-mirror',
      url: matchedArchiveStream.mirrorUrl,
      downloadUrl: matchedArchiveStream.downloadUrl,
      sizeMegabytes: matchedArchiveStream.sizeMegabytes,
    });
  }

  // Tier 3: Official YouTube Playlist Embed
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

  // Tier 4: Archive.org Theater Embed
  if (series.archiveIds && series.archiveIds.length > 0) {
    const primaryArchiveId = series.archiveIds[0];
    options.push({
      id: `archive-theater-${primaryArchiveId}`,
      label: `مشغل أرشيف الإنترنت (الحلقة ${ep})`,
      kind: 'embed-server',
      url: `https://archive.org/embed/${encodeURIComponent(primaryArchiveId)}?autoplay=1`,
    });
  }

  // Tier 5: VidLink / Videasy TMDB Fallback (only when series.tmdbId is present)
  const tmdb = series.tmdbId ? String(series.tmdbId) : '';
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
      id: 'cartoon-videasy',
      label: 'Videasy Player',
      kind: 'embed-server',
      url:
        series.mediaType === 'movie'
          ? `https://player.videasy.net/movie/${tmdb}`
          : `https://player.videasy.net/tv/${tmdb}/1/${ep}?nextEpisode=true`,
    });
  }

  return options;
}
