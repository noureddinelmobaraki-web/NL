export type MotionProfileName = 'full' | 'balanced' | 'reduced';

export interface MotionProfileInputs {
  reducedMotion: boolean;
  coarsePointer: boolean;
  narrowViewport: boolean;
}

export interface MotionProfile {
  name: MotionProfileName;
  connectionDelayMs: number;
  drawDurationMs: number;
  allowSpringOvershoot: boolean;
}
