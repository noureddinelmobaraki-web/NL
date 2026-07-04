// src/audio/nowPlayingBus.ts
// ناقل "now playing" عالمي. أي مصدر صوت (NL music، أغنية البروفايل، معرض العدسة،
// موسيقى الأقسام، المعاينات...) ينشر هنا الاسم + (اختياريًا) أزرار التحكّم لما
// يُسمع الآن. نوتش الـ glass switcher يعرض الاسم، ومشغّل نافذة الفقاعة يستدعي
// أزرار التحكّم المنشورة → فيتحكّم دائمًا في الأغنية الظاهرة في النوتش.
import { useSyncExternalStore } from 'react';

export interface NowPlayingControls {
  toggle?: () => void;
  next?: () => void;
  prev?: () => void;
  stop?: () => void;
}

export interface NowPlayingState {
  /** مفتاح مصدر audioManager (مثل 'song' أو 'profile'). */
  source: string;
  /** النص الأساسي (اسم المقطع/الملف/القسم). */
  title: string;
  /** نص ثانوي (الفنان/السياق). */
  subtitle?: string;
  /** غلاف اختياري. */
  artworkUrl?: string;
  /** هل يعمل الآن (لتبديل play/stop). */
  isPlaying: boolean;
  canNext?: boolean;
  canPrev?: boolean;
  controls?: NowPlayingControls;
}

/** شكل قديم (لافتة فقط) للتوافق الخلفي. */
export interface NowPlayingMeta {
  source: string;
  title: string;
  subtitle?: string;
}

const listeners = new Set<() => void>();
let current: NowPlayingState | null = null;

function emit(): void {
  listeners.forEach((cb) => {
    try { cb(); } catch { /* خطأ مستمع يجب ألا يكسر منتج صوت */ }
  });
}

function shallowEqual(a: NowPlayingState | null, b: NowPlayingState | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.source === b.source &&
    a.title === b.title &&
    a.subtitle === b.subtitle &&
    a.artworkUrl === b.artworkUrl &&
    a.isPlaying === b.isPlaying &&
    a.canNext === b.canNext &&
    a.canPrev === b.canPrev &&
    a.controls === b.controls
  );
}

export const nowPlayingBus = {
  /** نشر حالة تشغيل كاملة. آخر ناشر يفوز (= ما يُسمع فعلًا الآن). */
  publish(state: NowPlayingState): void {
    if (shallowEqual(current, state)) return; // تفادي رندر زائد
    current = state;
    emit();
  },
  /** تعديل حقول على العنصر الحالي فقط إن كان `source` ما زال يملك الـ bus. */
  patch(source: string, partial: Partial<NowPlayingState>): void {
    if (!current || current.source !== source) return;
    const next = { ...current, ...partial };
    if (shallowEqual(current, next)) return;
    current = next;
    emit();
  },
  /** توافق خلفي: نشر لافتة فقط (isPlaying:true بلا أزرار). */
  set(meta: NowPlayingMeta): void {
    nowPlayingBus.publish({ ...meta, isPlaying: true });
  },
  /** مسح. مرّر source لتمسح فقط إن كان ما زال يملك الـ bus. */
  clear(source?: string): void {
    if (!current) return;
    if (source && current.source !== source) return;
    current = null;
    emit();
  },
  get(): NowPlayingState | null {
    return current;
  },
  subscribe(cb: () => void): () => void {
    listeners.add(cb);
    return () => { listeners.delete(cb); };
  },
};

/** هوك الحالة الكاملة (النوتش + مشغّل نافذة الفقاعة). */
export function useNowPlayingState(): NowPlayingState | null {
  return useSyncExternalStore(
    (cb) => nowPlayingBus.subscribe(cb),
    () => nowPlayingBus.get(),
    () => null,
  );
}

/** هوك اللافتة (توافق خلفي). */
export function useNowPlayingMeta(): NowPlayingMeta | null {
  const s = useNowPlayingState();
  return s ? { source: s.source, title: s.title, subtitle: s.subtitle } : null;
}
