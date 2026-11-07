/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { Track } from '../engine/types';
import { getHashColor } from '../utils/cover';
import { MEDIA_BASE } from '../../../config/media';

interface FvRow {
  id?: string | number;
  key?: string;
  file?: string;
  title?: string;
  artist?: string;
  album?: string;
  genre?: string;
  year?: string | number;
  duration?: string | number;
  durationSec?: string | number;
  coverUrl?: string;
  coverColor?: string;
  url?: string;
  src?: string;
  urlJsdelivr?: string;
  hasLrc?: boolean;
  lrcFile?: string | null;
}

const FV_MEDIA_PREFIX = `${MEDIA_BASE}/xp/media/nl-fv-songs`;
const FV_JSDELIVR_PREFIX =
  'https://cdn.jsdelivr.net/gh/noureddinelmobaraki-web/nl-audio-cdn@main/xp/media/nl-fv-songs';

function toTrack(raw: FvRow): Track {
  const id = String(raw.id ?? raw.key ?? Math.random().toString(36).slice(2));
  const trackId = id.startsWith('fv-') ? id : 'fv-' + id;
  const numericId = id.replace(/^fv-/, '');
  const title = String(raw.title ?? 'Unknown title').trim();
  const file = raw.file
    ? String(raw.file).trim()
    : /^\d+$/.test(numericId)
      ? `song_${numericId.padStart(3, '0')}.m4a`
      : '';
  const urlStr = String(
    raw.url ?? raw.src ?? (file ? `${FV_MEDIA_PREFIX}/${file}` : ''),
  );
  const fallbackStr = raw.urlJsdelivr
    ? String(raw.urlJsdelivr)
    : file
      ? `${FV_JSDELIVR_PREFIX}/${file}`
      : urlStr;
  const coverUrlStr = raw.coverUrl
    ? String(raw.coverUrl)
    : file
      ? `${FV_MEDIA_PREFIX}/${file.replace(/\.[^.]+$/, '.webp')}`
      : undefined;

  return {
    id: trackId,
    title,
    artist: String(raw.artist ?? 'Unknown artist').trim(),
    album: raw.album ? String(raw.album) : undefined,
    genre: raw.genre ? String(raw.genre) : undefined,
    year: raw.year ? Number(raw.year) || undefined : undefined,
    durationSec: Number(raw.duration ?? raw.durationSec) || undefined,
    coverUrl: coverUrlStr,
    coverColor: raw.coverColor ? String(raw.coverColor) : getHashColor(title),
    src: urlStr,
    srcFallback: fallbackStr,
    kind: 'file',
    hasLrc: Boolean(raw.hasLrc),
    source: 'fv',
    url: urlStr,
    key: trackId,
  } as Track;
}

let _cache: Track[] | null = null;
let _inflight: Promise<Track[]> | null = null;

export function getFvTracksSync(): Track[] {
  return _cache ?? [];
}

export function loadFvTracks(): Promise<Track[]> {
  if (_cache) return Promise.resolve(_cache);
  if (_inflight) return _inflight;

  const url = `${import.meta.env.BASE_URL}data/nl-music-fv.json`;
  _inflight = fetch(url, { cache: 'force-cache' })
    .then((res) => {
      if (!res.ok) throw new Error(`nl-music-fv.json: HTTP ${res.status}`);
      return res.json() as Promise<FvRow[]>;
    })
    .then((rows) => {
      _cache = (Array.isArray(rows) ? rows : []).map(toTrack).filter((t) => t.src);
      return _cache;
    })
    .catch((err) => {
      _inflight = null;
      throw err;
    });

  return _inflight;
}

export function buildInitialOrder(tracks: Track[]): string[] {
  const ids = tracks.map((t) => t.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = ids[i];
    ids[i] = ids[j];
    ids[j] = tmp;
  }
  return ids;
}
