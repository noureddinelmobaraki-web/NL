/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Hybrid Release & Stream Discovery Service
 */

import { PUBLIC_TMDB_KEY } from '../../config/publicKeys';
import { extractValidImdbId } from '../../config/servers';
import { buildSources } from '../../components/Movies/MovieSourcesModal';
import {
  fetchExtractedVideos,
  type ExtractedVideoStream,
} from '../../services/videoExtractor';
import {
  buildPublicTorrentCacheUrls,
  formatBytes,
  getLiveTrackers,
  normalizeInfoHash,
  parseSceneReleaseName,
  synthesizeMagnetUri,
  verifyReleaseSafety,
} from './releaseParserAndFilter';
import type {
  DiscoveredReleaseOption,
  DownloadMediaContext,
  DownloadQualityTier,
} from './types';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const imdbMemoryCache = new Map<string, string>();

export async function resolveMediaImdbId(
  media: DownloadMediaContext,
): Promise<string> {
  const existing = extractValidImdbId(media.imdbId);
  if (existing) return existing;

  const cacheKey = `${media.mediaType}_${media.tmdbId}`;
  const cached = imdbMemoryCache.get(cacheKey);
  if (cached) return cached;

  try {
    const raw = localStorage.getItem('nl_imdb_id_cache_v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      const val = extractValidImdbId(parsed?.[cacheKey]);
      if (val) {
        imdbMemoryCache.set(cacheKey, val);
        return val;
      }
    }
  } catch {}

  const tmdbKey = import.meta.env.VITE_TMDB_API_KEY || PUBLIC_TMDB_KEY;
  if (!tmdbKey || !media.tmdbId) return '';

  try {
    const endpoint =
      media.mediaType === 'tv'
        ? `${TMDB_BASE_URL}/tv/${media.tmdbId}/external_ids?api_key=${tmdbKey}`
        : `${TMDB_BASE_URL}/movie/${media.tmdbId}/external_ids?api_key=${tmdbKey}`;
    const res = await fetch(endpoint, { signal: AbortSignal.timeout(4500) });
    if (!res.ok) return '';
    const data = await res.json();
    const found = extractValidImdbId(
      data?.imdb_id || data?.external_ids?.imdb_id || '',
    );
    if (found) {
      imdbMemoryCache.set(cacheKey, found);
    }
    return found;
  } catch {
    return '';
  }
}

interface RawIndexerCandidate {
  source: string;
  title: string;
  infoHash: string;
  sizeBytes?: number;
  seeders?: number;
  leechers?: number;
  quality?: string;
  videoCodec?: string;
  directStreamUrl?: string;
  streamReferer?: string;
  isDirectStream?: boolean;
}

function isValidRealHexInfoHash(hash: string | undefined): boolean {
  return Boolean(hash && /^[0-9a-fA-F]{40}$/.test(hash.trim()));
}

export function buildCleanDownloadFileName(
  media: DownloadMediaContext,
  quality: DownloadQualityTier,
  codec: string,
  ext = 'mp4',
): string {
  const safeBase = (media.originalTitle || media.title || 'Cinema_Title')
    .replace(/[^\p{L}\p{N}\s._-]/gu, '')
    .trim()
    .replace(/\s+/g, '.');
  const seTag =
    media.mediaType === 'tv'
      ? `.S${String(media.season || 1).padStart(2, '0')}E${String(
          media.episode || 1,
        ).padStart(2, '0')}`
      : media.year
        ? `.${media.year}`
        : '';
  const cleanCodec = codec.includes('265')
    ? 'H.265'
    : codec.includes('AV1')
      ? 'AV1'
      : 'H.264';
  return `${safeBase}${seTag}.${quality}.WEB-DL.${cleanCodec}.${ext}`;
}

export function computeRealPieceGeometry(sizeBytes: number): {
  pieceLength: number;
  totalPieces: number;
} {
  const pieceLength =
    sizeBytes >= 2 * 1024 * 1024 * 1024 ? 2 * 1024 * 1024 : 1024 * 1024;
  const totalPieces = Math.max(1, Math.ceil(sizeBytes / pieceLength));
  return { pieceLength, totalPieces };
}

