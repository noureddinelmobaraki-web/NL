/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Archive.org Metadata & Stream Resolver Engine
 * - Queries https://archive.org/metadata/{identifier}?extended_err=1
 * - Prefers web-optimized .ia.mp4 for instant <video> streaming and keeps original .mp4 for direct download
 * - Builds Primary CDN (archive.org/download/...) and Mirror CDN (https://{d2}{dir}/...) URLs
 * - Normalizes Franco-Arabic Spacetoon filenames and extracts accurate episode numbers
 * - Performs live open search via Archive.org AdvancedSearch API
 */

import type {
  CartoonEpisodeStream,
  CartoonSeriesItem,
} from '../types/cartoon.types';

const ARCHIVE_METADATA_CACHE = new Map<string, CartoonEpisodeStream[]>();
const ARCHIVE_LOCAL_CACHE_KEY = 'nl_archive_streams_cache_v2';
const ARCHIVE_CACHE_TTL_MS = 7 * 24 * 3600 * 1000;

interface CachedArchiveStreamsEntry {
  ts: number;
  streams: CartoonEpisodeStream[];
}

function readPersistentArchiveCache(identifier: string): CartoonEpisodeStream[] | null {
  try {
    const raw = localStorage.getItem(ARCHIVE_LOCAL_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, CachedArchiveStreamsEntry>;
    const entry = parsed?.[identifier];
    if (!entry || !Array.isArray(entry.streams) || entry.streams.length === 0) {
      return null;
    }
    if (Date.now() - Number(entry.ts || 0) > ARCHIVE_CACHE_TTL_MS) {
      return null;
    }
    return entry.streams;
  } catch {
    return null;
  }
}

function writePersistentArchiveCache(
  identifier: string,
  streams: CartoonEpisodeStream[],
): void {
  try {
    const raw = localStorage.getItem(ARCHIVE_LOCAL_CACHE_KEY);
    const parsed: Record<string, CachedArchiveStreamsEntry> = raw
      ? JSON.parse(raw)
      : {};
    parsed[identifier] = {
      ts: Date.now(),
      streams,
    };
    localStorage.setItem(ARCHIVE_LOCAL_CACHE_KEY, JSON.stringify(parsed));
  } catch {
    // ignore storage quota errors
  }
}

const FRANCO_DICTIONARY: Array<[RegExp, string]> = [
  [/alknas/gi, 'القناص'],
  [/alhlk|hlk|hal9a/gi, 'الحلقة'],
  [/amy[\s_-]*km[\s_-]*ahoaha/gi, 'أمي كم أهواها'],
  [/rymy|remi/gi, 'دروب ريمي'],
  [/aghny|aghani/gi, 'شارة'],
  [/alkabtn[\s_-]*magd/gi, 'الكابتن ماجد'],
  [/kokb[\s_-]*akshn/gi, 'فاصل كوكب أكشن'],
  [/kokb[\s_-]*mghamrat/gi, 'فاصل كوكب مغامرات'],
  [/kokb[\s_-]*ryada/gi, 'فاصل كوكب رياضة'],
  [/kokb[\s_-]*zmrda/gi, 'فاصل كوكب زمردة'],
  [/kokb[\s_-]*komydya/gi, 'فاصل كوكب كوميديا'],
  [/hzim[\s_-]*alraad/gi, 'هزيم الرعد'],
  [/aahd[\s_-]*alasdqaa/gi, 'عهد الأصدقاء'],
  [/sqor[\s_-]*alard/gi, 'صقور الأرض'],
  [/konan|conan/gi, 'المحقق كونان'],
  [/asbys[\s_-]*ton|spacetoon/gi, 'سبيستون'],
  [/Alatfal[\s_-]*alabtal/gi, 'الأطفال الأبطال'],
];

function convertEasternArabicDigits(input: string): string {
  return input.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

export function normalizeArabicEpisodeTitle(
  rawFileName: string,
  fallbackSeriesTitle: string,
  fallbackIndex: number,
): { episodeNumber: number; titleAr: string } {
  const withoutExt = rawFileName
    .replace(/\.ia\.mp4$/i, '')
    .replace(/\.(mp4|mkv|avi|webm|ogv)$/i, '');

  const normalizedDigits = convertEasternArabicDigits(withoutExt);

  // Strip misleading resolution/codec/year numbers before extracting episode number
  const cleanedForEp = normalizedDigits
    .replace(/\b(2160p|1080p|720p|480p|360p|240p|x264|h264|mp4|aac|19[89]\d|20[0-2]\d)\b/gi, ' ')
    .trim();

  let epNum: number | null = null;

  // 1. Arabic episode pattern
  const arMatch = cleanedForEp.match(/(?:الحلقة|حلقة|ح)\s*0*(\d{1,3})/i);
  if (arMatch) epNum = Number(arMatch[1]);

  // 2. Franco Spacetoon / EP pattern
  if (!epNum) {
    const francoMatch = cleanedForEp.match(
      /(?:alhlk|hlk|hal9a|ep|episode|e)[\s_-]*0*(\d{1,3})/i,
    );
    if (francoMatch) epNum = Number(francoMatch[1]);
  }

  // 3. Leading or trailing standalone number
  if (!epNum) {
    const startOrEnd =
      cleanedForEp.match(/^0*(\d{1,3})(?:\D|$)/) ||
      cleanedForEp.match(/(?:^|[\s_-])0*(\d{1,3})$/);
    if (startOrEnd) epNum = Number(startOrEnd[1]);
  }

  const resolvedEp = epNum && epNum > 0 ? epNum : fallbackIndex + 1;

  // Build clean human-readable Arabic title
  let pretty = withoutExt.replace(/[_-]+/g, ' ').trim();
  for (const [pattern, replacement] of FRANCO_DICTIONARY) {
    pretty = pretty.replace(pattern, replacement);
  }
  pretty = pretty.replace(/\s{2,}/g, ' ').trim();

  const hasArabicLetters = /[\u0600-\u06FF]/.test(pretty);
  const titleAr = hasArabicLetters
    ? pretty
    : `${fallbackSeriesTitle} — الحلقة ${resolvedEp}`;

  return { episodeNumber: resolvedEp, titleAr };
}

export async function resolveArchiveIdentifierStreams(
  identifier: string,
  seriesTitleAr: string,
): Promise<CartoonEpisodeStream[]> {
  const cleanId = identifier.trim();
  if (!cleanId) return [];

  const cached = ARCHIVE_METADATA_CACHE.get(cleanId);
  if (cached) return cached;

  const persisted = readPersistentArchiveCache(cleanId);
  if (persisted) {
    ARCHIVE_METADATA_CACHE.set(cleanId, persisted);
    return persisted;
  }

  try {
    const { resolveArchiveItemMetadata } = await import(
      '../../../services/archive/archiveMasterEngine'
    );
    const meta = await resolveArchiveItemMetadata(cleanId, seriesTitleAr);
    if (!meta || meta.videos.length === 0) return [];

    const streams: CartoonEpisodeStream[] = meta.videos.map((v, index) => {
      const { episodeNumber, titleAr } = normalizeArabicEpisodeTitle(
        v.rawFileName,
        seriesTitleAr,
        index,
      );

      return {
        episodeNumber,
        titleAr,
        rawFileName: v.rawFileName,
        archiveIdentifier: cleanId,
        streamUrl: v.directNodeUrl || v.cdnStreamUrl,
        mirrorUrl: v.directNodeUrl ? v.cdnStreamUrl : undefined,
        downloadUrl: v.downloadUrl,
        thumbnailUrl: meta.thumbnailUrl,
        sizeMegabytes: v.sizeMegabytes,
        durationSeconds: v.durationSeconds,
      };
    });

    streams.sort((a, b) => a.episodeNumber - b.episodeNumber);
    if (streams.length > 0) {
      ARCHIVE_METADATA_CACHE.set(cleanId, streams);
      writePersistentArchiveCache(cleanId, streams);
    }
    return streams;
  } catch {
    return [];
  }
}

export async function searchOpenArchiveCartoons(
  query: string,
): Promise<CartoonSeriesItem[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const qExpr = `(title:("${trimmed}") OR description:("${trimmed}")) AND mediatype:(movies) AND (SPACET00N OR "سبيستون" OR "مركز الزهرة" OR "مدبلج" OR "كرتون" OR creator:(derbydali))`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(qExpr)}&fl[]=identifier,title,description,downloads,year&sort[]=downloads+desc&rows=20&output=json`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(7500) });
    if (!res.ok) return [];
    const data = await res.json();
    const docs: any[] = Array.isArray(data?.response?.docs)
      ? data.response.docs
      : [];

    return docs
      .filter((d) => Boolean(d?.identifier))
      .map((doc): CartoonSeriesItem => {
        const id = String(doc.identifier);
        const title = String(doc.title || id);
        const desc = Array.isArray(doc.description)
          ? doc.description.join(' ')
          : String(doc.description || 'عمل كرتوني كلاسيكي من أرشيف سبيستون والزهرة.');
        return {
          id: `archive-${id}`,
          titleAr: title,
          titleEn: title,
          planet: 'adventure',
          planetLabelAr: 'أرشيف سبيستون المفتوح',
          studio: 'سبيستون',
          year: Number(doc.year) || 2000,
          rating: 8.8,
          episodesCount: 26,
          synopsisAr: desc.replace(/<[^>]+>/g, '').slice(0, 260),
          posterUrl: `https://archive.org/services/img/${encodeURIComponent(id)}`,
          backdropUrl: `https://archive.org/services/img/${encodeURIComponent(id)}`,
          mediaType: 'tv',
          archiveIds: [id],
        };
      });
  } catch {
    return [];
  }
}
