import { Mixpanel } from 'mixpanel-react-native';

class MixpanelService {
  private mixpanel: Mixpanel | null = null;
  private isInitialized = false;
  private userConsent = false;
  private userId: string | null = null;

  async initialize(projectToken: string, userConsent: boolean) {
    try {
      console.log('🚀 Starting Mixpanel initialization with token:', projectToken.substring(0, 8) + '...');
      this.mixpanel = new Mixpanel(projectToken, true);
      this.userConsent = userConsent;
      
      if (userConsent) {
        console.log('📱 Calling mixpanel.init()...');
        await this.mixpanel.init();
        this.isInitialized = true;
        
        console.log('✅ Mixpanel initialized successfully!');
        
        // Enable geolocation (country-level only)
        await this.mixpanel.setUseIpAddressForGeolocation(true);
      } else {
        console.log('⚠️ User consent not given, Mixpanel not initialized');
      }
    } catch (error) {
      console.error('❌ Mixpanel initialization failed:', error);
    }
  }

  setUserConsent(consent: boolean) {
    this.userConsent = consent;
    
    if (this.mixpanel) {
      if (consent) {
        this.mixpanel.optInTracking();
        this.mixpanel.init();
        this.isInitialized = true;
      } else {
        this.mixpanel.optOutTracking();
        this.isInitialized = false;
      }
    }
  }

  // Identify user with anonymized ID (no PII)
  identifyUser(userId: string) {
    this.userId = userId;
    
    if (this.mixpanel && this.userConsent && this.isInitialized) {
      // Use hashed user ID to prevent PII leakage
      const hashedUserId = this.hashUserId(userId);
      this.mixpanel.identify(hashedUserId);
    }
  }

  // Track events with PII protection
  track(eventName: string, properties: Record<string, any> = {}) {
    console.log('🎯 Attempting to track event:', eventName);
    console.log('📊 Mixpanel state:', {
      hasMixpanel: !!this.mixpanel,
      userConsent: this.userConsent,
      isInitialized: this.isInitialized
    });
    
    if (!this.mixpanel || !this.userConsent || !this.isInitialized) {
      console.log('⚠️ Cannot track event - Mixpanel not ready');
      return;
    }

    try {
      // Sanitize properties to remove any PII
      const sanitizedProperties = this.sanitizeProperties(properties);
      
      console.log('📤 Sending event to Mixpanel:', eventName, sanitizedProperties);
      this.mixpanel.track(eventName, sanitizedProperties);
      
      // Force flush to send immediately
      this.mixpanel.flush();
      console.log('✅ Event sent successfully!');
    } catch (error) {
      console.error('❌ Failed to track event:', error);
    }
  }

  // Track events with centralized event objects
  trackEvent(event: { name: string; properties?: Record<string, any> }, properties: Record<string, any> = {}) {
    const eventName = typeof event === 'string' ? event : event.name;
    const mergedProperties = { ...(event.properties || {}), ...properties };
    this.track(eventName, mergedProperties);
  }

  // Set user properties (anonymized)
  setUserProperties(properties: Record<string, any>) {
    if (!this.mixpanel || !this.userConsent || !this.isInitialized) {
      return;
    }

    const sanitizedProperties = this.sanitizeProperties(properties);
    this.mixpanel.getPeople().set(sanitizedProperties);
  }

  // Hash user ID to prevent PII exposure
  private hashUserId(userId: string): string {
    // Simple hash function - you might want to use a more robust one
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  // Remove PII from properties
  private sanitizeProperties(properties: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    
    // List of PII fields to exclude
    const piiFields = [
      'email', 'firstName', 'lastName', 'name', 'username',
      'university', 'program', 'phone', 'address', 'city', 'country'
    ];

    for (const [key, value] of Object.entries(properties)) {
      // Skip PII fields
      if (piiFields.includes(key.toLowerCase())) {
        continue;
      }

      // Hash sensitive identifiers
      if (key === 'userId' && typeof value === 'string') {
        sanitized[key] = this.hashUserId(value);
        continue;
      }

      // Allow safe properties
      if (this.isSafeProperty(key, value)) {
        sanitized[key] = this.sanitizeValue(value);
      }
    }

    return sanitized;
  }

  // Check if property is safe to track
  private isSafeProperty(key: string, value: any): boolean {
    // Allow numeric values
    if (typeof value === 'number' || typeof value === 'boolean') {
      return true;
    }

    // Allow safe string values
    if (typeof value === 'string') {
      // Check for email patterns
      if (/@/.test(value)) return false;
      
      // Check for phone patterns
      if (/[\+]?[1-9][\d\s\-\(\)]{7,}/.test(value)) return false;
      
      // Allow short strings (likely not PII)
      return value.length < 50;
    }

    // Allow arrays of safe values
    if (Array.isArray(value)) {
      return value.every(item => this.isSafeProperty('item', item));
    }

    // Allow objects with safe properties
    if (typeof value === 'object' && value !== null) {
      return Object.values(value).every(val => this.isSafeProperty('nested', val));
    }

    return false;
  }

  // Sanitize individual values
  private sanitizeValue(value: any): any {
    if (typeof value === 'string') {
      // Remove any potential PII patterns
      return value
        .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]')
        .replace(/[\+]?[1-9][\d\s\-\(\)]{7,}/g, '[PHONE]');
    }
    
    return value;
  }

  // Flush pending events
  async flush() {
    if (this.mixpanel && this.userConsent) {
      await this.mixpanel.flush();
    }
  }
}

export const mixpanelService = new MixpanelService();