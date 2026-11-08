/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Unit tests for the isolated Cinema Download System:
 * - Scene Release Parser & 6-Gate Security Filter
 * - Magnet URI Synthesizer & Real Multi-GB Piece Geometry
 * - Sliding-Window Priority Scheduler (Header+Tail First, Playhead Read-Ahead, Seek Reprioritization)
 */

import { describe, it, expect } from 'vitest';
import {
  buildPublicTorrentCacheUrls,
  formatBytes,
  normalizeInfoHash,
  parseSceneReleaseName,
  synthesizeMagnetUri,
  verifyReleaseSafety,
} from './releaseParserAndFilter';
import {
  buildCleanDownloadFileName,
  computeRealPieceGeometry,
} from './releaseDiscoveryService';
import {
  byteOffsetToPieceIndex,
  computePieceMapBuckets,
  selectNextPieceToDownload,
} from './slidingWindowScheduler';

describe('Cinema Download Release Parser & 6-Gate Security Filter', () => {
  it('parses complex 4K TV episode release names accurately', () => {
    const raw =
      'Severance.S02E04.Woes.Hollow.2160p.ATVP.WEB-DL.DDP5.1.Atmos.DV.HDR.H.265-FLUX';
    const parsed = parseSceneReleaseName(raw);

    expect(parsed.cleanTitle).toBe('Severance');
    expect(parsed.type).toBe('episode');
    expect(parsed.season).toBe(2);
    expect(parsed.episode).toBe(4);
    expect(parsed.screenSize).toBe('2160p');
    expect(parsed.videoCodec).toBe('H.265 / HEVC');
    expect(parsed.audioCodec).toBe('Dolby Atmos');
    expect(parsed.audioChannels).toBe('5.1');
    expect(parsed.colorDepth).toContain('Dolby Vision');
    expect(parsed.releaseGroup).toBe('FLUX');
  });

  it('blocks fake-media executable malware extensions and RTL override characters', () => {
    const exeAttempt = verifyReleaseSafety({
      rawTitle: 'Dune.Part.Two.2024.1080p.BluRay.codec_setup.exe',
      infoHash: normalizeInfoHash('', 'test1'),
      sizeBytes: 2 * 1024 * 1024 * 1024,
      quality: '1080p',
      seeders: 50,
    });
    expect(exeAttempt.safe).toBe(false);

    const rtlOverrideAttempt = verifyReleaseSafety({
      rawTitle: 'Movie.2024.\u202Egpj.exe',
      infoHash: normalizeInfoHash('', 'test2'),
      sizeBytes: 2 * 1024 * 1024 * 1024,
      quality: '1080p',
      seeders: 50,
    });
    expect(rtlOverrideAttempt.safe).toBe(false);
  });

  it('accepts valid media releases and synthesizes magnet + public cache URLs', () => {
    const hash = '08ada5a7a6183aae1e09d831df6748d566095a10';
    const safety = verifyReleaseSafety({
      rawTitle: 'Sintel.2010.1080p.WEB-DL.DDP5.1.H.264-Blender',
      infoHash: hash,
      sizeBytes: 1500 * 1024 * 1024,
      quality: '1080p',
      seeders: 120,
    });
    expect(safety.safe).toBe(true);

    const magnet = synthesizeMagnetUri(hash, 'Sintel.2010.1080p.mp4');
    expect(magnet).toContain(`magnet:?xt=urn:btih:${hash}`);
    expect(magnet).toContain('dn=Sintel.2010.1080p.mp4');

    const caches = buildPublicTorrentCacheUrls(hash);
    expect(caches[0]).toContain(hash.toUpperCase());
    expect(formatBytes(2.5 * 1024 * 1024 * 1024)).toBe('2.50 GB');
  });

  it('computes true multi-gigabyte piece geometry instead of hardcoded 32 pieces (8 MB)', () => {
    const size3_3GB = Math.round(3.3 * 1024 * 1024 * 1024);
    const geom3_3 = computeRealPieceGeometry(size3_3GB);
    expect(geom3_3.pieceLength).toBe(2 * 1024 * 1024);
    expect(geom3_3.totalPieces).toBeGreaterThan(1600);
    expect(geom3_3.totalPieces * geom3_3.pieceLength).toBeGreaterThanOrEqual(
      size3_3GB,
    );

    const size7_13GB = Math.round(7.13 * 1024 * 1024 * 1024);
    const geom7_13 = computeRealPieceGeometry(size7_13GB);
    expect(geom7_13.pieceLength).toBe(2 * 1024 * 1024);
    expect(geom7_13.totalPieces).toBeGreaterThan(3600);

    const cleanName = buildCleanDownloadFileName(
      {
        id: 278,
        tmdbId: 278,
        mediaType: 'movie',
        title: 'The Shawshank Redemption',
        year: '1994',
        posterUrl: '/poster.jpg',
      },
      '2160p',
      'H.265 / HEVC',
      'mp4',
    );
    expect(cleanName).toBe(
      'The.Shawshank.Redemption.1994.2160p.WEB-DL.H.265.mp4',
    );
  });

  it('prioritizes Header [0, 1] + Tail [N-1, N-2] first, then Playhead/Seek Window, then Sequential', () => {
    const totalPieces = 1000;
    const bf = new Uint8Array(totalPieces);

    // Step 1: Must pick piece 0, 1, 999, 998 first (Header + Tail for moov/Cues)
    const p1 = selectNextPieceToDownload(bf, totalPieces, 0);
    expect(p1?.pieceIndex).toBe(0);
    expect(p1?.phase).toBe('header-tail');
    bf[0] = 1;

    const p2 = selectNextPieceToDownload(bf, totalPieces, 0);
    expect(p2?.pieceIndex).toBe(1);
    bf[1] = 1;

    const p3 = selectNextPieceToDownload(bf, totalPieces, 0);
    expect(p3?.pieceIndex).toBe(999);
    bf[999] = 1;

    const p4 = selectNextPieceToDownload(bf, totalPieces, 0);
    expect(p4?.pieceIndex).toBe(998);
    bf[998] = 1;

    // Step 2: When user seeks to minute 55:00 (e.g. piece 540), scheduler immediately prioritizes [540..549]
    const seekTarget = byteOffsetToPieceIndex(
      540 * 1048576,
      1048576,
      totalPieces,
    );
    expect(seekTarget).toBe(540);

    const pSeek = selectNextPieceToDownload(bf, totalPieces, seekTarget, true);
    expect(pSeek?.pieceIndex).toBe(540);
    expect(pSeek?.phase).toBe('seek-window');
    expect(pSeek?.headerAndTailReady).toBe(true);

    const buckets = computePieceMapBuckets(bf, totalPieces, seekTarget, 48);
    expect(buckets.length).toBe(48);
    expect(buckets).toContain('playhead-window');
    expect(buckets).toContain('header-tail');
  });
});
