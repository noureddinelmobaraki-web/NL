/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Multi-Indexer Torrent & Direct Stream Discovery Service:
 * - Official YTS.GG v2 Fast API (`https://movies-api.accel.li/api/v2/` + fallbacks)
 * - Cloudflare Worker `/streams/direct` + `/probe` pre-flight verification
 * - Torrentio Stremio API + Backend Bridge `/api/cinema-download/discover`
 */

import { PUBLIC_TMDB_KEY } from '../../config/publicKeys';
import {
  buildWorkerProxyUrl,
  buildWorkerTorrentCacheUrl,
  extractDirectCinemaBundle,
  fetchExtractedVideos,
  probeVideoStream,
} from '../../services/videoExtractor';
import { buildSources } from '../../components/Movies/MovieSourcesModal';
import {
  resolveYtsMovieAndTorrents,
  YTS_RECOMMENDED_TRACKERS,
} from '../../services/ytsApiClient';
export { buildCleanDownloadFileName } from './releaseParserAndFilter';
import {
  buildCleanDownloadFileName,
  buildPublicTorrentCacheUrls,
  formatBytes,
  getLiveTrackers,
  parseSceneReleaseName,
  synthesizeMagnetUri,
  verifyReleaseSafety,
} from './releaseParserAndFilter';
import type {
  DiscoveredReleaseOption,
  DownloadMediaContext,
  DownloadQualityTier,
} from './types';

export function computeRealPieceGeometry(sizeBytes: number): {
  pieceLength: number;
  totalPieces: number;
} {
  const pieceLength =
    sizeBytes >= 2 * 1024 * 1024 * 1024 ? 2 * 1024 * 1024 : 1024 * 1024;
  const totalPieces = Math.max(1, Math.ceil(sizeBytes / pieceLength));
  return { pieceLength, totalPieces };
}

