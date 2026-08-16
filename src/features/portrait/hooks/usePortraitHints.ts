import { useCallback, useEffect, useState } from 'react';
import { isAutomatedEnv } from '../../../utils/env';
import { PORTRAIT_HINTS } from '../constants';

type StoredHintState = { v: number; seen: boolean };

type HintPhase = 'hidden' | 'shown' | 'leaving';

export type PortraitHints = {
  /** True while the arrows should be in the DOM at all. */
  visible: boolean;
  /** True during the fade-out, so CSS can transition opacity to 0. */
  leaving: boolean;
  /** Idempotent. Starts the fade and persists "seen" immediately. */
  dismiss: () => void;
};

function hasSeenHints(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem(PORTRAIT_HINTS.storageKey);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as Partial<StoredHintState>;
    return parsed.v === PORTRAIT_HINTS.storageVersion && parsed.seen === true;
  } catch {
    // Malformed JSON, or localStorage throwing in a locked-down context.
    // Treat as "not seen": showing the hints twice is harmless, crashing is not.
    return false;
  }
}

function markHintsSeen(): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: StoredHintState = {
      v: PORTRAIT_HINTS.storageVersion,
      seen: true,
    };
    window.localStorage.setItem(PORTRAIT_HINTS.storageKey, JSON.stringify(payload));
  } catch {
    // Safari private mode and "block all cookies" both throw on setItem.
    // The hints simply show again next time; nothing else depends on this.
  }
}

/**
 * Owns the one-time hint lifecycle.
 *
 * Automated environments are skipped entirely. e2e/test-base.ts injects
 * __NL_AUTOMATED__ and Lighthouse CI audits /NL/?lh=1, both of which
 * isAutomatedEnv() reports; keeping timed, self-dismissing DOM out of those
 * runs removes a whole class of flakiness before it can exist.
 */
export function usePortraitHints(): PortraitHints {
  const [phase, setPhase] = useState<HintPhase>(() =>
    isAutomatedEnv() || hasSeenHints() ? 'hidden' : 'shown',
  );

  const dismiss = useCallback(() => {
    setPhase((current) => (current === 'shown' ? 'leaving' : current));
  }, []);

  useEffect(() => {
    if (phase === 'shown') {
      const timer = window.setTimeout(
        () => setPhase('leaving'),
        PORTRAIT_HINTS.visibleMs,
      );
      return () => window.clearTimeout(timer);
    }

    if (phase === 'leaving') {
      // Persisted here, not in dismiss(): this covers both paths out of
      // 'shown' — an interaction and the 3s timeout — with one write.
      markHintsSeen();
      const timer = window.setTimeout(
        () => setPhase('hidden'),
        PORTRAIT_HINTS.fadeMs,
      );
      return () => window.clearTimeout(timer);
    }

    // tsconfig has noImplicitReturns: every branch must return explicitly.
    return undefined;
  }, [phase]);

  return {
    visible: phase !== 'hidden',
    leaving: phase === 'leaving',
    dismiss,
  };
}
