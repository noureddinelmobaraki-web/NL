/**
 * useMobileLyricsBodyLock — reference-counted body scroll lock.
 *
 * Why a module-level counter? The previous SongCard implementation set
 * `body.style.overflow = 'hidden'` from inside each card. If two cards
 * opened/closed in quick succession, the SECOND cleanup ran before the
 * first card restored scroll → the lock was released even though another
 * panel was still open (the "iOS scroll leak" bug).
 *
 * With a counter:
 *   • body is locked when count goes 0 → 1
 *   • body is unlocked only when count returns to 0
 *
 * StrictMode-safe: each useEffect's cleanup matches the exact acquire it
 * paired with, so dev-mode double-invocation never desynchronises.
 */
import { useEffect } from 'react';

let lockCount = 0;
let savedScrollY = 0;

const acquireLock = (): void => {
  if (typeof document === 'undefined') return;
  lockCount += 1;
  if (lockCount === 1) {
    savedScrollY = window.scrollY;
    document.body.style.overflow = 'hidden';
  }
};

const releaseLock = (): void => {
  if (typeof document === 'undefined') return;
  if (lockCount === 0) return; // defensive: never go negative
  lockCount -= 1;
  if (lockCount === 0) {
    document.body.style.overflow = '';
    if (savedScrollY > 0) {
      const y = savedScrollY;
      // rAF avoids iOS "jump to top" before paint settles.
      requestAnimationFrame(() => window.scrollTo(0, y));
    }
  }
};

/**
 * Lock body scroll while `isLocked` is true. Safe to call from many
 * components concurrently.
 *
 * @param isLocked  current lock state for THIS consumer
 * @param enabled   set false to disable (e.g. desktop layouts)
 */
export function useMobileLyricsBodyLock(
  isLocked: boolean,
  enabled: boolean = true,
): void {
  useEffect(() => {
    if (!enabled || !isLocked) return;
    acquireLock();
    return () => releaseLock();
  }, [isLocked, enabled]);
}

/** Test-only helper: reset module state between tests. */
export function __resetMobileLyricsBodyLockForTests(): void {
  lockCount = 0;
  savedScrollY = 0;
  if (typeof document !== 'undefined') {
    document.body.style.overflow = '';
  }
}
