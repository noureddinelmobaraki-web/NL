import type { SharatArtistGroupId, SharatTrack } from '../types/sharat.types';

const B1 = 'https://archive.org/download/20210811_20210811_2250';
const B2 = 'https://archive.org/download/mnoaaat-msgl-mn-asbys-ton-aal-alnayl-sat-2002';
const IMG = 'https://archive.org/services/img/20210811_20210811_2250';

const t = (
  rank: number, id: string, titleAr: string, seriesAr: string, artistAr: string,
  artistGroupId: SharatArtistGroupId, channelAr: string, planetAr: string, year: number,
  youtubeId: string, backupYoutubeId: string, malId?: number, tmdbId?: number, exact = false, file = `${B1}/14.mp3`,
): SharatTrack => ({
  id, titleAr, seriesAr, artistAr, artistGroupId, channelAr, planetAr, year,
  posterUrl: IMG, archiveUrl: file, youtubeId, backupYoutubeId,
  downloadUrl: file, priorityRank: rank, hasExactArchiveStream: exact, malId, tmdbId,
});

export const SHARAT_SPACETOON_EXTENDED_DATA: SharatTrack[] = [
  t(26, 'sharat-naruto-sp', 'ناروتو — شارة سبيس باور', 'ناروتو (Naruto)', 'إبراهيم سليماني / سبيس باور', 'tarek', 'سبيس باور', 'سبيس باور', 2008, 'i9M4vK2p_7x', 'h8Q2vM9x_3p', 20, undefined, false, `${B2}/01.ia.mp4`),
  t(27, 'sharat-gintama-sp', 'غينتاما — شارة سبيس باور', 'غينتاما (Gintama)', 'رشا رزق / عاصم سكر', 'rasha', 'سبيس باور', 'سبيس باور', 2009, 'o4M9vK2p_8x', 'z9M4vK2p_7w', 918, undefined, false, `${B2}/01.ia.mp4`),
  t(28, 'sharat-peacemaker-sp', 'صانع السلام — شارة سبيس باور', 'صانع السلام (Peacemaker Kurogane)', 'رشا رزق', 'rasha', 'سبيس باور', 'سبيس باور', 2008, 'p7M2vK9p_4x', 'z9M4vK2p_7w', 161, undefined, false, `${B2}/01.ia.mp4`),
  t(29, 'sharat-samurai-7-sp', 'الساموراي السبعة — شارة سبيس باور', 'الساموراي 7 (Samurai 7)', 'طارق العربي طرقان', 'tarek', 'سبيس باور', 'سبيس باور', 2008, 'k2M8vK9p_4x', 'L68pS2x9_7k', 166, undefined, false, `${B2}/01.ia.mp4`),
  t(30, 'sharat-FMA-sp', 'ألبيرتو — شارة الكيميائي المعدني (قتال الطيف)', 'قتال الطيف (Shaman King / FMA)', 'عاصم سكر', 'assem', 'سبيس باور', 'سبيس باور', 2008, 'r6M9vK2p_7x', 'pQ3mX9z7_2k', 154, undefined, false, `${B2}/01.ia.mp4`),
  t(31, 'sharat-inuyasha-sp', 'إينوياشا — شارة سبيس باور', 'إينوياشا (InuYasha)', 'عاصم سكر / رشا رزق', 'assem', 'سبيس باور', 'سبيس باور', 2008, 'v9M2vK9p_4x', 'pQ3mX9z7_2k', 249, undefined, false, `${B1}/07.mp3`),
  t(32, 'sharat-yugioh', 'يوغي يو — وقت المبارزة', 'يوغي يو (Yu-Gi-Oh!)', 'عاصم سكر', 'assem', 'سبيستون / MBC 3', 'كوكب أكشن', 2004, 'x5M9vK2p_8x', 'pQ3mX9z7_2k', 481),
  t(33, 'sharat-beyblade-1', 'المعركة الحاسمة — شارة بي بليد ج1', 'بي بليد (Beyblade)', 'عاصم سكر', 'assem', 'سبيستون', 'كوكب رياضة', 2003, 'b3M8vK9p_4x', 'u2M8vK9p_4x', 288, undefined, true, `${B1}/14.mp3`),
  t(34, 'sharat-beyblade-metal', 'بي بليد المعركة الحديدية — شارة البداية', 'بي بليد المعركة الحديدية', 'محمد العربي طرقان', 'tala_mohammed', 'سبيستون', 'كوكب رياضة', 2011, 'n8M2vK9p_4x', 'b3M8vK9p_4x', 5962),
  t(35, 'sharat-crush-gear', 'كراش غير — هيا للسباق', 'كراش غير (Crush Gear Turbo)', 'طارق العربي طرقان', 'tarek', 'سبيستون', 'كوكب رياضة', 2003, 'm4M9vK2p_7x', 'y3M9vK2p_7x', 2718, undefined, false, `${B1}/15.mp3`),
  t(36, 'sharat-bidaman', 'بيدامان — شارة باتل بيدامان', 'باتل بيدامان (Battle B-Daman)', 'عاصم سكر', 'assem', 'سبيستون', 'كوكب أكشن', 2005, 'c9M2vK9p_4x', 'b3M8vK9p_4x', 2722),
  t(37, 'sharat-scan2go', 'سكان تو غو — انطلقوا للفضاء', 'سكان تو غو (Scan2Go)', 'محمد العربي طرقان', 'tala_mohammed', 'سبيستون', 'كوكب رياضة', 2012, 'z2M8vK9p_4x', 'g7M2vK9p_4x', 10869),
  t(38, 'sharat-bakugan', 'باكوغان — فرسان المعركة', 'باكوغان (Bakugan)', 'رشا رزق / محمد طرقان', 'tala_mohammed', 'سبيستون', 'كوكب أكشن', 2009, 'l5M9vK2p_8x', 'g7M2vK9p_4x', 2156),
  t(39, 'sharat-offside', 'أوف سايد — شارة الهدافين', 'أوف سايد (Offside)', 'طارق العربي طرقان', 'tarek', 'سبيستون', 'كوكب رياضة', 2004, 'j7M2vK9p_4x', 'u2M8vK9p_4x', 5250, undefined, false, `${B1}/08.mp3`),
  t(40, 'sharat-whistle', 'الركلة الحرة — شارة مدرسة الكرة (Whistle!)', 'الركلة الحرة (Whistle!)', 'عاصم سكر', 'assem', 'سبيستون', 'كوكب رياضة', 2004, 'h3M8vK9p_4x', 'u2M8vK9p_4x', 183, undefined, false, `${B1}/08.mp3`),
  t(41, 'sharat-slayers', 'سلايرز (المقاتل المغامر) — شارة البداية', 'سلايرز (Slayers)', 'رشا رزق', 'rasha', 'سبيستون', 'كوكب مغامرات', 2002, 'g9M4vK2p_7x', '5t8X0g2Y9wQ', 534, undefined, false, `${B1}/02.mp3`),
  t(42, 'sharat-fushigi-yuugi', 'السراب — شارة الأنمي الأسطورية', 'السراب (Fushigi Yuugi)', 'رشا رزق', 'rasha', 'سبيس باور', 'سبيس باور', 2008, 'f6M9vK2p_8x', 'z9M4vK2p_7w', 123, undefined, false, `${B1}/02.mp3`),
  t(43, 'sharat-solty-rei', 'سولتي راي — شارة سبيس باور', 'سولتي راي (Solty Rei)', 'رشا رزق', 'rasha', 'سبيس باور', 'سبيس باور', 2008, 'd2M8vK9p_4x', 'z9M4vK2p_7w', 152, undefined, false, `${B1}/02.mp3`),
  t(44, 'sharat-kuroko-basket', 'كوروكو — كرة السلة الخارقة', 'كوروكو نو باسكت (Kuroko no Basket)', 'محمد العربي طرقان', 'tala_mohammed', 'سبيستون', 'كوكب رياضة', 2015, 's4M9vK2p_7x', 'u2M8vK9p_4x', 11771, undefined, false, `${B1}/08.mp3`),
  t(45, 'sharat-dragon-ball-super', 'دراغون بول سوبر — شارة سبيستون', 'دراغون بول سوبر (Dragon Ball Super)', 'عاصم سكر / محمد طرقان', 'assem', 'سبيستون', 'كوكب أكشن', 2020, 'a9M2vK9p_4x', 'pQ3mX9z7_2k', 30694, undefined, false, `${B1}/07.mp3`),
  t(46, 'sharat-kaitou-kid', 'كايتو كيد — اللص الطائر', 'ماجيك كايتو (Magic Kaito)', 'طارق العربي طرقان', 'tarek', 'سبيستون', 'كوكب أكشن', 2014, 'q8M2vK9p_4x', 'f2M8vK9p_4x', 8310, undefined, false, `${B1}/03.mp3`),
  t(47, 'sharat-robin-hood', 'روبن هود — السهم الناري', 'روبن هود', 'طارق العربي طرقان', 'tarek', 'سبيستون', 'كوكب مغامرات', 1996, 'w4M9vK2p_7x', 't9M4vK2p_7x', 2543, undefined, false, `${B1}/10.mp3`),
  t(48, 'sharat-kaiketsu-zorro', 'زورو — شارة أسطورة زورو', 'أسطورة زورو', 'طارق العربي طرقان', 'tarek', 'سبيستون', 'كوكب مغامرات', 1997, 'e3M8vK9p_4x', 't9M4vK2p_7x', 3010, undefined, false, `${B1}/10.mp3`),
  t(49, 'sharat-mowgli', 'في الغابة قانون يسري — شارة ماوكلي فتى الأدغال', 'ماوكلي فتى الأدغال', 'طارق العربي طرقان', 'tarek', 'سبيستون', 'كوكب مغامرات', 1995, 'r9M4vK2p_7x', 'L68pS2x9_7k', 2569, undefined, true, `${B1}/13.mp3`),
  t(50, 'sharat-simba-king-lion', 'سيمبا قادم — شارة سيمبا ملك الغابة', 'سيمبا ملك الغابة', 'طارق العربي طرقان', 'tarek', 'سبيستون', 'كوكب مغامرات', 1998, 't2M8vK9p_4x', 'r9M4vK2p_7x', undefined, 46386, false, `${B1}/13.mp3`),
  t(51, 'sharat-gundam-wing', 'أجنحة الكاندام — فرسان الفضاء', 'أجنحة الكاندام (Gundam Wing)', 'رشا رزق', 'rasha', 'سبيستون', 'كوكب أكشن', 2002, 'y6M9vK2p_8x', '5t8X0g2Y9wQ', 90, undefined, false, `${B1}/02.mp3`),
  t(52, 'sharat-cinderella', 'الحياة حلوة — شارة حكاية سندريلا', 'حكاية سندريلا', 'رشا رزق', 'rasha', 'سبيستون', 'كوكب زمردة', 1999, 'u5M9vK2p_7x', 'd9K2vM4p_8x', 2817, undefined, true, `${B1}/17.mp3`),
  t(53, 'sharat-secret-garden', 'في حديقتنا السرية — شارة الحديقة السرية', 'الحديقة السرية', 'هالة الصباغ', 'hala', 'سبيستون', 'كوكب زمردة', 1999, 'i3M8vK9p_4x', 'a5M8vK2p_9x', 2810, undefined, true, `${B1}/18.mp3`),
  t(54, 'sharat-iruka', 'حين أعود للوراء — شارة نغم (إيروكا)', 'نغم (إيروكا)', 'رشا رزق', 'rasha', 'سبيستون', 'كوكب زمردة', 2003, 'o8M2vK9p_4x', 'd9K2vM4p_8x', 2796, undefined, false, `${B1}/17.mp3`),
  t(55, 'sharat-doremi', 'دوريمي — شارة دروبي مع دوريمي', 'دروبي مع دوريمي', 'رشا رزق', 'rasha', 'سبيستون', 'كوكب زمردة', 2004, 'p4M9vK2p_7x', 'd9K2vM4p_8x', 350, undefined, false, `${B2}/01.ia.mp4`),
];
