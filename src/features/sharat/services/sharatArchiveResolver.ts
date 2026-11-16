import type { SharatTrack } from '../types/sharat.types';
import {
  fetchAniListBatchPostersByMalIds,
  resolvePosterByTmdbOrMal,
  type PosterCacheEntry,
} from '../../cartoon/services/cartoonMetadataClient';

const ARCHIVE_BUNDLES = [
  'hsrya-o-laol-mr-brnamg-konan-aal-alhoaaa-2000-2',
  '20210811_20210811_2250',
  'mnoaaat-msgl-mn-asbys-ton-aal-alnayl-sat-2002',
] as const;

const SESSION_CACHE_KEY = 'nl_sharat_resolved_catalog_v8';

interface ArchiveBundleFileEntry {
  cleanTitle: string;
  url: string;
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
    const entries: ArchiveBundleFileEntry[] = [];
    const seen = new Set<string>();

    const sorted = [...rawFiles].sort((a, b) =>
      ((a.name || '').endsWith('.ia.mp4') ? 1 : 0) - ((b.name || '').endsWith('.ia.mp4') ? 1 : 0),
    );

    for (const f of sorted) {
      const name = f.name || '';
      const lower = name.toLowerCase();
      if ((!lower.endsWith('.mp4') && !lower.endsWith('.mp3')) || lower.includes('__ia_thumb')) continue;
      const stem = name.replace(/\.(ia\.)?(mp4|mp3)$/i, '').trim();
      if (!stem || seen.has(stem)) continue;
      seen.add(stem);
      entries.push({
        cleanTitle: stem.replace(/[_-]+/g, ' ').trim(),
        url: `https://archive.org/download/${bundleId}/${encodeURIComponent(name)}`,
      });
    }
    return entries;
  } catch {
    return [];
  }
}

async function fetchAllAniListPosters(malIds: number[]): Promise<Map<number, PosterCacheEntry>> {
  const combined = new Map<number, PosterCacheEntry>();
  const chunkSize = 45;
  const chunks: number[][] = [];
  for (let i = 0; i < malIds.length; i += chunkSize) {
    chunks.push(malIds.slice(i, i + chunkSize));
  }
  const results = await Promise.all(chunks.map((c) => fetchAniListBatchPostersByMalIds(c)));
  for (const map of results) {
    for (const [id, entry] of map.entries()) {
      combined.set(id, entry);
    }
  }
  return combined;
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
    new Set(baseCatalog.map((s) => s.malId).filter((id): id is number => typeof id === 'number' && id > 0)),
  );
  const [anilistPosterMap, bundleLists] = await Promise.all([
    fetchAllAniListPosters(allMalIds),
    Promise.all(ARCHIVE_BUNDLES.map((id) => fetchBundleFiles(id))),
  ]);
  const allArchiveFiles = bundleLists.flat();

  const hydrated: SharatTrack[] = await Promise.all(
    baseCatalog.map(async (track) => {
      let archiveUrl = track.archiveUrl;
      let hasExactArchiveStream = Boolean(track.hasExactArchiveStream && archiveUrl);

      if (!hasExactArchiveStream) {
        const strictStem = getStrictSeriesStem(track.seriesAr);
        if (strictStem.length >= 6) {
          const matchedFile = allArchiveFiles.find((f) =>
            normalizeArabic(f.cleanTitle).includes(strictStem),
          );
          if (matchedFile) {
            archiveUrl = matchedFile.url;
            hasExactArchiveStream = true;
          }
        }
      }

      const anilistHit = track.malId ? anilistPosterMap.get(track.malId) : undefined;
      let posterUrl = anilistHit?.posterUrl || track.posterUrl;
      let backdropUrl = anilistHit?.backdropUrl || track.backdropUrl;

      if (!anilistHit?.posterUrl && track.tmdbId) {
        const resolvedTmdb = await resolvePosterByTmdbOrMal({
          cacheId: `sharat-${track.id}`,
          tmdbId: track.tmdbId,
          isMovie: track.tmdbMediaType === 'movie',
          fallbackPosterUrl: track.posterUrl,
          fallbackBackdropUrl: track.backdropUrl,
        });
        posterUrl = resolvedTmdb.posterUrl || posterUrl;
        backdropUrl = resolvedTmdb.backdropUrl || backdropUrl;
      }

      return {
        ...track,
        posterUrl,
        backdropUrl,
        archiveUrl,
        hasExactArchiveStream,
      };
    }),
  );

  const seen = new Set<string>();
  const deduped = hydrated.filter((item) => {
    const key = `${normalizeArabic(item.seriesAr)}::${normalizeArabic(item.titleAr)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  try {
    sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(deduped));
  } catch {
    // ignore storage quota errors
  }

  return deduped;
}

export async function resolveAnimeThemeFallback(track: SharatTrack): Promise<{
  rawWebmUrl: string | null;
  rawAudioOggUrl: string | null;
}> {
  if (track.rawWebmUrl) {
    return { rawWebmUrl: track.rawWebmUrl, rawAudioOggUrl: track.rawAudioOggUrl ?? null };
  }
  if (!track.animeThemesSlug) {
    return { rawWebmUrl: null, rawAudioOggUrl: null };
  }

  try {
    const res = await fetch(
      `https://api.animethemes.moe/anime/${encodeURIComponent(track.animeThemesSlug)}?include=animethemes.animethemeentries.videos.audio`,
      { signal: AbortSignal.timeout(6500) },
    );
    if (!res.ok) return { rawWebmUrl: null, rawAudioOggUrl: null };
    const data = await res.json();
    const themes: any[] = data?.anime?.animethemes ?? [];
    const opTheme = themes.find((t) => String(t?.slug).startsWith('OP')) || themes[0];
    const candidates: any[] = [];
    for (const entry of opTheme?.animethemeentries ?? []) {
      for (const v of entry?.videos ?? []) {
        if (v?.link || v?.filename) candidates.push(v);
      }
    }
    candidates.sort(
      (a, b) => Number(Boolean(b?.nc)) - Number(Boolean(a?.nc)) || (Number(b?.resolution ?? 0) - Number(a?.resolution ?? 0)),
    );
    const best = candidates[0];
    if (!best) return { rawWebmUrl: null, rawAudioOggUrl: null };
    return {
      rawWebmUrl: best.link || `https://v.animethemes.moe/${best.filename}.webm`,
      rawAudioOggUrl: best.audio?.link || null,
    };
  } catch {
    return { rawWebmUrl: null, rawAudioOggUrl: null };
  }
}
