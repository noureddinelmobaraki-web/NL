/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { useEffect, useCallback } from 'react';
import { trackVisit } from '../utils/userPrefs';
import { isLowEndDevice, prefersReducedMotion } from '../utils/perf';

export function useAppBootEffects(isMobile: boolean) {
  useEffect(() => {
    trackVisit();
    if (isLowEndDevice() || prefersReducedMotion()) {
      document.body.classList.add('low-perf');
    }

    if (!isMobile) return;

    let lastTouch = 0;
    const handler = (e: TouchEvent) => {
      const now = Date.now();
      if (now - lastTouch <= 300) e.preventDefault();
      lastTouch = now;
    };
    document.addEventListener('touchend', handler, { passive: false });
    return () => document.removeEventListener('touchend', handler);
  }, [isMobile]);

  useEffect(() => {
    // PWA Standalone app mode detection
    const mq = window.matchMedia('(display-mode: standalone)');

    const checkStandalone = () => {
      const isStandalone = mq.matches || (window.navigator as any).standalone === true;
      document.body.classList.toggle('standalone-app', isStandalone);
    };

    checkStandalone();
    mq.addEventListener('change', checkStandalone);

    return () => mq.removeEventListener('change', checkStandalone);
  }, []);

  const scrollToSection = useCallback((id: string) => {
    let cancelled = false;
    const timerIds: ReturnType<typeof setTimeout>[] = [];

    const attempt = (tries: number) => {
      if (cancelled) return;
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      if (tries < 6) {
        const t = setTimeout(() => attempt(tries + 1), 150);
        timerIds.push(t);
      }
    };
    attempt(0);

    return () => {
      cancelled = true;
      timerIds.forEach(clearTimeout);
    };
  }, []);

  return { scrollToSection };
}
