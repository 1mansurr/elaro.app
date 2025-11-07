/**
 * Mixpanel Analytics Service
 *
 * ⚠️ STATUS: PARKED - Currently using MockMixpanel implementation
 * 
 * This service is intentionally disabled but kept in codebase for potential
 * future re-enablement. All tracking calls are no-ops.
 * 
 * To re-enable:
 * 1. Uncomment real Mixpanel import (if available)
 * 2. Replace MockMixpanel with real Mixpanel instance
 * 3. Update App.tsx initialization
 * 4. Verify EXPO_PUBLIC_MIXPANEL_TOKEN is set in environment variables
 * 5. Test tracking functionality
 * 
 * See MIXPANEL_STATUS.md for more details.
 */

// Mock Mixpanel implementation
const MockMixpanel = {
  track: (_event?: string, _props?: Record<string, any>) => {},
  identify: (_id?: string) => {},
  reset: () => {},
  getDistinctId: () => 'mock-user-id',
  getPeople: () => ({ set: (_props?: Record<string, any>) => {} }),
  timeEvent: (_event?: string) => {},
  trackWithGroups: (
    _event?: string,
    _props?: Record<string, any>,
    _groups?: Record<string, any>,
  ) => {},
};

// const Mixpanel = MockMixpanel;

interface MixpanelService {
  trackEvent: (event: string, properties?: Record<string, any>) => void;
  track: (event: string, properties?: Record<string, any>) => void;
  identify: (userId: string) => void;
  reset: () => void;
  setUserProperties: (properties: Record<string, any>) => void;
  timeEvent: (event: string) => void;
  trackWithGroups: (
    event: string,
    properties?: Record<string, any>,
    groups?: Record<string, any>,
  ) => void;
}

class MixpanelAnalyticsService implements MixpanelService {
  private mixpanel: typeof MockMixpanel | null = null;
  private isInitialized = false;
  private projectToken: string | null = null;
  private userConsent: boolean = true;

  /**
   * Initialize Mixpanel with project token
   */
  async initialize(token?: string): Promise<void> {
    try {
      this.projectToken =
        token || process.env.EXPO_PUBLIC_MIXPANEL_TOKEN || null;

      if (!this.projectToken) {
        console.warn('⚠️ Mixpanel token not provided, analytics disabled');
        return;
      }

      this.mixpanel = MockMixpanel;
      this.isInitialized = true;

      console.log('✅ Mixpanel initialized successfully');
    } catch (error) {
      console.error('❌ Mixpanel initialization failed:', error);
      this.isInitialized = false;
    }
  }

  /**
   * Sanitize properties to remove PII
   */
  private sanitizeProperties(
    properties: Record<string, any> = {},
  ): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(properties)) {
      // Skip PII fields
      if (this.isPIIField(key)) {
        continue;
      }

      // Sanitize values
      sanitized[key] = this.sanitizeValue(value);
    }

    return sanitized;
  }

  /**
   * Check if a field contains PII
   */
  private isPIIField(fieldName: string): boolean {
    const piiFields = [
      'email',
      'name',
      'firstName',
      'lastName',
      'phone',
      'address',
      'password',
      'ssn',
      'creditCard',
      'bankAccount',
      'personalId',
    ];

    return piiFields.some(pii =>
      fieldName.toLowerCase().includes(pii.toLowerCase()),
    );
  }

  /**
   * Sanitize individual values
   */
  private sanitizeValue(value: unknown): unknown {
    if (typeof value === 'string') {
      // Hash user IDs
      if (
        value.match(
          /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i,
        )
      ) {
        return this.simpleHash(value);
      }

      // Truncate long strings
      if (value.length > 50) {
        return value.substring(0, 50) + '...';
      }

      return value;
    }

    if (Array.isArray(value)) {
      return value.map(item => this.sanitizeValue(item));
    }

    if (typeof value === 'object' && value !== null) {
      const sanitized: Record<string, any> = {};
      for (const [key, val] of Object.entries(value)) {
        if (!this.isPIIField(key)) {
          sanitized[key] = this.sanitizeValue(val);
        }
      }
      return sanitized;
    }

    return value;
  }

  /**
   * Simple hash function for user IDs
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Track an event with properties
   */
  trackEvent(event: string, properties?: Record<string, any>): void {
    if (!this.isInitialized || !this.mixpanel || !this.userConsent) {
      console.warn('Mixpanel not initialized, event not tracked:', event);
      return;
    }

    try {
      const sanitizedProperties = this.sanitizeProperties(properties);
      this.mixpanel.track(event, sanitizedProperties);
    } catch (error) {
      console.error('Error tracking event:', error);
    }
  }

  /**
   * Track an event (alias for trackEvent)
   */
  track(event: string, properties?: Record<string, any>): void {
    this.trackEvent(event, properties);
  }

  /**
   * Identify a user
   */
  identify(userId: string): void {
    if (!this.isInitialized || !this.mixpanel || !this.userConsent) {
      console.warn('Mixpanel not initialized, user not identified');
      return;
    }

    try {
      const hashedUserId = this.simpleHash(userId);
      this.mixpanel.identify(hashedUserId);
    } catch (error) {
      console.error('Error identifying user:', error);
    }
  }

  /**
   * Reset user identity
   */
  reset(): void {
    if (!this.isInitialized || !this.mixpanel) {
      return;
    }

    try {
      this.mixpanel.reset();
    } catch (error) {
      console.error('Error resetting Mixpanel:', error);
    }
  }

  /**
   * Set user properties
   */
  setUserProperties(properties: Record<string, any>): void {
    if (!this.isInitialized || !this.mixpanel || !this.userConsent) {
      console.warn('Mixpanel not initialized, properties not set');
      return;
    }

    try {
      const sanitizedProperties = this.sanitizeProperties(properties);
      this.mixpanel.getPeople().set(sanitizedProperties);
    } catch (error) {
      console.error('Error setting user properties:', error);
    }
  }

  /**
   * Start timing an event
   */
  timeEvent(event: string): void {
    if (!this.isInitialized || !this.mixpanel || !this.userConsent) {
      return;
    }

    try {
      this.mixpanel.timeEvent(event);
    } catch (error) {
      console.error('Error timing event:', error);
    }
  }

  /**
   * Track event with groups
   */
  trackWithGroups(
    event: string,
    properties?: Record<string, any>,
    groups?: Record<string, any>,
  ): void {
    if (!this.isInitialized || !this.mixpanel || !this.userConsent) {
      console.warn('Mixpanel not initialized, event not tracked');
      return;
    }

    try {
      const sanitizedProperties = this.sanitizeProperties(properties);
      const sanitizedGroups = this.sanitizeProperties(groups);

      this.mixpanel.trackWithGroups(
        event,
        sanitizedProperties,
        sanitizedGroups,
      );
    } catch (error) {
      console.error('Error tracking event with groups:', error);
    }
  }

  /**
   * Set user consent for analytics
   */
  setUserConsent(consent: boolean): void {
    this.userConsent = consent;
    if (!consent) {
      this.reset();
    }
  }
}

// Export singleton instance
export const mixpanelService = new MixpanelAnalyticsService();
