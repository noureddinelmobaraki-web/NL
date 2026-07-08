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

  // مرحلة 0: تحييد الحركة اللاصقة — النوافذ ظاهرة دائمًا والخيوط مرسومة بالكامل.
  const draw = useTransform(scrollYProgress, [0, 1], [1, 1]);
  const windowScale = useTransform(scrollYProgress, [0, 1], [1, 1]);
  const windowOpacity = useTransform(scrollYProgress, [0, 1], [1, 1]);
  const windowY = useTransform(scrollYProgress, [0, 1], [0, 0]);

  return { progress: scrollYProgress, draw, windowScale, windowOpacity, windowY };
}
