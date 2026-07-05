// src/components/notch/hooks/useAudioConflict.ts
// ────────────────────────────────────────────────────────────────────────
// واجهة حلّال التعارض للنوتش. تقرأ حصرًا من soundGovernor (السلطة المركزية).
//
// عندما يعلن الحاكم تعارضًا (أغنية + خلفية صفحة معًا) يتفرّع النوتش إلى خطّين:
//   • فرع الأغنية: اسم الأغنية + زر صمت → يُسكِت الأغنية ويُبقي الخلفية (keepBg).
//   • فرع الخلفية: زر إيقاف صوت BG + صمت → يُوقِف الخلفية ويُبقي الأغنية (keepSong).
// يظهر أوّل مرّة فقط عند الانتقال لصفحة (لأن خلفية الصفحة تبدأ مرّة واحدة لكل انتقال).
// إن لم يختر المستخدم خلال 4 ثوانٍ ينكمش التفرّع، ثم تخفت الأغنية تدريجيًا خلال 5 ثوانٍ
// فتبقى الخلفية فقط. إن وُجد صوت واحد فقط (أغنية فقط أو خلفية فقط) لا يحدث شيء (لا تعارض).
// ────────────────────────────────────────────────────────────────────────
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { soundGovernor } from "../../../audio/soundGovernor";

const DECISION_MS = 4000; // مهلة قرار المستخدم قبل الانكماش.
const FADE_MS = 5000; // مدّة خفض الأغنية تدريجيًا عند عدم الاختيار.

export interface AudioConflictApi {
  active: boolean;
  songLabel: string;
  bgId: string | null;
  keepSong: () => void; // إيقاف صوت الخلفية والإبقاء على الأغنية.
  keepBg: () => void; // إيقاف الأغنية والإبقاء على الخلفية.
  dismiss: () => void; // إخفاء التفرّع بلا إجراء.
}

export function useAudioConflict(): AudioConflictApi {
  const conflict = useSyncExternalStore(
    (cb) => soundGovernor.subscribe(cb),
    () => soundGovernor.getConflict(),
    () => soundGovernor.getConflict(),
  );

  const [dismissed, setDismissed] = useState(false);
  const timer = useRef<number | null>(null);
  const lastKeyRef = useRef("");

  const key = conflict.active ? `${conflict.songId}|${conflict.bgId}` : "";

  const clearTimer = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  // عند ظهور تعارض جديد (مفتاح مختلف) أعد تفعيل العرض (أوّل مرّة لكل انتقال).
  useEffect(() => {
    if (key && key !== lastKeyRef.current) {
      lastKeyRef.current = key;
      setDismissed(false);
    }
    if (!conflict.active) lastKeyRef.current = "";
  }, [key, conflict.active]);

  // مؤقّت القرار: بعد 4 ثوانٍ بلا اختيار → انكماش ثم خفض تدريجي للأغنية (5ث) وإبقاء الخلفية.
  useEffect(() => {
    clearTimer();
    if (conflict.active && !dismissed) {
      timer.current = window.setTimeout(() => {
        setDismissed(true); // ينكمش التفرّع وترجع النوتش عادية.
        soundGovernor.fadeOutSong(FADE_MS);
      }, DECISION_MS);
    }
    return clearTimer;
  }, [conflict.active, dismissed, key, clearTimer]);

  // تنظيف عام عند الفكّ.
  useEffect(() => () => clearTimer(), [clearTimer]);

  const keepSong = useCallback(() => {
    clearTimer();
    setDismissed(true);
    soundGovernor.silenceBackground();
  }, [clearTimer]);

  const keepBg = useCallback(() => {
    clearTimer();
    setDismissed(true);
    soundGovernor.silenceSong();
  }, [clearTimer]);

  const dismiss = useCallback(() => {
    clearTimer();
    setDismissed(true);
  }, [clearTimer]);

  return {
    active: conflict.active && !dismissed,
    songLabel: conflict.songLabel,
    bgId: conflict.bgId,
    keepSong,
    keepBg,
    dismiss,
  };
}