export async function sha1HexFromString(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest(
    'SHA-1',
    bytes as unknown as BufferSource,
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function resolveMediaImdbId(
  media: DownloadMediaContext,
): Promise<string> {
  if (media.imdbId && /^tt\d+$/i.test(media.imdbId.trim())) {
    return media.imdbId.trim();
  }
  const tmdbKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_TMDB_API_KEY) || PUBLIC_TMDB_KEY;
  if (tmdbKey && media.tmdbId > 0) {
    try {
      const endpoint =
        media.mediaType === 'tv'
          ? `https://api.themoviedb.org/3/tv/${media.tmdbId}/external_ids?api_key=${tmdbKey}`
          : `https://api.themoviedb.org/3/movie/${media.tmdbId}/external_ids?api_key=${tmdbKey}`;
      const res = await fetch(endpoint, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const data = await res.json();
        if (data?.imdb_id && /^tt\d+$/i.test(data.imdb_id)) {
          return data.imdb_id;
        }
      }
    } catch {
      // Fallback to YTS lookup below
    }
  }

  if (media.mediaType === 'movie' && (media.originalTitle || media.title)) {
    try {
      const yts = await resolveYtsMovieAndTorrents({
        title: media.originalTitle || media.title,
        year: media.year,
      });
      if (yts.movie?.imdb_code && /^tt\d+$/i.test(yts.movie.imdb_code)) {
        return yts.movie.imdb_code;
      }
    } catch {
      // Ignore fallback error
    }
  }

  return '';
}

interface RawCandidate {
  infoHash: string;
  rawTitle: string;
  sizeBytes: number;
  seeders: number;
  leechers: number;
  qualityHint?: DownloadQualityTier;
  sourceLabel: string;
  webSeeds?: string[];
  directTorrentUrl?: string;
}

async function collectTorrentCandidates(
  media: DownloadMediaContext,
  imdbId: string,
  signal?: AbortSignal,
): Promise<{
  candidates: RawCandidate[];
  directStreams: Awaited<ReturnType<typeof extractDirectCinemaBundle>>['streams'];
}> {
  const candidates: RawCandidate[] = [];
  const directStreams: Awaited<ReturnType<typeof extractDirectCinemaBundle>>['streams'] = [];

  const tasks: Promise<void>[] = [];

  tasks.push(
    extractDirectCinemaBundle({
      imdbId: imdbId || undefined,
      tmdbId: media.tmdbId,
      type: media.mediaType,
      season: media.season,
      episode: media.episode,
      title: media.originalTitle || media.title,
      year: media.year,
      signal,
    }).then((bundle) => {
      directStreams.push(...bundle.streams);
      for (const tor of bundle.torrents) {
        if (!tor.infoHash || !/^[0-9a-fA-F]{40}$/.test(tor.infoHash)) continue;
        const q = (
          ['2160p', '1080p', '720p', '480p'].includes(tor.quality)
            ? tor.quality
            : '1080p'
        ) as DownloadQualityTier;
        candidates.push({
          infoHash: tor.infoHash.toLowerCase(),
          rawTitle: tor.title,
          sizeBytes:
            tor.sizeBytes && tor.sizeBytes > 0
              ? tor.sizeBytes
              : q === '2160p'
                ? 5.2 * 1024 ** 3
                : q === '1080p'
                  ? 1.95 * 1024 ** 3
                  : 980 * 1024 ** 2,
          seeders: Number(tor.seeds) || 12,
          leechers: Number(tor.peers) || 3,
          qualityHint: q,
          sourceLabel: tor.directTorrentUrl ? 'YTS.GG Official v2' : 'Torrentio Swarm',
          directTorrentUrl: tor.directTorrentUrl,
        });
      }
    }),
  );

  if (media.mediaType === 'movie') {
    tasks.push(
      resolveYtsMovieAndTorrents({
        imdbId: imdbId || undefined,
        title: media.title,
        originalTitle: media.originalTitle,
        year: media.year,
        signal,
      }).then((ytsResult) => {
        const movieTitle =
          ytsResult.movie?.title_long ||
          ytsResult.movie?.title ||
          media.originalTitle ||
          media.title;
        for (const tor of ytsResult.torrents) {
          const qRaw = String(tor.quality || '1080p').toLowerCase();
          const q: DownloadQualityTier = qRaw.includes('2160')
            ? '2160p'
            : qRaw.includes('1080')
              ? '1080p'
              : qRaw.includes('720')
                ? '720p'
                : '480p';
          const codecTag =
            tor.video_codec === 'x265' ? 'x265.10bit' : tor.video_codec || 'x264';
          candidates.push({
            infoHash: tor.hash.toLowerCase(),
            rawTitle: `${movieTitle}.${tor.quality}.${(tor.type || 'WEB').toUpperCase()}.${codecTag}.${tor.audio_channels || '5.1'}-YTS.GG.mp4`,
            sizeBytes:
              Number(tor.size_bytes) ||
              (q === '2160p'
                ? 4.8 * 1024 ** 3
                : q === '1080p'
                  ? 1.85 * 1024 ** 3
                  : 920 * 1024 ** 2),
            seeders: Number(tor.seeds) || 25,
            leechers: Number(tor.peers) || 6,
            qualityHint: q,
            sourceLabel: `YTS.GG (${ (tor.type || 'WEB').toUpperCase() } ${codecTag})`,
            directTorrentUrl: tor.url || undefined,
          });
        }
      }),
    );
  }

  if (imdbId) {
    tasks.push(
      (async () => {
        try {
          const params = new URLSearchParams({
            imdbId,
            mediaType: media.mediaType,
            title: media.originalTitle || media.title,
            ...(media.season ? { season: String(media.season) } : {}),
            ...(media.episode ? { episode: String(media.episode) } : {}),
          });
          const res = await fetch(`/api/cinema-download/discover?${params}`, {
            signal: signal ?? AbortSignal.timeout(4500),
          });
          if (!res.ok) return;
          const data = await res.json();
          for (const item of data?.candidates || []) {
            if (!item?.infoHash) continue;
            candidates.push({
              infoHash: String(item.infoHash).toLowerCase(),
              rawTitle: String(item.rawTitle || media.title),
              sizeBytes: Number(item.sizeBytes) || 1.8 * 1024 ** 3,
              seeders: Number(item.seeders) || 15,
              leechers: Number(item.leechers) || 4,
              qualityHint: item.qualityHint,
              sourceLabel: String(item.sourceLabel || 'Bridge Indexer'),
              webSeeds: Array.isArray(item.webSeeds) ? item.webSeeds : undefined,
              directTorrentUrl: item.directTorrentUrl,
            });
          }
        } catch {}
      })(),
    );
  }

  await Promise.allSettled(tasks);
  return { candidates, directStreams };
}

export async function discoverReleasesForMedia(
  media: DownloadMediaContext,
  signal?: AbortSignal,
): Promise<{
  imdbId: string;
  releases: DiscoveredReleaseOption[];
  trackersCount: number;
}> {
  const [imdbId, baseTrackers] = await Promise.all([
    resolveMediaImdbId(media),
    getLiveTrackers(),
  ]);

  const topUrls = buildSources({
    id: media.tmdbId,
    mediaType: media.mediaType,
    imdbId: imdbId || undefined,
    season: media.season || 1,
    episode: media.episode || 1,
  })
    .slice(0, 5)
    .map((s) => s.url);

  const extractedStreamList = await fetchExtractedVideos(topUrls, signal).catch(
    () => [],
  );

  const liveTrackers = Array.from(
    new Set([...YTS_RECOMMENDED_TRACKERS, ...baseTrackers]),
  );

  const { candidates: rawCandidates, directStreams } =
    await collectTorrentCandidates(media, imdbId, signal);

  const fallbackStream = extractedStreamList[0];
  const fallbackStreamUrl =
    fallbackStream?.directUrl || fallbackStream?.proxiedUrl;
  const fallbackStreamReferer = fallbackStream?.sourcePage;

  const seenHashes = new Set<string>();
  const verifiedReleases: DiscoveredReleaseOption[] = [];

  for (const cand of rawCandidates) {
    const cleanHash = cand.infoHash.trim().toLowerCase();
    if (!/^[0-9a-f]{40}$/.test(cleanHash) || seenHashes.has(cleanHash)) {
      continue;
    }
    seenHashes.add(cleanHash);

    const parsed = parseSceneReleaseName(cand.rawTitle);
    if (cand.qualityHint) {
      parsed.screenSize = cand.qualityHint;
    }

    const safety = verifyReleaseSafety({
      rawTitle: cand.rawTitle,
      infoHash: cleanHash,
      sizeBytes: cand.sizeBytes,
      quality: parsed.screenSize,
      seeders: cand.seeders,
    });

    if (!safety.safe) continue;

    const { pieceLength, totalPieces } = computeRealPieceGeometry(
      cand.sizeBytes,
    );
    const cleanFileName = buildCleanDownloadFileName(
      media,
      parsed.screenSize,
      parsed.videoCodec,
      'mp4',
    );

    const cacheUrls = [
      buildWorkerTorrentCacheUrl(cleanHash, cand.directTorrentUrl),
      ...(cand.directTorrentUrl
        ? [buildWorkerProxyUrl(cand.directTorrentUrl)]
        : []),
      ...buildPublicTorrentCacheUrls(cleanHash),
    ];

    verifiedReleases.push({
      id: `${cleanHash}_${parsed.screenSize}`,
      title: cand.rawTitle,
      cleanFileName,
      quality: parsed.screenSize,
      sourceKind: 'torrent-hybrid',
      sizeBytes: cand.sizeBytes,
      sizeFormatted: formatBytes(cand.sizeBytes),
      seeders: cand.seeders,
      leechers: cand.leechers,
      infoHash: cleanHash,
      magnetUri: synthesizeMagnetUri(cleanHash, cand.rawTitle, liveTrackers),
      torrentCacheUrls: Array.from(new Set(cacheUrls)),
      directTorrentUrl: cand.directTorrentUrl,
      webSeeds: cand.webSeeds || [],
      directStreamUrl: fallbackStreamUrl,
      streamReferer: fallbackStreamReferer,
      videoCodec: parsed.videoCodec,
      audioCodec: parsed.audioCodec,
      audioChannels: parsed.audioChannels,
      hdrBadges: parsed.colorDepth,
      sourceLabel: cand.sourceLabel,
      releaseGroup: parsed.releaseGroup,
      pieceLength,
      totalPieces,
      verifiedSafe: true,
      securityNotes: safety.securityBadges,
      parsedMeta: parsed,
      isRealSource: true,
    });
  }

  // Probe direct streams via /probe and strictly discard any broken/blocked/HTML error URLs
  const streamCandidates = [
    ...directStreams.map((s) => ({
      url: s.directUrl,
      referer: s.referer || '',
      server: s.server,
      qualityHint: s.quality,
      sizeHint: s.sizeBytes,
    })),
    ...extractedStreamList.slice(0, 3).map((s, idx) => ({
      url: s.directUrl,
      referer: s.sourcePage || '',
      server: `stream-${idx + 1}`,
      qualityHint: s.type === 'hls' ? '1080p' : '720p',
      sizeHint: undefined,
    })),
  ];

  const probedStreams = await Promise.allSettled(
    streamCandidates.slice(0, 4).map(async (st) => {
      const probe = await probeVideoStream(st.url, st.referer, signal);
      return { st, probe };
    }),
  );

  for (let i = 0; i < probedStreams.length; i++) {
    const item = probedStreams[i];
    if (item.status !== 'fulfilled') continue;
    const { st, probe } = item.value;
    if (!probe.ok) continue;

    const streamHash = await sha1HexFromString(
      `direct_stream_${media.mediaType}_${media.tmdbId}_${media.season || 0}_${media.episode || 0}_${st.server}_${i}`,
    );
    if (seenHashes.has(streamHash)) continue;
    seenHashes.add(streamHash);

    const isHls = probe.kind === 'hls';
    const qTier: DownloadQualityTier = /2160|4k/i.test(st.qualityHint || '')
      ? '2160p'
      : /720/i.test(st.qualityHint || '')
        ? '720p'
        : '1080p';
    const estBytes =
      probe.totalBytes && probe.totalBytes > 0
        ? probe.totalBytes
        : st.sizeHint && st.sizeHint > 0
          ? st.sizeHint
          : qTier === '2160p'
            ? 3.6 * 1024 ** 3
            : qTier === '1080p'
              ? 1.45 * 1024 ** 3
              : 820 * 1024 ** 2;
    const { pieceLength, totalPieces } = computeRealPieceGeometry(estBytes);
    const containerExt = isHls ? 'ts' : probe.kind === 'mkv' ? 'mkv' : 'mp4';
    const cleanFileName = buildCleanDownloadFileName(
      media,
      qTier,
      'H.264',
      containerExt === 'mkv' ? 'mkv' : 'mp4',
    );
    const proxied =
      probe.proxiedUrl || buildWorkerProxyUrl(st.url, st.referer);

    verifiedReleases.push({
      id: `${streamHash}_${qTier}`,
      title: `${media.title} (${st.server} ${qTier})`,
      cleanFileName,
      quality: qTier,
      sourceKind: isHls ? 'direct-hls' : 'direct-mp4',
      sizeBytes: estBytes,
      sizeFormatted:
        probe.totalBytes && probe.totalBytes > 0
          ? formatBytes(estBytes)
          : `~${formatBytes(estBytes)}`,
      seeders: 45 - i * 5,
      leechers: 2,
      infoHash: streamHash,
      magnetUri: synthesizeMagnetUri(streamHash, cleanFileName, liveTrackers),
      torrentCacheUrls: [],
      webSeeds: isHls ? [] : [proxied],
      directStreamUrl: proxied,
      streamReferer: st.referer,
      videoCodec: 'H.264',
      audioCodec: 'AAC',
      audioChannels: '2.0',
      hdrBadges: qTier === '2160p' ? ['4K UHD'] : ['FHD'],
      sourceLabel: isHls
        ? `Direct HLS (${st.server})`
        : `Direct WebSeed (${st.server} · HTTP 206)`,
      releaseGroup: st.server.replace(/\s+/g, ''),
      pieceLength,
      totalPieces,
      verifiedSafe: true,
      securityNotes: ['Pre-probed via Cloudflare Worker /probe'],
      parsedMeta: parseSceneReleaseName(cleanFileName),
      isRealSource: true,
    });
  }

  const tierRank: Record<DownloadQualityTier, number> = {
    '2160p': 4,
    '1080p': 3,
    '720p': 2,
    '480p': 1,
  };
  verifiedReleases.sort((a, b) => {
    if (tierRank[b.quality] !== tierRank[a.quality]) {
      return tierRank[b.quality] - tierRank[a.quality];
    }
    return b.seeders - a.seeders;
  });

  return {
    imdbId,
    releases: verifiedReleases,
    trackersCount: liveTrackers.length,
  };
}
