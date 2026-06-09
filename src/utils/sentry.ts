import * as Sentry from '@sentry/react';

const isProd = import.meta.env.PROD === true;
const dsn = import.meta.env.VITE_SENTRY_DSN;

export function initSentry(): void {
  if (isProd && dsn) {
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      release: import.meta.env.VITE_APP_VERSION || 'dev',
      tracesSampleRate: 0.1,
      replaysOnErrorSampleRate: 0,
    });
  }
}

export function captureError(error: unknown, context?: Record<string, unknown>): void {
  if (isProd && dsn) {
    Sentry.captureException(error, {
      extra: context,
    });
  }
}
