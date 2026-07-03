import type { Track } from '../engine/types';

export function songShareUrl(track: Pick<Track, 'id'>): string {
  const num = String(track.id).replace(/^fv-/, '');
  const base = 'https://noureddinelmobaraki-web.github.io/NL';
  return `${base}/s/${num}.html`;
}

export async function shareSong(track: Track): Promise<'shared' | 'copied' | 'error'> {
  const url = songShareUrl(track);
  const title = `${track.title}${track.artist ? ' — ' + track.artist : ''}`;
  const shareData = { title, text: `Listen to ${track.title} on NL Music`, url };

  // 1) حاول المشاركة الأصلية أولاً (يجب استدعاؤها مباشرة داخل إيماءة المستخدم)
  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  const canShare = !!nav && typeof nav.share === 'function' &&
    (typeof nav.canShare !== 'function' || nav.canShare(shareData));
  if (canShare) {
    try {
      await nav!.share(shareData);
      return 'shared';
    } catch (e: any) {
      // إلغاء المستخدم = لا تنسخ ولا تظهر خطأ
      if (e && (e.name === 'AbortError' || e.name === 'CanceledError')) return 'shared';
      // خطأ حقيقي → اسقط إلى النسخ
    }
  }

  // 2) احتياطي: النسخ إلى الحافظة
  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    return 'error';
  }
}
