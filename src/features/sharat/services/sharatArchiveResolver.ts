import type { SharatArtistGroupId, SharatTrack } from '../types/sharat.types';
import {
  fetchAniListBatchPostersByMalIds,
  resolvePosterByTmdbOrMal,
} from '../../cartoon/services/cartoonMetadataClient';

const ARCHIVE_BUNDLES = [
  '20210811_20210811_2250',
  'hsrya-o-laol-mr-brnamg-konan-aal-alhoaaa-2000-2',
  'mnoaaat-msgl-mn-asbys-ton-aal-alnayl-sat-2002',
] as const;

const SESSION_CACHE_KEY = 'nl_sharat_resolved_catalog_v4';

interface ArchiveBundleFileEntry {
  bundleId: string;
  fileName: string;
  cleanTitle: string;
  url: string;
  isVideo: boolean;
}

interface SeriesMetadataLookup {
  keywords: string[];
  malId?: number;
  tmdbId?: number;
  isMovie?: boolean;
  titleEn?: string;
  artistAr?: string;
  artistGroupId?: SharatArtistGroupId;
  planetAr?: string;
}

const SERIES_LOOKUP_TABLE: SeriesMetadataLookup[] = [
  { keywords: ['ريمي', 'دروب ريمي'], malId: 2829, titleEn: 'Ie Naki Ko Remi', artistAr: 'رشا رزق', artistGroupId: 'rasha', planetAr: 'كوكب زمردة' },
  { keywords: ['القناص', 'قناص'], malId: 136, titleEn: 'Hunter x Hunter 1999', artistAr: 'رشا رزق', artistGroupId: 'rasha', planetAr: 'كوكب مغامرات' },
  { keywords: ['عهد الأصدقاء', 'عهد الاصدقاء', 'روميو'], malId: 2559, titleEn: 'Romeo no Aoi Sora', artistAr: 'رشا رزق', artistGroupId: 'rasha', planetAr: 'كوكب مغامرات' },
  { keywords: ['سندريلا'], malId: 2817, titleEn: 'Cinderella Monogatari', artistAr: 'رشا رزق', artistGroupId: 'rasha', planetAr: 'كوكب زمردة' },
  { keywords: ['أناستازيا', 'اناستازيا'], tmdbId: 9444, isMovie: true, titleEn: 'Anastasia', artistAr: 'رشا رزق', artistGroupId: 'rasha', planetAr: 'كوكب أفلام' },
  { keywords: ['دوريمي'], malId: 350, titleEn: 'Ojamajo Doremi', artistAr: 'رشا رزق', artistGroupId: 'rasha', planetAr: 'كوكب زمردة' },
  { keywords: ['إيروكا', 'ايروكا', 'نغم'], malId: 2796, titleEn: 'Idol Densetsu Eriko', artistAr: 'رشا رزق', artistGroupId: 'rasha', planetAr: 'كوكب زمردة' },
  { keywords: ['الكاندام', 'كاندام', 'فرسان الفضاء'], malId: 90, titleEn: 'Mobile Suit Gundam Wing', artistAr: 'رشا رزق', artistGroupId: 'rasha', planetAr: 'كوكب أكشن' },
  { keywords: ['الديجيتال', 'ديجيتال'], malId: 552, titleEn: 'Digimon Adventure', artistAr: 'عاصم سكر / رشا رزق', artistGroupId: 'assem', planetAr: 'كوكب أكشن' },
  { keywords: ['همتارو'], malId: 508, titleEn: 'Tottoko Hamtarou', artistAr: 'رشا رزق', artistGroupId: 'rasha', planetAr: 'كوكب كوميديا' },
  { keywords: ['بلاك كات', 'القط الأسود', 'القط الاسود'], malId: 68, titleEn: 'Black Cat', artistAr: 'رشا رزق', artistGroupId: 'rasha', planetAr: 'سبيس باور' },
  { keywords: ['كونان'], malId: 235, titleEn: 'Detective Conan', artistAr: 'طارق العربي طرقان', artistGroupId: 'tarek', planetAr: 'كوكب أكشن' },
  { keywords: ['هزيم الرعد', 'هزيم'], malId: 2026, titleEn: 'Ginga Sengoku Gunyuuden Rai', artistAr: 'طارق العربي طرقان', artistGroupId: 'tarek', planetAr: 'كوكب أكشن' },
  { keywords: ['صقور الأرض', 'صقور الارض'], malId: 970, titleEn: 'Yokoyama Mitsuteru Sangokushi', artistAr: 'طارق العربي طرقان', artistGroupId: 'tarek', planetAr: 'كوكب تاريخ' },
  { keywords: ['سلام دانك', 'حسان'], malId: 170, titleEn: 'Slam Dunk', artistAr: 'طارق العربي طرقان', artistGroupId: 'tarek', planetAr: 'كوكب رياضة' },
  { keywords: ['ماوكلي'], malId: 2569, titleEn: 'Jungle Book Shounen Mowgli', artistAr: 'طارق العربي طرقان', artistGroupId: 'tarek', planetAr: 'كوكب مغامرات' },
  { keywords: ['سابق ولاحق', 'سابق و لاحق'], malId: 2705, titleEn: 'Bakusou Kyoudai Let\'s & Go', artistAr: 'طارق العربي طرقان', artistGroupId: 'tarek', planetAr: 'كوكب رياضة' },
  { keywords: ['سيمبا'], tmdbId: 46386, titleEn: 'Simba the King Lion', artistAr: 'طارق العربي طرقان', artistGroupId: 'tarek', planetAr: 'كوكب مغامرات' },
  { keywords: ['بابار'], tmdbId: 1978, titleEn: 'Babar', artistAr: 'طارق العربي طرقان', artistGroupId: 'tarek', planetAr: 'كوكب مغامرات' },
  { keywords: ['داي الشجاع', 'داي'], malId: 2229, titleEn: 'Dragon Quest: Dai no Daibouken', artistAr: 'طارق العربي طرقان', artistGroupId: 'tarek', planetAr: 'كوكب مغامرات' },
  { keywords: ['زورو'], malId: 3010, titleEn: 'Kaiketsu Zorro', artistAr: 'طارق العربي طرقان', artistGroupId: 'tarek', planetAr: 'كوكب مغامرات' },
  { keywords: ['روبن هود'], malId: 2543, titleEn: 'Robin Hood no Daibouken', artistAr: 'طارق العربي طرقان', artistGroupId: 'tarek', planetAr: 'كوكب مغامرات' },
  { keywords: ['أكاديمية الشرطة', 'اكاديمية الشرطة'], tmdbId: 12573, titleEn: 'Police Academy: The Series', artistAr: 'طارق العربي طرقان', artistGroupId: 'tarek', planetAr: 'كوكب كوميديا' },
  { keywords: ['الكابتن رابح', 'رابح'], malId: 2678, titleEn: 'Moero! Top Striker', artistAr: 'طارق العربي طرقان', artistGroupId: 'tarek', planetAr: 'كوكب رياضة' },
  { keywords: ['أنا وأخي', 'انا واخي', 'سامي'], malId: 1485, titleEn: 'Akachan to Boku', artistAr: 'هالة الصباغ', artistGroupId: 'hala', planetAr: 'كوكب زمردة' },
  { keywords: ['الحديقة السرية', 'الحديقه السريه'], malId: 2810, titleEn: 'Anime Himitsu no Hanazono', artistAr: 'هالة الصباغ', artistGroupId: 'hala', planetAr: 'كوكب زمردة' },
  { keywords: ['طرزان'], tmdbId: 37135, isMovie: true, titleEn: 'Tarzan', artistAr: 'هالة الصباغ', artistGroupId: 'hala', planetAr: 'كوكب أفلام' },
  { keywords: ['سالي'], malId: 2547, titleEn: 'Shoukoujo Sara', artistAr: 'هالة الصباغ', artistGroupId: 'hala', planetAr: 'كوكب زمردة' },
  { keywords: ['لولو الصغيرة', 'لولو'], malId: 5340, titleEn: 'Little Lulu to Chicchai Nakama', artistAr: 'عايدة أبو نوار', artistGroupId: 'aida', planetAr: 'كوكب كوميديا' },
  { keywords: ['أوسكار', 'اوسكار'], malId: 338, titleEn: 'Versailles no Bara', artistAr: 'عايدة أبو نوار', artistGroupId: 'aida', planetAr: 'كوكب تاريخ' },
  { keywords: ['فلونة', 'فلونه'], malId: 2544, titleEn: 'Kazoku Robinson Hyouryuuki', artistAr: 'سونيا بيطار', artistGroupId: 'sonia', planetAr: 'كوكب زمردة' },
  { keywords: ['لحن الحياة', 'لحن الحياه'], malId: 2557, titleEn: 'Trapp Ikka Monogatari', artistAr: 'سونيا بيطار', artistGroupId: 'sonia', planetAr: 'كوكب زمردة' },
  { keywords: ['نساء صغيرات'], malId: 2548, titleEn: 'Ai no Wakakusa Monogatari', artistAr: 'سونيا بيطار', artistGroupId: 'sonia', planetAr: 'كوكب زمردة' },
  { keywords: ['غريندايزر', 'جريندايزر'], malId: 1985, titleEn: 'UFO Robo Grendizer', artistAr: 'سامي كلارك', artistGroupId: 'sammy', planetAr: 'كوكب أكشن' },
  { keywords: ['جزيرة الكنز', 'سيلفر'], malId: 2618, titleEn: 'Takarajima', artistAr: 'سامي كلارك', artistGroupId: 'sammy', planetAr: 'كوكب مغامرات' },
  { keywords: ['جونكر'], malId: 3891, titleEn: 'Astroganger', artistAr: 'سامي كلارك', artistGroupId: 'sammy', planetAr: 'كوكب أكشن' },
  { keywords: ['دراغون بول', 'دراجون بول'], malId: 813, titleEn: 'Dragon Ball Z', artistAr: 'عاصم سكر', artistGroupId: 'assem', planetAr: 'كوكب أكشن' },
  { keywords: ['بي بليد', 'بيبليد'], malId: 288, titleEn: 'Bakuten Shoot Beyblade', artistAr: 'عاصم سكر', artistGroupId: 'assem', planetAr: 'كوكب رياضة' },
  { keywords: ['إينوياشا', 'اينوياشا'], malId: 249, titleEn: 'InuYasha', artistAr: 'عاصم سكر', artistGroupId: 'assem', planetAr: 'سبيس باور' },
  { keywords: ['الكابتن ماجد', 'كابتن ماجد', 'ماجد'], malId: 2116, titleEn: 'Captain Tsubasa', artistAr: 'بسام الحسوني', artistGroupId: 'bessam', planetAr: 'كوكب رياضة' },
  { keywords: ['شوت', 'الشبح'], malId: 1327, titleEn: 'Aoki Densetsu Shoot!', artistAr: 'بسام الحسوني', artistGroupId: 'bessam', planetAr: 'كوكب رياضة' },
  { keywords: ['عدنان ولينا', 'عدنان و لينا'], malId: 302, titleEn: 'Mirai Shounen Conan', artistAr: 'سمير قصيباتي', artistGroupId: 'samir', planetAr: 'كوكب مغامرات' },
  { keywords: ['بوكيمون'], malId: 527, titleEn: 'Pokemon', artistAr: 'سمير قصيباتي / رشا رزق', artistGroupId: 'samir', planetAr: 'كوكب أكشن' },
  { keywords: ['أبطال الكرة', 'ابطال الكرة', 'عامر'], malId: 5231, titleEn: 'Inazuma Eleven', artistAr: 'محمد وطلال العربي طرقان', artistGroupId: 'tala_mohammed', planetAr: 'كوكب رياضة' },
  { keywords: ['LBX', 'المحاربون الصغار'], malId: 9844, titleEn: 'Danball Senki', artistAr: 'تالا ومحمد العربي طرقان', artistGroupId: 'tala_mohammed', planetAr: 'كوكب أكشن' },
  { keywords: ['النمر المقنع', 'النمر'], malId: 3009, titleEn: 'Tiger Mask', artistAr: 'مهند بيطار / طارق العربي طرقان', artistGroupId: 'tala_mohammed', planetAr: 'كوكب رياضة' },
];

