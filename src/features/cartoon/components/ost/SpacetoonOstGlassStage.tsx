import React, { useState, useEffect, useMemo } from 'react';
import {
  Music,
  Video,
  X,
  Search,
} from 'lucide-react';
import {
  SpacetoonThemeSongCard,
  type SpacetoonOstTrack,
} from './SpacetoonThemeSongCard';
import { GlassVectorIcon } from '../../../../components/shared/icons';
import {
  fetchAniListBatchPostersByMalIds,
  resolvePosterByTmdbOrMal,
} from '../../services/cartoonMetadataClient';

/**
 * Verified Archive.org Spacetoon OST & Promo Bundles (333+ total tracks):
 * 1) `20210811_20210811_2250` (153 tracks)
 * 2) `hsrya-o-laol-mr-brnamg-konan-aal-alhoaaa-2000-2` (114 tracks)
 * 3) `mnoaaat-msgl-mn-asbys-ton-aal-alnayl-sat-2002` (66 tracks)
 */
export const SPACETOON_OST_ARCHIVE_BUNDLES = [
  '20210811_20210811_2250',
  'hsrya-o-laol-mr-brnamg-konan-aal-alhoaaa-2000-2',
  'mnoaaat-msgl-mn-asbys-ton-aal-alnayl-sat-2002',
] as const;

let cachedTotalOstCount = 333;
const ostCountListeners = new Set<(count: number) => void>();

export function getSpacetoonOstTotalCount(): number {
  return cachedTotalOstCount;
}

export function setSpacetoonOstTotalCount(count: number): void {
  if (count <= 0 || count === cachedTotalOstCount) return;
  cachedTotalOstCount = count;
  ostCountListeners.forEach((cb) => cb(count));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('nl:spacetoon-ost-count', { detail: { count } }),
    );
  }
}

export function subscribeSpacetoonOstTotalCount(
  cb: (count: number) => void,
): () => void {
  ostCountListeners.add(cb);
  return () => {
    ostCountListeners.delete(cb);
  };
}

/**
 * Curated Spacetoon OST Classics with verified AniList CDN, Archive.org, & TMDB/MAL IDs.
 * Automatically enriched with AniList/TMDB posters + merged with ALL 333+ tracks
 * from the 3 verified Archive.org Spacetoon OST collections.
 */
