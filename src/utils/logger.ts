/**
 * Layer 1: Always-on minimal startup heartbeat logs
 *
 * Purpose: Debug startup deadlocks, white screens, and initialization failures on real devices.
 *
 * Rules:
 * - Always enabled (even in production)
 * - Minimal
 * - No PII
 * - No secrets
 * - No spam
 *
 * To reduce noise after testing: Modify the ENABLED_TAGS array below.
 * No code deletion required - just filter tags here.
 */

type LogTag = 'BOOT' | 'AUTH' | 'NAV' | 'SYNC' | 'SPLASH' | 'PERF';

// CRITICAL: To reduce noise after testing, add tags to this array
// Only logs with tags in ENABLED_TAGS will be output
// Example: const ENABLED_TAGS: LogTag[] = ['BOOT', 'AUTH']; // Only boot and auth logs
const ENABLED_TAGS: LogTag[] = [
  'BOOT',
  'AUTH',
  'NAV',
  'SYNC',
  'SPLASH',
  'PERF',
]; // All enabled during testing

interface LogData {
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Sanitize log data to remove PII and secrets
 */
function sanitizeData(data?: LogData): LogData | undefined {
  if (!data) return undefined;

  const sanitized: LogData = {};
  const sensitiveKeys = [
    'password',
    'token',
    'secret',
    'key',
    'email',
    'phone',
    'ssn',
    'creditCard',
    'access_token',
    'refresh_token',
    'apiKey',
    'dsn',
  ];

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'string' && value.length > 100) {
      // Truncate long strings
      sanitized[key] = value.substring(0, 100) + '...';
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Format log message with tag prefix
 */
function formatMessage(tag: LogTag, event: string, data?: LogData): string {
  const sanitized = sanitizeData(data);
  const dataStr = sanitized ? ` ${JSON.stringify(sanitized)}` : '';
  return `[${tag}] ${event}${dataStr}`;
}

/**
 * Log boot/startup events
 * Always enabled - critical for debugging startup issues
 */
export function logBoot(event: string, data?: LogData): void {
  if (!ENABLED_TAGS.includes('BOOT')) return;
  console.info(formatMessage('BOOT', event, data));
}

/**
 * Log warnings (non-critical issues)
 */
export function logWarn(event: string, data?: LogData): void {
  // Warnings are always logged regardless of tag filter
  const sanitized = sanitizeData(data);
  const message = `[WARN] ${event}${sanitized ? ` ${JSON.stringify(sanitized)}` : ''}`;
  console.warn(message);
}

/**
 * Log errors (critical issues)
 */
export function logError(event: string, data?: LogData): void {
  // Errors are always logged regardless of tag filter
  const sanitized = sanitizeData(data);
  const message = `[ERROR] ${event}${sanitized ? ` ${JSON.stringify(sanitized)}` : ''}`;
  console.error(message);
}

/**
 * Log auth-related events
 */
export function logAuth(event: string, data?: LogData): void {
  if (!ENABLED_TAGS.includes('AUTH')) return;
  console.info(formatMessage('AUTH', event, data));
}

/**
 * Log navigation-related events
 */
export function logNav(event: string, data?: LogData): void {
  if (!ENABLED_TAGS.includes('NAV')) return;
  console.info(formatMessage('NAV', event, data));
}

/**
 * Log sync-related events
 */
export function logSync(event: string, data?: LogData): void {
  if (!ENABLED_TAGS.includes('SYNC')) return;
  console.info(formatMessage('SYNC', event, data));
}

/**
 * Log splash screen events
 */
export function logSplash(event: string, data?: LogData): void {
  if (!ENABLED_TAGS.includes('SPLASH')) return;
  console.info(formatMessage('SPLASH', event, data));
}

/**
 * Log performance events (minimal - detailed perf goes to Sentry)
 */
export function logPerf(event: string, data?: LogData): void {
  if (!ENABLED_TAGS.includes('PERF')) return;
  console.info(formatMessage('PERF', event, data));
}
