import { supabase } from '../../../config/supabase';

export type PlayItemType = 'song' | 'movie' | 'series';

/**
 * تسجيل نقرة/فتح للترتيب. fire-and-forget:
 * لا يوقف ولا يرمي خطأً إلى الواجهة — لا يؤثر أبدًا على التشغيل.
 */
export function logPlay(p: {
  item_type: PlayItemType;
  item_id: string;
  media_type?: string | null;
  title?: string | null;
  seconds?: number;
}): void {
  try {
    void supabase
      .rpc('log_play', {
        p_item_type: p.item_type,
        p_item_id: String(p.item_id),
        p_media_type: p.media_type ?? null,
        p_title: p.title ?? null,
        p_seconds: Math.max(0, Math.round(p.seconds ?? 0)),
      })
      .then(({ error }) => { if (error) console.debug('[logPlay]', error.message); });
  } catch { /* noop */ }
}