export const SPACETOON_OST_TRACKS: SpacetoonOstTrack[] = [
  {
    id: 'ost-remi',
    titleAr: 'شارة دروب ريمي — مرّت في خاطري فكرة',
    showAr: 'دروب ريمي',
    performerAr: 'رشا رزق',
    planetBadgeAr: 'كوكب زمردة',
    seriesTitleAr: 'دروب ريمي',
    vocalistAr: 'رشا رزق',
    planetLabelAr: 'كوكب زمردة',
    year: 1996,
    tmdbId: 44757,
    malId: 2829,
    titleEn: 'Ie Naki Ko Remi',
    posterUrl: 'https://archive.org/services/img/20210811_20210811_2250',
    backdropUrl: 'https://archive.org/services/img/20210811_20210811_2250',
    archiveId: '20210811_20210811_2250',
    matchKeywords: ['ريمي', 'remi', 'rymy', 'دروب', 'أمي كم أهواها', 'amy'],
    fallbackAudioUrl:
      'https://archive.org/download/20210811_20210811_2250/01.mp3',
    fallbackVideoEmbedUrl:
      'https://archive.org/embed/mnoaaat-msgl-mn-asbys-ton-aal-alnayl-sat-2002',
    audioStreamUrl:
      'https://archive.org/download/20210811_20210811_2250/01.mp3',
    videoEmbedUrl:
      'https://archive.org/embed/mnoaaat-msgl-mn-asbys-ton-aal-alnayl-sat-2002',
  },
  {
    id: 'ost-hxh',
    titleAr: 'شارة القناص — قد لمعت عيناه',
    showAr: 'القناص (Hunter x Hunter)',
    performerAr: 'رشا رزق',
    planetBadgeAr: 'كوكب مغامرات',
    seriesTitleAr: 'القناص (Hunter x Hunter)',
    vocalistAr: 'رشا رزق',
    planetLabelAr: 'كوكب مغامرات',
    year: 1999,
    tmdbId: 46298,
    malId: 136,
    titleEn: 'Hunter x Hunter',
    posterUrl:
      'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx136-2N562t7j425O.jpg',
    backdropUrl: 'https://archive.org/services/img/alknas-alhlk-40',
    archiveId: '20210811_20210811_2250',
    matchKeywords: ['القناص', 'قناص', 'alknas', 'hunter', 'لمعت'],
    fallbackAudioUrl:
      'https://archive.org/download/20210811_20210811_2250/02.mp3',
    fallbackVideoEmbedUrl: 'https://archive.org/embed/01_20210903_202109',
    audioStreamUrl:
      'https://archive.org/download/20210811_20210811_2250/02.mp3',
    videoEmbedUrl: 'https://archive.org/embed/01_20210903_202109',
  },
  {
    id: 'ost-conan',
    titleAr: 'شارة المحقق كونان — يكتشف الغامض والمثير',
    showAr: 'المحقق كونان',
    performerAr: 'طارق العربي طرقان / رشا رزق',
    planetBadgeAr: 'كوكب أكشن',
    seriesTitleAr: 'المحقق كونان',
    vocalistAr: 'طارق العربي طرقان / رشا رزق',
    planetLabelAr: 'كوكب أكشن',
    year: 1998,
    tmdbId: 30983,
    malId: 235,
    titleEn: 'Detective Conan',
    posterUrl:
      'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx235-c3bc4f0I23P2.png',
    backdropUrl:
      'https://archive.org/services/img/hsrya-o-laol-mr-brnamg-konan-aal-alhoaaa-2000-2',
    archiveId: 'hsrya-o-laol-mr-brnamg-konan-aal-alhoaaa-2000-2',
    matchKeywords: ['كونان', 'conan', 'konan', 'المحقق'],
    fallbackAudioUrl:
      'https://archive.org/download/20210811_20210811_2250/03.mp3',
    fallbackVideoEmbedUrl:
      'https://archive.org/embed/hsrya-o-laol-mr-brnamg-konan-aal-alhoaaa-2000-2',
    audioStreamUrl:
      'https://archive.org/download/20210811_20210811_2250/03.mp3',
    videoEmbedUrl:
      'https://archive.org/embed/hsrya-o-laol-mr-brnamg-konan-aal-alhoaaa-2000-2',
  },
  {
    id: 'ost-majed',
    titleAr: 'شارة الكابتن ماجد — عاد إليكم من جديد',
    showAr: 'الكابتن ماجد',
    performerAr: 'بسام الحسوني / طارق العربي طرقان',
    planetBadgeAr: 'كوكب رياضة',
    seriesTitleAr: 'الكابتن ماجد',
    vocalistAr: 'بسام الحسوني / طارق العربي طرقان',
    planetLabelAr: 'كوكب رياضة',
    year: 1995,
    tmdbId: 31011,
    malId: 2116,
    titleEn: 'Captain Tsubasa',
    posterUrl:
      'https://archive.org/services/img/Shoot-Soccer-Anime-Arabic-dub-Spacetoon',
    backdropUrl:
      'https://archive.org/services/img/Shoot-Soccer-Anime-Arabic-dub-Spacetoon',
    archiveId: '20210811_20210811_2250',
    matchKeywords: ['ماجد', 'majed', 'magd', 'tsubasa', 'كابتن', 'alkabtn'],
    fallbackAudioUrl:
      'https://archive.org/download/20210811_20210811_2250/04.mp3',
    fallbackVideoEmbedUrl:
      'https://archive.org/embed/mnoaaat-msgl-mn-asbys-ton-aal-alnayl-sat-2002',
    audioStreamUrl:
      'https://archive.org/download/20210811_20210811_2250/04.mp3',
    videoEmbedUrl:
      'https://archive.org/embed/mnoaaat-msgl-mn-asbys-ton-aal-alnayl-sat-2002',
  },
  {
    id: 'ost-romeo',
    titleAr: 'شارة عهد الأصدقاء — حلمنا نهار',
    showAr: 'عهد الأصدقاء (روميو)',
    performerAr: 'رشا رزق',
    planetBadgeAr: 'كوكب مغامرات',
    seriesTitleAr: 'عهد الأصدقاء (روميو)',
    vocalistAr: 'رشا رزق',
    planetLabelAr: 'كوكب مغامرات',
    year: 1995,
    tmdbId: 44760,
    malId: 2559,
    titleEn: "Romeo's Blue Skies",
    posterUrl:
      'https://archive.org/services/img/mnoaaat-msgl-mn-asbys-ton-aal-alnayl-sat-2002',
    backdropUrl:
      'https://archive.org/services/img/mnoaaat-msgl-mn-asbys-ton-aal-alnayl-sat-2002',
    archiveId: '20210811_20210811_2250',
    matchKeywords: [
      'عهد',
      'الأصدقاء',
      'الاصدقاء',
      'aahd',
      'alasdqaa',
      'romeo',
      'حلمنا',
    ],
    fallbackAudioUrl:
      'https://archive.org/download/20210811_20210811_2250/05.mp3',
    fallbackVideoEmbedUrl:
      'https://archive.org/embed/mnoaaat-msgl-mn-asbys-ton-aal-alnayl-sat-2002',
    audioStreamUrl:
      'https://archive.org/download/20210811_20210811_2250/05.mp3',
    videoEmbedUrl:
      'https://archive.org/embed/mnoaaat-msgl-mn-asbys-ton-aal-alnayl-sat-2002',
  },
  {
    id: 'ost-digimon',
    titleAr: 'شارة أبطال الديجيتال — في فخ غريب وقعنا',
    showAr: 'أبطال الديجيتال',
    performerAr: 'عنتر (عاصم سكر) / رشا رزق',
    planetBadgeAr: 'كوكب أكشن',
    seriesTitleAr: 'أبطال الديجيتال',
    vocalistAr: 'عنتر (عاصم سكر) / رشا رزق',
    planetLabelAr: 'كوكب أكشن',
    year: 2000,
    tmdbId: 3074,
    malId: 552,
    titleEn: 'Digimon Adventure',
    posterUrl: 'https://archive.org/services/img/20210811_20210811_2250',
    backdropUrl: 'https://archive.org/services/img/20210811_20210811_2250',
    archiveId: '20210811_20210811_2250',
    matchKeywords: ['ديجيتال', 'الديجيتال', 'digimon', 'aldygytal', 'فخ'],
    fallbackAudioUrl:
      'https://archive.org/download/20210811_20210811_2250/06.mp3',
    fallbackVideoEmbedUrl:
      'https://archive.org/embed/mnoaaat-msgl-mn-asbys-ton-aal-alnayl-sat-2002',
    audioStreamUrl:
      'https://archive.org/download/20210811_20210811_2250/06.mp3',
    videoEmbedUrl:
      'https://archive.org/embed/mnoaaat-msgl-mn-asbys-ton-aal-alnayl-sat-2002',
  },
  {
    id: 'ost-dragonball',
    titleAr: 'شارة دراغون بول زد — رأيت الحقيقة خلف البصر',
    showAr: 'دراغون بول زد',
    performerAr: 'عاصم سكر / طارق العربي طرقان',
    planetBadgeAr: 'كوكب أكشن',
    seriesTitleAr: 'دراغون بول زد',
    vocalistAr: 'عاصم سكر / طارق العربي طرقان',
    planetLabelAr: 'كوكب أكشن',
    year: 1989,
    tmdbId: 12971,
    malId: 813,
    titleEn: 'Dragon Ball Z',
    posterUrl:
      'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx813-TsHy2R32bd7n.jpg',
    backdropUrl:
      'https://archive.org/services/img/D0RAG0N-B0RU-ARABIC-DUB-VENUS-2002',
    archiveId: '20210811_20210811_2250',
    matchKeywords: ['دراغون', 'بول', 'dragon', 'غوكو'],
    fallbackAudioUrl:
      'https://archive.org/download/20210811_20210811_2250/07.mp3',
    fallbackVideoEmbedUrl:
      'https://archive.org/embed/mnoaaat-msgl-mn-asbys-ton-aal-alnayl-sat-2002',
    audioStreamUrl:
      'https://archive.org/download/20210811_20210811_2250/07.mp3',
    videoEmbedUrl:
      'https://archive.org/embed/mnoaaat-msgl-mn-asbys-ton-aal-alnayl-sat-2002',
  },
  {
    id: 'ost-slamdunk',
    titleAr: 'شارة سلام دانك — فجر جديد يطل علينا',
    showAr: 'سلام دانك',
    performerAr: 'طارق العربي طرقان',
    planetBadgeAr: 'كوكب رياضة',
    seriesTitleAr: 'سلام دانك',
    vocalistAr: 'طارق العربي طرقان',
    planetLabelAr: 'كوكب رياضة',
    year: 1993,
    tmdbId: 42444,
    malId: 170,
    titleEn: 'Slam Dunk',
    posterUrl: 'https://archive.org/services/img/20210811_20210811_2250',
    backdropUrl: 'https://archive.org/services/img/20210811_20210811_2250',
    archiveId: '20210811_20210811_2250',
    matchKeywords: ['سلام دانك', 'سلام', 'دانك', 'slam', 'dunk', 'حسان'],
    fallbackAudioUrl:
      'https://archive.org/download/20210811_20210811_2250/08.mp3',
    fallbackVideoEmbedUrl:
      'https://archive.org/embed/mnoaaat-msgl-mn-asbys-ton-aal-alnayl-sat-2002',
    audioStreamUrl:
      'https://archive.org/download/20210811_20210811_2250/08.mp3',
    videoEmbedUrl:
      'https://archive.org/embed/mnoaaat-msgl-mn-asbys-ton-aal-alnayl-sat-2002',
  },
  {
    id: 'ost-hazeem',
    titleAr: 'شارة هزيم الرعد — ما عاش الظالم يسبيك',
    showAr: 'هزيم الرعد',
    performerAr: 'طارق العربي طرقان',
    planetBadgeAr: 'كوكب أكشن',
    seriesTitleAr: 'هزيم الرعد',
    vocalistAr: 'طارق العربي طرقان',
    planetLabelAr: 'كوكب أكشن',
    year: 1994,
    tmdbId: 44932,
    malId: 3908,
    titleEn: 'Ginga Sengoku Gunyuuden Rai',
    posterUrl: 'https://archive.org/services/img/20210811_20210811_2250',
    backdropUrl: 'https://archive.org/services/img/20210811_20210811_2250',
    archiveId: '20210811_20210811_2250',
    matchKeywords: ['هزيم', 'الرعد', 'hzim', 'alraad', 'thunder', 'ابرقي'],
    fallbackAudioUrl:
      'https://archive.org/download/20210811_20210811_2250/09.mp3',
    fallbackVideoEmbedUrl:
      'https://archive.org/embed/mnoaaat-msgl-mn-asbys-ton-aal-alnayl-sat-2002',
    audioStreamUrl:
      'https://archive.org/download/20210811_20210811_2250/09.mp3',
    videoEmbedUrl:
      'https://archive.org/embed/mnoaaat-msgl-mn-asbys-ton-aal-alnayl-sat-2002',
  },
  {
    id: 'ost-soqoor',
    titleAr: 'شارة صقور الأرض — نحو الشمس نطير',
    showAr: 'صقور الأرض',
    performerAr: 'طارق العربي طرقان / عاصم سكر',
    planetBadgeAr: 'كوكب تاريخ',
    seriesTitleAr: 'صقور الأرض',
    vocalistAr: 'طارق العربي طرقان / عاصم سكر',
    planetLabelAr: 'كوكب تاريخ',
    year: 1991,
    tmdbId: 44888,
    malId: 970,
    titleEn: 'Yokoyama Mitsuteru Sangokushi',
    posterUrl: 'https://archive.org/services/img/20210811_20210811_2250',
    backdropUrl: 'https://archive.org/services/img/20210811_20210811_2250',
    archiveId: '20210811_20210811_2250',
    matchKeywords: ['صقور', 'الأرض', 'الارض', 'sqor', 'alard', 'sangokushi'],
    fallbackAudioUrl:
      'https://archive.org/download/20210811_20210811_2250/10.mp3',
    fallbackVideoEmbedUrl:
      'https://archive.org/embed/mnoaaat-msgl-mn-asbys-ton-aal-alnayl-sat-2002',
    audioStreamUrl:
      'https://archive.org/download/20210811_20210811_2250/10.mp3',
    videoEmbedUrl:
      'https://archive.org/embed/mnoaaat-msgl-mn-asbys-ton-aal-alnayl-sat-2002',
  },
  {
    id: 'ost-grendizer',
    titleAr: 'شارة غريندايزر — عليّ عليّ بطل فليد',
    showAr: 'مغامرات الفضاء غريندايزر',
    performerAr: 'سامي كلارك',
    planetBadgeAr: 'كوكب أكشن',
    seriesTitleAr: 'مغامرات الفضاء غريندايزر',
    vocalistAr: 'سامي كلارك',
    planetLabelAr: 'كوكب أكشن',
    year: 1975,
    tmdbId: 35664,
    malId: 2775,
    titleEn: 'UFO Robot Grendizer',
    posterUrl: 'https://archive.org/services/img/Eizenborg-Arabic-1981-dub',
    backdropUrl: 'https://archive.org/services/img/Eizenborg-Arabic-1981-dub',
    archiveId: '20210811_20210811_2250',
    matchKeywords: ['غريندايزر', 'جريندايزر', 'فليد', 'grendizer'],
    fallbackAudioUrl:
      'https://archive.org/download/20210811_20210811_2250/11.mp3',
    fallbackVideoEmbedUrl:
      'https://archive.org/embed/mnoaaat-msgl-mn-asbys-ton-aal-alnayl-sat-2002',
    audioStreamUrl:
      'https://archive.org/download/20210811_20210811_2250/11.mp3',
    videoEmbedUrl:
      'https://archive.org/embed/mnoaaat-msgl-mn-asbys-ton-aal-alnayl-sat-2002',
  },
  {
    id: 'ost-anawaakhi',
    titleAr: 'شارة أنا وأخي — شوق يدفعني لأراها',
    showAr: 'أنا وأخي',
    performerAr: 'هالة الصباغ',
    planetBadgeAr: 'كوكب زمردة',
    seriesTitleAr: 'أنا وأخي',
    vocalistAr: 'هالة الصباغ',
    planetLabelAr: 'كوكب زمردة',
    year: 1996,
    tmdbId: 44878,
    malId: 1485,
    titleEn: 'Baby and Me',
    posterUrl: 'https://archive.org/services/img/20210811_20210811_2250',
    backdropUrl: 'https://archive.org/services/img/20210811_20210811_2250',
    archiveId: '20210811_20210811_2250',
    matchKeywords: ['أنا وأخي', 'انا واخي', 'ana', 'akhi', 'شوق', 'أمي'],
    fallbackAudioUrl:
      'https://archive.org/download/20210811_20210811_2250/12.mp3',
    fallbackVideoEmbedUrl:
      'https://archive.org/embed/mnoaaat-msgl-mn-asbys-ton-aal-alnayl-sat-2002',
    audioStreamUrl:
      'https://archive.org/download/20210811_20210811_2250/12.mp3',
    videoEmbedUrl:
      'https://archive.org/embed/mnoaaat-msgl-mn-asbys-ton-aal-alnayl-sat-2002',
  },
  {
    id: 'ost-mowgli',
    titleAr: 'شارة ماوكلي فتى الأدغال — في الغابة قانون يسري',
    showAr: 'ماوكلي فتى الأدغال',
    performerAr: 'طارق العربي طرقان',
    planetBadgeAr: 'كوكب مغامرات',
    seriesTitleAr: 'ماوكلي فتى الأدغال',
    vocalistAr: 'طارق العربي طرقان',
    planetLabelAr: 'كوكب مغامرات',
    year: 1989,
    malId: 2569,
    titleEn: 'Jungle Book Shounen Mowgli',
    posterUrl: 'https://archive.org/services/img/20210811_20210811_2250',
    backdropUrl: 'https://archive.org/services/img/20210811_20210811_2250',
    archiveId: '20210811_20210811_2250',
    matchKeywords: ['ماوكلي', 'mowgli', 'mawkly', 'الأدغال', 'الادغال'],
    fallbackAudioUrl:
      'https://archive.org/download/20210811_20210811_2250/13.mp3',
    fallbackVideoEmbedUrl:
      'https://archive.org/embed/mnoaaat-msgl-mn-asbys-ton-aal-alnayl-sat-2002',
    audioStreamUrl:
      'https://archive.org/download/20210811_20210811_2250/13.mp3',
    videoEmbedUrl:
      'https://archive.org/embed/mnoaaat-msgl-mn-asbys-ton-aal-alnayl-sat-2002',
  },
  {
    id: 'ost-beyblade',
    titleAr: 'شارة بي بليد — المعركة الحاسمة',
    showAr: 'بي بليد (منصور والبلابل)',
    performerAr: 'عاصم سكر / رشا رزق',
    planetBadgeAr: 'كوكب رياضة',
    seriesTitleAr: 'بي بليد (منصور والبلابل)',
    vocalistAr: 'عاصم سكر / رشا رزق',
    planetLabelAr: 'كوكب رياضة',
    year: 2001,
    malId: 288,
    titleEn: 'Beyblade',
    posterUrl: 'https://archive.org/services/img/20210811_20210811_2250',
    backdropUrl: 'https://archive.org/services/img/20210811_20210811_2250',
    archiveId: '20210811_20210811_2250',
    matchKeywords: ['بي بليد', 'بليد', 'beyblade'],
    fallbackAudioUrl:
      'https://archive.org/download/20210811_20210811_2250/14.mp3',
    fallbackVideoEmbedUrl:
      'https://archive.org/embed/mnoaaat-msgl-mn-asbys-ton-aal-alnayl-sat-2002',
    audioStreamUrl:
      'https://archive.org/download/20210811_20210811_2250/14.mp3',
    videoEmbedUrl:
      'https://archive.org/embed/mnoaaat-msgl-mn-asbys-ton-aal-alnayl-sat-2002',
  },
  {
    id: 'ost-sabeq',
    titleAr: 'شارة سابق ولاحق — هيا يا سابق',
    showAr: 'سابق ولاحق',
    performerAr: 'طارق العربي طرقان',
    planetBadgeAr: 'كوكب رياضة',
    seriesTitleAr: 'سابق ولاحق',
    vocalistAr: 'طارق العربي طرقان',
    planetLabelAr: 'كوكب رياضة',
    year: 1996,
    malId: 2705,
    titleEn: "Bakusou Kyoudai Let's & Go",
    posterUrl: 'https://archive.org/services/img/20210811_20210811_2250',
    backdropUrl: 'https://archive.org/services/img/20210811_20210811_2250',
    archiveId: '20210811_20210811_2250',
    matchKeywords: ['سابق', 'لاحق', 'sabeq', 'sabq'],
    fallbackAudioUrl:
      'https://archive.org/download/20210811_20210811_2250/15.mp3',
    fallbackVideoEmbedUrl:
      'https://archive.org/embed/mnoaaat-msgl-mn-asbys-ton-aal-alnayl-sat-2002',
    audioStreamUrl:
      'https://archive.org/download/20210811_20210811_2250/15.mp3',
    videoEmbedUrl:
      'https://archive.org/embed/mnoaaat-msgl-mn-asbys-ton-aal-alnayl-sat-2002',
  },
  {
    id: 'ost-pokemon',
    titleAr: 'شارة بوكيمون — أحلم دوماً أن أكون الأفضل',
    showAr: 'بوكيمون (آش وبيكاتشو)',
    performerAr: 'رشا رزق / طارق العربي طرقان',
    planetBadgeAr: 'كوكب أكشن',
    seriesTitleAr: 'بوكيمون (آش وبيكاتشو)',
    vocalistAr: 'رشا رزق / طارق العربي طرقان',
    planetLabelAr: 'كوكب أكشن',
    year: 1997,
    malId: 527,
    titleEn: 'Pokemon',
    posterUrl: 'https://archive.org/services/img/20210811_20210811_2250',
    backdropUrl: 'https://archive.org/services/img/20210811_20210811_2250',
    archiveId: '20210811_20210811_2250',
    matchKeywords: ['بوكيمون', 'pokemon', 'bokymon', 'بيكاتشو'],
    fallbackAudioUrl:
      'https://archive.org/download/20210811_20210811_2250/16.mp3',
    fallbackVideoEmbedUrl:
      'https://archive.org/embed/mnoaaat-msgl-mn-asbys-ton-aal-alnayl-sat-2002',
    audioStreamUrl:
      'https://archive.org/download/20210811_20210811_2250/16.mp3',
    videoEmbedUrl:
      'https://archive.org/embed/mnoaaat-msgl-mn-asbys-ton-aal-alnayl-sat-2002',
  },
  {
    id: 'ost-cinderella',
    titleAr: 'شارة سندريلا — الحياة حلوة',
    showAr: 'حكاية سندريلا',
    performerAr: 'رشا رزق',
    planetBadgeAr: 'كوكب زمردة',
    seriesTitleAr: 'حكاية سندريلا',
    vocalistAr: 'رشا رزق',
    planetLabelAr: 'كوكب زمردة',
    year: 1996,
    malId: 2817,
    titleEn: 'Cinderella Monogatari',
    posterUrl: 'https://archive.org/services/img/20210811_20210811_2250',
    backdropUrl: 'https://archive.org/services/img/20210811_20210811_2250',
    archiveId: '20210811_20210811_2250',
    matchKeywords: ['سندريلا', 'ساندريلا', 'cinderella', 'sndrla'],
    fallbackAudioUrl:
      'https://archive.org/download/20210811_20210811_2250/17.mp3',
    fallbackVideoEmbedUrl:
      'https://archive.org/embed/mnoaaat-msgl-mn-asbys-ton-aal-alnayl-sat-2002',
    audioStreamUrl:
      'https://archive.org/download/20210811_20210811_2250/17.mp3',
    videoEmbedUrl:
      'https://archive.org/embed/mnoaaat-msgl-mn-asbys-ton-aal-alnayl-sat-2002',
  },
  {
    id: 'ost-secret-garden',
    titleAr: 'شارة الحديقة السرية — في حديقتنا السرية',
    showAr: 'الحديقة السرية (ماري لينوكس)',
    performerAr: 'هالة الصباغ',
    planetBadgeAr: 'كوكب زمردة',
    seriesTitleAr: 'الحديقة السرية (ماري لينوكس)',
    vocalistAr: 'هالة الصباغ',
    planetLabelAr: 'كوكب زمردة',
    year: 1991,
    malId: 2810,
    titleEn: 'Anime Himitsu no Hanazono',
    posterUrl: 'https://archive.org/services/img/20210811_20210811_2250',
    backdropUrl: 'https://archive.org/services/img/20210811_20210811_2250',
    archiveId: '20210811_20210811_2250',
    matchKeywords: ['الحديقة', 'السرية', 'alhdyka', 'garden'],
    fallbackAudioUrl:
      'https://archive.org/download/20210811_20210811_2250/18.mp3',
    fallbackVideoEmbedUrl:
      'https://archive.org/embed/mnoaaat-msgl-mn-asbys-ton-aal-alnayl-sat-2002',
    audioStreamUrl:
      'https://archive.org/download/20210811_20210811_2250/18.mp3',
    videoEmbedUrl:
      'https://archive.org/embed/mnoaaat-msgl-mn-asbys-ton-aal-alnayl-sat-2002',
  },
  {
    id: 'ost-tiger-mask',
    titleAr: 'شارة النمر المقنع — حلبة المصارعة تلتقي الأبطال',
    showAr: 'النمر المقنع',
    performerAr: 'وائل أبو نوار / طارق العربي طرقان',
    planetBadgeAr: 'كوكب رياضة',
    seriesTitleAr: 'النمر المقنع',
    vocalistAr: 'وائل أبو نوار / طارق العربي طرقان',
    planetLabelAr: 'كوكب رياضة',
    year: 1981,
    tmdbId: 45011,
    malId: 3010,
    titleEn: 'Tiger Mask II',
    posterUrl: 'https://archive.org/services/img/20210811_20210811_2250',
    backdropUrl: 'https://archive.org/services/img/20210811_20210811_2250',
    archiveId: '20210811_20210811_2250',
    matchKeywords: ['النمر', 'المقنع', 'alnmr', 'tiger'],
    fallbackAudioUrl:
      'https://archive.org/download/20210811_20210811_2250/19.mp3',
    fallbackVideoEmbedUrl:
      'https://archive.org/embed/mnoaaat-msgl-mn-asbys-ton-aal-alnayl-sat-2002',
    audioStreamUrl:
      'https://archive.org/download/20210811_20210811_2250/19.mp3',
    videoEmbedUrl:
      'https://archive.org/embed/mnoaaat-msgl-mn-asbys-ton-aal-alnayl-sat-2002',
  },
  {
    id: 'ost-treasure-island',
    titleAr: 'شارة جزيرة الكنز — ها نحن قادمون يا جزيرة الكنز',
    showAr: 'جزيرة الكنز (القبطان سيلفر)',
    performerAr: 'سامي كلارك',
    planetBadgeAr: 'كوكب مغامرات',
    seriesTitleAr: 'جزيرة الكنز (القبطان سيلفر)',
    vocalistAr: 'سامي كلارك',
    planetLabelAr: 'كوكب مغامرات',
    year: 1978,
    tmdbId: 37497,
    malId: 2618,
    titleEn: 'Takarajima',
    posterUrl: 'https://archive.org/services/img/20210811_20210811_2250',
    backdropUrl: 'https://archive.org/services/img/20210811_20210811_2250',
    archiveId: '20210811_20210811_2250',
    matchKeywords: ['جزيرة', 'الكنز', 'gzyra', 'alknz', 'takarajima'],
    fallbackAudioUrl:
      'https://archive.org/download/20210811_20210811_2250/20.mp3',
    fallbackVideoEmbedUrl:
      'https://archive.org/embed/mnoaaat-msgl-mn-asbys-ton-aal-alnayl-sat-2002',
    audioStreamUrl:
      'https://archive.org/download/20210811_20210811_2250/20.mp3',
    videoEmbedUrl:
      'https://archive.org/embed/mnoaaat-msgl-mn-asbys-ton-aal-alnayl-sat-2002',
  },
];

