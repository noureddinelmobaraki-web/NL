import type { SharatArtistGroupId, SharatTrack } from '../types/sharat.types';

const B1 = 'https://archive.org/download/20210811_20210811_2250';
const IMG = 'https://archive.org/services/img/20210811_20210811_2250';

const g = (
  rank: number, id: string, titleAr: string, seriesAr: string, artistAr: string,
  artistGroupId: SharatArtistGroupId, channelAr: string, planetAr: string, year: number,
  youtubeId: string, backupYoutubeId: string, malId?: number, tmdbId?: number, exact = false, file = `${B1}/20.mp3`,
): SharatTrack => ({
  id, titleAr, seriesAr, artistAr, artistGroupId, channelAr, planetAr, year,
  posterUrl: IMG, archiveUrl: file, youtubeId, backupYoutubeId,
  downloadUrl: file, priorityRank: rank, hasExactArchiveStream: exact, malId, tmdbId,
});

export const SHARAT_GOLDEN_ERA_DATA: SharatTrack[] = [
  g(56, 'sharat-grendizer', 'عليّ عليّ بطل فليد — شارة غريندايزر', 'مغامرات الفضاء غريندايزر', 'سامي كلارك', 'sammy', 'الزمن الجميل', 'كوكب أكشن', 1979, 'a2M8vK9p_4x', 'L68pS2x9_7k', 1985, undefined, true, `${B1}/11.mp3`),
  g(57, 'sharat-treasure-island', 'ها نحن قادمون — شارة جزيرة الكنز (سيلفر)', 'جزيرة الكنز', 'سامي كلارك', 'sammy', 'الزمن الجميل', 'كوكب مغامرات', 1982, 's7M2vK9p_4x', 'a2M8vK9p_4x', 2618, undefined, true, `${B1}/20.mp3`),
  g(58, 'sharat-adnan-wa-lina', 'عدنان ولينا — جمعهم أماني جميلة', 'عدنان ولينا', 'سمير قصيباتي / فلاح هاشم', 'samir', 'الزمن الجميل', 'كوكب مغامرات', 1981, 'd4M9vK2p_7x', 's7M2vK9p_4x', 302),
  g(59, 'sharat-captain-majed-1', 'عاد إليكم من جديد — شارة الكابتن ماجد ج1', 'الكابتن ماجد', 'بسام الحسوني', 'bessam', 'سبيستون / الزمن الجميل', 'كوكب رياضة', 1991, 'f8M2vK9p_4x', 'm7K2vP9x_4w', 2116, undefined, true, `${B1}/04.mp3`),
  g(60, 'sharat-captain-majed-3', 'الشبح — شارة الكابتن ماجد الجزء الثالث', 'الكابتن ماجد ج3', 'طارق العربي طرقان', 'tarek', 'سبيستون', 'كوكب رياضة', 1998, 'g3M9vK2p_7x', 'f8M2vK9p_4x', 2116, undefined, false, `${B1}/04.mp3`),
  g(61, 'sharat-captain-rabeh', 'الكابتن رابح — شارة البداية', 'الكابتن رابح', 'طارق العربي طرقان', 'tarek', 'سبيستون', 'كوكب رياضة', 1997, 'h6M2vK9p_4x', 'f8M2vK9p_4x', 2678, undefined, false, `${B1}/08.mp3`),
  g(62, 'sharat-tiger-mask', 'النمر المقنع — حلبة المصارعة تلتقي الأبطال', 'النمر المقنع', 'مهند بيطار / طارق العربي طرقان', 'zaman_jamil', 'الزمن الجميل', 'كوكب رياضة', 1982, 'j9M4vK2p_7x', 'a2M8vK9p_4x', 3009, undefined, true, `${B1}/19.mp3`),
  g(63, 'sharat-sasuke', 'ساسوكي — شارة المغامر ساسوكي', 'المغامر ساسوكي (Manga Sarutobi Sasuke)', 'الزمن الجميل (الأردن)', 'zaman_jamil', 'الزمن الجميل', 'كوكب أكشن', 1982, 'k5M9vK2p_8x', 's7M2vK9p_4x', 3893),
  g(64, 'sharat-kabamaru', 'نينجا المغامر كابامارو — شارة البداية', 'نينجا كابامارو (Igano Kabamaru)', 'الزمن الجميل (لبنان)', 'zaman_jamil', 'الزمن الجميل', 'كوكب كوميديا', 1984, 'l2M8vK9p_4x', 's7M2vK9p_4x', 2762),
  g(65, 'sharat-mazinger-z', 'مازنجر زد — شارة الآلي الجبار', 'مازنجر زد (Mazinger Z)', 'الزمن الجميل', 'zaman_jamil', 'الزمن الجميل', 'كوكب أكشن', 1980, 'z7M2vK9p_4x', 'a2M8vK9p_4x', 2253, undefined, false, `${B1}/11.mp3`),
  g(66, 'sharat-astroganger', 'جونكر — البطل الجبار', 'جونكر (Astroganger)', 'سامي كلارك / الزمن الجميل', 'sammy', 'الزمن الجميل', 'كوكب أكشن', 1981, 'x4M9vK2p_7x', 'a2M8vK9p_4x', 3891, undefined, false, `${B1}/11.mp3`),
  g(67, 'sharat-sanshiro-jumaru', 'سانشيرو — البطل المغوار (جومارو)', 'سانشيرو (Plawres Sanshiro)', 'الزمن الجميل', 'zaman_jamil', 'الزمن الجميل', 'كوكب أكشن', 1985, 'c8M2vK9p_4x', 'a2M8vK9p_4x', 1873, undefined, false, `${B1}/11.mp3`),
  g(68, 'sharat-voltron', 'فولترون — المدافع عن الكون', 'فولترون (Voltron)', 'الزمن الجميل', 'zaman_jamil', 'الزمن الجميل', 'كوكب أكشن', 1986, 'v3M9vK2p_7x', 'a2M8vK9p_4x', 1448, undefined, false, `${B1}/11.mp3`),
  g(69, 'sharat-raideen', 'نسر الفضاء — شارة البداية', 'نسر الفضاء (Brave Raideen)', 'الزمن الجميل', 'zaman_jamil', 'الزمن الجميل', 'كوكب أكشن', 1983, 'b6M2vK9p_4x', 'a2M8vK9p_4x', 2128, undefined, false, `${B1}/11.mp3`),
  g(70, 'sharat-iron-man-1981', 'الرجل الحديدي — كمال ولميس', 'الرجل الحديدي (Dinosaur War Izenborg)', 'الزمن الجميل (الكويت)', 'zaman_jamil', 'الزمن الجميل', 'كوكب أكشن', 1981, 'n9M4vK2p_7x', 'a2M8vK9p_4x', 4076, undefined, true, 'https://archive.org/download/Eizenborg-Arabic-1981-dub/01.ia.mp4'),
  g(71, 'sharat-thunder-jet', 'فرسان الفضاء — مقاتلو المجرة', 'فرسان الفضاء (Thunder Jet)', 'طارق العربي طرقان', 'tarek', 'سبيستون', 'كوكب أكشن', 1999, 'm2M8vK9p_4x', 'L68pS2x9_7k', 2026, undefined, false, `${B1}/09.mp3`),
  g(72, 'sharat-sally', 'أنا قصة إنسان — شارة سالي الأصلية', 'سالي (Princess Sarah)', 'سهير عودة / هالة الصباغ', 'hala', 'الزمن الجميل / سبيستون', 'كوكب زمردة', 1989, 'q5M9vK2p_8x', 'a5M8vK2p_9x', 2547, undefined, false, `${B1}/18.mp3`),
  g(73, 'sharat-lady-lynn', 'ليدي ليدي — ما أجمل أن نكون معاً', 'ليدي ليدي (Lady!!)', 'سونيا بيطار', 'sonia', 'الزمن الجميل / سبيستون', 'كوكب زمردة', 1990, 'w8M2vK9p_4x', 'q5M9vK2p_8x', 2383, undefined, false, `${B1}/18.mp3`),
  g(74, 'sharat-lady-oscar', 'ليدي أوسكار — زهرة فيرساي', 'ليدي أوسكار (The Rose of Versailles)', 'عايدة أبو نوار', 'aida', 'الزمن الجميل', 'كوكب تاريخ', 1984, 'e4M9vK2p_7x', 'q5M9vK2p_8x', 338, undefined, false, `${B1}/17.mp3`),
  g(75, 'sharat-georgie', 'جورجي — الفتاة الشقراء', 'جورجي (Lady Georgie)', 'الزمن الجميل', 'zaman_jamil', 'الزمن الجميل', 'كوكب زمردة', 1985, 'r7M2vK9p_4x', 'q5M9vK2p_8x', 2542, undefined, false, `${B1}/18.mp3`),
  g(76, 'sharat-sandybell', 'ساندي بل — أنا اسمي ساندي بل', 'ساندي بل (Hello! Sandybell)', 'الزمن الجميل', 'zaman_jamil', 'الزمن الجميل', 'كوكب زمردة', 1984, 't3M9vK2p_7x', 'q5M9vK2p_8x', 2799, undefined, false, `${B1}/18.mp3`),
  g(77, 'sharat-flone', 'فلونة — شارة عائلة روبنسون السويسرية', 'فلونة', 'سونيا بيطار', 'sonia', 'الزمن الجميل / سبيستون', 'كوكب زمردة', 1985, 'y9M4vK2p_7x', 'q5M9vK2p_8x', 2544, undefined, false, `${B1}/18.mp3`),
  g(78, 'sharat-heidi', 'هايدي — فتاة الجبال', 'هايدي (Heidi)', 'الزمن الجميل', 'zaman_jamil', 'الزمن الجميل', 'كوكب زمردة', 1980, 'u4M9vK2p_7x', 'q5M9vK2p_8x', 2225, undefined, false, `${B1}/18.mp3`),
  g(79, 'sharat-belle-sebastian', 'بيل وسبستيان — الصداقة الوفية', 'بيل وسبستيان (Belle and Sebastian)', 'عايدة أبو نوار', 'aida', 'الزمن الجميل', 'كوكب مغامرات', 1983, 'i6M2vK9p_4x', 's7M2vK9p_4x', 3836),
  g(80, 'sharat-sinbad', 'مغامرات سندباد — علي بابا وياسمينة', 'مغامرات سندباد (Arabian Nights Sinbad)', 'الزمن الجميل', 'zaman_jamil', 'الزمن الجميل', 'كوكب مغامرات', 1979, 'o2M8vK9p_4x', 's7M2vK9p_4x', 2825),
  g(81, 'sharat-calimero', 'كاليميرو — الكتكوت الأسود الصغير', 'كاليميرو (Calimero)', 'عايدة أبو نوار', 'aida', 'الزمن الجميل', 'كوكب كوميديا', 1983, 'p9M4vK2p_7x', 's7M2vK9p_4x', 2827, undefined, false, `${B1}/18.mp3`),
  g(82, 'sharat-maya-bee', 'زينة ونحول — مغامرات نحول', 'زينة ونحول (Maya the Bee)', 'الزمن الجميل', 'zaman_jamil', 'الزمن الجميل', 'كوكب مغامرات', 1981, 'a6M2vK9p_4x', 's7M2vK9p_4x', 2571),
  g(83, 'sharat-smurfs', 'السنافر — قرية السنافر الزرقاء', 'السنافر (The Smurfs)', 'الزمن الجميل', 'zaman_jamil', 'الزمن الجميل / سبيستون', 'كوكب مغامرات', 1984, 's3M9vK2p_7x', 's7M2vK9p_4x', undefined, 5882),
  g(84, 'sharat-snorks', 'الشناكل — عالم البحار العجيب', 'الشناكل (The Snorks)', 'الزمن الجميل', 'zaman_jamil', 'الزمن الجميل', 'كوكب كوميديا', 1986, 'd8M2vK9p_4x', 's7M2vK9p_4x', undefined, 3364),
  g(85, 'sharat-little-lulu', 'لولو الصغيرة — شارة مغامرات لولو وطبوش', 'لولو الصغيرة', 'عايدة أبو نوار', 'aida', 'الزمن الجميل', 'كوكب كوميديا', 1983, 'f4M9vK2p_7x', 'q5M9vK2p_8x', 5340, undefined, false, `${B1}/18.mp3`),
  g(86, 'sharat-chibi-maruko', 'ماروكو الصغيرة — شارة البداية', 'ماروكو الصغيرة (Chibi Maruko-chan)', 'الزمن الجميل', 'zaman_jamil', 'الزمن الجميل', 'كوكب كوميديا', 1994, 'g2M8vK9p_4x', 'q5M9vK2p_8x', 951, undefined, false, `${B1}/18.mp3`),
  g(87, 'sharat-trapp-family', 'لحن الحياة — صفاء ونسيم الجبال', 'لحن الحياة', 'سونيا بيطار', 'sonia', 'سبيستون', 'كوكب زمردة', 1996, 'h9M4vK2p_7x', 'd9K2vM4p_8x', 2557, undefined, false, `${B1}/17.mp3`),
  g(88, 'sharat-little-women', 'نساء صغيرات — أربع شقيقات', 'نساء صغيرات', 'سونيا بيطار', 'sonia', 'سبيستون', 'كوكب زمردة', 1997, 'j5M9vK2p_8x', 'd9K2vM4p_8x', 2548, undefined, false, `${B1}/18.mp3`),
  g(89, 'sharat-my-daddy-long-legs', 'صاحب الظل الطويل — جودي أبوت', 'صاحب الظل الطويل', 'الزمن الجميل', 'zaman_jamil', 'الزمن الجميل / سبيستون', 'كوكب زمردة', 1993, 'k8M2vK9p_4x', 'd9K2vM4p_8x', 1375, undefined, false, `${B1}/18.mp3`),
  g(90, 'sharat-pollyanna', 'بوليانا — لعبة الفرح والسرور', 'بوليانا (Ai Shoujo Pollyanna)', 'الزمن الجميل', 'zaman_jamil', 'الزمن الجميل', 'كوكب زمردة', 1988, 'l3M9vK2p_7x', 'd9K2vM4p_8x', 2554, undefined, false, `${B1}/18.mp3`),
  g(91, 'sharat-nils', 'نيلز — مغامرات نيلز ومرتن', 'مغامرات نيلز (Wonderful Adventures of Nils)', 'الزمن الجميل', 'zaman_jamil', 'الزمن الجميل', 'كوكب مغامرات', 1983, 'z6M2vK9p_4x', 's7M2vK9p_4x', 2151),
  g(92, 'sharat-pero', 'توم سوير — مغامرات توم سوير وهاك', 'مغامرات توم سوير (The Adventures of Tom Sawyer)', 'الزمن الجميل', 'zaman_jamil', 'الزمن الجميل', 'كوكب مغامرات', 1983, 'x9M4vK2p_7x', 's7M2vK9p_4x', 2577),
  g(93, 'sharat-pepero', 'بيبيرو — النسر الذهبي', 'النسر الذهبي (Pepero)', 'الزمن الجميل', 'zaman_jamil', 'الزمن الجميل', 'كوكب مغامرات', 1982, 'c4M9vK2p_7x', 's7M2vK9p_4x', 3833),
  g(94, 'sharat-hikaru-makibaou', 'الحصان الأخضر — مغامرات برتقالي', 'الحصان الأخضر (Midori no Makibaou)', 'طارق العربي طرقان', 'tarek', 'سبيستون', 'كوكب كوميديا', 2001, 'v7M2vK9p_4x', 'L68pS2x9_7k', 356, undefined, false, `${B1}/13.mp3`),
  g(95, 'sharat-pokemon-arabic', 'بوكيمون — سأجمعها الآن', 'بوكيمون (Pokemon)', 'سمير قصيباتي / رشا رزق', 'samir', 'سبيستون / الزمن الجميل', 'كوكب أكشن', 2000, 'b2M8vK9p_4x', '5t8X0g2Y9wQ', 527, undefined, true, `${B1}/16.mp3`),
];
