/**
 * Enhanced Sentry Integration - Consolidated
 *
 * Provides deep Sentry integration with context, breadcrumbs, and user tracking.
 * Captures all errors with full context for debugging.
 * Uses environment variables for configuration (no hardcoded DSN).
 */

// @deno-types="https://deno.land/x/sentry/types/index.d.ts"
// @ts-expect-error - Sentry module is available at runtime in Deno
import * as sentryModule from 'sentry';

type SentryModule = typeof sentryModule & {
  init?: typeof sentryModule.init;
};

const sentry = sentryModule as SentryModule;

// @ts-expect-error - Deno.env is available at runtime in Deno
const SENTRY_DSN = Deno.env.get('SENTRY_DSN');
// @ts-expect-error - Deno.env is available at runtime in Deno
const ENVIRONMENT = Deno.env.get('ENVIRONMENT') || 'production';
// @ts-expect-error - Deno.env is available at runtime in Deno
const RELEASE_VERSION = Deno.env.get('RELEASE_VERSION') || 'unknown';

const hasInit = typeof sentry.init === 'function';
const hasGetCurrentHub = typeof sentry.getCurrentHub === 'function';

const SENTRY_SUPPORTED =
  !!SENTRY_DSN &&
  hasInit &&
  hasGetCurrentHub &&
  typeof sentry.setUser === 'function' &&
  typeof sentry.addBreadcrumb === 'function' &&
  typeof sentry.captureException === 'function';

if (SENTRY_SUPPORTED && !sentry.getCurrentHub().getClient()) {
  sentry.init?.({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,
    tracesSampleRate: parseFloat(
      // @ts-expect-error - Deno.env is available at runtime in Deno
      Deno.env.get('SENTRY_TRACES_SAMPLE_RATE') || '0.1',
    ),
    release: RELEASE_VERSION,
    beforeSend(event: unknown, _hint: unknown) {
      // Redact PII from event before sending
      const eventTyped = event as { user?: { id?: string; email?: string; username?: string }; tags?: { email?: string; phone?: string } };
      if (eventTyped.user) {
        // Hash user ID instead of sending directly
        if (eventTyped.user.id) {
          eventTyped.user.id = `hashed_${hashString(eventTyped.user.id)}`;
        }
        // Remove email
        delete eventTyped.user.email;
        delete eventTyped.user.username;
      }

      // Remove sensitive data from tags
      if (eventTyped.tags) {
        delete eventTyped.tags.email;
        delete eventTyped.tags.phone;
      }

      return eventTyped as unknown;
    },
  });
} else if (!SENTRY_SUPPORTED && SENTRY_DSN) {
  console.warn(
    'Sentry SDK not fully supported in this runtime; error tracking disabled.',
  );
}

/**
 * Simple hash function (non-cryptographic, for privacy)
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
 * Set user context for Sentry
 */
export function setUserContext(
  userId: string,
  metadata?: {
    email?: string;
    username?: string;
    subscriptionTier?: string;
  },
): void {
  if (!SENTRY_SUPPORTED) return;
  sentry.setUser({
    id: hashString(userId), // Hash for privacy
    // Don't include email/username (PII)
    subscription_tier: metadata?.subscriptionTier,
  });
}

/**
 * Add breadcrumb to Sentry
 */
export function addBreadcrumb(
  message: string,
  category: string = 'custom',
  level: 'info' | 'warning' | 'error' | 'debug' = 'info',
  data?: Record<string, unknown>,
): void {
  if (!SENTRY_SUPPORTED) return;
  sentry.addBreadcrumb({
    message,
    category,
    level,
    data: data ? sanitizeBreadcrumbData(data) : undefined,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Sanitize breadcrumb data (remove PII)
 */
function sanitizeBreadcrumbData(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();

    // Skip PII fields
    if (
      lowerKey.includes('email') ||
      lowerKey.includes('password') ||
      lowerKey.includes('token') ||
      lowerKey.includes('secret') ||
      lowerKey.includes('key')
    ) {
      continue;
    }

    // Hash IDs
    if (lowerKey.includes('id') && typeof value === 'string') {
      sanitized[key] = `hashed_${hashString(value)}`;
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Set custom context/tags
 */
export function setContext(
  key: string,
  context: Record<string, unknown>,
): void {
  if (!SENTRY_SUPPORTED) return;
  sentry.setContext(key, sanitizeBreadcrumbData(context));
}

/**
 * Set tag
 */
export function setTag(key: string, value: string): void {
  if (!SENTRY_SUPPORTED) return;
  sentry.setTag(key, value);
}

/**
 * Capture exception with full context
 */
export function captureException(
  error: Error,
  context?: {
    function?: string;
    userId?: string;
    traceId?: string;
    metadata?: Record<string, unknown>;
  },
): string {
  if (!SENTRY_SUPPORTED) {
    return 'sentry_disabled';
  }
  // Add context
  if (context) {
    if (context.function) {
      setTag('function', context.function);
    }
    if (context.userId) {
      setUserContext(context.userId);
    }
    if (context.traceId) {
      setTag('trace_id', context.traceId);
    }
    if (context.metadata) {
      setContext('custom', context.metadata);
    }
  }

  return sentry.captureException(error);
}

/**
 * Capture message
 */
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' | 'fatal' | 'debug' = 'info',
  context?: {
    function?: string;
    userId?: string;
    traceId?: string;
    metadata?: Record<string, unknown>;
  },
): string {
  if (!SENTRY_SUPPORTED) {
    return 'sentry_disabled';
  }
  // Add context
  if (context) {
    if (context.function) {
      setTag('function', context.function);
    }
    if (context.userId) {
      setUserContext(context.userId);
    }
    if (context.traceId) {
      setTag('trace_id', context.traceId);
    }
    if (context.metadata) {
      setContext('custom', context.metadata);
    }
  }

  return sentry.captureMessage(message, level);
}

/**
 * Wrap a function with Sentry error tracking and breadcrumbs
 */
export function withSentry<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  functionName: string,
): T {
  return (async (...args: unknown[]) => {
    if (SENTRY_SUPPORTED) {
      // Add breadcrumb for function start
      addBreadcrumb(`Starting ${functionName}`, 'function', 'info', {
        function: functionName,
        args_count: args.length,
      });
    }

    try {
      const result = await fn(...args);

      if (SENTRY_SUPPORTED) {
        // Add breadcrumb for success
        addBreadcrumb(`Completed ${functionName}`, 'function', 'info', {
          function: functionName,
          success: true,
        });
      }

      return result;
    } catch (error) {
      if (SENTRY_SUPPORTED) {
        // Capture exception with context
        captureException(
          error instanceof Error ? error : new Error(String(error)),
          {
            function: functionName,
          },
        );
      }

      throw error;
    }
  }) as T;
}