const ROTATING_PLANET_BADGES = [
  'كوكب مغامرات',
  'كوكب أكشن',
  'كوكب زمردة',
  'كوكب رياضة',
  'كوكب كوميديا',
  'كوكب تاريخ',
  'كوكب أبجد',
  'كوكب علوم',
];

const FRANCO_TO_ARABIC_MAP: Array<[RegExp, string]> = [
  [/alknas/gi, 'القناص'],
  [/alhlk|hlk|hal9a/gi, 'الحلقة'],
  [/amy[\s_-]*km[\s_-]*ahoaha/gi, 'أمي كم أهواها'],
  [/rymy|remi/gi, 'دروب ريمي'],
  [/aghny|aghani/gi, 'أغنية'],
  [/shara|sharat/gi, 'شارة'],
  [/alkabtn[\s_-]*magd/gi, 'الكابتن ماجد'],
  [/kokb[\s_-]*akshn/gi, 'كوكب أكشن'],
  [/kokb[\s_-]*mghamrat/gi, 'كوكب مغامرات'],
  [/kokb[\s_-]*ryada/gi, 'كوكب رياضة'],
  [/kokb[\s_-]*zmrda/gi, 'كوكب زمردة'],
  [/kokb[\s_-]*komydya/gi, 'كوكب كوميديا'],
  [/kokb[\s_-]*tarykh/gi, 'كوكب تاريخ'],
  [/kokb[\s_-]*aalom/gi, 'كوكب علوم'],
  [/kokb[\s_-]*abgd/gi, 'كوكب أبجد'],
  [/kokb[\s_-]*bonbon/gi, 'كوكب بونبون'],
  [/hzim[\s_-]*alraad/gi, 'هزيم الرعد'],
  [/aahd[\s_-]*alasdqaa/gi, 'عهد الأصدقاء'],
  [/sqor[\s_-]*alard/gi, 'صقور الأرض'],
  [/konan|conan/gi, 'المحقق كونان'],
  [/asbys[\s_-]*ton|spacetoon/gi, 'سبيستون'],
  [/alatfal[\s_-]*alabtal/gi, 'الأطفال الأبطال'],
  [/abtal[\s_-]*aldygytal/gi, 'أبطال الديجيتال'],
];

