/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { type AudiobookChapter, type AudiobookItem, stripHtml } from './types';
import { WORKER_ENDPOINT } from '../../../services/videoExtractor';
import { getSuperCacheAsync, setSuperCache } from './cache';
import { directInternetArchiveAudiobooks } from './internetArchive';

const WORKER_BASE = WORKER_ENDPOINT.replace(/\/+$/, '');

export async function directItunesAudiobooks(
  q: string,
  genre: string,
  signal?: AbortSignal,
): Promise<AudiobookItem[]> {
  const term =
    q || (genre && genre !== 'popular' && genre !== 'all' ? genre : 'classic literature audiobook');
  const u = new URL('https://itunes.apple.com/search');
  u.searchParams.set('term', term);
  u.searchParams.set('media', 'audiobook');
  u.searchParams.set('limit', '20');

  const r = await fetch(u.toString(), { signal });
  if (!r.ok) return [];
  const data = await r.json();
  const results = Array.isArray(data?.results) ? data.results : [];
  return results.map((item: Record<string, unknown>) => {
    const hiResCover = String(item.artworkUrl100 || '').replace(/100x100bb/g, '600x600bb');
    return {
      id: `itunes_${String(item.collectionId || Math.random().toString(36).slice(2))}`,
      title: String(item.collectionName || item.trackName || 'Audiobook'),
      author: String(item.artistName || 'Narrator'),
      description: stripHtml(String(item.description || '')).slice(0, 600),
      language: 'English',
      runtime: item.trackTimeMillis ? `${Math.round(Number(item.trackTimeMillis) / 60000)} min` : '',
      year: item.releaseDate ? String(item.releaseDate).slice(0, 4) : '',
      coverUrl: hiResCover,
      source: 'Audio Edition',
      chapterCount: Number(item.trackCount) || 1,
      previewUrl: String(item.previewUrl || ''),
      externalUrl: String(item.collectionViewUrl || ''),
    };
  });
}

export async function directLocAudio(
  q: string,
  genre: string,
  signal?: AbortSignal,
): Promise<AudiobookItem[]> {
  const term = q || (genre && genre !== 'popular' && genre !== 'all' ? genre : 'literature poetry');
  const u = new URL('https://www.loc.gov/audio/');
  u.searchParams.set('fo', 'json');
  u.searchParams.set('at', 'results,pagination');
  u.searchParams.set('c', '14');
  u.searchParams.set('q', term);

  const r = await fetch(u.toString(), { signal });
  if (!r.ok) return [];
  const data = await r.json();
  const results = Array.isArray(data?.results) ? data.results : [];
  return results.map((item: Record<string, unknown>, idx: number) => {
    const imgs = Array.isArray(item.image_url) ? (item.image_url as string[]) : [];
    const desc = Array.isArray(item.description) ? (item.description as string[]).join(' ') : '';
    const contrib = Array.isArray(item.contributor)
      ? (item.contributor as string[]).join(', ')
      : 'Archive Narrator';
    return {
      id: `loc_${idx}_${encodeURIComponent(String(item.id || item.title || idx)).slice(-20)}`,
      title: String(item.title || 'Historical Audio Recording'),
      author: contrib,
      description: stripHtml(desc).slice(0, 500),
      language: Array.isArray(item.language) ? String(item.language[0]) : 'English',
      year: item.date ? String(item.date).slice(0, 4) : '',
      coverUrl: imgs.length > 0 ? imgs[imgs.length - 1] : '',
      source: 'Audio Edition',
      chapterCount: 1,
      externalUrl: String(item.url || item.id || ''),
    };
  });
}

