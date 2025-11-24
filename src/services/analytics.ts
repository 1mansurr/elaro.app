import { Mixpanel } from 'mixpanel-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AnalyticsEvent {
  event: string;
  properties?: Record<string, unknown>;
  timestamp: number;
}

class AnalyticsService {
  private mixpanel: Mixpanel | null = null;
  private isInitialized = false;
  private fallbackEvents: AnalyticsEvent[] = [];
  private readonly FALLBACK_STORAGE_KEY = 'analytics_fallback_events';
  private readonly MAX_FALLBACK_EVENTS = 1000;

  async initialize(projectToken: string) {
    try {
      if (!projectToken) {
        console.warn('⚠️ Analytics token not provided, using fallback mode');
        await this.loadFallbackEvents();
        return;
      }

      this.mixpanel = new Mixpanel(projectToken, true);
      await this.mixpanel.init();
      this.isInitialized = true;

      console.log('✅ Analytics initialized successfully');

      // Send any stored fallback events
      await this.flushFallbackEvents();
    } catch (error) {
      console.error('❌ Analytics initialization failed:', error);
      await this.loadFallbackEvents();
    }
  }

  // Simple tracking - no complex PII protection
  track(event: string, properties?: Record<string, unknown>) {
    const eventData: AnalyticsEvent = {
      event,
      properties,
      timestamp: Date.now(),
    };

    if (this.isInitialized && this.mixpanel) {
      try {
        this.mixpanel.track(event, properties);
        console.log('📊 Event tracked:', event);
      } catch (error) {
        console.error('❌ Failed to track event:', error);
        this.storeFallbackEvent(eventData);
      }
    } else {
      console.log('📊 Event stored (fallback):', event);
      this.storeFallbackEvent(eventData);
    }
  }

  // Set user properties
  setUserProperties(properties: Record<string, any>) {
    if (this.isInitialized && this.mixpanel) {
      try {
        this.mixpanel.getPeople().set(properties);
      } catch (error) {
        console.error('❌ Failed to set user properties:', error);
      }
    }
  }

  // Identify user
  identifyUser(userId: string) {
    if (this.isInitialized && this.mixpanel) {
      try {
        this.mixpanel.identify(userId);
      } catch (error) {
        console.error('❌ Failed to identify user:', error);
      }
    }
  }

  // Store events locally when Mixpanel is unavailable
  private async storeFallbackEvent(eventData: AnalyticsEvent) {
    this.fallbackEvents.push(eventData);

    // Keep only recent events
    if (this.fallbackEvents.length > this.MAX_FALLBACK_EVENTS) {
      this.fallbackEvents = this.fallbackEvents.slice(
        -this.MAX_FALLBACK_EVENTS,
      );
    }

    try {
      await AsyncStorage.setItem(
        this.FALLBACK_STORAGE_KEY,
        JSON.stringify(this.fallbackEvents),
      );
    } catch (error) {
      console.error('❌ Failed to store fallback event:', error);
    }
  }

  // Load stored events from local storage
  private async loadFallbackEvents() {
    try {
      const stored = await AsyncStorage.getItem(this.FALLBACK_STORAGE_KEY);
      if (stored) {
        this.fallbackEvents = JSON.parse(stored);
        console.log(`📊 Loaded ${this.fallbackEvents.length} fallback events`);
      }
    } catch (error) {
      console.error('❌ Failed to load fallback events:', error);
      this.fallbackEvents = [];
    }
  }

  // Send stored events when Mixpanel becomes available
  private async flushFallbackEvents() {
    if (this.fallbackEvents.length === 0) return;

    console.log(`📤 Flushing ${this.fallbackEvents.length} fallback events`);

    for (const eventData of this.fallbackEvents) {
      try {
        this.mixpanel?.track(eventData.event, eventData.properties);
      } catch (error) {
        console.error('❌ Failed to flush event:', error);
      }
    }

    // Clear stored events
    this.fallbackEvents = [];
    await AsyncStorage.removeItem(this.FALLBACK_STORAGE_KEY);
  }

  // Get fallback events count (for debugging)
  getFallbackEventsCount(): number {
    return this.fallbackEvents.length;
  }
}

export const analyticsService = new AnalyticsService();
