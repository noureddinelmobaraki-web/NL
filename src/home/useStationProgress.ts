// src/home/useStationProgress.ts
// يحوّل تقدّم سكرول المحطّة (0→1 عبر الدخول ثم الخروج) إلى قيم Motion جاهزة:
// draw = pathLength الخيط (يظهر عند الاقتراب ويتراجع عند المغادرة = "رجوع الزمن").
import { useScroll, useTransform, type MotionValue } from 'framer-motion';
import type { RefObject } from 'react';

export interface StationMotion {
  progress: MotionValue<number>;
  draw: MotionValue<number>;
  windowScale: MotionValue<number>;
  windowOpacity: MotionValue<number>;
  windowY: MotionValue<number>;
}

export function useStationProgress(
  ref: RefObject<HTMLElement | null>,
  reduced: boolean,
): StationMotion {
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  // الخيط: يُرسم مع الدخول (0→0.45) ثم يتراجع مع الخروج (0.55→1).
  const draw = useTransform(scrollYProgress, [0, 0.45, 0.55, 1], [0, 1, 1, 0]);
  const windowScale = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    reduced ? [1, 1, 1] : [0.9, 1, 0.92],
  );
  const windowOpacity = useTransform(
    scrollYProgress,
    [0, 0.18, 0.5, 0.82, 1],
    [0, 1, 1, 1, 0],
  );
  const windowY = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    reduced ? [0, 0, 0] : [40, 0, -30],
  );

  return { progress: scrollYProgress, draw, windowScale, windowOpacity, windowY };
}
