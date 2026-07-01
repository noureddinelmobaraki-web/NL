import { useMemo } from 'react';
import { useDeviceType } from './useDeviceType';
import { isLowEndDevice, prefersReducedMotion } from '../utils/perf';

/**
 * مصدر حقيقة موحّد لقرارات الأداء التكيّفي.
 * الهدف: الحفاظ على الهوية على سطح المكتب وتخفيف الحِمل على الهاتف/الأجهزة الضعيفة
 * دون نثر شروط isMobile في كل مكوّن.
 */
export function useAdaptivePerformance() {
  const { isMobile, isTablet, isDesktop, isReducedMotion } = useDeviceType();

  return useMemo(() => {
    const lowEnd = isLowEndDevice();
    const reduced = isReducedMotion || prefersReducedMotion();
    let saveData = false;
    try {
      const conn = (navigator as any).connection;
      saveData = conn?.saveData === true
        || conn?.effectiveType === '2g'
        || conn?.effectiveType === 'slow-2g';
    } catch { /* ignore */ }

    // lightMode = خفّف المؤثّرات الثقيلة (جسيمات، three.js، preload الكامل...)
    const lightMode = isMobile || lowEnd || reduced || saveData;

    return { isMobile, isTablet, isDesktop, lowEnd, reduced, saveData, lightMode };
  }, [isMobile, isTablet, isDesktop, isReducedMotion]);
}
