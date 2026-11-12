/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * launcherIntro.timeline — Single source of truth for the "Genesis Sequence".
 * Pure data + pure math. No React, no DOM.
 */
import type { Transition } from 'framer-motion';
import type { Pt } from '../graph.geometry';
import type { Size } from '../useStageSize';

export type IntroPhase =
  | 'boot'
  | 'focusMe'
  | 'homePortal'
  | 'pullBack'
  | 'profileBox'
  | 'branchBurst'
  | 'settle'
  | 'done';

export interface GraphScript {
  readonly root: string | null;
  readonly branch: string | null;
  readonly sub: string | null;
}

export interface IntroCue {
  readonly at: number;
  readonly phase: IntroPhase;
  readonly graph?: GraphScript;
}

type Bezier = [number, number, number, number];

const g = (root: string | null, branch: string | null = null, sub: string | null = null): GraphScript => ({
  root,
  branch,
  sub,
});

export const GRAPH_RESET: GraphScript = g(null);

export const INTRO_TOTAL_MS = 10_200;
export const INTRO_SKIP_SETTLE_MS = 560;
export const INTRO_STORAGE_KEY = 'nl:launcher-intro:v1';

/** Ordered cue sheet. `at` is ms from intro start. */
export const INTRO_CUES: readonly IntroCue[] = [
  { at: 0, phase: 'boot', graph: GRAPH_RESET },
  { at: 650, phase: 'focusMe' },
  { at: 1_900, phase: 'homePortal', graph: g('me') },
  { at: 3_500, phase: 'pullBack' },
  { at: 4_500, phase: 'profileBox', graph: GRAPH_RESET },
  { at: 5_900, phase: 'branchBurst', graph: g('ent') },
  { at: 6_500, phase: 'branchBurst', graph: g('ent', 'watch') },
  { at: 7_150, phase: 'branchBurst', graph: g('ent', 'listen') },
  { at: 7_700, phase: 'branchBurst', graph: g('ent', 'read', 'art') },
  { at: 8_350, phase: 'branchBurst', graph: g('nos') },
  { at: 9_000, phase: 'settle', graph: GRAPH_RESET },
  { at: INTRO_TOTAL_MS, phase: 'done' },
];

/* ------------------------------------------------------------------ */
/* Camera                                                              */
/* ------------------------------------------------------------------ */

export type CameraFocus = 'center' | 'me' | 'home';

export interface CameraPose {
  readonly scale: number;
  readonly rotateX: number;
  readonly rotateY: number;
  readonly z: number;
  readonly focus: CameraFocus;
}

export type CameraTarget = {
  x: number;
  y: number;
  scale: number;
  rotateX: number;
  rotateY: number;
  z: number;
};

export const CAMERA_INITIAL: CameraTarget = {
  x: 0,
  y: 0,
  scale: 1.38,
  rotateX: 24,
  rotateY: 0,
  z: -280,
};

export const CAMERA_POSES: Record<IntroPhase, CameraPose> = {
  boot: { scale: 0.94, rotateX: 10, rotateY: 0, z: -60, focus: 'center' },
  focusMe: { scale: 2.15, rotateX: 6, rotateY: -14, z: 0, focus: 'me' },
  homePortal: { scale: 2.45, rotateX: 3, rotateY: 10, z: 60, focus: 'home' },
  pullBack: { scale: 1.08, rotateX: -4, rotateY: 4, z: 0, focus: 'center' },
  profileBox: { scale: 1, rotateX: 0, rotateY: 0, z: 0, focus: 'center' },
  branchBurst: { scale: 1.04, rotateX: 5, rotateY: -3, z: 0, focus: 'center' },
  settle: { scale: 1, rotateX: 0, rotateY: 0, z: 0, focus: 'center' },
  done: { scale: 1, rotateX: 0, rotateY: 0, z: 0, focus: 'center' },
};

const EASE_EXPO_OUT: Bezier = [0.16, 1, 0.3, 1];
const EASE_CINE_INOUT: Bezier = [0.65, 0, 0.35, 1];
const EASE_SOFT_OUT: Bezier = [0.33, 1, 0.68, 1];
const EASE_GLASS: Bezier = [0.22, 1, 0.36, 1];

export const CAMERA_TRANSITIONS: Record<IntroPhase, Transition> = {
  boot: { duration: 0.65, ease: EASE_EXPO_OUT },
  focusMe: { duration: 1.25, ease: EASE_CINE_INOUT },
  homePortal: { duration: 1.5, ease: EASE_SOFT_OUT },
  pullBack: { duration: 1.0, ease: EASE_GLASS },
  profileBox: { duration: 0.6, ease: EASE_GLASS },
  branchBurst: { type: 'spring', stiffness: 120, damping: 20, mass: 1 },
  settle: { type: 'spring', stiffness: 140, damping: 22, mass: 1 },
  done: { duration: 0 },
};

/* ------------------------------------------------------------------ */
/* Anchors + camera math                                               */
/* ------------------------------------------------------------------ */

export interface IntroAnchors {
  me: Pt | null;
  home: Pt | null;
  size: Size;
}

export const EMPTY_ANCHORS: IntroAnchors = { me: null, home: null, size: { w: 0, h: 0 } };

export const MOBILE_BREAKPOINT = 768;
const MOBILE_ZOOM_DAMPING = 0.72;
const MOBILE_ROTATION_DAMPING = 0.6;

/**
 * With transform-origin 50% 50%, a stage point p maps to: c + T + s·(p − c).
 * To bring p to the centre c we need T = s·(c − p).
 */
export function computeCameraTarget(pose: CameraPose, anchors: IntroAnchors): CameraTarget {
  const { w, h } = anchors.size;
  const isMobile = w > 0 && w < MOBILE_BREAKPOINT;
  const scale = isMobile ? 1 + (pose.scale - 1) * MOBILE_ZOOM_DAMPING : pose.scale;
  const rotateX = isMobile ? pose.rotateX * MOBILE_ROTATION_DAMPING : pose.rotateX;
  const rotateY = isMobile ? pose.rotateY * MOBILE_ROTATION_DAMPING : pose.rotateY;

  const focusPt =
    pose.focus === 'me' ? anchors.me : pose.focus === 'home' ? (anchors.home ?? anchors.me) : null;

  if (!focusPt || w === 0 || h === 0) {
    return { x: 0, y: 0, scale, rotateX, rotateY, z: pose.z };
  }

  return {
    x: (w / 2 - focusPt.x) * scale,
    y: (h / 2 - focusPt.y) * scale,
    scale,
    rotateX,
    rotateY,
    z: pose.z,
  };
}

export function sameAnchors(a: IntroAnchors, b: IntroAnchors): boolean {
  const samePt = (p: Pt | null, q: Pt | null) =>
    p === q || (p !== null && q !== null && p.x === q.x && p.y === q.y);
  return a.size.w === b.size.w && a.size.h === b.size.h && samePt(a.me, b.me) && samePt(a.home, b.home);
}
