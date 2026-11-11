/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Stremio OpenSubtitles v3 Keyless JSON Subtitle Provider
 * - Movies: https://opensubtitles-v3.strem.io/subtitles/movie/{imdbId}.json
 * - Series: https://opensubtitles-v3.strem.io/subtitles/series/{imdbId}:{season}:{episode}.json
 */

import type { ExtractedSubtitleTrack } from '../videoExtractor';
import type { SubtitleFetchParams } from '../subtitleService';
import {
  getLanguageLabel,
  normalizeLangCode,
} from '../../features/cinema/subtitles/languages';

interface StremioOsV3SubEntry {
  id?: string;
  url?: string;
  lang?: string;
}

export async function searchStremioOpenSubsV3(
  params: SubtitleFetchParams,
  langs: string[],
): Promise<ExtractedSubtitleTrack[]> {
  const cleanImdb =
    params.imdbId && /^tt\d+$/i.test(params.imdbId.trim())
      ? params.imdbId.trim()
      : '';
  if (!cleanImdb) return [];

  const endpoint =
    params.mediaType === 'tv'
      ? `https://opensubtitles-v3.strem.io/subtitles/series/${encodeURIComponent(cleanImdb)}:${Math.max(1, params.season || 1)}:${Math.max(1, params.episode || 1)}.json`
      : `https://opensubtitles-v3.strem.io/subtitles/movie/${encodeURIComponent(cleanImdb)}.json`;

  try {
    const res = await fetch(endpoint, {
      signal: params.signal ?? AbortSignal.timeout(6500),
    });
    if (!res.ok) return [];
    const payload = (await res.json()) as { subtitles?: StremioOsV3SubEntry[] };
    const list = Array.isArray(payload?.subtitles) ? payload.subtitles : [];
    const allowedSet = new Set(langs.map((l) => normalizeLangCode(l)));

    const tracks: ExtractedSubtitleTrack[] = [];
    for (let i = 0; i < list.length; i += 1) {
      const item = list[i];
      if (!item || typeof item.url !== 'string' || !item.url.trim()) continue;
      const lang = normalizeLangCode(item.lang || 'en');
      if (!allowedSet.has(lang)) continue;

      tracks.push({
        id: `stremio-osv3:${item.id ?? i}:${lang}`,
        provider: 'stremio-osv3',
        lang,
        label: getLanguageLabel(lang),
        release: `OpenSubtitles v3 #${item.id ?? i + 1}`,
        hearingImpaired: false,
        remoteUrl: item.url.trim(),
        url: '',
        proxiedUrl: '',
        loaded: false,
      });
    }

    return tracks;
  } catch {
    return [];
  }
}
