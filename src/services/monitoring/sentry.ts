/**
 * Layer 2 & 3: Remote structured logging and performance tracing with Sentry
 * 
 * Purpose: 
 * - Layer 2: Debug device-only and production-only issues
 * - Layer 3: Measure startup performance without polluting logs
 * 
 * Rules:
 * - Log only: Startup timeouts, Auth failures, Navigation failures, Unexpected recoverable errors
 * - Do NOT log: UI noise, user actions
 * - Privacy: Strip tokens, emails, user IDs (or hash them)
 */

import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import type { Event, EventHint, Transaction } from '@sentry/react-native';

type SentryModule = {
  init?: (options: {
    dsn: string;
    enabled?: boolean;
    environment?: string;
    release?: string;
    tracesSampleRate?: number;
    enableAutoSessionTracking?: boolean;
    sessionTrackingIntervalMillis?: number;
    beforeSend?: (event: Event, hint: EventHint) => Event | null;
  }) => void;
  setTag?: (key: string, value: string) => void;
  captureException?: (error: Error, context?: { extra?: Record<string, unknown>; level?: string }) => void;
  captureMessage?: (message: string, level?: string) => void;
  setUser?: (user: { id: string }) => void;
  addBreadcrumb?: (breadcrumb: {
    message: string;
    category?: string;
    level?: string;
    data?: Record<string, unknown>;
  }) => void;
  startTransaction?: (options: { name: string; op?: string }) => Transaction;
};

let Sentry: SentryModule | null = null;
try {
  Sentry = require('@sentry/react-native') as SentryModule;
} catch (e) {
  // Sentry package not available - continue without it
}

/**
 * Hash string for privacy (non-cryptographic)
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).padStart(8, '0');
}

/**
 * Redact PII from object
 */
function redactPIIFromObject(obj: Record<string, unknown>): void {
  if (!obj || typeof obj !== 'object') return;

  const piiFields = [
    'email',
    'phone',
    'password',
    'token',
    'secret',
    'key',
    'ssn',
    'creditCard',
    'access_token',
    'refresh_token',
    'apiKey',
    'dsn',
  ];

  for (const key in obj) {
    const lowerKey = key.toLowerCase();

    if (piiFields.some(pii => lowerKey.includes(pii))) {
      obj[key] = '[REDACTED]';
    } else if (
      typeof obj[key] === 'object' &&
      obj[key] !== null &&
      !Array.isArray(obj[key])
    ) {
      redactPIIFromObject(obj[key] as Record<string, unknown>);
    }
  }
}

/**
 * Initialize Sentry for remote logging and performance tracing
 */
export function initializeSentry(dsn?: string): void {
  if (!Sentry || !dsn) {
    return;
  }

  const release =
    Constants.expoConfig?.extra?.EXPO_PUBLIC_APP_VERSION ||
    Constants.expoConfig?.version ||
    'unknown';
  const environment = __DEV__ ? 'development' : 'production';

  Sentry.init({
    dsn,
    enabled: !__DEV__, // Disable in development (use console logs instead)
    environment,
    release,
    tracesSampleRate: __DEV__ ? 1.0 : 0.1, // 100% in dev, 10% in prod
    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 30000,
    beforeSend: (event: Event, hint: EventHint) => {
      // Redact PII from event
      if (event.user) {
        if (event.user.id) {
          event.user.id = `hashed_${hashString(event.user.id)}`;
        }
        delete event.user.email;
        delete event.user.username;
      }

      if (event.tags) {
        delete event.tags.email;
        delete event.tags.phone;
        delete event.tags.userId;
      }

      if (event.extra) {
        redactPIIFromObject(event.extra as Record<string, unknown>);
      }

      // Filter out non-critical errors
      if (event.level === 'warning' && event.exception) {
        const error = event.exception.values?.[0];
        if (
          error?.type === 'NetworkError' ||
          error?.type === 'TimeoutError'
        ) {
          // These are handled by retry logic, don't need to alert
          return null;
        }
      }

      return event;
    },
  });

  // Set initial context
  if (Sentry?.setTag) {
    Sentry.setTag('platform', Constants.platform?.ios ? 'ios' : 'android');
    Sentry.setTag('update_channel', Updates.channel || 'default');
  }
}

/**
 * Layer 2: Capture structured event (for startup timeouts, auth failures, etc.)
 */
export function captureEvent(name: string, payload?: Record<string, unknown>): void {
  if (!Sentry?.addBreadcrumb) return;

  const redactedPayload = payload ? { ...payload } : undefined;
  if (redactedPayload) {
    redactPIIFromObject(redactedPayload);
  }

  Sentry.addBreadcrumb({
    message: name,
    category: 'startup',
    level: 'info',
    data: redactedPayload,
  });
}

/**
 * Layer 2: Capture error (for unexpected recoverable errors)
 */
export function captureError(error: unknown, context?: Record<string, unknown>): void {
  if (!Sentry?.captureException) return;

  const redactedContext = context ? { ...context } : undefined;
  if (redactedContext) {
    redactPIIFromObject(redactedContext);
  }

  const errorObj = error instanceof Error ? error : new Error(String(error));
  Sentry.captureException(errorObj, {
    extra: redactedContext,
  });
}

/**
 * Layer 2: Add breadcrumb for startup phase tracking
 * Accepts either a message string or an object with message property
 */
export function addBreadcrumb(
  messageOrObj: string | { message: string; data?: Record<string, unknown> },
  data?: Record<string, unknown>
): void {
  if (!Sentry?.addBreadcrumb) return;

  const message = typeof messageOrObj === 'string' ? messageOrObj : messageOrObj.message;
  const breadcrumbData = typeof messageOrObj === 'string' ? data : messageOrObj.data;

  const redactedData = breadcrumbData ? { ...breadcrumbData } : undefined;
  if (redactedData) {
    redactPIIFromObject(redactedData);
  }

  Sentry.addBreadcrumb({
    message,
    category: 'startup',
    level: 'info',
    data: redactedData,
  });
}

/**
 * Layer 3: Start performance transaction for app startup
 */
export function startStartupTransaction(): Transaction | null {
  if (!Sentry?.startTransaction) return null;

  return Sentry.startTransaction({
    name: 'app_startup',
    op: 'app.startup',
  });
}

/**
 * Layer 3: Start child span within transaction
 */
export function startSpan(
  transaction: Transaction,
  description: string,
  op: string = 'app.operation',
): ReturnType<Transaction['startChild']> | null {
  if (!transaction) return null;

  return transaction.startChild({
    description,
    op,
  });
}

/**
 * Layer 3: Finish span
 */
export function finishSpan(span: ReturnType<Transaction['startChild']> | null): void {
  if (span) {
    span.finish();
  }
}

/**
 * Layer 3: Finish transaction
 */
export function finishTransaction(transaction: Transaction | null): void {
  if (transaction) {
    transaction.finish();
  }
}

