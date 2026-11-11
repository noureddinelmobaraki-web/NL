/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Arabic & Islamic Manuscripts, OpenITI Corpus, and Shamela / Turath Client
 * - Queries Archive.org AdvancedSearch for rare Arabic manuscripts & early printed books
 * - Resolves Archive.org item metadata for scanned page spreads & PDFs
 * - Includes curated OpenITI & Classical Arabic Turath masterpieces
 */

import { type BookItem, stripHtml } from './types';

export interface ManuscriptPageSpread {
  pageNumber: number;
  imageUrl: string;
}

export interface ManuscriptMetadata {
  identifier: string;
  title: string;
  creator: string;
  pdfUrl?: string;
  embedUrl: string;
  pageCount: number;
  pages: ManuscriptPageSpread[];
}

const CURATED_TURATH_AND_MANUSCRIPTS: BookItem[] = [
  {
    id: 'turath-muqaddimah-ibn-khaldun',
    iaId: 'MuqaddimahIbnKhaldun',
    title: 'مقدمة ابن خلدون — ديوان المبتدأ والخبر',
    author: 'عبد الرحمن بن خلدون (OpenITI / التراث العربي)',
    year: 1377,
    language: 'ar',
    coverUrl: 'https://archive.org/services/img/fp50929',
    description:
      'تأسيس علم الاجتماع والعمران البشري وفلسفة التاريخ في التراث العربي الإسلامي.',
    ext: 'pdf',
    source: 'OpenITI & Turath',
    sources: ['OpenITI', 'Archive.org'],
    directReadFormats: {
      embed: 'https://archive.org/embed/fp50929?ui=embed',
    },
  },
  {
    id: 'turath-alf-layla',
    iaId: 'AlfLaylaWaLaylaBulaq',
    title: 'ألف ليلة وليلة (طبعة بولاق النادرة)',
    author: 'التراث الشعبي العربي — بولاق',
    year: 1835,
    language: 'ar',
    coverUrl: 'https://archive.org/services/img/ar1001nights01',
    description:
      'النسخة التاريخية النادرة من حكايات ألف ليلة وليلة بطبعتها الكلاسيكية الأصيلة.',
    ext: 'pdf',
    source: 'Arabic Manuscripts',
    sources: ['EarlyArabicPrintedBooks'],
    directReadFormats: {
      embed: 'https://archive.org/embed/ar1001nights01?ui=embed',
    },
  },
  {
    id: 'turath-canon-of-medicine',
    iaId: 'CanonOfMedicineAvicenna',
    title: 'مخطوط القانون في الطب — ابن سينا',
    author: 'أبو علي الحسين بن سينا',
    year: 1025,
    language: 'ar',
    coverUrl: 'https://archive.org/services/img/McGillLibrary-108657-460',
    description:
      'من أنفس المخطوطات العلمية الطبية العربية المحفوظة في المجموعات العالمية.',
    ext: 'pdf',
    source: 'Islamic Manuscripts',
    sources: ['islamic_manuscripts'],
    directReadFormats: {
      embed: 'https://archive.org/embed/McGillLibrary-108657-460?ui=embed',
    },
  },
  {
    id: 'turath-al-jahiz-hayawan',
    iaId: 'kitabalhayawan01jahiuoft',
    title: 'كتاب الحيوان — الجاحظ',
    author: 'أبو عثمان عمرو بن بحر الجاحظ',
    year: 847,
    language: 'ar',
    coverUrl: 'https://archive.org/services/img/kitabalhayawan01jahiuoft',
    description:
      'موسوعة أدبية وعلمية وطبيعية رائدة في التراث العباسي.',
    ext: 'pdf',
    source: 'OpenITI & Shamela',
    sources: ['PrincetonACO', 'OpenITI'],
    directReadFormats: {
      embed: 'https://archive.org/embed/kitabalhayawan01jahiuoft?ui=embed',
    },
  },
];

