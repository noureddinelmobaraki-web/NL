/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Podnapisi Keyless JSON Provider
 * - Queries Podnapisi JSON endpoint for Arabic and international subtitles
 */

import type { ExtractedSubtitleTrack } from '../videoExtractor';
import type { SubtitleFetchParams } from '../subtitleService';
import {
  getLanguageLabel,
  normalizeLangCode,
} from '../../features/cinema/subtitles/languages';

interface PodnapisiItem {
  id?: string | number;
  pid?: string;
  release?: string;
  releases?: string[];
  language?: string;
  flags?: string[];
  download?: string;
}

export async function searchPodnapisiSubtitles(
  params: SubtitleFetchParams,
  langs: string[],
): Promise<ExtractedSubtitleTrack[]> {
  const title = (params.title || '').trim();
  if (!title) return [];

  const primaryLang = langs.includes('ar') ? 'ar' : langs[0] || 'en';
  const u = new URL('https://www.podnapisi.net/subtitles/search/advanced');
  u.searchParams.set('keywords', title);
  if (params.year) {
    u.searchParams.set('year', String(params.year).slice(0, 4));
  }
  if (params.mediaType === 'tv') {
    u.searchParams.set('seasons', String(Math.max(1, params.season || 1)));
    u.searchParams.set('episodes', String(Math.max(1, params.episode || 1)));
  }
  u.searchParams.set('language', primaryLang);

  try {
    const res = await fetch(u.toString(), {
      headers: { Accept: 'application/json' },
      signal: params.signal ?? AbortSignal.timeout(6500),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { data?: PodnapisiItem[] };
    const items = Array.isArray(data?.data) ? data.data : [];

    return items
      .slice(0, 5)
      .map((item, idx): ExtractedSubtitleTrack | null => {
        const pid = item.pid || item.id;
        const rawDl =
          item.download || (pid ? `/subtitles/${pid}/download` : '');
        if (!rawDl) return null;
        const remoteUrl = rawDl.startsWith('http')
          ? rawDl
          : `https://www.podnapisi.net${rawDl}`;
        const lang = normalizeLangCode(item.language || primaryLang);
        const rel =
          (Array.isArray(item.releases) && item.releases[0]) ||
          item.release ||
          title;

        return {
          id: `podnapisi:${pid ?? idx}:${lang}`,
          provider: 'podnapisi',
          lang,
          label: getLanguageLabel(lang),
          release: String(rel).slice(0, 120),
          hearingImpaired: Array.isArray(item.flags)
            ? item.flags.includes('hearing_impaired')
            : false,
          remoteUrl,
          isZipArchive: true,
          url: '',
          proxiedUrl: '',
          loaded: false,
        };
      })
      .filter(Boolean) as ExtractedSubtitleTrack[];
  } catch {
    return [];
  }
}
