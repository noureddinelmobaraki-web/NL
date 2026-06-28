import { Track } from '../engine/types';
import { getHashColor } from '../utils/cover';
// البيانات مُضمّنة في الحزمة — تظهر فوراً بلا طلب شبكي
import fvRows from '../../../../public/data/nl-music-fv.json';

function toTrack(raw: any): Track {
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
    key: trackId
  } as any;
}

// نبني المسارات مرة واحدة فقط (مُخزّنة)
let _cache: Track[] | null = null;
export function getFvTracks(): Track[] {
  if (_cache) return _cache;
  const rows = Array.isArray(fvRows) ? (fvRows as any[]) : [];
  _cache = rows.map(toTrack).filter((t) => t.src);
  return _cache;
}

// ترتيب عرض عشوائي جديد في كل فتح (خلط Fisher-Yates)
export function getFvInitialOrder(): string[] {
  const ids = getFvTracks().map((t) => t.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = ids[i];
    ids[i] = ids[j];
    ids[j] = tmp;
  }
  return ids;
}
