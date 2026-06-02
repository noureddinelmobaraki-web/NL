import { useEffect, useRef } from 'react';

export interface UseFullscreenManagerOptions {
  /** اسم الـ class الذي يُضاف على body عند فتح الـ fullscreen */
  bodyClass: string;
  /** يُستدعى عند الضغط على Escape (اختياري). الـ hook يدير ESC داخليًا. */
  onEscape?: () => void;
  /** محاولة قفل الـ orientation. iOS Safari سيتجاهل بصمت — مقبول. */
  lockOrientation?: 'portrait' | 'landscape';
  /**
   * هل ينطبق الـ fullscreen على الجهاز الحالي؟ مرّر `isMobile || isTablet`.
   * لو `false` → الـ hook لا يفعل أي شيء (يحمي desktop).
   */
  enabled?: boolean;
}

/**
 * Unified fullscreen manager (2025 best-practice).
 * - Body overflow lock + scrollY save/restore (avoids iOS jump-to-top).
 * - Adds/removes a body class for global CSS targeting.
 * - Best-effort screen.orientation.lock (try-catch, silent fail on iOS).
 * - ESC key → calls onEscape.
 * - Guaranteed cleanup on unmount, including a safety net for StrictMode
 *   double-effect: only restores overflow if WE were the one who locked it.
 */
export function useFullscreenManager(
  isOpen: boolean,
  { bodyClass, onEscape, lockOrientation, enabled = true }: UseFullscreenManagerOptions
): void {
  const savedScrollY = useRef(0);
  const didLockRef = useRef(false);

  // 1) body class + overflow lock + scroll save/restore
  useEffect(() => {
    if (!enabled) return;

    if (isOpen) {
      savedScrollY.current = window.scrollY;
      // Lock body scroll. Use a sentinel to avoid double-toggle in StrictMode.
      if (document.body.style.overflow !== 'hidden') {
        document.body.style.overflow = 'hidden';
        didLockRef.current = true;
      }
      document.body.classList.add(bodyClass);
    } else {
      document.body.classList.remove(bodyClass);
      if (didLockRef.current) {
        document.body.style.overflow = '';
        didLockRef.current = false;
        if (savedScrollY.current > 0) {
          const y = savedScrollY.current;
          requestAnimationFrame(() => window.scrollTo(0, y));
        }
      }
    }

    return () => {
      document.body.classList.remove(bodyClass);
      if (didLockRef.current) {
        document.body.style.overflow = '';
        didLockRef.current = false;
        if (savedScrollY.current > 0) {
          const y = savedScrollY.current;
          requestAnimationFrame(() => window.scrollTo(0, y));
        }
      }
    };
  }, [isOpen, bodyClass, enabled]);

  // 2) Orientation lock (best-effort, silent fail)
  useEffect(() => {
    if (!enabled || !isOpen || !lockOrientation) return;
    let cancelled = false;
    try {
      const sor = (screen as any).orientation;
      if (sor && typeof sor.lock === 'function') {
        sor.lock(lockOrientation).catch(() => {});
      }
    } catch {
      // iOS Safari throws — silent fail is expected
    }
    return () => {
      if (cancelled) return;
      try {
        const sor = (screen as any).orientation;
        if (sor && typeof sor.unlock === 'function') sor.unlock();
      } catch {}
    };
  }, [isOpen, lockOrientation, enabled]);

  // 3) ESC handler
  useEffect(() => {
    if (!enabled || !isOpen || !onEscape) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onEscape();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onEscape, enabled]);
}
