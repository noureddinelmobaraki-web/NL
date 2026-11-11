/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Parallel Stremio Multi-Indexer Stream & Torrent Fallbacks:
 * - Comet (https://comet.elfhosted.com)
 * - MediaFusion (https://mediafusion.elfhosted.com)
 * - KnightCrawler (https://knightcrawler.elfhosted.com)
 * - WebStreamr Direct HTTP Streams (https://webstreamr.hayd.uk)
 */

import type { DownloadQualityTier } from '../../features/cinemaDownload/types';

export interface StremioDiscoveredTorrent {
  infoHash: string;
  rawTitle: string;
  sizeBytes: number;
  seeders: number;
  leechers: number;
  qualityHint: DownloadQualityTier;
  sourceLabel: string;
  webSeeds?: string[];
}

export interface StremioDiscoveredDirectStream {
  directUrl: string;
  referer?: string;
  server: string;
  quality: DownloadQualityTier;
  sizeBytes?: number;
}

export interface StremioMultiIndexerResult {
  torrents: StremioDiscoveredTorrent[];
  directStreams: StremioDiscoveredDirectStream[];
}

interface StremioStreamEntry {
  name?: string;
  title?: string;
  description?: string;
  infoHash?: string;
  url?: string;
  externalUrl?: string;
  sources?: string[];
  behaviorHints?: {
    videoSize?: number;
    filename?: string;
    bingeGroup?: string;
  };
}

const STREMIO_ADDON_PROVIDERS = [
  {
    id: 'comet',
    label: 'Comet Swarm',
    baseUrl: 'https://comet.elfhosted.com',
  },
  {
    id: 'mediafusion',
    label: 'MediaFusion',
    baseUrl: 'https://mediafusion.elfhosted.com',
  },
  {
    id: 'knightcrawler',
    label: 'KnightCrawler',
    baseUrl: 'https://knightcrawler.elfhosted.com',
  },
  {
    id: 'webstreamr',
    label: 'WebStreamr HTTP',
    baseUrl: 'https://webstreamr.hayd.uk',
  },
] as const;

function parseQualityFromText(text: string): DownloadQualityTier {
  if (/2160p|4k|uhd/i.test(text)) return '2160p';
  if (/1080p|fhd/i.test(text)) return '1080p';
  if (/720p|hd/i.test(text)) return '720p';
  return '480p';
}

function parseSizeBytesFromText(
  text: string,
  hintBytes?: number,
  quality?: DownloadQualityTier,
): number {
  if (typeof hintBytes === 'number' && hintBytes > 50 * 1024 * 1024) {
    return hintBytes;
  }
  const gbMatch = text.match(/(\d+(?:\.\d+)?)\s*GB/i);
  if (gbMatch) {
    return Math.round(parseFloat(gbMatch[1]) * 1024 ** 3);
  }
  const mbMatch = text.match(/(\d+(?:\.\d+)?)\s*MB/i);
  if (mbMatch) {
    return Math.round(parseFloat(mbMatch[1]) * 1024 ** 2);
  }
  if (quality === '2160p') return Math.round(4.6 * 1024 ** 3);
  if (quality === '1080p') return Math.round(1.85 * 1024 ** 3);
  if (quality === '720p') return Math.round(920 * 1024 ** 2);
  return Math.round(520 * 1024 ** 2);
}

function parseSeedersFromText(text: string): number {
  const peerMatch =
    text.match(/👤\s*(\d+)/) ||
    text.match(/🌱\s*(\d+)/) ||
    text.match(/S:\s*(\d+)/i) ||
    text.match(/seeds?:\s*(\d+)/i);
  if (peerMatch) {
    return Math.max(1, parseInt(peerMatch[1], 10));
  }
  return 18;
}

export async function queryStremioMultiIndexers(params: {
  imdbId: string;
  mediaType: 'movie' | 'tv';
  season?: number;
  episode?: number;
  signal?: AbortSignal;
}): Promise<StremioMultiIndexerResult> {
  const cleanImdb = (params.imdbId || '').trim();
  if (!/^tt\d+$/i.test(cleanImdb)) {
    return { torrents: [], directStreams: [] };
  }

  const stremioType = params.mediaType === 'tv' ? 'series' : 'movie';
  const streamKey =
    params.mediaType === 'tv'
      ? `${cleanImdb}:${Math.max(1, params.season || 1)}:${Math.max(1, params.episode || 1)}`
      : cleanImdb;

  const torrents: StremioDiscoveredTorrent[] = [];
  const directStreams: StremioDiscoveredDirectStream[] = [];

  const settled = await Promise.allSettled(
    STREMIO_ADDON_PROVIDERS.map(async (provider) => {
      const endpoint = `${provider.baseUrl}/stream/${stremioType}/${encodeURIComponent(streamKey)}.json`;
      const res = await fetch(endpoint, {
        signal: params.signal ?? AbortSignal.timeout(5500),
      });
      if (!res.ok) return { provider, streams: [] as StremioStreamEntry[] };
      const json = (await res.json()) as { streams?: StremioStreamEntry[] };
      return {
        provider,
        streams: Array.isArray(json?.streams) ? json.streams : [],
      };
    }),
  );

  for (const outcome of settled) {
    if (outcome.status !== 'fulfilled') continue;
    const { provider, streams } = outcome.value;

    for (const st of streams) {
      const combinedText = [
        st.name || '',
        st.title || '',
        st.description || '',
        st.behaviorHints?.filename || '',
      ]
        .filter(Boolean)
        .join(' ');
      const quality = parseQualityFromText(combinedText);
      const sizeBytes = parseSizeBytesFromText(
        combinedText,
        st.behaviorHints?.videoSize,
        quality,
      );

      if (st.infoHash && /^[0-9a-fA-F]{40}$/.test(st.infoHash.trim())) {
        const cleanTitle =
          st.behaviorHints?.filename ||
          (st.title || st.description || '').split('\n')[0] ||
          `${cleanImdb}.${quality}`;
        torrents.push({
          infoHash: st.infoHash.trim().toLowerCase(),
          rawTitle: cleanTitle.trim(),
          sizeBytes,
          seeders: parseSeedersFromText(combinedText),
          leechers: 4,
          qualityHint: quality,
          sourceLabel: provider.label,
          webSeeds: Array.isArray(st.sources)
            ? st.sources.filter((s) => /^https?:\/\//i.test(s))
            : undefined,
        });
      } else if (st.url && /^https?:\/\//i.test(st.url.trim())) {
        directStreams.push({
          directUrl: st.url.trim(),
          server: provider.label,
          quality,
          sizeBytes,
        });
      }
    }
  }

  return { torrents, directStreams };
}
