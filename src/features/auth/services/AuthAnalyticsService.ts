import { User } from '@/types';
import { mixpanelService } from '@/services/mixpanel';
import { AnalyticsEvents } from '@/services/analyticsEvents';

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
  identifyUser(user: User): void {
    try {
      mixpanelService.identify(user.id);
      mixpanelService.setUserProperties({
        subscription_tier: user.subscription_tier,
        onboarding_completed: user.onboarding_completed,
        created_at: user.created_at,
        university: user.university,
        program: user.program,
      });
    } catch (error) {
      console.error('❌ Error identifying user in analytics:', error);
    }
  }

  /**
   * Track login event
   */
  trackLogin(events: AuthAnalyticsEvents['login']): void {
    try {
      mixpanelService.track(AnalyticsEvents.USER_LOGGED_IN, {
        subscription_tier: events.subscription_tier,
        onboarding_completed: events.onboarding_completed,
        login_method: events.method,
      });
    } catch (error) {
      console.error('❌ Error tracking login event:', error);
    }
  }

  /**
   * Track signup event
   */
  trackSignup(events: AuthAnalyticsEvents['signup']): void {
    try {
      mixpanelService.track(AnalyticsEvents.USER_SIGNED_UP, {
        signup_method: events.method,
        has_first_name: events.has_first_name,
        has_last_name: events.has_last_name,
      });
    } catch (error) {
      console.error('❌ Error tracking signup event:', error);
    }
  }

  /**
   * Track logout event
   */
  trackLogout(events: AuthAnalyticsEvents['logout']): void {
    try {
      mixpanelService.track(AnalyticsEvents.USER_LOGGED_OUT, {
        logout_reason: events.reason,
        timeout_days: events.timeout_days,
      });
    } catch (error) {
      console.error('❌ Error tracking logout event:', error);
    }
  }

  /**
   * Track authentication error
   */
  trackError(events: AuthAnalyticsEvents['error']): void {
    try {
      mixpanelService.track(AnalyticsEvents.ERROR_OCCURRED, {
        error_type: events.type,
        error_message: events.message,
      });
    } catch (error) {
      console.error('❌ Error tracking auth error:', error);
    }
  }

  /**
   * Track trial-related events
   */
  trackTrialEvent(eventName: string, properties: Record<string, any> = {}): void {
    try {
      mixpanelService.track(eventName, properties);
    } catch (error) {
      console.error('❌ Error tracking trial event:', error);
    }
  }
}
