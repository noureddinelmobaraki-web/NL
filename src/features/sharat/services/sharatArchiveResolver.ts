import type { SharatTrack } from '../types/sharat.types';
import {
  fetchAniListBatchPostersByMalIds,
  resolvePosterByTmdbOrMal,
} from '../../cartoon/services/cartoonMetadataClient';

const ARCHIVE_BUNDLES = [
  '20210811_20210811_2250',
  'hsrya-o-laol-mr-brnamg-konan-aal-alhoaaa-2000-2',
  'mnoaaat-msgl-mn-asbys-ton-aal-alnayl-sat-2002',
] as const;

const SESSION_CACHE_KEY = 'nl_sharat_resolved_catalog_v7';

interface ArchiveBundleFileEntry {
  bundleId: string;
  fileName: string;
  cleanTitle: string;
  url: string;
  isVideo: boolean;
}

const STOP_WORDS_REGEX = /\b(شاره|شارة|بدايه|بداية|نهايه|نهاية|اغنيه|أغنية|ابطال|أبطال|مغامرات|كوكب|سبيس|الجزء)\b/g;

function normalizeArabic(text: string): string {
  return text
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F]/g, '')
    .toLowerCase()
    .trim();
}

function getStrictSeriesStem(seriesAr: string): string {
  const base = seriesAr.split('(')[0].trim();
  return normalizeArabic(base).replace(STOP_WORDS_REGEX, '').replace(/\s+/g, ' ').trim();
}

async function fetchBundleFiles(bundleId: string): Promise<ArchiveBundleFileEntry[]> {
  try {
    const res = await fetch(`https://archive.org/metadata/${bundleId}`, {
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const rawFiles: Array<{ name?: string }> = Array.isArray(data?.files) ? data.files : [];
    const baseEntries: ArchiveBundleFileEntry[] = [];
    const seenStems = new Set<string>();

    const sorted = [...rawFiles].sort((a, b) => {
      const aIa = (a.name || '').endsWith('.ia.mp4') ? 1 : 0;
      const bIa = (b.name || '').endsWith('.ia.mp4') ? 1 : 0;
      return aIa - bIa;
    });

    for (const f of sorted) {
      const name = f.name || '';
      const lower = name.toLowerCase();
      if ((!lower.endsWith('.mp4') && !lower.endsWith('.mp3')) || lower.includes('__ia_thumb')) continue;
      const stem = name.replace(/\.(ia\.)?(mp4|mp3)$/i, '').trim();
      if (!stem || seenStems.has(stem)) continue;
      seenStems.add(stem);
      baseEntries.push({
        bundleId,
        fileName: name,
        cleanTitle: stem.replace(/[_-]+/g, ' ').trim(),
        url: `https://archive.org/download/${bundleId}/${encodeURIComponent(name)}`,
        isVideo: lower.endsWith('.mp4'),
      });
    }
    return baseEntries;
  } catch {
    return [];
  }
}

export async function resolveFullSharatArchiveCatalog(
  baseCatalog: SharatTrack[],
): Promise<SharatTrack[]> {
  try {
    const cachedRaw = sessionStorage.getItem(SESSION_CACHE_KEY);
    if (cachedRaw) {
      const parsed = JSON.parse(cachedRaw) as SharatTrack[];
      if (Array.isArray(parsed) && parsed.length >= baseCatalog.length) {
        return parsed;
      }
    }
  } catch {
    // ignore storage read errors
  }

  const allMalIds = Array.from(
    new Set(
      baseCatalog
        .map((s) => s.malId)
        .filter((id): id is number => typeof id === 'number' && id > 0),
    ),
  );
  const anilistPosterMap = await fetchAniListBatchPostersByMalIds(allMalIds);

  const bundleLists = await Promise.all(ARCHIVE_BUNDLES.map((id) => fetchBundleFiles(id)));
  const allArchiveFiles = bundleLists.flat();

  const hydratedCurated: SharatTrack[] = await Promise.all(
    baseCatalog.map(async (track) => {
      let finalArchiveUrl = track.archiveUrl;
      let hasExactArchiveStream = Boolean(track.hasExactArchiveStream);

      if (!hasExactArchiveStream) {
        const strictStem = getStrictSeriesStem(track.seriesAr);
        if (strictStem.length >= 6) {
          const matchedFile = allArchiveFiles.find((f) => {
            const normFile = normalizeArabic(f.cleanTitle);
            return normFile.includes(strictStem);
          });
          if (matchedFile) {
            finalArchiveUrl = matchedFile.url;
            hasExactArchiveStream = true;
          }
        }
      }

      let posterUrl = track.posterUrl;
      if (track.malId && anilistPosterMap.get(track.malId)?.posterUrl) {
        posterUrl = anilistPosterMap.get(track.malId)!.posterUrl;
      } else if (track.tmdbId) {
        const resolvedPoster = await resolvePosterByTmdbOrMal({
          cacheId: `sharat-${track.id}`,
          tmdbId: track.tmdbId,
          malId: track.malId,
          fallbackPosterUrl: track.posterUrl,
        });
        posterUrl = resolvedPoster.posterUrl || track.posterUrl;
      }

      return {
        ...track,
        posterUrl,
        archiveUrl: finalArchiveUrl,
        downloadUrl: finalArchiveUrl,
        hasExactArchiveStream,
      };
    }),
  );

  // Deduplicate by normalized seriesAr + titleAr and sort by priorityRank
  const seenKeys = new Set<string>();
  const deduped: SharatTrack[] = [];
  for (const item of hydratedCurated) {
    const key = `${normalizeArabic(item.seriesAr)}::${normalizeArabic(item.titleAr)}`;
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    deduped.push(item);
  }

  deduped.sort((a, b) => (a.priorityRank ?? 500) - (b.priorityRank ?? 500));

  try {
    sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(deduped));
  } catch {
    // ignore storage quota errors
  }

  return deduped;
}
