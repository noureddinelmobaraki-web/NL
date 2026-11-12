/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */
import { useMemo } from 'react';
import type { Transition } from 'framer-motion';
import {
  CAMERA_POSES,
  CAMERA_TRANSITIONS,
  computeCameraTarget,
  type CameraTarget,
  type IntroAnchors,
  type IntroPhase,
} from './launcherIntro.timeline';

export interface IntroCamera {
  animate: CameraTarget;
  transition: Transition;
}

export function useIntroCamera(phase: IntroPhase, anchors: IntroAnchors): IntroCamera {
  return useMemo(
    () => ({
      animate: computeCameraTarget(CAMERA_POSES[phase], anchors),
      transition: CAMERA_TRANSITIONS[phase],
    }),
    [phase, anchors],
  );
}
