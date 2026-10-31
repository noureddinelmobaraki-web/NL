import { useSyncExternalStore } from 'react';
import type { MotionProfileName } from '../../../quality/motion/motionProfile.types';
import { useMotionProfile } from '../../../quality/motion/useMotionProfile';

export type GlassTier = 'liquid' | 'frost' | 'lite';

export interface GlassTierInputs {
  motionProfile: MotionProfileName;
  lowPerfClass: boolean;
  saveData: boolean;
  deviceMemory: number;
  hardwareConcurrency: number;
  fineHover: boolean;
  wideViewport: boolean;
}

interface NavigatorBrand {
  brand: string;
  version?: string;
}

interface NavigatorWithExtras extends Navigator {
  deviceMemory?: number;
  connection?: {
    saveData?: boolean;
    addEventListener?: (type: string, listener: () => void) => void;
    removeEventListener?: (type: string, listener: () => void) => void;
  };
  userAgentData?: {
    brands?: NavigatorBrand[];
  };
}

interface EnvSnapshot {
  lowPerfClass: boolean;
  saveData: boolean;
  deviceMemory: number;
  hardwareConcurrency: number;
  fineHover: boolean;
  wideViewport: boolean;
}

const SERVER_ENV_SNAPSHOT: EnvSnapshot = {
  lowPerfClass: false,
  saveData: false,
  deviceMemory: 8,
  hardwareConcurrency: 8,
  fineHover: false,
  wideViewport: false,
};

export function resolveGlassTier(inputs: GlassTierInputs): GlassTier {
  if (
    inputs.motionProfile === 'reduced' ||
    inputs.lowPerfClass ||
    inputs.saveData ||
    inputs.deviceMemory <= 2 ||
    inputs.hardwareConcurrency <= 2
  ) {
    return 'lite';
  }
  if (inputs.motionProfile === 'full' && inputs.fineHover && inputs.wideViewport) {
    return 'liquid';
  }
  return 'frost';
}

export function supportsRefraction(nav?: NavigatorWithExtras): boolean {
  const targetNav =
    nav ?? (typeof navigator !== 'undefined' ? (navigator as NavigatorWithExtras) : undefined);
  const brands = targetNav?.userAgentData?.brands;
  if (!Array.isArray(brands)) return false;
  return brands.some((entry) => typeof entry?.brand === 'string' && entry.brand.includes('Chromium'));
}

let envSnapshot: EnvSnapshot = SERVER_ENV_SNAPSHOT;
let initialized = false;
let cleanup: (() => void) | null = null;
const listeners = new Set<() => void>();

function readBrowserEnv(): EnvSnapshot {
  const nav = navigator as NavigatorWithExtras;
  return {
    lowPerfClass: typeof document !== 'undefined' && document.body?.classList.contains('low-perf'),
    saveData: Boolean(nav.connection?.saveData),
    deviceMemory: nav.deviceMemory ?? 8,
    hardwareConcurrency: nav.hardwareConcurrency ?? 8,
    fineHover: window.matchMedia('(hover: hover) and (pointer: fine)').matches,
    wideViewport: window.matchMedia('(min-width: 768px)').matches,
  };
}

function sameEnv(a: EnvSnapshot, b: EnvSnapshot): boolean {
  return (
    a.lowPerfClass === b.lowPerfClass &&
    a.saveData === b.saveData &&
    a.deviceMemory === b.deviceMemory &&
    a.hardwareConcurrency === b.hardwareConcurrency &&
    a.fineHover === b.fineHover &&
    a.wideViewport === b.wideViewport
  );
}

function initializeEnvStore(): void {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  const queries = [
    window.matchMedia('(hover: hover) and (pointer: fine)'),
    window.matchMedia('(min-width: 768px)'),
  ];

  const update = () => {
    const next = readBrowserEnv();
    if (sameEnv(envSnapshot, next)) return;
    envSnapshot = next;
    listeners.forEach((listener) => listener());
  };

  queries.forEach((q) => q.addEventListener?.('change', update));
  const nav = navigator as NavigatorWithExtras;
  nav.connection?.addEventListener?.('change', update);

  let bodyObserver: MutationObserver | null = null;
  if (typeof MutationObserver !== 'undefined' && document.body) {
    bodyObserver = new MutationObserver(update);
    bodyObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }

  update();

  cleanup = () => {
    queries.forEach((q) => q.removeEventListener?.('change', update));
    nav.connection?.removeEventListener?.('change', update);
    bodyObserver?.disconnect();
    initialized = false;
    cleanup = null;
  };
}

function subscribeEnv(listener: () => void): () => void {
  initializeEnvStore();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) cleanup?.();
  };
}

function getEnvSnapshot(): EnvSnapshot {
  if (typeof window !== 'undefined') initializeEnvStore();
  return envSnapshot;
}

function getEnvServerSnapshot(): EnvSnapshot {
  return SERVER_ENV_SNAPSHOT;
}

export function useGlassTier(): GlassTier {
  const motionProfile = useMotionProfile();
  const env = useSyncExternalStore(subscribeEnv, getEnvSnapshot, getEnvServerSnapshot);

  return resolveGlassTier({
    motionProfile: motionProfile.name,
    lowPerfClass: env.lowPerfClass,
    saveData: env.saveData,
    deviceMemory: env.deviceMemory,
    hardwareConcurrency: env.hardwareConcurrency,
    fineHover: env.fineHover,
    wideViewport: env.wideViewport,
  });
}