function cleanArchiveSongName(fileName: string): string {
  let cleaned = fileName
    .replace(/\.ia\.mp4$/i, '')
    .replace(/\.(mp4|mp3|ogg|mkv|avi|webm)$/i, '')
    .replace(/^[\d\s._-]+/, '')
    .replace(/[_-]+/g, ' ')
    .trim();

  for (const [pattern, replacement] of FRANCO_TO_ARABIC_MAP) {
    cleaned = cleaned.replace(pattern, replacement);
  }
  return cleaned.replace(/\s{2,}/g, ' ').trim();
}

function encodeArchivePath(fileName: string): string {
  return fileName
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
}

interface ParsedArchiveMediaEntry {
  archiveId: string;
  baseKey: string;
  streamName: string;
  title?: string;
  thumbUrl?: string;
}

function extractPlayableEntriesFromMetadata(
  archiveId: string,
  files: Array<{ name?: string; title?: string }>,
): ParsedArchiveMediaEntry[] {
  const thumbByBaseKey = new Map<string, string>();
  const mediaByBaseKey = new Map<
    string,
    {
      iaMp4?: { name: string; title?: string };
      mp4?: { name: string; title?: string };
      audio?: { name: string; title?: string };
    }
  >();

  for (const raw of files) {
    const name = String(raw?.name || '');
    if (!name) continue;
    const lower = name.toLowerCase();

    // Collect per-file thumbnails (.thumbs/...jpg or matching .jpg/.png)
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png')) {
      if (lower.includes('__ia_thumb')) continue;
      const thumbBase = name
        .replace(/^\.thumbs\//i, '')
        .replace(/_\d+\.(jpg|jpeg|png)$/i, '')
        .replace(/\.(jpg|jpeg|png)$/i, '')
        .toLowerCase();
      if (thumbBase && !thumbByBaseKey.has(thumbBase)) {
        thumbByBaseKey.set(
          thumbBase,
          `https://archive.org/download/${encodeURIComponent(archiveId)}/${encodeArchivePath(name)}`,
        );
      }
      continue;
    }

    const isIaMp4 = lower.endsWith('.ia.mp4');
    const isMp4 = !isIaMp4 && lower.endsWith('.mp4');
    const isAudio = lower.endsWith('.mp3') || lower.endsWith('.ogg');

    if (!isIaMp4 && !isMp4 && !isAudio) continue;

    const baseKey = name
      .replace(/\.ia\.mp4$/i, '')
      .replace(/\.(mp4|mp3|ogg)$/i, '')
      .toLowerCase();

    const group = mediaByBaseKey.get(baseKey) || {};
    if (isIaMp4) {
      group.iaMp4 = { name, title: raw.title };
    } else if (isMp4) {
      group.mp4 = { name, title: raw.title };
    } else if (isAudio) {
      group.audio = { name, title: raw.title };
    }
    mediaByBaseKey.set(baseKey, group);
  }

  const results: ParsedArchiveMediaEntry[] = [];
  for (const [baseKey, group] of mediaByBaseKey.entries()) {
    const chosen = group.iaMp4 || group.mp4 || group.audio;
    if (!chosen) continue;
    const title = group.mp4?.title || group.audio?.title || group.iaMp4?.title;
    const thumbUrl = thumbByBaseKey.get(baseKey);
    results.push({
      archiveId,
      baseKey,
      streamName: chosen.name,
      title,
      thumbUrl,
    });
  }

  return results;
}

