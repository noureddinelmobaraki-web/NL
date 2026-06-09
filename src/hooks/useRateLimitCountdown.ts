/**
 * Derives a human-readable "try again in N seconds" countdown from the
 * existing `useClientRateLimit` log.
 *
 * Why a separate hook:
 *  - keeps `useClientRateLimit.ts` storage-only (no setInterval pollution).
 *  - lets ContactForm subscribe to a per-second tick ONLY while blocked,
 *    so idle pages do no work.
 *
 * Contract:
 *  - returns `{ secondsLeft, label }`.
 *  - secondsLeft = 0 when not blocked or already expired.
 *  - label is pre-formatted in Arabic for direct rendering.
 */
import { useEffect, useState } from 'react';
import { CONTACT_LIMITS } from '../constants/contact';

export interface RateLimitCountdown {
  secondsLeft: number;
  label: string;
}

export function useRateLimitCountdown(
  log: string[],
  isBlocked: boolean
): RateLimitCountdown {
  const computeSecondsLeft = () => {
    if (!isBlocked || log.length === 0) return 0;
    // The OLDEST entry inside the rolling window is the one that will
    // expire first, freeing a slot.
    const oldest = log
      .map((ts) => new Date(ts).getTime())
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => a - b)[0];
    if (!oldest) return 0;
    const expiresAt = oldest + CONTACT_LIMITS.windowMs;
    return Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
  };

  const [secondsLeft, setSecondsLeft] = useState<number>(computeSecondsLeft);

  useEffect(() => {
    if (!isBlocked) {
      setSecondsLeft(0);
      return;
    }
    setSecondsLeft(computeSecondsLeft());
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => {
        const next = computeSecondsLeft();
        return next === prev ? prev : next;
      });
    }, 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBlocked, log.length]);

  return { secondsLeft, label: formatArabicCountdown(secondsLeft) };
}

function formatArabicCountdown(s: number): string {
  if (s <= 0) return '';
  if (s < 60) return `حاول مرة أخرى بعد ${s} ثانية`;
  const m = Math.floor(s / 60);
  if (m < 60) return `حاول مرة أخرى بعد ${m} دقيقة`;
  const h = Math.floor(m / 60);
  return `حاول مرة أخرى بعد ${h} ساعة`;
}
