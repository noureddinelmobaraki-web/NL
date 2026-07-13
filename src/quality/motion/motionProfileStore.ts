import type { MotionProfile, MotionProfileInputs } from './motionProfile.types';

const SERVER_PROFILE: MotionProfile = {
  name: 'reduced',
  connectionDelayMs: 0,
  drawDurationMs: 0,
  allowSpringOvershoot: false,
};

export function resolveMotionProfile(inputs: MotionProfileInputs): MotionProfile {
  if (inputs.reducedMotion) return SERVER_PROFILE;
  if (inputs.coarsePointer || inputs.narrowViewport) {
    return {
      name: 'balanced',
      connectionDelayMs: 80,
      drawDurationMs: 260,
      allowSpringOvershoot: false,
    };
  }
  return {
    name: 'full',
    connectionDelayMs: 120,
    drawDurationMs: 420,
    allowSpringOvershoot: true,
  };
}

let snapshot: MotionProfile = SERVER_PROFILE;
let initialized = false;
let cleanup: (() => void) | null = null;
const listeners = new Set<() => void>();

function readBrowserInputs(): MotionProfileInputs {
  return {
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    coarsePointer: window.matchMedia('(pointer: coarse)').matches,
    narrowViewport: window.matchMedia('(max-width: 767px)').matches,
  };
}

function sameProfile(a: MotionProfile, b: MotionProfile): boolean {
  return a.name === b.name
    && a.connectionDelayMs === b.connectionDelayMs
    && a.drawDurationMs === b.drawDurationMs
    && a.allowSpringOvershoot === b.allowSpringOvershoot;
}

function initialize(): void {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  const queries = [
    window.matchMedia('(prefers-reduced-motion: reduce)'),
    window.matchMedia('(pointer: coarse)'),
    window.matchMedia('(max-width: 767px)'),
  ];
  const update = () => {
    const next = resolveMotionProfile(readBrowserInputs());
    if (sameProfile(snapshot, next)) return;
    snapshot = next;
    listeners.forEach((listener) => listener());
  };
  queries.forEach((query) => query.addEventListener?.('change', update));
  update();
  cleanup = () => {
    queries.forEach((query) => query.removeEventListener?.('change', update));
    initialized = false;
    cleanup = null;
  };
}

export function subscribeMotionProfile(listener: () => void): () => void {
  initialize();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) cleanup?.();
  };
}

export function getMotionProfileSnapshot(): MotionProfile {
  if (typeof window !== 'undefined') initialize();
  return snapshot;
}

export function getMotionProfileServerSnapshot(): MotionProfile {
  return SERVER_PROFILE;
}
