import { useCallback, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { withViewTransition } from '../utils/themeSwitcher';

const SCROLL_TARGETS: Record<string, string | 'top'> = {
  home: 'top',
  songs: 'my-songs-section',
  drawings: 'drawings-section',
  mebit: 'me-bit-gallery',
  lens: 'lens-section',
  contact: 'contact-section',
  mood: 'mood-section',
};

const VALID_PAGES = new Set(Object.keys(SCROLL_TARGETS));

function scrollToTargetWithRetry(id: string, signal: AbortSignal) {
  const attempt = (tries: number) => {
    if (signal.aborted) return;
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (tries < 6) {
      window.setTimeout(() => attempt(tries + 1), 150);
    }
  };
  attempt(0);
}

/**
 * Centralised navigation. Replaces every direct setCurrentPage call.
 *
 * Responsibilities:
 *   - Validate target (rejects unknown pages — no race surface).
 *   - Race-guard: a second call cancels the previous scroll chain.
 *   - Wrap state mutation in withViewTransition (theme/animation).
 *   - Trigger scroll side-effect deterministically.
 *
 * Audio recovery is intentionally NOT done here — useNavigationAudioRecovery
 * already debounces on currentPage. Keeping concerns separated.
 */
export function useNavigateSection() {
  const { setCurrentPage, currentPage } = useAppContext();
  const abortRef = useRef<AbortController | null>(null);

  return useCallback((target: string) => {
    if (!VALID_PAGES.has(target)) {
      if (import.meta.env.DEV) {
        console.warn(`[useNavigateSection] Unknown target "${target}", ignoring.`);
      }
      return;
    }
    if (target === currentPage) return; // no-op, prevents re-render storm

    // Cancel any in-flight scroll chain
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    withViewTransition(() => {
      setCurrentPage(target);
      const scrollTarget = SCROLL_TARGETS[target];
      if (scrollTarget === 'top') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (scrollTarget) {
        scrollToTargetWithRetry(scrollTarget, controller.signal);
      }
    });
  }, [setCurrentPage, currentPage]);
}
