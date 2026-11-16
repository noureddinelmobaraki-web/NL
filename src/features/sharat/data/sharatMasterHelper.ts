import type { SharatTrack } from '../types/sharat.types';

const BUNDLE_2000 = 'https://archive.org/download/hsrya-o-laol-mr-brnamg-konan-aal-alhoaaa-2000-2';
const BUNDLE_2021 = 'https://archive.org/download/20210811_20210811_2250';

const DIRECT_ARCHIVE_URLS: Record<number, { url: string; bundleId: string }> = {
  1: { url: 'https://archive.org/download/vhs-thunder-jet-arabic/thunder%20jet%201%20part%201.mp4', bundleId: 'vhs-thunder-jet-arabic' },
  2: { url: 'https://archive.org/download/alknas-alhlk-40/alknas-alhlk-1.mp4', bundleId: 'alknas-alhlk-40' },
  4: { url: 'https://archive.org/download/D0RAG0N-B0RU-ARABIC-DUB-VENUS-2002/D0RAG0N%20B0RU%20-%20AR%20DUB%20-%2001.mp4', bundleId: 'D0RAG0N-B0RU-ARABIC-DUB-VENUS-2002' },
  7: { url: `${BUNDLE_2000}/sbys-ton-albth-alrsmy-aal-albhryn-3-skor-alard.mp4`, bundleId: 'hsrya-o-laol-mr-brnamg-konan-aal-alhoaaa-2000-2' },
  25: { url: `${BUNDLE_2021}/%D8%A8%D8%AF%D8%A7%D9%8A%D8%A9%20%D8%A7%D9%84%D8%B7%D8%A7%D9%82%D8%A9%20%D8%A7%D9%84%D8%B2%D8%B1%D9%82%D8%A7%D8%A1%202005.mp4`, bundleId: '20210811_20210811_2250' },
  34: { url: `${BUNDLE_2021}/%D9%85%D9%86%20%D8%A7%D9%84%D8%A7%D8%B1%D8%B4%D9%8A%D9%81%20%D8%B4%D8%A7%D8%B1%D8%A9%20%D8%A7%D8%B1%D8%BA%D8%A7%D9%8A%20%D9%85%D8%B9%20%D8%A7%D9%84%D9%83%D9%84%D9%85%D8%A7%D8%AA.mp4`, bundleId: '20210811_20210811_2250' },
  37: { url: `${BUNDLE_2000}/sbys-ton-albth-altgryby-aal-albhryn-4-almhkk-konan.mp4`, bundleId: 'hsrya-o-laol-mr-brnamg-konan-aal-alhoaaa-2000-2' },
  39: { url: `${BUNDLE_2000}/digimon-arabic-opening.mp4`, bundleId: 'hsrya-o-laol-mr-brnamg-konan-aal-alhoaaa-2000-2' },
  40: { url: `${BUNDLE_2021}/%D8%A7%D8%A8%D8%B7%D8%A7%D9%84%20%D8%A7%D9%84%D8%AF%D9%8A%D8%AC%D9%8A%D8%AA%D8%A7%D9%84%20%D8%B4%D8%A7%D8%B1%D8%A9%20%D8%A7%D9%84%D9%86%D9%87%D8%A7%D9%8A%D9%87%202003.mp4`, bundleId: '20210811_20210811_2250' },
  42: { url: `${BUNDLE_2021}/%D8%A8%D8%AF%D8%A7%D9%8A%D8%A9%20%D8%A7%D8%A8%D8%B7%D8%A7%D9%84%20%D8%A7%D9%84%D8%AF%D9%8A%D8%AC%D9%8A%D8%AA%D8%A7%D9%84%203.mp4`, bundleId: '20210811_20210811_2250' },
  45: { url: `${BUNDLE_2021}/%D8%B4%D8%A7%D8%B1%D8%A9%20%D8%A7%D9%84%D8%A8%D8%AF%D8%A7%D9%8A%D9%87%20%D9%88%D9%86%20%D8%A8%D9%8A%D8%B3%20%D8%B3%D8%A8%D9%8A%D8%B3%20%D8%A8%D8%A7%D9%88%D8%B1%202009.mp4`, bundleId: '20210811_20210811_2250' },
  47: { url: `${BUNDLE_2000}/Pok%C3%A9mon%20theme%20arabic%20opening.mp4`, bundleId: 'hsrya-o-laol-mr-brnamg-konan-aal-alhoaaa-2000-2' },
  63: { url: `${BUNDLE_2000}/aghny-alkabtn-magd-kdymhblhn-aghny-shot-shaml.mp4`, bundleId: 'hsrya-o-laol-mr-brnamg-konan-aal-alhoaaa-2000-2' },
  69: { url: `${BUNDLE_2000}/%D8%B3%D9%84%D8%A7%D9%85%20%D8%AF%D8%A7%D9%86%D9%83%20Slam%20Dank%20Anime%20Ar%20Op.mp4`, bundleId: 'hsrya-o-laol-mr-brnamg-konan-aal-alhoaaa-2000-2' },
  81: { url: `${BUNDLE_2021}/%D8%A8%D8%AF%D8%A7%D9%8A%D8%A9%20%D8%B1%D9%8A%D9%85%D9%8A%20%D8%A7%D9%84%D9%82%D8%AF%D9%8A%D9%85%D9%87%20%D8%A7%D9%84%D9%86%D8%A7%D8%AF%D8%B1%D9%87%20%D8%A7%D9%84%D9%86%D8%B3%D8%AE%D9%87%20%D8%A7%D9%84%D9%82%D8%AF%D9%8A%D9%85%D9%87.mp4`, bundleId: '20210811_20210811_2250' },
  82: { url: `${BUNDLE_2000}/amy-km-ahoaha-rymy-sbys-ton-spacetoon.mp4`, bundleId: 'hsrya-o-laol-mr-brnamg-konan-aal-alhoaaa-2000-2' },
  83: { url: `${BUNDLE_2000}/ana-wa-akhi.mp4`, bundleId: 'hsrya-o-laol-mr-brnamg-konan-aal-alhoaaa-2000-2' },
};

