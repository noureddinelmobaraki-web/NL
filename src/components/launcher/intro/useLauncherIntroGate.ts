/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * useLauncherIntroGate — Decides ONCE (on mount) whether the Genesis Sequence plays.
 */
import { useEffect, useState } from 'react';
import { isAutomatedEnv } from '../../../utils/env';
import type { GlassTier } from '../glass/useGlassTier';
import { INTRO_STORAGE_KEY } from './launcherIntro.timeline';

export interface IntroGateInputs {
  urlFlag: '1' | '0' | null;
  alreadyPlayed: boolean;
  reducedMotion: boolean;
  automated: boolean;
  hidden: boolean;
  glassTier: GlassTier;
}

export function decideIntro(inputs: IntroGateInputs): boolean {
  if (inputs.urlFlag === '0') return false;
  if (inputs.urlFlag === '1') return true;
  if (inputs.automated || inputs.reducedMotion || inputs.hidden) return false;
  if (inputs.glassTier === 'lite') return false;
  return !inputs.alreadyPlayed;
}

function readGateInputs(glassTier: GlassTier): IntroGateInputs {
  if (typeof window === 'undefined') {
    return {
      urlFlag: null,
      alreadyPlayed: true,
      reducedMotion: true,
      automated: true,
      hidden: true,
      glassTier,
    };
  }

  let urlFlag: IntroGateInputs['urlFlag'] = null;
  try {
    const value = new URLSearchParams(window.location.search).get('intro');
    urlFlag = value === '1' || value === '0' ? value : null;
  } catch {
    /* ignore */
  }

  let alreadyPlayed = false;
  try {
    alreadyPlayed = window.sessionStorage.getItem(INTRO_STORAGE_KEY) === 'played';
  } catch {
    /* ignore */
  }

  return {
    urlFlag,
    alreadyPlayed,
    reducedMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
    automated: isAutomatedEnv(),
    hidden: typeof document !== 'undefined' && document.hidden,
    glassTier,
  };
}

export function useLauncherIntroGate(glassTier: GlassTier): boolean {
  const [shouldPlay] = useState<boolean>(() => decideIntro(readGateInputs(glassTier)));

  useEffect(() => {
    if (!shouldPlay) return;
    try {
      window.sessionStorage.setItem(INTRO_STORAGE_KEY, 'played');
    } catch {
      /* ignore */
    }
  }, [shouldPlay]);

  return shouldPlay;
}
