// src/transitions/useGenieTransition.ts
import { useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import type { Transition, TargetAndTransition } from 'framer-motion';
import { getGenieOrigin, genieOriginToTransformOrigin } from './genieOrigin';

export interface GenieMotionProps {
  initial: TargetAndTransition;
  animate: TargetAndTransition;
  exit: TargetAndTransition;
  transition: Transition;
  style: { transformOrigin: string; willChange: string };
}

/**
 * يُرجِع خصائص framer-motion جاهزة للنشر على motion.div.
 * يلتقط نقطة الأصل لحظة الانتقال من مغلق→مفتوح.
 */
export function useGenieTransition(open: boolean): GenieMotionProps {
  const reduced = useReducedMotion();
  const originRef = useRef<string>('50% 50%');
  const prevOpen = useRef<boolean>(false);

  if (open && !prevOpen.current) {
    originRef.current = genieOriginToTransformOrigin(getGenieOrigin());
  }
  prevOpen.current = open;

  if (reduced) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.2, ease: 'easeOut' },
      style: { transformOrigin: originRef.current, willChange: 'opacity' },
    };
  }

  return {
    initial: { opacity: 0, scale: 0.06, filter: 'blur(6px)' },
    animate: { opacity: 1, scale: 1, filter: 'blur(0px)' },
    exit: { opacity: 0, scale: 0.06, filter: 'blur(4px)' },
    transition: {
      type: 'spring',
      stiffness: 320,
      damping: 30,
      mass: 0.9,
      opacity: { duration: 0.28, ease: 'easeOut' },
      filter: { duration: 0.3, ease: 'easeOut' },
    },
    style: { transformOrigin: originRef.current, willChange: 'transform, opacity, filter' },
  };
}