export async function discoverReleasesForMedia(
  media: DownloadMediaContext,
  signal?: AbortSignal,
): Promise<{
  imdbId: string;
  releases: DiscoveredReleaseOption[];
  trackersCount: number;
}> {
  const [imdbId, liveTrackers] = await Promise.all([
    resolveMediaImdbId(media),
    getLiveTrackers(),
  ]);

  const rawCandidates: RawIndexerCandidate[] = [];
  const extractedDirectStreams: ExtractedVideoStream[] = [];
  const season = Math.max(1, media.season || 1);
  const episode = Math.max(1, media.episode || 1);

  const discoveryTasks: Promise<void>[] = [];

  if (imdbId) {
    discoveryTasks.push(
      (async () => {
        try {
          const params = new URLSearchParams({
            imdbId,
            mediaType: media.mediaType,
            season: String(season),
            episode: String(episode),
          });
          const res = await fetch(
            `/api/cinema-download/discover?${params.toString()}`,
            { signal: signal || AbortSignal.timeout(4500) },
          );
          if (!res.ok) return;
          const ct = res.headers.get('content-type') || '';
          if (!ct.includes('application/json')) return;
          const data = (await res.json()) as { items?: RawIndexerCandidate[] };
          if (Array.isArray(data.items)) {
            rawCandidates.push(...data.items);
          }
        } catch {}
      })(),
    );

    discoveryTasks.push(
      (async () => {
        try {
          const endpoint =
            media.mediaType === 'tv'
              ? `https://torrentio.strem.fun/stream/series/${encodeURIComponent(imdbId)}:${season}:${episode}.json`
              : `https://torrentio.strem.fun/stream/movie/${encodeURIComponent(imdbId)}.json`;
          const res = await fetch(endpoint, {
            signal: signal || AbortSignal.timeout(5500),
          });
          if (!res.ok) return;
          const data = (await res.json()) as {
            streams?: Array<{
              name?: string;
              title?: string;
              infoHash?: string;
            }>;
          };
          for (const st of data.streams || []) {
            if (!isValidRealHexInfoHash(st.infoHash)) continue;
            const text = `${st.name || ''} ${st.title || ''}`.replace(
              /\r?\n/g,
              ' ',
            );
            const seedMatch = text.match(/👤\s*(\d+)/);
            const sizeMatch = text.match(/💾\s*([\d.]+)\s*(GB|MB)/i);
            let sizeBytes = 0;
            if (sizeMatch) {
              const num = parseFloat(sizeMatch[1]);
              const unit = sizeMatch[2].toUpperCase();
              sizeBytes = Math.round(
                num * (unit === 'GB' ? 1024 * 1024 * 1024 : 1024 * 1024),
              );
            }
            const firstLine = (st.title || '').split(/\r?\n/)[0] || text;
            rawCandidates.push({
              source: 'Torrentio P2P Swarm',
              title: firstLine.trim(),
              infoHash: st.infoHash!.trim().toLowerCase(),
              sizeBytes: sizeBytes > 0 ? sizeBytes : undefined,
              seeders: seedMatch ? Number(seedMatch[1]) : 18,
            });
          }
        } catch {}
      })(),
    );

    if (media.mediaType === 'movie') {
      discoveryTasks.push(
        (async () => {
          try {
            const res = await fetch(
              `https://yts.mx/api/v2/list_movies.json?query_term=${encodeURIComponent(imdbId)}`,
              { signal: signal || AbortSignal.timeout(5000) },
            );
            if (!res.ok) return;
            const data = (await res.json()) as any;
            const movies = data?.data?.movies || [];
            for (const mv of movies) {
              for (const tor of mv?.torrents || []) {
                if (!isValidRealHexInfoHash(tor?.hash)) continue;
                rawCandidates.push({
                  source: 'YTS Official Swarm',
                  title: `${mv.title_long || mv.title}.${tor.quality}.${tor.type || 'WEB'}.${tor.video_codec || 'x264'}-YTS`,
                  infoHash: String(tor.hash).trim().toLowerCase(),
                  sizeBytes: Number(tor.size_bytes) || 0,
                  seeders: Number(tor.seeds) || 20,
                  leechers: Number(tor.peers) || 5,
                  quality: tor.quality,
                  videoCodec: tor.video_codec,
                });
              }
            }
          } catch {}
        })(),
      );
    }
  }

  discoveryTasks.push(
    (async () => {
      try {
        const playSources = buildSources({
          id: media.tmdbId,
          mediaType: media.mediaType,
          imdbId: imdbId || undefined,
          season,
          episode,
        });
        const topUrls = playSources.slice(0, 5).map((s) => s.url);
        if (topUrls.length === 0) return;
        const streams = await fetchExtractedVideos(topUrls, signal);
        extractedDirectStreams.push(...streams);
        streams.slice(0, 4).forEach((st, idx) => {
          const streamUrl = st.proxiedUrl || st.directUrl;
          if (!streamUrl) return;
          const isHls = st.type === 'hls' || st.directUrl.includes('.m3u8');
          const qual: DownloadQualityTier = idx === 0 ? '1080p' : '720p';
          const hashSeed = `direct_real_${media.mediaType}_${media.tmdbId}_s${season}e${episode}_${idx}`;
          rawCandidates.push({
            source: isHls
              ? 'Direct HLS Segment Stream'
              : 'Direct MP4 HTTP Server',
            title: `${media.title}.${qual}.${isHls ? 'HLS-Stream' : 'Direct-MP4'}.H.264-NL`,
            infoHash: normalizeInfoHash('', hashSeed),
            sizeBytes:
              qual === '1080p' ? 1450 * 1024 * 1024 : 780 * 1024 * 1024,
            seeders: 150,
            leechers: 0,
            quality: qual,
            videoCodec: 'H.264',
            directStreamUrl: streamUrl,
            streamReferer: st.sourcePage,
            isDirectStream: true,
          });
        });
      } catch {}
    })(),
  );

  await Promise.allSettled(discoveryTasks);

  const primaryFallbackStream =
    extractedDirectStreams.find((s) => s.type === 'mp4') ||
    extractedDirectStreams[0];
  const fallbackUrl = primaryFallbackStream
    ? primaryFallbackStream.proxiedUrl || primaryFallbackStream.directUrl
    : undefined;
  const fallbackType: 'mp4' | 'hls' | undefined = primaryFallbackStream
    ? primaryFallbackStream.type === 'hls' ||
      primaryFallbackStream.directUrl.includes('.m3u8')
      ? 'hls'
      : 'mp4'
    : undefined;

  const seenHashes = new Set<string>();
  const verifiedReleases: DiscoveredReleaseOption[] = [];
  const fallbackYear = media.year ? Number(media.year.slice(0, 4)) : undefined;

  for (const cand of rawCandidates) {
    const isRealDirect = Boolean(cand.isDirectStream && cand.directStreamUrl);
    const isRealTorrent = isValidRealHexInfoHash(cand.infoHash);
    if (!isRealDirect && !isRealTorrent) continue;

    const cleanHash = isRealTorrent
      ? cand.infoHash.trim().toLowerCase()
      : normalizeInfoHash(cand.infoHash, cand.title);
    if (seenHashes.has(cleanHash)) continue;

    const parsed = parseSceneReleaseName(cand.title, media.title, fallbackYear);
    const quality: DownloadQualityTier =
      (cand.quality as DownloadQualityTier) || parsed.screenSize || '1080p';

    const defaultSize =
      quality === '2160p'
        ? 5.2 * 1024 * 1024 * 1024
        : quality === '1080p'
          ? 1.95 * 1024 * 1024 * 1024
          : quality === '720p'
            ? 920 * 1024 * 1024
            : 480 * 1024 * 1024;

    const sizeBytes = Math.round(
      cand.sizeBytes && cand.sizeBytes > 0 ? cand.sizeBytes : defaultSize,
    );
    const seeders = cand.seeders ?? 15;
    const leechers = cand.leechers ?? Math.max(1, Math.round(seeders * 0.18));

    const safety = verifyReleaseSafety({
      rawTitle: cand.title,
      infoHash: cleanHash,
      sizeBytes,
      quality,
      seeders,
      isDirectStream: isRealDirect,
    });

    if (!safety.safe) continue;
    seenHashes.add(cleanHash);

    const { pieceLength, totalPieces } = computeRealPieceGeometry(sizeBytes);
    const cleanFileName = buildCleanDownloadFileName(
      media,
      quality,
      parsed.videoCodec,
      'mp4',
    );

    verifiedReleases.push({
      id: `${cleanHash}_${quality}`,
      title: cand.title,
      cleanFileName,
      quality,
      sourceKind: isRealDirect
        ? cand.source.includes('HLS')
          ? 'direct-hls'
          : 'direct-mp4'
        : 'torrent-hybrid',
      sizeBytes,
      sizeFormatted: formatBytes(sizeBytes),
      seeders,
      leechers,
      infoHash: cleanHash,
      magnetUri: synthesizeMagnetUri(cleanHash, cleanFileName, liveTrackers),
      torrentCacheUrls: buildPublicTorrentCacheUrls(cleanHash),
      directStreamUrl: cand.directStreamUrl,
      streamReferer: cand.streamReferer,
      fallbackStreamUrl: fallbackUrl,
      fallbackStreamType: fallbackType,
      fallbackStreamReferer: primaryFallbackStream?.sourcePage,
      videoCodec: cand.videoCodec || parsed.videoCodec,
      audioCodec: parsed.audioCodec,
      audioChannels: parsed.audioChannels,
      hdrBadges: parsed.colorDepth,
      sourceLabel: cand.source || parsed.source,
      releaseGroup: parsed.releaseGroup,
      pieceLength,
      totalPieces,
      verifiedSafe: true,
      securityNotes: safety.securityBadges,
      parsedMeta: parsed,
      isRealSource: true,
    });
  }

  const qualityRank: Record<DownloadQualityTier, number> = {
    '2160p': 4,
    '1080p': 3,
    '720p': 2,
    '480p': 1,
  };

  verifiedReleases.sort((a, b) => {
    const qDiff = qualityRank[b.quality] - qualityRank[a.quality];
    if (qDiff !== 0) return qDiff;
    return b.seeders - a.seeders;
  });

  return {
    imdbId,
    releases: verifiedReleases.slice(0, 16),
    trackersCount: liveTrackers.length,
  };
}
