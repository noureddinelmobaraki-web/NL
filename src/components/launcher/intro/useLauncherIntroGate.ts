/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * useLauncherIntroGate — Unconditionally disabled for instant 0ms entry to Launcher.
 */
import type { GlassTier } from '../glass/useGlassTier';

export interface IntroGateInputs {
  urlFlag: '1' | '0' | null;
  alreadyPlayed: boolean;
  reducedMotion: boolean;
  automated: boolean;
  hidden: boolean;
  glassTier: GlassTier;
}

export function decideIntro(_inputs?: IntroGateInputs): boolean {
  return false;
}

export function useLauncherIntroGate(_glassTier?: GlassTier): boolean {
  return false;
}
