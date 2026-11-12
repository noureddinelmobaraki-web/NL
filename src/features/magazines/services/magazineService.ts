/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import {
  type BookItem,
  type BookMirrorBranch,
  type BookResolveResult,
  stripHtml,
} from '../../liquid-glass/services/types';

export type MagazineCategory =
  | 'featured'
  | 'arabic_retro'
  | 'gaming_retro'
  | 'computing'
  | 'science_nature'
  | 'pulp_scifi'
  | 'photography_art'
  | 'comics_manga'
  | 'fashion_culture'
  | 'music_press';

const MAGAZINE_COLLECTION_QUERIES: Record<MagazineCategory, string> = {
  featured:
    'collection:(magazine_rack OR computermagazines OR gamemagazines) AND mediatype:texts',
  arabic_retro:
    '(title:(Majid OR ماجد OR العربي OR الهلال OR سبيستون OR باسم OR سمير OR المقتطف) OR (language:(ara OR Arabic) AND (magazine OR مجلة))) AND mediatype:texts',
  gaming_retro:
    'collection:(gamemagazines OR nintendopower OR electronicgamingmonthly OR pcgamer OR retro-gamer) AND mediatype:texts',
  computing:
    'collection:(computermagazines OR byte-magazine OR wired-magazine OR 2600magazine OR macworld OR amigaworld) AND mediatype:texts',
  science_nature:
    '(collection:(popularmechanics OR popularscience OR nationalgeographicmagazine OR scientificamerican) OR subject:("science magazine")) AND mediatype:texts',
  pulp_scifi:
    'collection:(pulpmagazines OR ifmagazine OR galaxymagazine OR weirdtales OR astoundingstories) AND mediatype:texts',
  photography_art:
    '(collection:(lifemagazine OR aperturemagazine) OR (collection:magazine_rack AND subject:(photography OR art OR design))) AND mediatype:texts',
  comics_manga:
    '(collection:(comics OR heavy-metal-magazine OR madmagazine) OR (collection:magazine_rack AND subject:(comics OR manga))) AND mediatype:texts',
  fashion_culture:
    '(collection:magazine_rack AND (subject:(fashion OR culture OR lifestyle) OR title:(Vogue OR GQ OR Time OR New Yorker))) AND mediatype:texts',
  music_press:
    '(collection:magazine_rack AND (subject:(music OR rock OR hiphop OR jazz) OR title:(Billboard OR Rolling Stone OR Spin OR Vibe))) AND mediatype:texts',
};

const LANG_FILTER_MAP: Record<string, string> = {
  en: ' AND language:(eng OR English OR en)',
  ar: ' AND language:(ara OR Arabic OR ar)',
  fr: ' AND language:(fre OR fra OR French OR fr)',
  es: ' AND language:(spa OR Spanish OR es)',
  de: ' AND language:(ger OR deu OR German OR de)',
  ja: ' AND language:(jpn OR Japanese OR ja)',
};

const SORT_MAP: Record<string, string> = {
  popular: 'downloads desc',
  newest: 'date desc',
  classic: 'date asc',
};

const magazineCache = new Map<string, { time: number; items: BookItem[] }>();
const CACHE_TTL = 1000 * 60 * 30;

export function getCachedMagazinesSync(params: {
  q?: string;
  category: string;
  lang: string;
  ext: string;
  sortOrder: string;
  page: number;
}): BookItem[] | null {
  const key = JSON.stringify(params);
  const hit = magazineCache.get(key);
  if (hit && Date.now() - hit.time < CACHE_TTL) {
    return hit.items;
  }
  return null;
}

