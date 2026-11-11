/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Anime Torrents, SeaDex Best Releases, Stremio Addon Streams & Arabic Subtitles (.ass / .vtt)
 */

import { computeResolvedImdbEpisode } from './animeIdBridgeService';
import type {
  AnimeIdentifiers,
  AnimeSubtitleTrack,
  AnimeTorrentRelease,
} from '../types/anime.types';

const EXTRA_BONUS_REGEX = /\b(NCOP|NCED|NCBD|Creditless|Menu|Preview|PV|CM)\b/i;

function formatBytes(bytes?: number): string {
  if (!bytes || !Number.isFinite(bytes) || bytes <= 0) return '850 MB';
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(0)} MB`;
}

export async function fetchSeaDexBestHashes(anilistId?: number): Promise<Set<string>> {
  const bestHashes = new Set<string>();
  if (!anilistId) return bestHashes;

  try {
    const url = `https://releases.moe/api/collections/entries/records?filter=(alID=${anilistId})&expand=trs`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5500) });
    if (!res.ok) return bestHashes;
    const data = await res.json();
    const items = Array.isArray(data?.items) ? data.items : [];
    for (const entry of items) {
      const trs = entry?.expand?.trs || [];
      for (const tr of trs) {
        if (tr?.infoHash && (tr?.isBest || tr?.dualAudio)) {
          bestHashes.add(String(tr.infoHash).toLowerCase());
        }
      }
    }
  } catch {
    // Non-blocking enrichment
  }
  return bestHashes;
}

export async function fetchAnimeToshoReleases(
  anidbId?: number,
  episodeNumber = 1,
  seaDexBestHashes?: Set<string>,
): Promise<{ releases: AnimeTorrentRelease[]; subtitles: AnimeSubtitleTrack[] }> {
  if (!anidbId) return { releases: [], subtitles: [] };
  const paddedEp = String(episodeNumber).padStart(2, '0');
  const url = `https://feed.animetosho.org/json?qx=1&aid=${anidbId}&q=${encodeURIComponent(paddedEp)}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6500) });
    if (!res.ok) return { releases: [], subtitles: [] };
    const list = await res.json();
    if (!Array.isArray(list)) return { releases: [], subtitles: [] };

    const releases: AnimeTorrentRelease[] = [];
    const subtitles: AnimeSubtitleTrack[] = [];

    for (const entry of list.slice(0, 20)) {
      const title = String(entry?.title || '');
      if (!title || EXTRA_BONUS_REGEX.test(title)) continue;

      const infoHash = String(entry?.info_hash || '').toLowerCase();
      const isSeaDex = Boolean(infoHash && seaDexBestHashes?.has(infoHash));
      const resMatch = title.match(/\b(2160p|1080p|720p|480p)\b/i);
      const groupMatch = title.match(/^\[([^\]]+)\]/);

      const entrySubs: AnimeSubtitleTrack[] = [];
      if (Array.isArray(entry?.attachments)) {
        for (const att of entry.attachments) {
          const attUrl = String(att?.url || '');
          const attName = String(att?.name || '');
          if (!attUrl || !/\.(ass|srt|vtt)$/i.test(attName)) continue;
          const isAr = /\b(ar|ara|arabic|عربي)\b/i.test(attName);
          const format = attName.toLowerCase().endsWith('.ass')
            ? 'ass'
            : attName.toLowerCase().endsWith('.vtt')
              ? 'vtt'
              : 'srt';
          const track: AnimeSubtitleTrack = {
            id: `tosho-sub-${att?.id || Math.random().toString(36).slice(2, 7)}`,
            label: isAr ? `العربية (${format.toUpperCase()}) — AnimeTosho` : `${attName} (${format.toUpperCase()})`,
            lang: isAr ? 'ar' : 'en',
            format,
            url: attUrl,
            isArabic: isAr,
            releaseName: title,
          };
          entrySubs.push(track);
          subtitles.push(track);
        }
      }

      releases.push({
        id: `tosho-${entry?.id || infoHash || Math.random()}`,
        title,
        group: groupMatch ? groupMatch[1] : undefined,
        resolution: resMatch ? resMatch[1].toUpperCase() : '1080P',
        sizeLabel: formatBytes(Number(entry?.total_size)),
        sizeBytes: Number(entry?.total_size) || undefined,
        seeders: Number(entry?.seeders) || 12,
        magnetUri: entry?.magnet_uri || undefined,
        torrentUrl: entry?.torrent_url || undefined,
        infoHash: infoHash || undefined,
        isSeaDexBest: isSeaDex,
        isDualAudio: /\b(dual[\s_-]*audio|multi[\s_-]*audio)\b/i.test(title),
        subtitles: entrySubs,
        source: isSeaDex ? 'SeaDex' : 'AnimeTosho',
      });
    }

    return { releases, subtitles };
  } catch {
    return { releases: [], subtitles: [] };
  }
}

export async function fetchStremioAnimeStreams(
  ids: AnimeIdentifiers,
  courEpisode: number,
  seaDexBestHashes?: Set<string>,
): Promise<AnimeTorrentRelease[]> {
  const ep = Math.max(1, Math.floor(courEpisode || 1));
  const season = Math.max(1, Math.floor(ids.resolvedSeason || 1));
  const imdbEp = computeResolvedImdbEpisode(ep, ids.episodeOffset);

  const endpoints: Array<{ url: string; source: AnimeTorrentRelease['source'] }> = [];
  if (ids.kitsuId) {
    endpoints.push(
      {
        url: `https://torrentio.strem.fun/stream/series/kitsu:${ids.kitsuId}:${ep}.json`,
        source: 'Torrentio',
      },
      {
        url: `https://comet.elfhosted.com/stream/series/kitsu:${ids.kitsuId}:${ep}.json`,
        source: 'Comet',
      },
      {
        url: `https://mediafusion.elfhosted.com/stream/series/kitsu:${ids.kitsuId}:${ep}.json`,
        source: 'MediaFusion',
      },
    );
  }
  if (ids.imdbId) {
    endpoints.push({
      url: `https://torrentio.strem.fun/stream/series/${ids.imdbId}:${season}:${imdbEp}.json`,
      source: 'Torrentio',
    });
  }

  const results = await Promise.allSettled(
    endpoints.map(async ({ url, source }) => {
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) return [];
      const data = await res.json();
      if (!Array.isArray(data?.streams)) return [];
      return data.streams
        .map((st: any): AnimeTorrentRelease | null => {
          const rawTitle = String(st?.title || st?.description || st?.name || '');
          if (!rawTitle || EXTRA_BONUS_REGEX.test(rawTitle)) return null;
          const infoHash = String(st?.infoHash || '').toLowerCase();
          const isSeaDex = Boolean(infoHash && seaDexBestHashes?.has(infoHash));
          const resMatch = `${st?.name || ''} ${rawTitle}`.match(/\b(2160p|4k|1080p|720p|480p)\b/i);
          const seedMatch = rawTitle.match(/👤\s*(\d+)/);
          const sizeMatch = rawTitle.match(/💾\s*([\d.]+\s*(?:GB|MB))/i);

          return {
            id: `${source}-${infoHash || Math.random().toString(36).slice(2, 8)}`,
            title: rawTitle.split('\n')[0] || rawTitle,
            resolution: resMatch ? resMatch[1].toUpperCase() : '1080P',
            sizeLabel: sizeMatch ? sizeMatch[1] : '1.1 GB',
            seeders: seedMatch ? Number(seedMatch[1]) : 25,
            infoHash: infoHash || undefined,
            magnetUri: infoHash ? `magnet:?xt=urn:btih:${infoHash}` : undefined,
            isSeaDexBest: isSeaDex,
            isDualAudio: /\b(dual\s*audio|dubbed|multi)\b/i.test(rawTitle),
            source: isSeaDex ? 'SeaDex' : source,
          };
        })
        .filter((x: AnimeTorrentRelease | null): x is AnimeTorrentRelease => x !== null);
    }),
  );

  const merged: AnimeTorrentRelease[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') merged.push(...r.value);
  }
  return merged;
}

