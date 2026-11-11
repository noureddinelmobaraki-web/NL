/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * SubDL API & ZIP Unpacker Provider
 * - Queries SubDL API for Arabic, English, French, and international subtitles
 * - Unpacks .zip subtitle bundles directly in the browser using JSZip
 * - Supports legacy Arabic Windows-1256 and UTF-8 .srt/.ass/.vtt files
 */

import type { ExtractedSubtitleTrack } from '../videoExtractor';
import type { SubtitleFetchParams } from '../subtitleService';
import {
  getLanguageLabel,
  normalizeLangCode,
} from '../../features/cinema/subtitles/languages';

const SUBDL_API_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUBDL_API_KEY) ||
  '';

interface SubDlSubtitleItem {
  release_name?: string;
  name?: string;
  lang?: string;
  language?: string;
  url?: string;
  hi?: boolean | number;
}

export async function searchSubDlSubtitles(
  params: SubtitleFetchParams,
  langs: string[],
): Promise<ExtractedSubtitleTrack[]> {
  if (!SUBDL_API_KEY) return [];

  const u = new URL('https://api.subdl.com/api/v1/subtitles');
  u.searchParams.set('api_key', SUBDL_API_KEY);
  if (params.imdbId && /^tt\d+$/i.test(params.imdbId.trim())) {
    u.searchParams.set('imdb_id', params.imdbId.trim());
  }
  if (params.tmdbId > 0) {
    u.searchParams.set('tmdb_id', String(params.tmdbId));
  }
  u.searchParams.set('type', params.mediaType === 'tv' ? 'tv' : 'movie');
  if (params.mediaType === 'tv') {
    u.searchParams.set('season_number', String(Math.max(1, params.season || 1)));
    u.searchParams.set(
      'episode_number',
      String(Math.max(1, params.episode || 1)),
    );
  }
  u.searchParams.set(
    'languages',
    langs.map((l) => l.slice(0, 2).toUpperCase()).join(','),
  );

  try {
    const res = await fetch(u.toString(), {
      signal: params.signal ?? AbortSignal.timeout(7000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      status?: boolean;
      subtitles?: SubDlSubtitleItem[];
    };
    const list = Array.isArray(data?.subtitles) ? data.subtitles : [];

    return list
      .filter((it) => it && typeof it.url === 'string' && it.url.trim())
      .map((it, idx): ExtractedSubtitleTrack => {
        const lang = normalizeLangCode(it.language || it.lang || 'ar');
        const rawUrl = it.url!.trim();
        const remoteUrl = rawUrl.startsWith('http')
          ? rawUrl
          : `https://dl.subdl.com${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
        return {
          id: `subdl:${idx}:${lang}`,
          provider: 'subdl',
          lang,
          label: getLanguageLabel(lang),
          release: String(it.release_name || it.name || 'SubDL Release').slice(
            0,
            120,
          ),
          hearingImpaired: Boolean(it.hi),
          remoteUrl,
          isZipArchive: /\.zip($|\?)/i.test(remoteUrl),
          url: '',
          proxiedUrl: '',
          loaded: false,
        };
      });
  } catch {
    return [];
  }
}

/**
 * Downloads a subtitle URL that may be either a plain text (.srt/.ass/.vtt) or a .zip archive,
 * unpacks the first matching subtitle file via JSZip if compressed, and decodes bytes with
 * Arabic Windows-1256 / UTF-8 awareness.
 */
export async function downloadAndUnpackSubtitleText(
  url: string,
  lang: string,
  decodeFn: (buf: ArrayBuffer, lang?: string) => string,
  signal?: AbortSignal,
): Promise<string> {
  const res = await fetch(url, {
    signal: signal ?? AbortSignal.timeout(9500),
  });
  if (!res.ok) {
    throw new Error(`Subtitle download HTTP ${res.status}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  // Check PK\x03\x04 ZIP magic header or .zip extension
  const isZipMagic =
    bytes.length > 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes[2] === 0x03 &&
    bytes[3] === 0x04;

  if (isZipMagic || /\.zip($|\?)/i.test(url)) {
    const { default: JSZip } = await import('jszip');
    const zip = await JSZip.loadAsync(arrayBuffer);
    const entryNames = Object.keys(zip.files).filter(
      (name) => !zip.files[name].dir && /\.(srt|ass|ssa|vtt)$/i.test(name),
    );
    if (entryNames.length === 0) {
      throw new Error('No .srt/.ass/.vtt found inside ZIP archive');
    }
    // Prefer .srt or .ass
    entryNames.sort((a, b) => {
      const score = (n: string) =>
        /\.ass$/i.test(n) ? 2 : /\.srt$/i.test(n) ? 1 : 0;
      return score(b) - score(a);
    });
    const fileBuf = await zip.files[entryNames[0]].async('arraybuffer');
    return decodeFn(fileBuf, lang);
  }

  return decodeFn(arrayBuffer, lang);
}
