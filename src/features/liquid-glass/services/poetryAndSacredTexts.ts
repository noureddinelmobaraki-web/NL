/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Al-Quran Cloud API (Uthmani Script + Mishary Alafasy Audio) & PoetryDB Diwan Client
 */

import type { BookItem } from './types';

export interface QuranAyah {
  number: number;
  numberInSurah: number;
  text: string;
  audioUrl: string;
}

export interface QuranSurahDetail {
  number: number;
  name: string;
  englishName: string;
  revelationType: string;
  numberOfAyahs: number;
  ayahs: QuranAyah[];
}

export interface PoemWork {
  title: string;
  author: string;
  lines: string[];
  linecount: number;
}

const SACRED_QURAN_BOOK_ITEM: BookItem = {
  id: 'sacred:quran-alafasy',
  title: 'المصحف الشريف المرتل — بالرسم العثماني وتلاوة مشاري العفاسي',
  author: 'القرآن الكريم (Al-Quran Cloud API)',
  year: 632,
  language: 'ar',
  coverUrl: 'https://archive.org/services/img/QuranKareem_201805',
  description:
    'قراءة وتدبر سور القرآن الكريم بالرسم العثماني الواضح مع الاستماع لتلاوة الشيخ مشاري راشد العفاسي آية بآية.',
  ext: 'quran',
  source: 'Al-Quran Cloud',
  sources: ['Al-Quran Cloud'],
  directReadFormats: {
    preview: 'quran://1',
  },
};

const ARABIC_DIWAN_ITEMS: BookItem[] = [
  {
    id: 'poetry:arabic-muallaqat',
    title: 'ديوان المعلقات السبع وروائع الشعر العربي الفصيح',
    author: 'امرؤ القيس · المتنبي · أبو العلاء المعري · عنترة بن شداد',
    year: 600,
    language: 'ar',
    coverUrl: 'https://archive.org/services/img/sharhalmuallaqat00zauz',
    description:
      'مختارات شعرية خالدة من عيون القصيد العربي الكلاسيكي منسقة بنظام الديوان الشعري العمودي.',
    ext: 'poetry',
    source: 'Arabic Diwan',
    sources: ['PoetryDB & Arabic Diwan'],
    directReadFormats: {
      preview: 'poetry://arabic-classics',
    },
  },
];

export const BUILTIN_ARABIC_POEMS: PoemWork[] = [
  {
    title: 'معلقة امرئ القيس — قِفَا نَبْكِ مِنْ ذِكْرَى حَبِيبٍ وَمَنْزِلِ',
    author: 'امرؤ القيس',
    linecount: 8,
    lines: [
      'قِفَا نَبْكِ مِنْ ذِكْرَى حَبِيبٍ وَمَنْزِلِ ۞ بِسِقْطِ اللِّوَى بَيْنَ الدَّخُولِ فَحَوْمَلِ',
      'فَتُوضِحَ فَالمِقْرَاةِ لَمْ يَعْفُ رَسْمُهَا ۞ لِمَا نَسَجَتْهَا مِنْ جَنُوبٍ وَشَمْأَلِ',
      'وَلَيْلٍ كَمَوْجِ البَحْرِ أَرْخَى سُدُولَهُ ۞ عَلَيَّ بِأَنْوَاعِ الهُمُومِ لِيَبْتَلِي',
      'فَقُلْتُ لَهُ لَمَّا تَمَطَّى بِصُلْبِهِ ۞ وَأَرْدَفَ أَعْجَازاً وَنَاءَ بِكَلْكَلِ',
      'أَلا أَيُّهَا اللَّيْلُ الطَّوِيلُ أَلا انْجَلِي ۞ بِصُبْحٍ وَمَا الإِصْبَاحُ مِنْكَ بِأَمْثَلِ',
    ],
  },
  {
    title: 'على قدر أهل العزم تأتي العزائم',
    author: 'أبو الطيب المتنبي',
    linecount: 8,
    lines: [
      'عَلَى قَدْرِ أَهْلِ العَزْمِ تَأْتِي العَزَائِمُ ۞ وَتَأْتِي عَلَى قَدْرِ الكِرَامِ المَكَارِمُ',
      'وَتَعْظُمُ فِي عَيْنِ الصَّغِيرِ صِغَارُهَا ۞ وَتَصْغُرُ فِي عَيْنِ العَظِيمِ العَظَائِمُ',
      'أَنَا الَّذِي نَظَرَ الأَعْمَى إِلَى أَدَبِي ۞ وَأَسْمَعَتْ كَلِمَاتِي مَنْ بِهِ صَمَمُ',
      'أَنَامُ مِلْءَ جُفُونِي عَنْ شَوَارِدِهَا ۞ وَيَسْهَرُ الخَلْقُ جَرَّاهَا وَيَخْتَصِمُ',
      'الخَيْلُ وَاللَّيْلُ وَالبَيْدَاءُ تَعْرِفُنِي ۞ وَالسَّيْفُ وَالرُّمْحُ وَالقِرْطَاسُ وَالقَلَمُ',
    ],
  },
  {
    title: 'غير مجدٍ في ملتي واعتقادي',
    author: 'أبو العلاء المعري',
    linecount: 8,
    lines: [
      'غَيْرُ مُجْدٍ فِي مِلَّتِي وَاعْتِقَادِي ۞ نَوْحُ بَاكٍ وَلا تَرَنُّمُ شَادِي',
      'وَشَبِيهٌ صَوْتُ النَّعِيِّ إِذَا قِيـ ۞ ـسَ بِصَوْتِ البَشِيرِ فِي كُلِّ نَادِي',
      'صَاحِ هَذِهِ قُبُورُنَا تَمْلأُ الرُّحْـ ۞ ـبَ فَأَيْنَ القُبُورُ مِنْ عَهْدِ عَادِ',
      'خَفِّفِ الوَطْءَ مَا أَظُنُّ أَدِيمَ الأَرْ ۞ ضِ إِلا مِنْ هَذِهِ الأَجْسَادِ',
    ],
  },
];