export async function fetchArabicAnimeSubtitles(
  ids: AnimeIdentifiers,
  courEpisode: number,
  toshoSubs: AnimeSubtitleTrack[] = [],
): Promise<AnimeSubtitleTrack[]> {
  const ep = Math.max(1, Math.floor(courEpisode || 1));
  const season = Math.max(1, Math.floor(ids.resolvedSeason || 1));
  const imdbEp = computeResolvedImdbEpisode(ep, ids.episodeOffset);
  const tracks: AnimeSubtitleTrack[] = [...toshoSubs];

  const targetId = ids.imdbId || (ids.tmdbId ? String(ids.tmdbId) : '');
  if (targetId) {
    // Wyzie Subs (Arabic priority)
    try {
      const wyzieUrl = `https://sub.wyzie.io/search?id=${encodeURIComponent(targetId)}&season=${season}&episode=${imdbEp}&language=ar`;
      const res = await fetch(wyzieUrl, { signal: AbortSignal.timeout(5500) });
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list)) {
          for (const item of list.slice(0, 8)) {
            if (!item?.url) continue;
            tracks.push({
              id: `wyzie-ar-${item.id || Math.random().toString(36).slice(2, 7)}`,
              label: `العربية — ${item.release || item.display || 'Wyzie Official'}`,
              lang: 'ar',
              format: String(item.format || 'srt').toLowerCase() === 'ass' ? 'ass' : 'vtt',
              url: String(item.url),
              isArabic: true,
              releaseName: item.release,
            });
          }
        }
      }
    } catch {
      // ignore
    }

    // OpenSubtitles v3 Stremio JSON
    if (ids.imdbId) {
      try {
        const osUrl = `https://opensubtitles-v3.strem.io/subtitles/series/${ids.imdbId}:${season}:${imdbEp}.json`;
        const res = await fetch(osUrl, { signal: AbortSignal.timeout(5500) });
        if (res.ok) {
          const data = await res.json();
          const subs = Array.isArray(data?.subtitles) ? data.subtitles : [];
          for (const s of subs) {
            const lang = String(s?.lang || '').toLowerCase();
            if (!lang.startsWith('ar') && !lang.startsWith('en')) continue;
            const isAr = lang.startsWith('ar');
            tracks.push({
              id: `os-${s.id || Math.random().toString(36).slice(2, 7)}`,
              label: isAr ? 'العربية — OpenSubtitles' : 'English — OpenSubtitles',
              lang: isAr ? 'ar' : 'en',
              format: 'vtt',
              url: String(s.url),
              isArabic: isAr,
            });
          }
        }
      } catch {
        // ignore
      }
    }
  }

  // Always sort Arabic tracks to the top
  return tracks.sort((a, b) => Number(b.isArabic) - Number(a.isArabic));
}
