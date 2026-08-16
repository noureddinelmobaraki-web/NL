import { Track } from '../engine/types';
import { getHashColor } from '../utils/cover';

/**
 * البيانات لم تعد مُضمّنة في الحزمة.
 * السبب: الاستيراد الثابت كان يحوّل 856 KB من JSON إلى JS literal
 * يُحلّله المتصفح على الـ main thread قبل أول رسمة (400-900ms على الهاتف).
 * الآن: جلب مرة واحدة + JSON.parse الأصلي (أسرع 5-8x) + كاش الـ SW.
 * ضمان عدم وميض القائمة الفارغة يتم عبر status:'loading' في المتجر.
 */

interface FvRow {
  id?: string | number;
  key?: string;
  title?: string;
  artist?: string;
  album?: string;
  genre?: string;
  year?: string | number;
  duration?: string | number;
  durationSec?: string | number;
  coverUrl?: string;
  coverColor?: string;
  url?: string;
  src?: string;
  urlJsdelivr?: string;
}

function toTrack(raw: FvRow): Track {
  const id = String(raw.id ?? raw.key ?? Math.random().toString(36).slice(2));
  const trackId = id.startsWith('fv-') ? id : 'fv-' + id;
  const title = String(raw.title ?? 'Unknown title').trim();
  const urlStr = String(raw.url ?? raw.src ?? '');
  return {
    id: trackId,
    title,
    artist: String(raw.artist ?? 'Unknown artist').trim(),
    album: raw.album ? String(raw.album) : undefined,
    genre: raw.genre ? String(raw.genre) : undefined,
    year: raw.year ? Number(raw.year) || undefined : undefined,
    durationSec: Number(raw.duration ?? raw.durationSec) || undefined,
    coverUrl: raw.coverUrl ? String(raw.coverUrl) : undefined,
    coverColor: raw.coverColor ? String(raw.coverColor) : getHashColor(title),
    src: urlStr,
    srcFallback: raw.urlJsdelivr ? String(raw.urlJsdelivr) : urlStr,
    kind: 'file',
    hasLrc: false,
    source: 'fv',
    url: urlStr,
    key: trackId,
  } as Track;
}

let _cache: Track[] | null = null;
let _inflight: Promise<Track[]> | null = null;

/** المسارات المحملة، أو مصفوفة فارغة إن لم يكتمل الجلب بعد. */
export function getFvTracksSync(): Track[] {
  return _cache ?? [];
}

/** جلب المسارات مرة واحدة فقط. الاستدعاءات المتوازية تشترك في نفس الوعد. */
export function loadFvTracks(): Promise<Track[]> {
  if (_cache) return Promise.resolve(_cache);
  if (_inflight) return _inflight;

  const url = `${import.meta.env.BASE_URL}data/nl-music-fv.json`;
  _inflight = fetch(url, { cache: 'force-cache' })
    .then((res) => {
      if (!res.ok) throw new Error(`nl-music-fv.json: HTTP ${res.status}`);
      return res.json() as Promise<FvRow[]>;
    })
    .then((rows) => {
      _cache = (Array.isArray(rows) ? rows : []).map(toTrack).filter((t) => t.src);
      return _cache;
    })
    .catch((err) => {
      _inflight = null; // اسمح بإعادة المحاولة
      throw err;
    });

  return _inflight;
}

/** ترتيب عرض عشوائي جديد في كل فتح (Fisher-Yates) - سلوك محفوظ كما كان. */
export function buildInitialOrder(tracks: Track[]): string[] {
  const ids = tracks.map((t) => t.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = ids[i];
    ids[i] = ids[j];
    ids[j] = tmp;
  }
  return ids;
}
