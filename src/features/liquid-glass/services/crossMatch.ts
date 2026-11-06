/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import type { AudiobookItem, BookItem } from './types';

const cachedAudiobooksByNormTitle = new Map<string, AudiobookItem>();
const cachedBooksByNormTitle = new Map<string, BookItem>();
export const probedAudioForBookCache = new Map<string, AudiobookItem | null>();
export const probedBookForAudioCache = new Map<string, BookItem | null>();

export function normalizeTitleOnly(raw?: string): string {
  return String(raw || '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\b(audiobook|audio|unabridged|abridged|librivox|edition|volume|vol|book)\b/gi, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .slice(0, 42);
}

export function registerBooksInCrossCache(books: BookItem[]): void {
  for (const b of books) {
    if (!b?.title) continue;
    const key = normalizeTitleOnly(b.title);
    if (key.length >= 3 && !cachedBooksByNormTitle.has(key)) {
      cachedBooksByNormTitle.set(key, b);
    }
  }
}

export function registerAudiobooksInCrossCache(audiobooks: AudiobookItem[]): void {
  for (const a of audiobooks) {
    if (!a?.title) continue;
    const key = normalizeTitleOnly(a.title);
    if (key.length >= 3 && !cachedAudiobooksByNormTitle.has(key)) {
      cachedAudiobooksByNormTitle.set(key, a);
    }
  }
}

const KNOWN_AUDIO_ELIGIBLE_KEYWORDS = [
  'pride', 'prejudice', 'sherlock', 'holmes', 'frankenstein', 'dracula', 'gatsby',
  'odyssey', 'iliad', 'republic', 'plato', 'aristotle', 'nietzsche', 'dostoevsky',
  'crime', 'punishment', 'karamazov', 'tolstoy', 'war and peace', 'anna karenina',
  'alice', 'wonderland', 'moby', 'dick', 'jane eyre', 'wuthering', 'dickens',
  'expectations', 'twain', 'huckleberry', 'tom sawyer', 'dorian gray', 'oscar wilde',
  'metamorphosis', 'kafka', 'divine comedy', 'dante', 'hamlet', 'macbeth', 'shakespeare',
  'romeo', 'juliet', 'beowulf', 'meditations', 'marcus aurelius', 'sun tzu', 'art of war',
  'prince', 'machiavelli', 'utopia', 'time machine', 'war of the worlds', 'wells',
  'verne', 'twenty thousand', 'treasure island', 'jekyll', 'hyde', 'little women',
  'monte cristo', 'three musketeers', 'les miserables', 'hugo', 'don quixote',
  'arabian nights', 'الف ليلة', 'ابن خلدون', 'المقدمة', 'جبران', 'النبي', 'طه حسين',
  'الأيام', 'نجيب محفوظ', 'العقاد', 'المنفلوطي', 'كليلة ودمنة', 'رسالة الغفران',
];

export function getInstantAudiobookMatchForBook(book: BookItem): {
  hasAudio: boolean;
  matchedAudiobook?: AudiobookItem;
  searchQuery: string;
} {
  const norm = normalizeTitleOnly(book.title);
  const exact = cachedAudiobooksByNormTitle.get(norm);
  if (exact) {
    return { hasAudio: true, matchedAudiobook: exact, searchQuery: exact.title };
  }
  for (const [k, val] of cachedAudiobooksByNormTitle.entries()) {
    if (norm.length >= 5 && k.length >= 5 && (k.includes(norm) || norm.includes(k))) {
      return { hasAudio: true, matchedAudiobook: val, searchQuery: val.title };
    }
  }
  const probed = probedAudioForBookCache.get(norm);
  if (probed) {
    return { hasAudio: true, matchedAudiobook: probed, searchQuery: probed.title };
  }
  const hay = `${book.title} ${book.author}`.toLowerCase();
  const isClassicOrGutenberg =
    Boolean(book.gutenbergId) ||
    book.source === 'Gutenberg' ||
    book.source === 'Standard Ebooks' ||
    KNOWN_AUDIO_ELIGIBLE_KEYWORDS.some((kw) => hay.includes(kw));

  const cleanAuthor =
    book.author && book.author !== 'Unknown Author' && book.author !== 'Classic Edition'
      ? book.author.split(',')[0].trim()
      : '';
  const searchQuery = `${book.title} ${cleanAuthor}`.trim();
  return {
    hasAudio: isClassicOrGutenberg,
    searchQuery,
  };
}

export function getInstantBookMatchForAudiobook(audio: AudiobookItem): {
  hasBook: boolean;
  matchedBook?: BookItem;
  searchQuery: string;
} {
  const norm = normalizeTitleOnly(audio.title);
  const exact = cachedBooksByNormTitle.get(norm);
  if (exact) {
    return { hasBook: true, matchedBook: exact, searchQuery: exact.title };
  }
  for (const [k, val] of cachedBooksByNormTitle.entries()) {
    if (norm.length >= 5 && k.length >= 5 && (k.includes(norm) || norm.includes(k))) {
      return { hasBook: true, matchedBook: val, searchQuery: val.title };
    }
  }
  const probed = probedBookForAudioCache.get(norm);
  if (probed) {
    return { hasBook: true, matchedBook: probed, searchQuery: probed.title };
  }
  const cleanTitle = audio.title
    .replace(/\([^)]*\)/g, '')
    .replace(/\b(audiobook|unabridged|librivox)\b/gi, '')
    .trim();
  return {
    hasBook: true,
    searchQuery: cleanTitle || audio.title,
  };
}

export function getCachedBookByNormTitle(norm: string): BookItem | undefined {
  return cachedBooksByNormTitle.get(norm);
}

export function getCachedAudiobookByNormTitle(norm: string): AudiobookItem | undefined {
  return cachedAudiobooksByNormTitle.get(norm);
}
