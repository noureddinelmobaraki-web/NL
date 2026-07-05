// src/audio/songSurfaceBus.ts
// ناقل بسيط يعلن "سطح أغنية معروض الآن" (صفحة NL Music أو My Songs).
// هاتان الصفحتان لهما مشغّلهما الخاص، لذا يعرض النوتش فيهما نسخة مصغّرة
// (اسم الأغنية فقط بلا أزرار)، بينما يعرض المشغّل الكامل في بقية الصفحات.
// عدّاد مرجعي (ref-count) حتى لا يكسر التركيب/الفكّ المتداخل الحالة.
import { useSyncExternalStore } from 'react';

let count = 0;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((cb) => {
    try { cb(); } catch { /* مستمع خاطئ يجب ألا يكسر البقية */ }
  });
}

export const songSurfaceBus = {
  /** يُعلن دخول سطح أغنية. يُعيد دالة خروج (استدعِها في cleanup). */
  enter(): () => void {
    count += 1;
    emit();
    let released = false;
    return () => {
      if (released) return;
      released = true;
      count = Math.max(0, count - 1);
      emit();
    };
  },
  /** هل يوجد سطح أغنية معروض الآن؟ */
  isPresent(): boolean {
    return count > 0;
  },
  subscribe(cb: () => void): () => void {
    listeners.add(cb);
    return () => { listeners.delete(cb); };
  },
};

/** هوك React: true حين تكون صفحة موسيقى (لها مشغّلها) معروضة. */
export function useSongSurface(): boolean {
  return useSyncExternalStore(
    (cb) => songSurfaceBus.subscribe(cb),
    () => songSurfaceBus.isPresent(),
    () => false,
  );
}
