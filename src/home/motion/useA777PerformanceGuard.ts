import { useEffect, useRef, useState } from 'react';

export type A777GuardState = 'idle' | 'warming' | 'stable' | 'fallback';

interface A777PerformanceGuardOptions {
  enabled: boolean;
  onFallback: () => void;
}

const STARTUP_GRACE_MS = 12_000;
const INTERACTION_GRACE_MS = 2_400;
const SAMPLE_FRAMES = 240;
const SEVERE_AVERAGE_MS = 55;
const SEVERE_FRAME_MS = 70;
const SEVERE_FRAME_RATIO = 0.35;
const CATASTROPHIC_FREEZE_MS = 700;
const FREEZES_REQUIRED = 3;
const SEVERE_WINDOWS_REQUIRED = 4;

/**
 * Critical-only runtime guard.
 *
 * It deliberately ignores device labels and all active interaction. A normal
 * 30fps phone averages ~33ms and must NEVER fall back. Automatic NORMAL is only
 * allowed after sustained <=18fps idle rendering or repeated 700ms freezes.
 */
export function useA777PerformanceGuard({
  enabled,
  onFallback,
}: A777PerformanceGuardOptions): A777GuardState {
  const [guardState, setGuardState] = useState<A777GuardState>('idle');
  const fallbackRef = useRef(onFallback);
  fallbackRef.current = onFallback;

  useEffect(() => {
    if (!enabled) {
      setGuardState('idle');
      return;
    }

    let raf = 0;
    let cancelled = false;
    const enabledAt = performance.now();
    let previousFrame = enabledAt;
    let ignoreUntil = enabledAt + STARTUP_GRACE_MS;
    let frameCount = 0;
    let elapsedSum = 0;
    let severeFrameCount = 0;
    let severeWindows = 0;
    let catastrophicFreezes = 0;

    setGuardState('warming');

    const resetSample = (now: number) => {
      previousFrame = now;
      frameCount = 0;
      elapsedSum = 0;
      severeFrameCount = 0;
    };

    const markInteraction = () => {
      const now = performance.now();
      ignoreUntil = Math.max(ignoreUntil, now + INTERACTION_GRACE_MS);
      severeWindows = 0;
      catastrophicFreezes = 0;
      resetSample(now);
    };

    const interactionEvents: Array<keyof WindowEventMap> = [
      'scroll',
      'wheel',
      'pointerdown',
      'pointermove',
      'touchstart',
      'touchmove',
      'resize',
      'orientationchange',
    ];
    interactionEvents.forEach((name) =>
      window.addEventListener(name, markInteraction, { passive: true }),
    );

    const frame = (now: number) => {
      if (cancelled) return;

      if (document.visibilityState !== 'visible' || now < ignoreUntil) {
        resetSample(now);
        raf = requestAnimationFrame(frame);
        return;
      }

      const delta = now - previousFrame;
      previousFrame = now;

      if (delta >= CATASTROPHIC_FREEZE_MS) {
        catastrophicFreezes += 1;
      }

      frameCount += 1;
      elapsedSum += Math.min(delta, 1000);
      if (delta >= SEVERE_FRAME_MS) severeFrameCount += 1;

      if (catastrophicFreezes >= FREEZES_REQUIRED) {
        cancelled = true;
        setGuardState('fallback');
        fallbackRef.current();
        return;
      }

      if (frameCount >= SAMPLE_FRAMES) {
        const average = elapsedSum / frameCount;
        const severeRatio = severeFrameCount / frameCount;
        const isSevere = average >= SEVERE_AVERAGE_MS
          && severeRatio >= SEVERE_FRAME_RATIO;

        severeWindows = isSevere ? severeWindows + 1 : 0;
        if (!isSevere) setGuardState('stable');

        if (severeWindows >= SEVERE_WINDOWS_REQUIRED) {
          cancelled = true;
          setGuardState('fallback');
          fallbackRef.current();
          return;
        }
        resetSample(now);
      }

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      interactionEvents.forEach((name) =>
        window.removeEventListener(name, markInteraction),
      );
    };
  }, [enabled]);

  return guardState;
}
