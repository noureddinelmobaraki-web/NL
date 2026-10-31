import type { MotionProfileName } from '../../quality/motion/motionProfile.types';
import type { GlassTier } from './glass/useGlassTier';

export type LauncherEase = [number, number, number, number];

export interface LauncherRevealSpec {
  duration: number;
  ease: LauncherEase;
}

export interface GlassTierRevealSpec {
  type: 'spring' | 'tween';
  duration: number;
  exitDuration: number;
  ease: LauncherEase;
  stiffness: number;
  damping: number;
  delay: number;
  staggerMs: number;
  allowSpringOvershoot: boolean;
}

const EASE: LauncherEase = [0.22, 1, 0.36, 1];

/** One authoritative timeline for both node travel and ray drawing (legacy motionProfile signature). */
export function getLauncherRevealSpec(profile: MotionProfileName): LauncherRevealSpec {
  if (profile === 'reduced') return { duration: 0, ease: EASE };
  if (profile === 'balanced') return { duration: 0.28, ease: EASE };
  return { duration: 0.38, ease: EASE };
}

/**
 * Shared timeline for both droplet node reveal and connector ray drawing per GlassTier.
 * Keeps identical timing/stagger so the ray tip always stays attached to the moving pill.
 */
export function getGlassTierRevealSpec(
  tier: GlassTier,
  siblingIndex = 0,
): GlassTierRevealSpec {
  if (tier === 'lite') {
    return {
      type: 'tween',
      duration: 0,
      exitDuration: 0,
      ease: EASE,
      stiffness: 380,
      damping: 30,
      delay: 0,
      staggerMs: 0,
      allowSpringOvershoot: false,
    };
  }

  if (tier === 'frost') {
    const duration = 0.24;
    return {
      type: 'tween',
      duration,
      exitDuration: duration * 0.8,
      ease: EASE,
      stiffness: 380,
      damping: 30,
      delay: siblingIndex * 0.02,
      staggerMs: 20,
      allowSpringOvershoot: false,
    };
  }

  const duration = 0.38;
  return {
    type: 'spring',
    duration,
    exitDuration: duration * 0.8,
    ease: EASE,
    stiffness: 380,
    damping: 30,
    delay: siblingIndex * 0.035,
    staggerMs: 35,
    allowSpringOvershoot: true,
  };
}
