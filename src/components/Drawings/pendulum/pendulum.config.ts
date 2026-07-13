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
  angularDamping: number;
  /** max angle while dragging (rad) */
  maxGrabAngle: number;
  /** max velocity allowed for the pendulum (rad/s) */
  maxAngularVelocity: number;
  /** exponential smoothing coefficient for velocity release tracking */
  releaseSmoothing: number;
  /** small starting angle so the window looks alive when it enters view */
  initialAngle: number;
  /** sleep thresholds: below these (and not dragging) the loop stops itself */
  restAngle: number;
  restOmega: number;
  /** fixed integration timestep (s) for frame-rate independence */
  fixedStep: number;
  /** clamp for a single animation-frame delta (s) */
  maxFrame: number;
  /** safety cap on fixed substeps per frame */
  maxSubSteps: number;
  /** px the pointer must travel before a press becomes a swing-drag */
  dragThreshold: number;
}

export const DEFAULT_PENDULUM: PendulumConfig = {
  gravity: 980,
  length: 286,
  angularDamping: 1.55,
  maxGrabAngle: 0.78,
  maxAngularVelocity: 2.4,
  releaseSmoothing: 0.24,
  initialAngle: 0.075,
  restAngle: 0.0025,
  restOmega: 0.012,
  fixedStep: 1 / 120,
  maxFrame: 0.034,
  maxSubSteps: 5,
  dragThreshold: 7,
};
