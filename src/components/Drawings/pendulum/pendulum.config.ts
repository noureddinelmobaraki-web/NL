/**
 * Tunable constants + types for the Drawings pendulum.
 *
 * Keeping them in one place lets the physics hook stay pure and lets you retune
 * the "feel" (period, damping, elasticity) without touching the simulation.
 */
export interface PendulumConfig {
  /** gravity (px/s^2) — higher = faster swing */
  gravity: number;
  /** pendulum length (px): pivot -> window center — higher = slower swing */
  length: number;
  /** angular damping — higher = the swing dies down faster */
  damping: number;
  /** elastic stretch gain (px) driven by rope tension */
  stretchGain: number;
  /** rope spring stiffness */
  springK: number;
  /** rope spring damping */
  springDamp: number;
  /** max angle while dragging (rad ~ 75deg) */
  maxGrabAngle: number;
  /** rope compression clamp (px) */
  minStretch: number;
  /** rope stretch clamp (px) */
  maxStretch: number;
  /** small starting angle so the window looks alive when it enters view */
  initialAngle: number;
  /** sleep thresholds: below these (and not dragging) the loop stops itself */
  restAngle: number;
  restOmega: number;
  /** fixed integration timestep (s) for frame-rate independence */
  fixedStep: number;
  /** clamp for a single animation-frame delta (s) */
  maxFrame: number;
  /** safety cap on fixed substeps per frame (prevents a spiral of death) */
  maxSubSteps: number;
  /** px the pointer must travel before a press becomes a swing-drag */
  dragThreshold: number;
}

export const DEFAULT_PENDULUM: PendulumConfig = {
  gravity: 650,
  length: 260,
  damping: 0.5,
  stretchGain: 22,
  springK: 130,
  springDamp: 22,
  maxGrabAngle: 1.3,
  minStretch: -24,
  maxStretch: 80,
  initialAngle: 0.18,
  restAngle: 0.004,
  restOmega: 0.02,
  fixedStep: 1 / 120,
  maxFrame: 0.05,
  maxSubSteps: 8,
  dragThreshold: 8,
};
