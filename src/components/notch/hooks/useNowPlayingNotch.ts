import { useMemo } from 'react';
import { useNowPlayingState } from '../../../audio/nowPlayingBus';
import type { NotchTransport } from '../notch.types';

/**
 * القاعدة الذهبية: النوتش يقرأ حصريًا من nowPlayingBus وفقط عندما source === 'song'.
 * لا fallback إلى SOURCE_LABELS ولا إلى متجر NL Music. هذا يقتل خطأ "NL Music"
 * وخطأ "الأزرار لا تتحكّم" لأن controls تأتي دائمًا من الناشر الفعلي (My Songs أو Bridge).
 * onStop: يوقف فعليًا (stop إن وُجد، وإلا toggle) → مع بوابة الرؤية (isPlaying) تنكمش الجزيرة.
 */
export function useNowPlayingNotch(): NotchTransport | null {
  const np = useNowPlayingState();
  return useMemo<NotchTransport | null>(() => {
    if (!np || np.source !== 'song') return null;
    const c = np.controls;
    if (!c) return null; // بلا تحكّم حقيقي = لا نوتش (نتجنّب أزرارًا صمّاء)
    return {
      title: np.title?.trim() || 'Untitled',
      isPlaying: np.isPlaying,
      canPrev: np.canPrev !== false,
      canNext: np.canNext !== false,
      onToggle: () => c.toggle?.(),
      onNext: () => c.next?.(),
      onPrev: () => c.prev?.(),
      onStop: () => { (c.stop ?? c.toggle)?.(); },
    };
  }, [np]);
}
