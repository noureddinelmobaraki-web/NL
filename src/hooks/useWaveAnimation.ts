/**
 * useWaveAnimation
 * ─────────────────────────────────────────────────────────────────────────────
 * Controls the play-state of a CSS-driven animation. Returns a `playState`
 * string ('running' | 'paused') that the consumer pipes directly into
 * `style={{ animationPlayState }}`. No per-frame rerenders.
 *
 * Pauses when:
 *   • caller flips isActive=false
 *   • document.visibilityState === 'hidden'
 *   • user has (prefers-reduced-motion: reduce)
 *
 * `prefersReducedMotion` is exposed so consumers can fully disable animation
 * (e.g. fall back to static bars at mid-height).
 */
import { useEffect, useState } from 'react';

interface UseWaveAnimationOptions {
  isActive: boolean;
}

interface UseWaveAnimationResult {
  playState: 'running' | 'paused';
  prefersReducedMotion: boolean;
}

const queryReducedMotion = (): boolean => {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

export function useWaveAnimation({
  isActive,
}: UseWaveAnimationOptions): UseWaveAnimationResult {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(queryReducedMotion);
  const [isPageVisible, setIsPageVisible] = useState(() => {
    if (typeof document === 'undefined') return true;
    return document.visibilityState !== 'hidden';
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handler = () => setIsPageVisible(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  const running = isActive && isPageVisible && !prefersReducedMotion;

  return {
    playState: running ? 'running' : 'paused',
    prefersReducedMotion,
  };
}
