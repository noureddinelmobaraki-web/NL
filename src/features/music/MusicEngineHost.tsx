import { useEffect } from 'react';
import { useMusicEngine } from './hooks/useMusicEngine';
import { useMusicStore } from './store/musicStore';

/**
 * مضيف المحرك على مستوى الجذر: يُركّب مرة واحدة قرب جذر التطبيق
 * فيبقى محرك الموسيقى موصولاً بالمتجر عبر كل الصفحات. بفضل هذا لا تتوقف
 * الأغنية الظاهرة في النوتش عند التنقل - تستمر حتى يوقفها المستخدم.
 *
 * يتولى أيضاً ترطيب بيانات المسارات مرة واحدة (بعد الرسمة الأولى).
 */
export function MusicEngineHost(): null {
  useMusicEngine();
  const hydrateTracks = useMusicStore((s) => s.hydrateTracks);

  useEffect(() => {
    // نؤخر الجلب إلى ما بعد الرسمة الأولى حتى لا ينافس موارد الـ LCP
    const schedule =
      typeof requestIdleCallback === 'function'
        ? requestIdleCallback
        : (cb: () => void) => setTimeout(cb, 200);
    const handle = schedule(() => {
      void hydrateTracks();
    });
    return () => {
      if (typeof cancelIdleCallback === 'function' && typeof handle === 'number') {
        cancelIdleCallback(handle);
      } else {
        clearTimeout(handle as unknown as number);
      }
    };
  }, [hydrateTracks]);

  return null;
}

export default MusicEngineHost;
