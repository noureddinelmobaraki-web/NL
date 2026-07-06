// src/home/useStationProgress.ts
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
): StationMotion {
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  // يُرسم مع الدخول (0→0.45) ثم يتراجع مع الخروج (0.55→1) = رجوع الزمن.
  const draw = useTransform(scrollYProgress, [0, 0.45, 0.55, 1], [0, 1, 1, 0]);
  const windowScale = useTransform(scrollYProgress, [0, 0.5, 1], [0.86, 1, 0.9]);
  const windowOpacity = useTransform(
    scrollYProgress,
    [0, 0.16, 0.5, 0.84, 1],
    [0, 1, 1, 1, 0],
  );
  const windowY = useTransform(scrollYProgress, [0, 0.5, 1], [46, 0, -34]);

  return { progress: scrollYProgress, draw, windowScale, windowOpacity, windowY };
}
