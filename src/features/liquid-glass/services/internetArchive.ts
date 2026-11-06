/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { z } from 'zod';
import { type AudiobookItem, type BookItem, stripHtml } from './types';

const IADocSchema = z
  .object({
    identifier: z.string().optional(),
    title: z.union([z.string(), z.array(z.string())]).optional(),
    creator: z.union([z.string(), z.array(z.string())]).optional(),
    description: z.union([z.string(), z.array(z.string())]).optional(),
    downloads: z.number().optional(),
    runtime: z.union([z.string(), z.array(z.string())]).optional(),
    year: z.union([z.string(), z.number()]).optional(),
    language: z.union([z.string(), z.array(z.string())]).optional(),
  })
  .passthrough();

const IASearchResponseSchema = z
  .object({
    response: z
      .object({
        docs: z.array(IADocSchema).optional(),
      })
      .optional(),
  })
  .passthrough();

export async function directInternetArchiveTexts(
  query: string,
  subject: string,
  lang: string,
  page: number,
  signal?: AbortSignal,
): Promise<BookItem[]> {
  const qParts = ['mediatype:texts', 'NOT collection:inlibrary'];
  if (query) qParts.push(`(${query})`);
  if (subject && subject !== 'all' && subject !== 'trending') qParts.push(`subject:(${subject})`);
  if (lang && lang !== 'all') {
    const langMap: Record<string, string> = {
      ar: 'Arabic OR ara',
      en: 'English OR eng',
      fr: 'French OR fre',
      es: 'Spanish OR spa',
      de: 'German OR ger',
      ja: 'Japanese OR jpn',
    };
    qParts.push(`language:(${langMap[lang] || lang})`);
  }
  const u = new URL('https://archive.org/advancedsearch.php');
  u.searchParams.set('q', qParts.join(' AND '));
  ['identifier', 'title', 'creator', 'downloads', 'year', 'language', 'description'].forEach((f) =>
    u.searchParams.append('fl[]', f),
  );
  u.searchParams.append('sort[]', 'downloads desc');
  u.searchParams.set('rows', '24');
  u.searchParams.set('page', String(Math.max(1, page)));
  u.searchParams.set('output', 'json');

  const r = await fetch(u.toString(), { signal });
  if (!r.ok) return [];
  const raw = await r.json();
  const parsed = IASearchResponseSchema.safeParse(raw);
  const docs = parsed.success && parsed.data.response?.docs ? parsed.data.response.docs : [];

  return docs.map((d) => {
    const iaId = String(d.identifier || '');
    const titleVal = Array.isArray(d.title) ? d.title[0] : d.title;
    const creator = Array.isArray(d.creator)
      ? d.creator.join(', ')
      : String(d.creator || 'Unknown Author');
    const desc = Array.isArray(d.description)
      ? d.description.join(' ')
      : String(d.description || '');
    const langVal = Array.isArray(d.language) ? d.language[0] : d.language || 'en';
    return {
      id: `ia_${iaId}`,
      title: String(titleVal || iaId),
      author: creator,
      year: d.year ? String(d.year) : '',
      language: String(langVal).slice(0, 3).toLowerCase(),
      coverUrl: `https://archive.org/services/img/${encodeURIComponent(iaId)}`,
      iaId,
      description: stripHtml(desc).slice(0, 650),
      ext: 'pdf',
      source: 'Internet Archive',
      downloads: Number(d.downloads) || 0,
      directReadFormats: {
        embed: `https://archive.org/embed/${encodeURIComponent(iaId)}?ui=embed`,
      },
    };
  });
}

export async function directInternetArchiveAudiobooks(
  q: string,
  genre: string,
  lang: string,
  page: number,
  signal?: AbortSignal,
): Promise<AudiobookItem[]> {
  const parts = ['mediatype:audio', 'collection:(audio_bookspoetry OR opensource_audio)'];
  if (q) parts.unshift(`(${q})`);
  if (genre && genre !== 'all' && genre !== 'popular') parts.push(`subject:(${genre})`);
  if (lang && lang !== 'all') parts.push(`language:(${lang})`);

  const u = new URL('https://archive.org/advancedsearch.php');
  u.searchParams.set('q', parts.join(' AND '));
  [
    'identifier',
    'title',
    'creator',
    'description',
    'downloads',
    'runtime',
    'year',
    'language',
  ].forEach((f) => u.searchParams.append('fl[]', f));
  u.searchParams.append('sort[]', 'downloads desc');
  u.searchParams.set('rows', '24');
  u.searchParams.set('page', String(Math.max(1, page)));
  u.searchParams.set('output', 'json');

  const r = await fetch(u.toString(), { signal });
  if (!r.ok) return [];
  const raw = await r.json();
  const parsed = IASearchResponseSchema.safeParse(raw);
  const docs = parsed.success && parsed.data.response?.docs ? parsed.data.response.docs : [];

  return docs.map((d) => {
    const iaId = String(d.identifier || '');
    const titleVal = Array.isArray(d.title) ? d.title[0] : d.title;
    const creator = Array.isArray(d.creator)
      ? d.creator.join(', ')
      : String(d.creator || 'Classic Narrator');
    const desc = Array.isArray(d.description)
      ? d.description.join(' ')
      : String(d.description || '');
    const runtimeVal = Array.isArray(d.runtime) ? d.runtime[0] : d.runtime;
    return {
      id: `ia_audio_${iaId}`,
      iaId,
      title: String(titleVal || iaId),
      author: creator,
      description: stripHtml(desc).slice(0, 600),
      language: Array.isArray(d.language)
        ? String(d.language[0])
        : String(d.language || 'English'),
      runtime: runtimeVal ? String(runtimeVal) : '',
      year: d.year ? String(d.year) : '',
      coverUrl: `https://archive.org/services/img/${encodeURIComponent(iaId)}`,
      source: 'Audio Edition',
      downloads: Number(d.downloads) || 0,
    };
  });
}