const DIRECT_ANIMETHEMES_URLS: Record<number, string> = {
  1: 'https://v.animethemes.moe/GingaSengokuGunyuudenRai-OP1.webm',
  2: 'https://v.animethemes.moe/HunterxHunter-OP1.webm',
  3: 'https://v.animethemes.moe/ReccaNoHonoo-OP1.webm',
  4: 'https://v.animethemes.moe/DragonBallZ-OP1.webm',
  9: 'https://v.animethemes.moe/BlackCat-OP1.webm',
  38: 'https://v.animethemes.moe/RomeoNoAoiSora-OP1.webm',
  39: 'https://v.animethemes.moe/DigimonAdventure-OP1.webm',
  44: 'https://v.animethemes.moe/MonsterFarmTheAnimation-OP1.webm',
  69: 'https://v.animethemes.moe/SlamDunk-OP1.webm',
  81: 'https://v.animethemes.moe/IeNakiKoRemi-OP1.webm',
  83: 'https://v.animethemes.moe/AkachanToBoku-OP1.webm',
};

export interface SharatSeedInput {
  n: number;
  seriesAr: string;
  titleAr: string;
  originalTitle: string;
  artistAr: string;
  youtubeId: string;
  slug?: string;
  malId?: number;
  tmdbId?: number;
  tmdbMediaType?: 'tv' | 'movie';
  bundleId?: string;
}

export function mkSharat(seed: SharatSeedInput): SharatTrack {
  const directArchive = DIRECT_ARCHIVE_URLS[seed.n];
  const rawWebmUrl = DIRECT_ANIMETHEMES_URLS[seed.n];
  const maxRes = `https://i.ytimg.com/vi/${seed.youtubeId}/maxresdefault.jpg`;
  const hqFallback = `https://i.ytimg.com/vi/${seed.youtubeId}/hqdefault.jpg`;

  return {
    id: `sharat-${seed.n}`,
    catalogNumber: seed.n,
    seriesAr: seed.seriesAr,
    titleAr: seed.titleAr,
    originalTitle: seed.originalTitle,
    artistAr: seed.artistAr,
    youtubeId: seed.youtubeId,
    animeThemesSlug: seed.slug,
    animeThemesUrl: rawWebmUrl,
    malId: seed.malId,
    tmdbId: seed.tmdbId,
    tmdbMediaType: seed.tmdbMediaType,
    archiveUrl: directArchive?.url,
    archiveBundleId: directArchive?.bundleId ?? seed.bundleId,
    hasExactArchiveStream: Boolean(directArchive?.url),
    posterUrl: maxRes,
    backdropUrl: maxRes,
    backdropFallbackUrl: hqFallback,
    rawWebmUrl,
  };
}
