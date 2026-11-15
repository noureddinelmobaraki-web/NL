import type { SharatArtistGroupId, SharatTrack } from '../types/sharat.types';

const B1 = 'https://archive.org/download/20210811_20210811_2250';
const B2 = 'https://archive.org/download/mnoaaat-msgl-mn-asbys-ton-aal-alnayl-sat-2002';
const IMG = 'https://archive.org/services/img/mnoaaat-msgl-mn-asbys-ton-aal-alnayl-sat-2002';

const m = (
  rank: number, id: string, titleAr: string, seriesAr: string, artistAr: string,
  artistGroupId: SharatArtistGroupId, channelAr: string, planetAr: string, year: number,
  youtubeId: string, backupYoutubeId: string, malId?: number, tmdbId?: number, file = `${B2}/01.ia.mp4`,
): SharatTrack => ({
  id, titleAr, seriesAr, artistAr, artistGroupId, channelAr, planetAr, year,
  posterUrl: IMG, archiveUrl: file, youtubeId, backupYoutubeId,
  downloadUrl: file, priorityRank: rank, hasExactArchiveStream: false, malId, tmdbId,
});

export const SHARAT_MBC3_CN_NICK_DATA: SharatTrack[] = [
  m(96, 'sharat-ben10-classic', 'بن 10 — بدأنا القصة بجهاز غريب', 'بن 10 (Ben 10 Classic)', 'كرتون نتورك / MBC 3', 'mbc3_cn_nick', 'CN بالعربية / MBC 3', 'كرتون وأكشن', 2007, 'n5M9vK2p_8x', 'b2M8vK9p_4x', undefined, 2085),
  m(97, 'sharat-spongebob-arabic', 'سبونج بوب سكوير بانتس — جاهزون يا أطفال', 'سبونج بوب (SpongeBob SquarePants)', 'نيكلوديون بالعربية / MBC 3', 'mbc3_cn_nick', 'نيكلوديون / MBC 3', 'كوميديا', 2008, 'm8M2vK9p_4x', 'n5M9vK2p_8x', undefined, 387),
  m(98, 'sharat-tmnt-2003', 'سلاحف النينجا — أبطال في نصف صدفة', 'سلاحف النينجا (TMNT)', 'طارق العربي طرقان / MBC 3', 'mbc3_cn_nick', 'سبيستون / MBC 3', 'كوكب أكشن', 2004, 'q4M9vK2p_7x', 'L68pS2x9_7k', undefined, 1608, `${B1}/09.mp3`),
  m(99, 'sharat-danny-phantom', 'داني الشبح — الفتى الشبح', 'داني الشبح (Danny Phantom)', 'MBC 3 / نيكلوديون', 'mbc3_cn_nick', 'MBC 3 / نيكلوديون', 'أكشن ومغامرات', 2006, 'w7M2vK9p_4x', 'n5M9vK2p_8x', undefined, 2116),
  m(100, 'sharat-totally-spies', 'الجاسوسات — ثلاث فتيات شجاعات', 'الجاسوسات (Totally Spies!)', 'MBC 3 / آرتينز', 'mbc3_cn_nick', 'MBC 3 / آرتينز', 'مغامرات', 2004, 'e2M8vK9p_4x', 'n5M9vK2p_8x', undefined, 2028),
  m(101, 'sharat-martin-mystery', 'مارتن مستري — عالم الأسرار والغموض', 'مارتن مستري (Martin Mystery)', 'MBC 3 / سبيستون', 'mbc3_cn_nick', 'MBC 3 / سبيستون', 'أكشن وغموض', 2005, 'r5M9vK2p_8x', 'n5M9vK2p_8x', undefined, 4633),
  m(102, 'sharat-teen-titans', 'مراهقو التايتنز — شارة البداية', 'مراهقو التايتنز (Teen Titans)', 'CN بالعربية / MBC 3', 'mbc3_cn_nick', 'CN بالعربية / MBC 3', 'أكشن', 2006, 't8M2vK9p_4x', 'n5M9vK2p_8x', undefined, 591),
  m(103, 'sharat-avatar-aang', 'آفاتار أسطورة آنج — مسخر الهواء الأخير', 'آفاتار أسطورة آنج (Avatar: The Last Airbender)', 'MBC 3 / نيكلوديون', 'mbc3_cn_nick', 'MBC 3 / نيكلوديون', 'مغامرات', 2007, 'y4M9vK2p_7x', 'n5M9vK2p_8x', undefined, 246),
  m(104, 'sharat-slugterra', 'سلغتيرا — عالم الأعماق', 'سلغتيرا (Slugterra)', 'MBC 3 / ديزني', 'mbc3_cn_nick', 'MBC 3 / جيم', 'أكشن', 2013, 'u7M2vK9p_4x', 'n5M9vK2p_8x', undefined, 44269),
  m(105, 'sharat-generator-rex', 'جنريتور ريكس — الآلات المتحولة', 'جنريتور ريكس (Generator Rex)', 'CN بالعربية', 'mbc3_cn_nick', 'CN بالعربية', 'أكشن', 2011, 'i2M8vK9p_4x', 'n5M9vK2p_8x', undefined, 32418),
  m(106, 'sharat-samurai-jack', 'ساموراي جاك — العودة للماضي', 'ساموراي جاك (Samurai Jack)', 'CN بالعربية', 'mbc3_cn_nick', 'CN بالعربية', 'أكشن', 2005, 'o5M9vK2p_8x', 'n5M9vK2p_8x', undefined, 2723),
  m(107, 'sharat-powerpuff-girls', 'فتيات القوة — سكر وتوابل وكل شيء لطيف', 'فتيات القوة (The Powerpuff Girls)', 'سبيستون / CN بالعربية', 'mbc3_cn_nick', 'سبيستون / CN بالعربية', 'كوميديا وأكشن', 2002, 'p8M2vK9p_4x', 'n5M9vK2p_8x', undefined, 2070),
  m(108, 'sharat-dexter-lab', 'مختبر دكستر — العبقري الصغير', 'مختبر دكستر (Dexter\'s Laboratory)', 'CN بالعربية / MBC 3', 'mbc3_cn_nick', 'CN بالعربية / MBC 3', 'علوم وكوميديا', 2003, 'a3M9vK2p_7x', 'n5M9vK2p_8x', undefined, 1020),
  m(109, 'sharat-courage-dog', 'كوردج الجبان — الكلب الوفي', 'كوردج الجبان (Courage the Cowardly Dog)', 'CN بالعربية', 'mbc3_cn_nick', 'CN بالعربية', 'كوميديا وغموض', 2004, 's6M2vK9p_4x', 'n5M9vK2p_8x', undefined, 2083),
  m(110, 'sharat-ed-edd-eddy', 'إد إدد وإدي — الثلاثي المرح', 'إد إدد وإدي (Ed, Edd n Eddy)', 'CN بالعربية', 'mbc3_cn_nick', 'CN بالعربية', 'كوميديا', 2004, 'd9M4vK2p_7x', 'n5M9vK2p_8x', undefined, 1669),
  m(111, 'sharat-batman-tas', 'باتمان — فارس الظلام', 'باتمان (Batman: The Animated Series)', 'طارق العربي طرقان', 'tarek', 'سبيستون', 'كوكب أكشن', 1999, 'f3M9vK2p_7x', 'L68pS2x9_7k', undefined, 2098, `${B1}/09.mp3`),
  m(112, 'sharat-superman-tas', 'سوبرمان — رجل الفولاذ', 'سوبرمان (Superman: The Animated Series)', 'طارق العربي طرقان', 'tarek', 'سبيستون', 'كوكب أكشن', 2000, 'g6M2vK9p_4x', 'L68pS2x9_7k', undefined, 2289, `${B1}/09.mp3`),
  m(113, 'sharat-The-Mask', 'القناع — شارة المسلسل الكرتوني', 'القناع (The Mask)', 'طارق العربي طرقان', 'tarek', 'سبيستون', 'كوكب كوميديا', 2000, 'h2M8vK9p_4x', 'L68pS2x9_7k', undefined, 2905, `${B1}/03.mp3`),
  m(114, 'sharat-police-academy', 'أكاديمية الشرطة — المهمة الصعبة', 'أكاديمية الشرطة (Police Academy)', 'طارق العربي طرقان', 'tarek', 'سبيستون', 'كوكب كوميديا', 2000, 'j4M9vK2p_7x', 'L68pS2x9_7k', undefined, 12573, `${B1}/03.mp3`),
  m(115, 'sharat-inspector-gadget', 'المفتش غادجيت — المحقق الآلي', 'المفتش غادجيت (Inspector Gadget)', 'الزمن الجميل / MBC 3', 'mbc3_cn_nick', 'الزمن الجميل / MBC 3', 'كوميديا ومغامرات', 1995, 'k7M2vK9p_4x', 'n5M9vK2p_8x', undefined, 2248),
  m(116, 'sharat-pinky-brain', 'بينكي وبرين — السيطرة على العالم', 'بينكي وبرين (Pinky and the Brain)', 'سبيستون', 'mbc3_cn_nick', 'سبيستون', 'كوكب كوميديا', 2001, 'l9M4vK2p_7x', 'n5M9vK2p_8x', undefined, 2029),
  m(117, 'sharat-animaniacs', 'الضاحكون — ياكو وواكو ودوت', 'الضاحكون (Animaniacs)', 'سبيستون', 'mbc3_cn_nick', 'سبيستون', 'كوكب كوميديا', 2001, 'z3M9vK2p_7x', 'n5M9vK2p_8x', undefined, 2273),
  m(118, 'sharat-timon-pumbaa', 'تيمون وبومبا — هاكونا ماتاتا', 'تيمون وبومبا (Timon & Pumbaa)', 'ديزني بالعربية / قناة جيم', 'mbc3_cn_nick', 'ديزني / قناة جيم', 'كوميديا', 1998, 'x6M2vK9p_4x', 'n5M9vK2p_8x', undefined, 4551),
  m(119, 'sharat-recess', 'الفسحة — طلاب المدرسة المرحون', 'الفسحة (Recess)', 'ديزني بالعربية / قناة جيم', 'mbc3_cn_nick', 'ديزني / قناة جيم', 'كوميديا', 2000, 'c9M4vK2p_7x', 'n5M9vK2p_8x', undefined, 2081),
];
