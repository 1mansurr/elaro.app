import * as Sentry from 'https://esm.sh/@sentry/deno@7.77.0';

export function initSentry() {
  Sentry.init({
    dsn: 'https://d6d181c65451966f19f478043f757442@o4509741415661568.ingest.de.sentry.io/4509741458849872',
    tracesSampleRate: 1.0,
  });
}

export function captureException(error: any) {
  Sentry.captureException(error);
}