export async function fetchArabicManuscriptsAndTurath(
  query = '',
  mode: 'manuscripts' | 'turath' = 'manuscripts',
  page = 1,
  signal?: AbortSignal,
): Promise<BookItem[]> {
  const cleanQ = query.trim();
  const baseFilter =
    mode === 'manuscripts'
      ? '(collection:(arabic_manuscripts OR islamic_manuscripts OR PrincetonACO OR EarlyArabicPrintedBooks) OR (subject:("مخطوط" OR "مخطوطات" OR "manuscript") AND language:(ara OR Arabic)))'
      : '(collection:(PrincetonACO OR EarlyArabicPrintedBooks) OR (language:(ara OR Arabic) AND mediatype:(texts) AND (subject:("تراث" OR "أدب" OR "تاريخ" OR "فلسفة"))))';

  const fullQuery = cleanQ
    ? `(${baseFilter}) AND (${cleanQ})`
    : `${baseFilter} AND mediatype:(texts)`;

  const u = new URL('https://archive.org/advancedsearch.php');
  u.searchParams.set('q', fullQuery);
  for (const field of [
    'identifier',
    'title',
    'creator',
    'date',
    'description',
    'downloads',
    'language',
  ]) {
    u.searchParams.append('fl[]', field);
  }
  u.searchParams.append('sort[]', 'downloads desc');
  u.searchParams.set('rows', '28');
  u.searchParams.set('page', String(Math.max(1, page)));
  u.searchParams.set('output', 'json');

  try {
    const res = await fetch(u.toString(), {
      signal: signal ?? AbortSignal.timeout(8000),
    });
    if (!res.ok) return CURATED_TURATH_AND_MANUSCRIPTS;
    const json = await res.json();
    const docs: Record<string, unknown>[] = json?.response?.docs || [];

    const mapped: BookItem[] = docs
      .map((doc): BookItem | null => {
        const identifier = String(doc.identifier || '').trim();
        const title = String(doc.title || '').trim();
        if (!identifier || !title) return null;

        const creatorRaw = doc.creator;
        const author = Array.isArray(creatorRaw)
          ? String(creatorRaw[0] || 'مخطوط تراثي')
          : String(creatorRaw || 'مخطوط تراثي');

        return {
          id: `ia-ms-${identifier}`,
          iaId: identifier,
          title,
          author,
          year: doc.date ? String(doc.date).slice(0, 4) : undefined,
          language: 'ar',
          coverUrl: `https://archive.org/services/img/${encodeURIComponent(identifier)}`,
          description: stripHtml(
            Array.isArray(doc.description)
              ? String(doc.description[0] || '')
              : String(doc.description || ''),
          ).slice(0, 320),
          downloads: Number(doc.downloads) || 120,
          ext: 'manuscript',
          source: mode === 'manuscripts' ? 'Arabic Manuscripts' : 'OpenITI & Turath',
          sources: [mode === 'manuscripts' ? 'Arabic Manuscripts' : 'Turath'],
          directReadFormats: {
            embed: `https://archive.org/embed/${encodeURIComponent(identifier)}?ui=embed`,
          },
        };
      })
      .filter(Boolean) as BookItem[];

    return page === 1 && !cleanQ
      ? [...CURATED_TURATH_AND_MANUSCRIPTS, ...mapped]
      : mapped;
  } catch {
    return CURATED_TURATH_AND_MANUSCRIPTS;
  }
}

export async function resolveManuscriptMetadata(
  identifier: string,
  signal?: AbortSignal,
): Promise<ManuscriptMetadata> {
  const cleanId = identifier.replace(/^ia-ms-/, '').trim();
  const embedUrl = `https://archive.org/embed/${encodeURIComponent(cleanId)}?ui=embed`;

  try {
    const res = await fetch(
      `https://archive.org/metadata/${encodeURIComponent(cleanId)}`,
      { signal: signal ?? AbortSignal.timeout(7500) },
    );
    if (!res.ok) throw new Error('Metadata HTTP error');
    const data = await res.json();
    const meta = data?.metadata || {};
    const files: Array<{ name?: string; format?: string }> = Array.isArray(
      data?.files,
    )
      ? data.files
      : [];

    const pdfFile = files.find(
      (f) =>
        f.name &&
        (/\.pdf$/i.test(f.name) ||
          String(f.format || '').toLowerCase().includes('pdf')),
    );

    const pdfUrl = pdfFile?.name
      ? `https://archive.org/download/${encodeURIComponent(cleanId)}/${encodeURIComponent(pdfFile.name)}`
      : undefined;

    const imageCount = Math.min(
      60,
      Math.max(12, Number(meta.imagecount) || 24),
    );
    const pages: ManuscriptPageSpread[] = Array.from(
      { length: imageCount },
      (_, idx) => ({
        pageNumber: idx + 1,
        imageUrl: `https://archive.org/download/${encodeURIComponent(cleanId)}/page/n${idx}/mode/1up`,
      }),
    );

    return {
      identifier: cleanId,
      title: String(meta.title || cleanId),
      creator: String(meta.creator || 'التراث العربي'),
      pdfUrl,
      embedUrl,
      pageCount: imageCount,
      pages,
    };
  } catch {
    return {
      identifier: cleanId,
      title: cleanId,
      creator: 'التراث العربي',
      embedUrl,
      pageCount: 16,
      pages: Array.from({ length: 16 }, (_, idx) => ({
        pageNumber: idx + 1,
        imageUrl: `https://archive.org/services/img/${encodeURIComponent(cleanId)}`,
      })),
    };
  }
}
