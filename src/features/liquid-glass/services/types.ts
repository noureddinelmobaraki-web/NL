/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { z } from 'zod';

export interface DirectReadFormats {
  embed?: string;
  pdf?: string;
  epub?: string;
  html?: string;
  txt?: string;
  preview?: string;
}

export interface BookItem {
  id: string;
  title: string;
  author: string;
  year?: string | number;
  language?: string;
  coverUrl?: string;
  isbn?: string;
  md5?: string;
  iaId?: string;
  gutenbergId?: string;
  doi?: string;
  description?: string;
  rating?: string;
  pages?: number;
  filesize?: string;
  ext?: string;
  source?: string;
  sources?: string[];
  downloads?: number;
  directReadFormats?: DirectReadFormats;
}

export interface BookMirrorBranch {
  id: string;
  label: string;
  host: string;
  url: string;
  badge: string;
  latencyMs?: number;
  status?: 'checking' | 'online' | 'ready';
}

export interface BookResolveResult {
  md5?: string;
  iaId?: string;
  isbn?: string;
  doi?: string;
  gutenbergId?: string;
  downloads?: number;
  directReadFormats: DirectReadFormats;
  mirrors: BookMirrorBranch[];
}

export interface AudiobookItem {
  id: string;
  librivoxId?: string;
  iaId?: string;
  title: string;
  author: string;
  description?: string;
  language?: string;
  runtime?: string;
  year?: string | number;
  coverUrl?: string;
  fallbackCoverUrl?: string;
  source: string;
  downloads?: number;
  chapterCount?: number;
  rssUrl?: string;
  previewUrl?: string;
  externalUrl?: string;
}

export interface AudiobookChapter {
  index: number;
  title: string;
  url: string;
  duration: number;
  size?: number;
  format?: string;
}

export const DirectReadFormatsSchema = z
  .object({
    embed: z.string().optional(),
    pdf: z.string().optional(),
    epub: z.string().optional(),
    html: z.string().optional(),
    txt: z.string().optional(),
    preview: z.string().optional(),
  })
  .passthrough();

export const BookItemSchema: z.ZodType<BookItem> = z
  .object({
    id: z.string(),
    title: z.string(),
    author: z.string(),
    year: z.union([z.string(), z.number()]).optional(),
    language: z.string().optional(),
    coverUrl: z.string().optional(),
    isbn: z.string().optional(),
    md5: z.string().optional(),
    iaId: z.string().optional(),
    gutenbergId: z.string().optional(),
    doi: z.string().optional(),
    description: z.string().optional(),
    rating: z.string().optional(),
    pages: z.number().optional(),
    filesize: z.string().optional(),
    ext: z.string().optional(),
    source: z.string().optional(),
    sources: z.array(z.string()).optional(),
    downloads: z.number().optional(),
    directReadFormats: DirectReadFormatsSchema.optional(),
  })
  .passthrough();

export function stripHtml(raw?: string | null): string {
  if (!raw || typeof raw !== 'string') return '';
  return raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeBookKey(title?: string, author?: string): string {
  const t = String(title || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .slice(0, 48);
  const a = String(author || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .slice(0, 24);
  return `${t}__${a}`;
}

const ARTISTIC_COVER_GRADIENTS = [
  ['#0f172a', '#1e3a8a', '#38bdf8'],
  ['#064e3b', '#047857', '#34d399'],
  ['#31102f', '#701a75', '#f472b6'],
  ['#1e1b4b', '#4338ca', '#a78bfa'],
  ['#3b0764', '#6d28d9', '#c084fc'],
  ['#451a03', '#b45309', '#fbbf24'],
  ['#082f49', '#0369a1', '#22d3ee'],
] as const;

export function getBookArtisticPalette(seed: string): readonly [string, string, string] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  return ARTISTIC_COVER_GRADIENTS[Math.abs(h) % ARTISTIC_COVER_GRADIENTS.length];
}
