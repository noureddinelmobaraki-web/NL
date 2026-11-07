/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

const isProd = import.meta.env.PROD === true;
const dsn = import.meta.env.VITE_SENTRY_DSN;

let sentryModulePromise: Promise<typeof import('@sentry/react')> | null = null;

function loadSentry(): Promise<typeof import('@sentry/react')> {
  if (!sentryModulePromise) {
    sentryModulePromise = import('@sentry/react');
  }
  return sentryModulePromise;
}

export function initSentry(): void {
  const isIframe = typeof window !== 'undefined' && window !== window.top;
  if (isIframe || !isProd || !dsn) return;

  const start = () => {
    void loadSentry()
      .then((Sentry) => {
        Sentry.init({
          dsn,
          environment: import.meta.env.MODE,
          release: import.meta.env.VITE_APP_VERSION || 'dev',
          tracesSampleRate: 0.1,
          replaysOnErrorSampleRate: 0,
        });
      })
      .catch(() => {});
  };

  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    window.requestIdleCallback(start, { timeout: 3000 });
  } else {
    setTimeout(start, 1500);
  }
}

export function captureError(error: unknown, context?: Record<string, unknown>): void {
  const isIframe = typeof window !== 'undefined' && window !== window.top;
  if (isProd && dsn && !isIframe) {
    void loadSentry()
      .then((Sentry) => {
        Sentry.captureException(error, {
          extra: context,
        });
      })
      .catch(() => {});
  }
}
