import type { MotionProfileName } from '../../quality/motion/motionProfile.types';

export type LauncherEase = [number, number, number, number];

export interface LauncherRevealSpec {
  duration: number;
  ease: LauncherEase;
}

const EASE: LauncherEase = [0.22, 1, 0.36, 1];

/** One authoritative timeline for both node travel and ray drawing. */
export function getLauncherRevealSpec(profile: MotionProfileName): LauncherRevealSpec {
  if (profile === 'reduced') return { duration: 0, ease: EASE };
  if (profile === 'balanced') return { duration: 0.28, ease: EASE };
  return { duration: 0.38, ease: EASE };
}