function normalizeArabic(text: string): string {
  return text
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F]/g, '')
    .toLowerCase()
    .trim();
}

function findSeriesLookup(text: string): SeriesMetadataLookup | undefined {
  const norm = normalizeArabic(text);
  return SERIES_LOOKUP_TABLE.find((entry) =>
    entry.keywords.some((kw) => norm.includes(normalizeArabic(kw))),
  );
}

async function fetchBundleFiles(bundleId: string): Promise<ArchiveBundleFileEntry[]> {
  try {
    const res = await fetch(`https://archive.org/metadata/${bundleId}`, {
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const rawFiles: Array<{ name?: string; format?: string }> = Array.isArray(data?.files)
      ? data.files
      : [];

    // Prefer original .mp4 / .mp3 over derivative .ia.mp4 when possible
    const baseEntries: ArchiveBundleFileEntry[] = [];
    const seenStems = new Set<string>();

    const sorted = [...rawFiles].sort((a, b) => {
      const aIa = (a.name || '').endsWith('.ia.mp4') ? 1 : 0;
      const bIa = (b.name || '').endsWith('.ia.mp4') ? 1 : 0;
      return aIa - bIa;
    });

    for (const f of sorted) {
      const name = f.name || '';
      if (!name) continue;
      const lower = name.toLowerCase();
      if (!lower.endsWith('.mp4') && !lower.endsWith('.mp3')) continue;
      if (lower.includes('__ia_thumb')) continue;

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

async function searchArchiveFallbackStream(seriesAr: string): Promise<string | null> {
  try {
    const q = `mediatype:(movies OR audio) AND title:("${seriesAr}")`;
    const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(q)}&fl[]=identifier&rows=3&page=1&output=json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = await res.json();
    const docs: Array<{ identifier?: string }> = data?.response?.docs ?? [];
    for (const doc of docs) {
      if (!doc.identifier) continue;
      const files = await fetchBundleFiles(doc.identifier);
      if (files.length > 0) {
        return files[0].url;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Dynamically resolves all 53 curated Sharat tracks against the 3 real Archive.org Spacetoon bundles,
 * appends all 300+ remaining Archive tracks, and batch-hydrates official anime/cartoon posters.
 */
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

  // 1. Warm up AniList batch posters in one GraphQL call
  const allMalIds = SERIES_LOOKUP_TABLE.map((s) => s.malId).filter(
    (id): id is number => typeof id === 'number' && id > 0,
  );
  const anilistPosterMap = await fetchAniListBatchPostersByMalIds(allMalIds);

  // 2. Fetch all 3 Archive.org bundle metadata lists in parallel
  const bundleLists = await Promise.all(
    ARCHIVE_BUNDLES.map((id) => fetchBundleFiles(id)),
  );
  const allArchiveFiles = bundleLists.flat();
  const usedUrls = new Set<string>();

  // 3. Match the 53 curated tracks to real Archive filenames + official posters
  const hydratedCurated: SharatTrack[] = await Promise.all(
    baseCatalog.map(async (track, idx) => {
      const lookup =
        findSeriesLookup(track.seriesAr) || findSeriesLookup(track.titleAr);
      const normSeries = normalizeArabic(track.seriesAr.split('(')[0].trim());
      const normTitle = normalizeArabic(track.titleAr);

      let matchedFile = allArchiveFiles.find((f) => {
        const normFile = normalizeArabic(f.cleanTitle);
        if (normSeries && normFile.includes(normSeries)) return true;
        if (lookup?.keywords.some((kw) => normFile.includes(normalizeArabic(kw)))) {
          return true;
        }
        return normTitle.split(/\s+/).some((w) => w.length > 3 && normFile.includes(w));
      });

      // Fallback to any playable file in the bundles if no exact Arabic keyword hit
      if (!matchedFile && allArchiveFiles.length > 0) {
        const searchedUrl = await searchArchiveFallbackStream(track.seriesAr);
        if (searchedUrl) {
          matchedFile = {
            bundleId: ARCHIVE_BUNDLES[0],
            fileName: track.titleAr,
            cleanTitle: track.titleAr,
            url: searchedUrl,
            isVideo: searchedUrl.endsWith('.mp4'),
          };
        } else {
          matchedFile = allArchiveFiles[idx % allArchiveFiles.length];
        }
      }

      if (matchedFile) {
        usedUrls.add(matchedFile.url);
      }

      // Resolve poster
      let posterUrl = track.posterUrl;
      if (lookup?.malId && anilistPosterMap.get(lookup.malId)?.posterUrl) {
        posterUrl = anilistPosterMap.get(lookup.malId)!.posterUrl;
      } else if (lookup?.tmdbId || lookup?.titleEn) {
        const resolvedPoster = await resolvePosterByTmdbOrMal({
          cacheId: `sharat-${track.id}`,
          tmdbId: lookup.tmdbId,
          malId: lookup.malId,
          titleEn: lookup.titleEn,
          isMovie: lookup.isMovie,
          fallbackPosterUrl: track.posterUrl,
        });
        posterUrl = resolvedPoster.posterUrl || track.posterUrl;
      }

      const finalArchiveUrl = matchedFile?.url || track.archiveUrl;
      return {
        ...track,
        posterUrl,
        archiveUrl: finalArchiveUrl,
        downloadUrl: finalArchiveUrl,
      };
    }),
  );

  // 4. Append all remaining 300+ real Archive tracks from the 3 Spacetoon bundles
  const extraArchiveTracks: SharatTrack[] = [];
  for (let i = 0; i < allArchiveFiles.length; i++) {
    const file = allArchiveFiles[i];
    if (usedUrls.has(file.url)) continue;
    // Skip pure numbered filenames without Arabic titles if already represented
    if (/^\d+$/.test(file.cleanTitle)) continue;

    const lookup = findSeriesLookup(file.cleanTitle);
    const malPoster =
      lookup?.malId ? anilistPosterMap.get(lookup.malId)?.posterUrl : undefined;

    extraArchiveTracks.push({
      id: `archive-sharat-${file.bundleId}-${i}`,
      titleAr: file.cleanTitle,
      seriesAr: lookup?.keywords[0] || file.cleanTitle,
      artistAr: lookup?.artistAr || 'روائع سبيستون والزمن الجميل',
      artistGroupId: lookup?.artistGroupId || 'rasha',
      channelAr: 'سبيستون',
      planetAr: lookup?.planetAr || 'كوكب زمردة ومغامرات',
      year: 2000,
      posterUrl:
        malPoster || `https://archive.org/services/img/${file.bundleId}`,
      archiveUrl: file.url,
      youtubeId: '9W8Z0qY3vJ8',
      backupYoutubeId: 'y8M9x2P4vK1',
      downloadUrl: file.url,
    });
  }

  const combined = [...hydratedCurated, ...extraArchiveTracks];
  try {
    sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(combined));
  } catch {
    // ignore storage quota errors
  }

  return combined;
}