export async function fetchPoetryAndSacredBooks(
  query = '',
  signal?: AbortSignal,
): Promise<BookItem[]> {
  const items: BookItem[] = [SACRED_QURAN_BOOK_ITEM, ...ARABIC_DIWAN_ITEMS];
  const cleanQ = query.trim();
  const endpoint = cleanQ
    ? `https://poetrydb.org/title/${encodeURIComponent(cleanQ)}`
    : 'https://poetrydb.org/random/16';

  try {
    const res = await fetch(endpoint, {
      signal: signal ?? AbortSignal.timeout(6500),
    });
    if (!res.ok) return items;
    const raw = await res.json();
    if (!Array.isArray(raw)) return items;

    const poems: BookItem[] = raw.slice(0, 16).map((p: Record<string, unknown>, idx) => {
      const title = String(p.title || `Classic Poem #${idx + 1}`);
      const author = String(p.author || 'Classic Poet');
      const lines = Array.isArray(p.lines) ? (p.lines as string[]) : [];
      return {
        id: `poetrydb:${idx}:${encodeURIComponent(title.slice(0, 40))}`,
        title,
        author,
        year: 1850,
        language: 'en',
        description: lines.slice(0, 6).join(' / '),
        pages: lines.length,
        ext: 'poetry',
        source: 'PoetryDB',
        sources: ['PoetryDB'],
        directReadFormats: {
          txt: lines.join('\n'),
          preview: `poetry://${encodeURIComponent(title)}`,
        },
      };
    });

    return [...items, ...poems];
  } catch {
    return items;
  }
}

export async function fetchQuranSurahList(
  signal?: AbortSignal,
): Promise<
  Array<{
    number: number;
    name: string;
    englishName: string;
    numberOfAyahs: number;
  }>
> {
  try {
    const res = await fetch('https://api.alquran.cloud/v1/surah', {
      signal: signal ?? AbortSignal.timeout(7000),
    });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json?.data) ? json.data : [];
  } catch {
    return [];
  }
}

export async function fetchQuranSurahWithAudio(
  surahNumber: number,
  signal?: AbortSignal,
): Promise<QuranSurahDetail | null> {
  const num = Math.max(1, Math.min(114, Math.floor(surahNumber || 1)));
  try {
    const res = await fetch(
      `https://api.alquran.cloud/v1/surah/${num}/ar.alafasy`,
      { signal: signal ?? AbortSignal.timeout(8000) },
    );
    if (!res.ok) return null;
    const json = await res.json();
    const d = json?.data;
    if (!d) return null;

    const ayahs: QuranAyah[] = (Array.isArray(d.ayahs) ? d.ayahs : []).map(
      (a: Record<string, unknown>) => ({
        number: Number(a.number) || 1,
        numberInSurah: Number(a.numberInSurah) || 1,
        text: String(a.text || ''),
        audioUrl: String(a.audio || ''),
      }),
    );

    return {
      number: Number(d.number) || num,
      name: String(d.name || `سورة ${num}`),
      englishName: String(d.englishName || `Surah ${num}`),
      revelationType: String(d.revelationType || 'Meccan'),
      numberOfAyahs: Number(d.numberOfAyahs) || ayahs.length,
      ayahs,
    };
  } catch {
    return null;
  }
}
