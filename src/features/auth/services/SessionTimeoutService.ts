import { Alert } from 'react-native';
import {
  isSessionExpired,
  clearLastActiveTimestamp,
  updateLastActiveTimestamp,
} from '@/utils/sessionTimeout';
import { mixpanelService } from '@/services/mixpanel';
import { AnalyticsEvents } from '@/services/analyticsEvents';

export interface SessionTimeoutConfig {
  timeoutDays: number;
  showAlert: boolean;
  trackAnalytics: boolean;
}

export class SessionTimeoutService {
  private static instance: SessionTimeoutService;
  private config: SessionTimeoutConfig = {
    timeoutDays: 30,
    showAlert: true,
    trackAnalytics: true,
  };

  public static getInstance(): SessionTimeoutService {
    if (!SessionTimeoutService.instance) {
      SessionTimeoutService.instance = new SessionTimeoutService();
    }
    return SessionTimeoutService.instance;
  }

  /**
   * Check if session has expired and handle timeout
   */
  async checkAndHandleTimeout(): Promise<boolean> {
    try {
      const expired = await isSessionExpired();

      if (expired) {
        console.log(
          '⏰ Session expired due to inactivity. Handling timeout...',
        );
        await this.handleTimeout();
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Error checking session timeout:', error);
      return false;
    }
  }

  /**
   * Handle session timeout
   */
  private async handleTimeout(): Promise<void> {
    try {
      // Track the session timeout event
      if (this.config.trackAnalytics) {
        mixpanelService.track(AnalyticsEvents.USER_LOGGED_OUT, {
          logout_reason: 'session_timeout',
          timeout_days: this.config.timeoutDays,
        });
      }

      // Clear the last active timestamp
      await clearLastActiveTimestamp();

      // Show alert to user
      if (this.config.showAlert) {
        Alert.alert(
          'Session Expired',
          'Your session has expired due to inactivity. Please log in again.',
          [{ text: 'OK' }],
        );
      }
    } catch (error) {
      console.error('❌ Error handling session timeout:', error);
    }
  }

  /**
   * Update last active timestamp
   */
  async updateLastActiveTimestamp(): Promise<void> {
    try {
      await updateLastActiveTimestamp();
    } catch (error) {
      console.error('❌ Error updating last active timestamp:', error);
    }
  }

  /**
   * Clear session timeout data
   */
  async clearSessionTimeout(): Promise<void> {
    try {
      await clearLastActiveTimestamp();
    } catch (error) {
      console.error('❌ Error clearing session timeout:', error);
    }
  }

  /**
   * Configure session timeout settings
   */
  configure(config: Partial<SessionTimeoutConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): SessionTimeoutConfig {
    return { ...this.config };
  }
}
