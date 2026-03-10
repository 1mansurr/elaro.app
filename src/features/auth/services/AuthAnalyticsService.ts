import { User } from '@/types';

export interface AuthAnalyticsEvents {
  login: {
    method: string;
    subscription_tier?: string;
    onboarding_completed?: boolean;
  };
  signup: {
    method: string;
    has_first_name: boolean;
    has_last_name: boolean;
  };
  logout: {
    reason: string;
    timeout_days?: number;
  };
  error: {
    type: string;
    message: string;
  };
}

export class AuthAnalyticsService {
  private static instance: AuthAnalyticsService;

  public static getInstance(): AuthAnalyticsService {
    if (!AuthAnalyticsService.instance) {
      AuthAnalyticsService.instance = new AuthAnalyticsService();
    }
    return AuthAnalyticsService.instance;
  }

  /**
   * Identify user in analytics and set user properties
   */
  identifyUser(_user: User): void {
    // analytics removed
  }

  /**
   * Track login event
   */
  trackLogin(_events: AuthAnalyticsEvents['login']): void {
    // analytics removed
  }

  /**
   * Track signup event
   */
  trackSignup(_events: AuthAnalyticsEvents['signup']): void {
    // analytics removed
  }

  /**
   * Track logout event
   */
  trackLogout(_events: AuthAnalyticsEvents['logout']): void {
    // analytics removed
  }

  /**
   * Track authentication error
   */
  trackError(_events: AuthAnalyticsEvents['error']): void {
    // analytics removed
  }

  /**
   * Track trial-related events
   */
  trackTrialEvent(
    _eventName: string,
    _properties: Record<string, any> = {},
  ): void {
    // analytics removed
  }
}
