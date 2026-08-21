import * as Sentry from '@sentry/node';

const dsn = process.env.SENTRY_DSN;

export const sentryEnabled = !!dsn;

export function initSentry() {
  if (!dsn) {
    console.log('[Sentry] SENTRY_DSN not set — error tracking disabled.');
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'production',
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
  });

  console.log('[Sentry] Error tracking enabled.');
}

export { Sentry };
