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

function encodeArchivePath(fileName: string): string {
  return fileName
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
}

export async function resolveArchiveIdentifierStreams(
  identifier: string,
  seriesTitleAr: string,
): Promise<CartoonEpisodeStream[]> {
  const cached = ARCHIVE_METADATA_CACHE.get(identifier);
  if (cached) return cached;

  try {
    const res = await fetch(
      `https://archive.org/metadata/${encodeURIComponent(identifier)}?extended_err=1`,
      { signal: AbortSignal.timeout(8500) },
    );
    if (!res.ok) return [];
    const data = await res.json();
    const files: any[] = Array.isArray(data?.files) ? data.files : [];
    const d2: string = data?.d2 || data?.d1 || '';
    const dir: string = data?.dir || '';

    // Group video files by base key so we pair .ia.mp4 (fast stream) with original .mp4 (high-res download)
    const groups = new Map<
      string,
      { iaMp4?: any; originalMp4?: any; baseName: string }
    >();

    for (const f of files) {
      const name = String(f?.name || '');
      if (!name) continue;
      const lower = name.toLowerCase();
      const isIaMp4 = lower.endsWith('.ia.mp4');
      const isOriginalVideo =
        !isIaMp4 &&
        (lower.endsWith('.mp4') ||
          lower.endsWith('.mkv') ||
          lower.endsWith('.avi'));

      if (!isIaMp4 && !isOriginalVideo) continue;

      const baseKey = name
        .replace(/\.ia\.mp4$/i, '')
        .replace(/\.(mp4|mkv|avi)$/i, '')
        .toLowerCase();

      const existing = groups.get(baseKey) || { baseName: name };
      if (isIaMp4) {
        existing.iaMp4 = f;
      } else {
        existing.originalMp4 = f;
        existing.baseName = name;
      }
      groups.set(baseKey, existing);
    }

    const streams: CartoonEpisodeStream[] = [];
    let index = 0;

    for (const [, group] of groups) {
      const streamFile = group.iaMp4 || group.originalMp4;
      const downloadFile = group.originalMp4 || group.iaMp4;
      if (!streamFile || !downloadFile) continue;

      const streamName = String(streamFile.name);
      const downloadName = String(downloadFile.name);
      const encodedStream = encodeArchivePath(streamName);
      const encodedDownload = encodeArchivePath(downloadName);

      const primaryStreamUrl = `https://archive.org/download/${encodeURIComponent(identifier)}/${encodedStream}`;
      const mirrorUrl =
        d2 && dir ? `https://${d2}${dir}/${encodedStream}` : undefined;
      const downloadUrl = `https://archive.org/download/${encodeURIComponent(identifier)}/${encodedDownload}`;

      const sizeBytes = Number(downloadFile.size || streamFile.size) || 0;
      const sizeMegabytes =
        sizeBytes > 0 ? Math.max(1, Math.round(sizeBytes / (1024 * 1024))) : undefined;

      const { episodeNumber, titleAr } = normalizeArabicEpisodeTitle(
        downloadName,
        seriesTitleAr,
        index,
      );

      streams.push({
        episodeNumber,
        titleAr,
        rawFileName: downloadName,
        archiveIdentifier: identifier,
        streamUrl: primaryStreamUrl,
        mirrorUrl,
        downloadUrl,
        thumbnailUrl: `https://archive.org/services/img/${encodeURIComponent(identifier)}`,
        sizeMegabytes,
        durationSeconds: Number(streamFile.length) || undefined,
      });

      index += 1;
    }

    streams.sort((a, b) => a.episodeNumber - b.episodeNumber);
    if (streams.length > 0) {
      ARCHIVE_METADATA_CACHE.set(identifier, streams);
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