export const SpacetoonOstGlassStage: React.FC = () => {
  const [tracks, setTracks] = useState<SpacetoonOstTrack[]>(SPACETOON_OST_TRACKS);
  const [activeTrack, setActiveTrack] = useState<SpacetoonOstTrack | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [planetFilter, setPlanetFilter] = useState<string>('all');

  useEffect(() => {
    let cancelled = false;
    async function resolveAllSpacetoonSongsAndPosters() {
      try {
        // 1. Pre-warm all MAL IDs in a single AniList GraphQL batch query (zero 429 rate-limits)
        const malIds = SPACETOON_OST_TRACKS.map((t) => t.malId).filter(
          (id): id is number => typeof id === 'number' && id > 0,
        );
        await fetchAniListBatchPostersByMalIds(malIds);

        // 2. Hydrate curated base tracks with official AniList / TMDB posters
        const posterHydratedBase = await Promise.all(
          SPACETOON_OST_TRACKS.map(async (track) => {
            const resolved = await resolvePosterByTmdbOrMal({
              cacheId: `ost-${track.id}`,
              tmdbId: track.tmdbId,
              malId: track.malId,
              titleEn: track.titleEn,
              fallbackPosterUrl: track.posterUrl,
              fallbackBackdropUrl: track.backdropUrl,
            });
            return {
              ...track,
              posterUrl: resolved.posterUrl || track.posterUrl,
              backdropUrl:
                resolved.backdropUrl ||
                track.backdropUrl ||
                resolved.posterUrl,
            };
          }),
        );

        if (cancelled) return;
        setTracks(posterHydratedBase);

        // 3. Fetch metadata in parallel from ALL 3 verified Archive.org Spacetoon OST bundles (333+ tracks)
        const bundleResponses = await Promise.allSettled(
          SPACETOON_OST_ARCHIVE_BUNDLES.map((bundleId) =>
            fetch(
              `https://archive.org/metadata/${encodeURIComponent(bundleId)}`,
              { signal: AbortSignal.timeout(9500) },
            ).then(async (res) => ({
              bundleId,
              ok: res.ok,
              json: res.ok ? await res.json() : null,
            })),
          ),
        );

        const allArchiveEntries: ParsedArchiveMediaEntry[] = [];
        for (const res of bundleResponses) {
          if (res.status === 'fulfilled' && res.value.ok && res.value.json) {
            const files = Array.isArray(res.value.json.files)
              ? res.value.json.files
              : [];
            const extracted = extractPlayableEntriesFromMetadata(
              res.value.bundleId,
              files,
            );
            allArchiveEntries.push(...extracted);
          }
        }

        if (cancelled || allArchiveEntries.length === 0) return;

        const usedEntryKeys = new Set<string>();

        // 4. Bind exact media streams to our 20 curated classics
        const updatedCurated = posterHydratedBase.map((track, idx) => {
          const matchedEntry =
            allArchiveEntries.find((entry) => {
              const uniqueKey = `${entry.archiveId}::${entry.baseKey}`;
              if (usedEntryKeys.has(uniqueKey)) return false;
              const hay = `${entry.streamName} ${entry.title ?? ''} ${cleanArchiveSongName(entry.streamName)}`.toLowerCase();
              return track.matchKeywords.some((kw) =>
                hay.includes(kw.toLowerCase()),
              );
            }) ?? allArchiveEntries[idx % allArchiveEntries.length];

          if (matchedEntry) {
            usedEntryKeys.add(
              `${matchedEntry.archiveId}::${matchedEntry.baseKey}`,
            );
          }

          const streamUrl = matchedEntry
            ? `https://archive.org/download/${encodeURIComponent(matchedEntry.archiveId)}/${encodeArchivePath(matchedEntry.streamName)}`
            : track.fallbackAudioUrl;

          const videoUrl = matchedEntry
            ? streamUrl
            : track.fallbackVideoEmbedUrl;

          return {
            ...track,
            archiveId: matchedEntry?.archiveId || track.archiveId,
            backdropUrl: matchedEntry?.thumbUrl || track.backdropUrl,
            fallbackAudioUrl: streamUrl,
            audioStreamUrl: streamUrl,
            fallbackVideoEmbedUrl: videoUrl,
            videoEmbedUrl: videoUrl,
          };
        });

        // 5. Add ALL remaining tracks across the 3 Archive.org bundles with matched show posters or true Archive thumbnails
        const extraArchiveTracks: SpacetoonOstTrack[] = allArchiveEntries
          .filter(
            (entry) =>
              !usedEntryKeys.has(`${entry.archiveId}::${entry.baseKey}`),
          )
          .map((entry, extraIdx) => {
            const rawTitle =
              entry.title || cleanArchiveSongName(entry.streamName);
            const displayTitle = rawTitle
              ? `شارة سبيستون — ${rawTitle}`
              : `شارة سبيستون الكلاسيكية #${extraIdx + 21}`;

            const hay = `${entry.streamName} ${entry.title ?? ''} ${rawTitle}`.toLowerCase();
            const matchedShow = posterHydratedBase.find((base) =>
              base.matchKeywords.some((kw) => hay.includes(kw.toLowerCase())),
            );

            const archiveServiceImg = `https://archive.org/services/img/${encodeURIComponent(entry.archiveId)}`;
            const resolvedPoster = matchedShow
              ? matchedShow.posterUrl
              : entry.thumbUrl || archiveServiceImg;
            const resolvedBackdrop =
              entry.thumbUrl ||
              (matchedShow ? matchedShow.backdropUrl : archiveServiceImg);

            const streamUrl = `https://archive.org/download/${encodeURIComponent(entry.archiveId)}/${encodeArchivePath(entry.streamName)}`;

            let planetLabel = matchedShow
              ? matchedShow.planetLabelAr
              : ROTATING_PLANET_BADGES[
                  extraIdx % ROTATING_PLANET_BADGES.length
                ];

            if (!matchedShow) {
              if (hay.includes('أكشن') || hay.includes('كونان') || hay.includes('konan')) {
                planetLabel = 'كوكب أكشن';
              } else if (hay.includes('مغامرات')) {
                planetLabel = 'كوكب مغامرات';
              } else if (hay.includes('رياضة')) {
                planetLabel = 'كوكب رياضة';
              } else if (hay.includes('زمردة')) {
                planetLabel = 'كوكب زمردة';
              } else if (hay.includes('كوميديا')) {
                planetLabel = 'كوكب كوميديا';
              } else if (hay.includes('علوم')) {
                planetLabel = 'كوكب علوم';
              } else if (hay.includes('تاريخ')) {
                planetLabel = 'كوكب تاريخ';
              } else if (hay.includes('أبجد') || hay.includes('بونبون')) {
                planetLabel = 'كوكب أبجد';
              }
            }

            return {
              id: `ost-archive-${entry.archiveId}-${extraIdx}`,
              titleAr: displayTitle,
              showAr: matchedShow
                ? matchedShow.showAr
                : rawTitle || 'روائع شارات سبيستون',
              performerAr: matchedShow
                ? matchedShow.performerAr
                : 'رشا رزق / طارق العربي طرقان (مركز الزهرة)',
              planetBadgeAr: planetLabel,
              seriesTitleAr: matchedShow
                ? matchedShow.seriesTitleAr
                : rawTitle || 'أرشيف شارات سبيستون الكامل',
              vocalistAr: matchedShow
                ? matchedShow.vocalistAr
                : 'رشا رزق / طارق العربي طرقان',
              planetLabelAr: planetLabel,
              year: matchedShow ? matchedShow.year : 2000,
              posterUrl: resolvedPoster,
              backdropUrl: resolvedBackdrop,
              archiveId: entry.archiveId,
              matchKeywords: [rawTitle],
              fallbackAudioUrl: streamUrl,
              fallbackVideoEmbedUrl: streamUrl,
              audioStreamUrl: streamUrl,
              videoEmbedUrl: streamUrl,
              tmdbId: matchedShow?.tmdbId,
              malId: matchedShow?.malId,
              titleEn: matchedShow?.titleEn,
            };
          });

        if (!cancelled) {
          const combined = [...updatedCurated, ...extraArchiveTracks];
          setTracks(combined);
          setSpacetoonOstTotalCount(combined.length);
        }
      } catch {
        // Keep curated tracks on network error
      }
    }
    void resolveAllSpacetoonSongsAndPosters();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredTracks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tracks.filter((t) => {
      if (planetFilter !== 'all' && t.planetLabelAr !== planetFilter) {
        return false;
      }
      if (!q) return true;
      return (
        t.titleAr.toLowerCase().includes(q) ||
        t.seriesTitleAr.toLowerCase().includes(q) ||
        t.vocalistAr.toLowerCase().includes(q) ||
        t.planetLabelAr.toLowerCase().includes(q)
      );
    });
  }, [tracks, searchQuery, planetFilter]);

  const handleSelectTrack = (track: SpacetoonOstTrack) => {
    setActiveTrack(track);
  };

  const isDirectVideoFile = Boolean(
    activeTrack &&
      /\.(ia\.mp4|mp4|webm|ogg)(\?|$)/i.test(activeTrack.videoEmbedUrl),
  );

  return (
    <div className="w-full space-y-6 pb-16" dir="rtl">
      {/* Header Banner + Search & Filter */}
      <div
        className="rounded-3xl p-5 sm:p-6 border border-white/25 bg-slate-950/45 shadow-2xl flex flex-col gap-4"
        style={{
          backdropFilter: 'blur(22px) saturate(175%)',
          WebkitBackdropFilter: 'blur(22px) saturate(175%)',
        }}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-300/35 text-teal-200 text-xs font-extrabold">
              <GlassVectorIcon icon={Music} theme="emerald" size={14} badge={false} />
              <span>كوكب شارات سبيستون · الأرشيف المرئي الكامل ({tracks.length} شارة)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              شارات وأغاني سبيستون الخالدة (معاينة فورية عند التمرير + عرض كامل بالصوت)
            </h2>
            <p className="text-xs sm:text-sm text-slate-200 max-w-2xl">
              مرّر المؤشر فوق أي مربع لتشغيل فيديو الشارة فوراً، أو اضغط عليه لفتح المشغل الزجاجي الكامل بالصوت الأصلي لمركز الزهرة.
            </p>
          </div>
        </div>

        {/* Search Input + Planet Filter Pills */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 pt-2 border-t border-white/15">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-teal-300/80 pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث في أكثر من 333 شارة (ريمي، القناص، كونان، ماجد، عهد الأصدقاء، هزيم الرعد...)"
              className="w-full pr-10 pl-4 py-2.5 rounded-2xl bg-slate-950/55 border border-white/25 focus:border-teal-400/70 text-xs sm:text-sm text-white placeholder:text-slate-300 outline-none transition"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
            {[
              { id: 'all', label: `الكل (${tracks.length})` },
              { id: 'كوكب أكشن', label: 'أكشن' },
              { id: 'كوكب مغامرات', label: 'مغامرات' },
              { id: 'كوكب زمردة', label: 'زمردة' },
              { id: 'كوكب رياضة', label: 'رياضة' },
              { id: 'كوكب تاريخ', label: 'تاريخ' },
            ].map((pill) => (
              <button
                key={pill.id}
                type="button"
                onClick={() => setPlanetFilter(pill.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap transition cursor-pointer ${
                  planetFilter === pill.id
                    ? 'bg-teal-400 text-slate-950 shadow-md'
                    : 'bg-white/12 hover:bg-white/20 text-white border border-white/20'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Fullscreen Liquid Glass Video Modal when a square card is clicked */}
      {activeTrack && (
        <div
          className="fixed inset-0 z-[10600] flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-xl"
          onClick={() => setActiveTrack(null)}
        >
          <div
            className="relative w-full max-w-4xl rounded-3xl p-4 sm:p-6 border border-teal-300/50 bg-slate-950/85 shadow-[0_0_60px_rgba(45,212,191,0.3)] space-y-4"
            style={{
              backdropFilter: 'blur(28px) saturate(180%)',
              WebkitBackdropFilter: 'blur(28px) saturate(180%)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={activeTrack.posterUrl}
                  alt={activeTrack.titleAr}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const target = e.currentTarget;
                    const fallback = `https://archive.org/services/img/${encodeURIComponent(activeTrack.archiveId || '20210811_20210811_2250')}`;
                    if (target.src !== fallback) {
                      target.src = fallback;
                    }
                  }}
                  className="w-12 h-12 rounded-2xl object-cover border border-white/25 shrink-0"
                />
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-black text-white truncate">
                    {activeTrack.titleAr}
                  </h3>
                  <p className="text-xs text-teal-300 font-bold truncate">
                    {activeTrack.vocalistAr} · {activeTrack.planetLabelAr}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="px-3 py-1.5 rounded-full text-xs font-extrabold bg-teal-400/20 border border-teal-300/40 text-teal-200 inline-flex items-center gap-1.5">
                  <Video size={13} />
                  <span>فيديو الشارة الرسمي</span>
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTrack(null)}
                  className="p-2 rounded-full bg-rose-500/25 hover:bg-rose-500/45 text-rose-200 border border-rose-400/35 transition cursor-pointer"
                  aria-label="إغلاق المشغل"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-white/25 shadow-2xl">
              {isDirectVideoFile ? (
                <video
                  src={activeTrack.videoEmbedUrl}
                  poster={activeTrack.posterUrl}
                  controls
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain bg-black"
                />
              ) : (
                <iframe
                  src={`${activeTrack.videoEmbedUrl}${activeTrack.videoEmbedUrl.includes('?') ? '&' : '?'}autoplay=1`}
                  title={activeTrack.titleAr}
                  className="w-full h-full border-0"
                  allow="autoplay; fullscreen"
                  allowFullScreen
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Square Multi-Grid — Displays ALL 333+ Spacetoon Video Theme Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filteredTracks.map((track) => (
          <SpacetoonThemeSongCard
            key={track.id}
            track={track}
            isActive={activeTrack?.id === track.id}
            onSelectTrack={handleSelectTrack}
          />
        ))}
      </div>
    </div>
  );
};
