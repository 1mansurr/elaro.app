import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';

type SeverityLevel = 'debug' | 'info' | 'warning' | 'error' | 'fatal';

interface ErrorContext {
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  contexts?: Record<string, unknown>;
  user?: { id: string; email?: string };
  level?: SeverityLevel;
}

class ErrorTrackingService {
  private static instance: ErrorTrackingService;
  private isInitialized = false;

  static getInstance(): ErrorTrackingService {
    if (!ErrorTrackingService.instance) {
      ErrorTrackingService.instance = new ErrorTrackingService();
    }
    return ErrorTrackingService.instance;
  }

  initialize(dsn?: string) {
    if (this.isInitialized) return;

    // Get DSN from config if not provided
    const sentryDsn =
      dsn || Constants.expoConfig?.extra?.EXPO_PUBLIC_SENTRY_DSN;

    if (!sentryDsn) {
      console.warn('⚠️ Sentry DSN not configured - error tracking disabled');
      this.isInitialized = true;
      return;
    }

    try {
      const release =
        Constants.expoConfig?.extra?.EXPO_PUBLIC_APP_VERSION ||
        Constants.expoConfig?.version ||
        'unknown';
      const environment = __DEV__ ? 'development' : 'production';

      Sentry.init({
        dsn: sentryDsn,
        enabled: !__DEV__, // Disable in development
        environment,
        release,
        tracesSampleRate: __DEV__ ? 1.0 : 0.1, // 100% in dev, 10% in prod
        enableAutoSessionTracking: true,
        sessionTrackingIntervalMillis: 30000, // 30 seconds
        beforeSend: (event: any, hint: any) => {
          // Helper function to hash string (same as hashString method)
          const hashString = (str: string): string => {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
              const char = str.charCodeAt(i);
              hash = (hash << 5) - hash + char;
              hash = hash & hash;
            }
            return Math.abs(hash).toString(36).padStart(8, '0');
          };

          // Helper function to redact PII (same as redactPIIFromObject method)
          const redactPIIFromObject = (obj: Record<string, unknown>): void => {
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
          };

          // Redact PII from event
          if (event.user) {
            if (event.user.id) {
              event.user.id = hashString(event.user.id);
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

          // Filter out non-critical errors in production
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
      Sentry.setTag('platform', Constants.platform?.ios ? 'ios' : 'android');
      Sentry.setTag('update_channel', Updates.channel || 'default');

      this.isInitialized = true;
      console.log('✅ Sentry error tracking initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Sentry:', error);
      this.isInitialized = true; // Mark as initialized to prevent retry loops
    }
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36).padStart(8, '0');
  }

  private redactPIIFromObject(obj: Record<string, unknown>): void {
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
        this.redactPIIFromObject(obj[key] as Record<string, unknown>);
      }
    }
  }

  captureError(error: Error, context?: ErrorContext) {
    console.error('Error captured:', error);

    if (!this.isInitialized) {
      return;
    }

    if (context) {
      // Set tags if provided
      if (context.tags) {
        Object.entries(context.tags).forEach(([key, value]) => {
          Sentry.setTag(key, value);
        });
      }

      // Capture exception with extra context
      Sentry.captureException(error, {
        extra: context.extra,
        level: context.level,
      });
    } else {
      Sentry.captureException(error);
    }
  }

  captureMessage(
    message: string,
    level: 'info' | 'warning' | 'error' = 'info',
  ) {
    console.log(`[${level.toUpperCase()}] ${message}`);

    if (this.isInitialized) {
      Sentry.captureMessage(message, level);
    }
  }

  setUser(user: { id: string; email?: string; username?: string }) {
    if (this.isInitialized) {
      const hashedId = this.hashString(user.id);

      Sentry.setUser({
        id: hashedId,
        // Don't include email/username (PII)
      });
    }
  }

  addBreadcrumb(
    message: string,
    category?: string,
    level?: string,
    data?: Record<string, unknown>,
  ) {
    if (this.isInitialized) {
      const redactedData = data ? { ...data } : undefined;
      if (redactedData) {
        this.redactPIIFromObject(redactedData);
      }

      Sentry.addBreadcrumb({
        message,
        category: category || 'user',
        level: (level as SeverityLevel) || 'info',
        data: redactedData,
      });
    }
  }

  /**
   * Track performance metrics
   * Note: Sentry metrics API may not be available in all versions
   */
  trackPerformance(
    metric: string,
    value: number,
    unit: 'ms' | 'bytes' | 'count' = 'ms',
  ) {
    if (this.isInitialized) {
      // Use breadcrumb for performance tracking if metrics API not available
      Sentry.addBreadcrumb({
        message: `Performance: ${metric}`,
        category: 'performance',
        level: 'info',
        data: {
          value,
          unit,
        },
      });
    }
  }

  /**
   * Set alert threshold and track if exceeded
   */
  checkThreshold(
    metric: string,
    value: number,
    threshold: number,
    severity: 'warning' | 'error' = 'warning',
  ) {
    if (value > threshold) {
      const message = `${metric} exceeded threshold: ${value} > ${threshold}`;
      this.captureMessage(message, severity);
      return true;
    }
    return false;
  }

  /**
   * Track custom event with context
   */
  trackEvent(eventName: string, properties?: Record<string, unknown>) {
    if (this.isInitialized) {
      const redactedProperties = properties ? { ...properties } : undefined;
      if (redactedProperties) {
        this.redactPIIFromObject(redactedProperties);
      }

      Sentry.addBreadcrumb({
        message: eventName,
        category: 'custom',
        level: 'info',
        data: redactedProperties,
      });
    }
  }
}

export const errorTracking = ErrorTrackingService.getInstance();
