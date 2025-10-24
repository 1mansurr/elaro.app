import * as Sentry from '@sentry/react-native';

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
    
    if (dsn) {
      Sentry.init({
        dsn,
        enabled: true,
      });
    }
    
    this.isInitialized = true;
  }

  captureError(error: Error, context?: any) {
    console.error('Error captured:', error);
    
    if (this.isInitialized) {
      Sentry.captureException(error, context);
    }
  }

  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
    console.log(`[${level.toUpperCase()}] ${message}`);
    
    if (this.isInitialized) {
      Sentry.captureMessage(message, level);
    }
  }

  setUser(user: { id: string; email?: string }) {
    if (this.isInitialized) {
      Sentry.setUser(user);
    }
  }

  addBreadcrumb(message: string, category?: string, level?: string) {
    if (this.isInitialized) {
      Sentry.addBreadcrumb({
        message,
        category: category || 'user',
        level: (level as any) || 'info',
      });
    }
  }
}

export const errorTracking = ErrorTrackingService.getInstance();