export async function fetchAudiobookChapters(
  item: AudiobookItem,
  signal?: AbortSignal,
): Promise<{ coverUrl?: string; tracks: AudiobookChapter[] }> {
  const cacheKey = `chapters:${item.iaId || item.librivoxId || item.id}`;
  const cached = await getSuperCacheAsync<{ coverUrl?: string; tracks: AudiobookChapter[] }>(
    cacheKey,
  );
  if (cached?.value && Array.isArray(cached.value.tracks) && cached.value.tracks.length > 0) {
    return cached.value;
  }

  if (item.iaId || item.librivoxId) {
    try {
      const u = new URL(`${WORKER_BASE}/audiobooks/tracks`);
      if (item.iaId) u.searchParams.set('iaId', item.iaId);
      if (item.librivoxId) u.searchParams.set('librivoxId', item.librivoxId);

      const r = await fetch(u.toString(), { signal });
      if (r.ok) {
        const data = await r.json();
        if (Array.isArray(data?.tracks) && data.tracks.length > 0) {
          const result = { coverUrl: data.coverUrl || item.coverUrl, tracks: data.tracks };
          void setSuperCache(cacheKey, result, true);
          return result;
        }
      }
    } catch {
      /* fallback to direct metadata */
    }
  }

  if (item.iaId) {
    try {
      const r = await fetch(`https://archive.org/metadata/${encodeURIComponent(item.iaId)}`, {
        signal,
      });
      if (r.ok) {
        const data = await r.json();
        const files = Array.isArray(data?.files) ? data.files : [];
        let coverUrl =
          item.coverUrl || `https://archive.org/services/img/${encodeURIComponent(item.iaId)}`;

        for (const f of files) {
          if (
            f?.name &&
            /\.(jpg|jpeg|png)$/i.test(f.name) &&
            !String(f.name).includes('_thumb')
          ) {
            coverUrl = `https://archive.org/download/${encodeURIComponent(item.iaId)}/${encodeURIComponent(f.name)}`;
            break;
          }
        }

        const mp3Files = files.filter(
          (f: { name?: string }) =>
            f &&
            typeof f.name === 'string' &&
            /\.(mp3|m4a|ogg)$/i.test(f.name) &&
            !/_64kb\.mp3$/i.test(f.name) &&
            !/\.ogg$/i.test(f.name),
        );
        const candidateFiles =
          mp3Files.length > 0
            ? mp3Files
            : files.filter(
                (f: { name?: string }) =>
                  f && typeof f.name === 'string' && /\.(mp3|m4a|ogg)$/i.test(f.name),
              );

        const seenBase = new Set<string>();
        const tracks: AudiobookChapter[] = [];
        for (const f of candidateFiles) {
          const base = String(f.name)
            .replace(/_(?:64kb|128kb|vbr)\.[^.]+$/i, '')
            .replace(/\.[^.]+$/, '');
          if (seenBase.has(base)) continue;
          seenBase.add(base);

          const trackNum = parseInt(String(f.track || '').split('/')[0], 10) || tracks.length + 1;
          let durationSec = 0;
          if (f.length) {
            if (/^\d+(\.\d+)?$/.test(String(f.length))) {
              durationSec = Math.round(parseFloat(String(f.length)));
            } else {
              const parts = String(f.length).split(':').map(Number);
              if (parts.length === 3) durationSec = parts[0] * 3600 + parts[1] * 60 + parts[2];
              else if (parts.length === 2) durationSec = parts[0] * 60 + parts[1];
            }
          }

          tracks.push({
            index: trackNum,
            title: String(
              f.title || base.replace(/[_-]+/g, ' ').trim() || `Chapter ${tracks.length + 1}`,
            ),
            url: `https://archive.org/download/${encodeURIComponent(item.iaId)}/${encodeURIComponent(f.name)}`,
            duration: durationSec,
            size: f.size ? Number(f.size) : 0,
            format: (String(f.name).split('.').pop() || 'mp3').toLowerCase(),
          });
        }

        tracks.sort((a, b) => a.index - b.index);
        tracks.forEach((t, idx) => {
          t.index = idx + 1;
        });

        if (tracks.length > 0) {
          const result = { coverUrl, tracks };
          void setSuperCache(cacheKey, result, true);
          return result;
        }
      }
    } catch {
      /* ignore */
    }
  }

  if (item.previewUrl) {
    const result = {
      coverUrl: item.coverUrl,
      tracks: [
        {
          index: 1,
          title: `${item.title} — Audio Preview`,
          url: item.previewUrl,
          duration: 90,
          format: 'm4a',
        },
      ],
    };
    void setSuperCache(cacheKey, result, true);
    return result;
  }

  try {
    const cleanTitle = item.title.replace(/[^\p{L}\p{N}\s]+/gu, ' ').trim();
    const matches = await directInternetArchiveAudiobooks(cleanTitle, 'all', 'all', 1, signal);
    if (matches.length > 0 && matches[0].iaId) {
      const resolved = await fetchAudiobookChapters({ ...item, iaId: matches[0].iaId }, signal);
      if (resolved.tracks.length > 0) {
        void setSuperCache(cacheKey, resolved, true);
      }
      return resolved;
    }
  } catch {
    /* ignore */
  }

  return { coverUrl: item.coverUrl, tracks: [] };
}
