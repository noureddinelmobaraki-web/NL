// src/motion/tokens.ts
// Single source of truth for the launcher motion system.

export const spring = {
  soft:   { type: 'spring' as const, stiffness: 210, damping: 26, mass: 0.9 },
  snappy: { type: 'spring' as const, stiffness: 420, damping: 32 },
};

export const dur = {
  fast: 0.18,
  base: 0.32,
  slow: 0.60,
};

export const ease = {
  out: [0.22, 1, 0.36, 1] as [number, number, number, number],
};

export const stagger = {
  children: 0.045,
};

// Check for reduced motion preference.
export function useReducedMotion() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
