import { audioManager } from './audioManager';

type Src =
  | 'bg' | 'song' | 'lens' | 'video' | 'mebit' | 'intro'
  | 'games' | 'movies' | 'series' | 'tv' | 'retro' | 'xp'
  | 'profile' | 'portrait' | 'poem';

type Options = {
  /**
   * Bypass Rule 2 in audioManager.play(). Required for any source whose
   * priority is lower than whatever was playing on the previous page —
   * without it the play is refused silently and this helper can never
   * tell the difference between "refused" and "played".
   */
  force?: boolean;
  /**
   * Must return true only when audio is genuinely audible.
   *
   * audioManager.play() swallows its own errors and always resolves, so
   * without a verifier this helper marks itself done after a refused play
   * and then removes its own gesture listeners — the retry never happens.
   */
  verify?: () => boolean;
};

/**
 * يحاول التشغيل فوراً (ينجح إن كنا داخل نافذة إيماءة المستخدم),
 * وإن مُنِع، يبدأ عند أول تفاعل للمستخدم ثم يزيل نفسه.
 * يُعيد دالة تنظيف.
 */
export function ensureAutoplay(source: Src, opts: Options = {}): () => void {
  let done = false;
  const events = [
    'pointerdown',
    'touchstart',
    'keydown',
    'wheel',
    // Movement is not an activation-triggering event, so it cannot unlock a
    // blocked play on its own. It is here because a page entered by a click
    // already has sticky activation, and the earliest signal that the user is
    // present on this page is the pointer crossing the picture.
    'pointermove',
    'mousemove',
    'touchmove',
    'scroll',
  ] as const;

  const cleanup = () => {
    events.forEach((e) => window.removeEventListener(e, onGesture, true));
  };

  const attempt = () => {
    audioManager
      .play(source, opts.force ? { force: true } : undefined)
      .then(() => {
        if (opts.verify && !opts.verify()) return; // refused — keep listening
        done = true;
        cleanup();
      })
      .catch(() => { /* سيُعاد المحاولة عند الإيماءة */ });
  };

  const onGesture = () => { if (!done) attempt(); };

  attempt(); // محاولة فورية داخل الإيماءة الحالية إن وُجدت
  events.forEach((e) => window.addEventListener(e, onGesture, { capture: true }));
  return cleanup;
}

