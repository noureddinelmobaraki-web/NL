import { audioManager } from './audioManager';

type Src = 'bg' | 'song' | 'lens' | 'video' | 'mebit' | 'intro' | 'games' | 'movies' | 'series' | 'tv' | 'retro' | 'xp';

/**
 * يحاول التشغيل فوراً (ينجح إن كنا داخل نافذة إيماءة المستخدم),
 * وإن مُنِع، يبدأ عند أول تفاعل للمستخدم ثم يزيل نفسه.
 * يُعيد دالة تنظيف.
 */
export function ensureAutoplay(source: Src): () => void {
  let done = false;
  const events = ['pointerdown', 'touchstart', 'keydown', 'wheel'] as const;

  const cleanup = () => {
    events.forEach((e) => window.removeEventListener(e, onGesture, true));
  };

  const attempt = () => {
    audioManager
      .play(source)
      .then(() => { done = true; cleanup(); })
      .catch(() => { /* سيُعاد المحاولة عند الإيماءة */ });
  };

  const onGesture = () => { if (!done) attempt(); };

  attempt(); // محاولة فورية داخل الإيماءة الحالية إن وُجدت
  events.forEach((e) => window.addEventListener(e, onGesture, { capture: true }));
  return cleanup;
}