export async function fetchMagazinesCatalog(params: {
  q?: string;
  category: string;
  lang: string;
  ext: string;
  sortOrder: string;
  page: number;
  signal?: AbortSignal;
}): Promise<BookItem[]> {
  const cacheKey = JSON.stringify({
    q: params.q || '',
    category: params.category,
    lang: params.lang,
    ext: params.ext,
    sortOrder: params.sortOrder,
    page: params.page,
  });
  const cached = magazineCache.get(cacheKey);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.items;
  }

  const cat = (params.category as MagazineCategory) || 'featured';
  const baseQuery =
    MAGAZINE_COLLECTION_QUERIES[cat] || MAGAZINE_COLLECTION_QUERIES.featured;

  const userQuery = params.q?.trim()
    ? `(${baseQuery}) AND (${params.q.trim()})`
    : baseQuery;

  const langClause =
    params.lang && params.lang !== 'all'
      ? LANG_FILTER_MAP[params.lang] || ''
      : '';

  const sortParam = SORT_MAP[params.sortOrder] || 'downloads desc';

  const url =
    `https://archive.org/advancedsearch.php?q=${encodeURIComponent(userQuery + langClause)}` +
    `&fl[]=identifier,title,creator,date,year,language,downloads,description,format,imagecount` +
    `&sort[]=${encodeURIComponent(sortParam)}` +
    `&rows=28&page=${params.page}&output=json`;

  try {
    const res = await fetch(url, { signal: params.signal });
    if (!res.ok) return [];
    const data = await res.json();
    const docs = Array.isArray(data?.response?.docs) ? data.response.docs : [];

    const items: BookItem[] = docs
      .filter((d: any) => d?.identifier && d?.title)
      .map((d: any) => {
        const id = String(d.identifier);
        const rawAuthor = Array.isArray(d.creator) ? d.creator[0] : d.creator;
        const rawLang = Array.isArray(d.language) ? d.language[0] : d.language;
        const formats: string[] = Array.isArray(d.format)
          ? d.format.map((f: any) => String(f).toLowerCase())
          : [];
        const hasEpub = formats.some((f) => f.includes('epub'));
        const ext = hasEpub ? 'EPUB' : 'PDF';

        return {
          id: `mag-${id}`,
          iaId: id,
          title: stripHtml(String(d.title)),
          author: rawAuthor ? stripHtml(String(rawAuthor)) : 'Magazine Archive Press',
          year: d.year || (d.date ? String(d.date).slice(0, 4) : undefined),
          language: rawLang ? String(rawLang).slice(0, 3).toUpperCase() : 'EN',
          coverUrl: `https://archive.org/services/img/${encodeURIComponent(id)}`,
          description: d.description
            ? stripHtml(
                Array.isArray(d.description) ? d.description[0] : String(d.description),
              )
            : 'Full-color digitized magazine issue from The Magazine Rack.',
          pages: Number(d.imagecount) || undefined,
          ext,
          source: 'Magazine Rack',
          sources: ['Magazine Rack', 'Archive.org'],
          downloads: Number(d.downloads) || 0,
          directReadFormats: {
            embed: `https://archive.org/embed/${encodeURIComponent(id)}?ui=embed&view=theater`,
            preview: `https://archive.org/details/${encodeURIComponent(id)}`,
          },
        };
      });

    const filtered =
      params.ext && params.ext !== 'all' && params.ext !== 'inapp'
        ? items.filter((item) => item.ext?.toLowerCase() === params.ext.toLowerCase())
        : items;

    magazineCache.set(cacheKey, { time: Date.now(), items: filtered });
    return filtered;
  } catch {
    return [];
  }
}

export async function resolveMagazineIssueDetails(
  magazine: BookItem,
): Promise<BookResolveResult> {
  const iaId = magazine.iaId || magazine.id.replace(/^mag-/, '');
  const embedUrl = `https://archive.org/embed/${encodeURIComponent(iaId)}?ui=embed&view=theater`;
  const detailsUrl = `https://archive.org/details/${encodeURIComponent(iaId)}`;

  let pdfUrl: string | undefined;
  let epubUrl: string | undefined;
  let txtUrl: string | undefined;

  try {
    const res = await fetch(
      `https://archive.org/metadata/${encodeURIComponent(iaId)}`,
    );
    if (res.ok) {
      const meta = await res.json();
      const files: any[] = Array.isArray(meta?.files) ? meta.files : [];
      const pdfFile = files.find((f) => /\.pdf$/i.test(f?.name || ''));
      const epubFile = files.find((f) => /\.epub$/i.test(f?.name || ''));
      const txtFile = files.find((f) => /_djvu\.txt$|\.txt$/i.test(f?.name || ''));

      if (pdfFile?.name) {
        pdfUrl = `https://archive.org/download/${encodeURIComponent(iaId)}/${encodeURIComponent(pdfFile.name)}`;
      }
      if (epubFile?.name) {
        epubUrl = `https://archive.org/download/${encodeURIComponent(iaId)}/${encodeURIComponent(epubFile.name)}`;
      }
      if (txtFile?.name) {
        txtUrl = `https://archive.org/download/${encodeURIComponent(iaId)}/${encodeURIComponent(txtFile.name)}`;
      }
    }
  } catch {
    // fallback to embed + details mirrors
  }

  const mirrors: BookMirrorBranch[] = [
    {
      id: 'ia-theater',
      label: 'Interactive 2-Page Spread Reader',
      host: 'archive.org/embed',
      url: embedUrl,
      badge: 'IN-APP SPREAD',
      status: 'ready',
    },
  ];

  if (pdfUrl) {
    mirrors.push({
      id: 'ia-pdf-direct',
      label: 'High-Resolution PDF Issue',
      host: 'archive.org/download',
      url: pdfUrl,
      badge: 'DIRECT PDF',
      status: 'ready',
    });
  }

  if (epubUrl) {
    mirrors.push({
      id: 'ia-epub-direct',
      label: 'EPUB Digital Edition',
      host: 'archive.org/download',
      url: epubUrl,
      badge: 'DIRECT EPUB',
      status: 'ready',
    });
  }

  mirrors.push({
    id: 'ia-details-page',
    label: 'Internet Archive Issue Page',
    host: 'archive.org/details',
    url: detailsUrl,
    badge: 'ARCHIVE PAGE',
    status: 'ready',
  });

  return {
    iaId,
    downloads: magazine.downloads,
    directReadFormats: {
      embed: embedUrl,
      pdf: pdfUrl,
      epub: epubUrl,
      txt: txtUrl,
      preview: detailsUrl,
    },
    mirrors,
  };
}
