declare global {
  interface Window {
    plausible?: (
      eventName: string,
      options?: {
        props?: Record<string, string | number | boolean | undefined | null>;
      }
    ) => void;
  }
}

import { isAutomatedEnv } from './env';

/**
 * Safely tracks a custom event with properties to Plausible Analytics.
 * Only triggers in production and when not running in an automated/headless environment.
 */
export function track(
  event: string,
  props?: Record<string, string | number | boolean | undefined | null>
): void {
  const isProd = import.meta.env.PROD;
  const isAutomated = isAutomatedEnv();

  if (isProd && !isAutomated) {
    try {
      if (typeof window !== 'undefined' && window.plausible) {
        window.plausible(event, props ? { props } : undefined);
      }
    } catch (error) {
      console.warn('[Analytics] Failed to track event:', error);
    }
  } else {
    // Development or automated test environments logging
    if (!isAutomated) {
      console.log(`[Analytics - Simulated] ${event}:`, props);
    }
  }
}
