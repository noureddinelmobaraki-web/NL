export type HomeMotionMode = 'normal' | 'a777';

export interface HomeMotionCapability {
  eligible: boolean;
  reason: string | null;
}

export const HOME_MOTION_STORAGE_KEY = 'nl-home-motion-mode-v1';
