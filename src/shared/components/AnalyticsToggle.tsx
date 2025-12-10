import React, { useState, useEffect } from 'react';
import { Switch } from 'react-native';
import { mixpanelService } from '@/services/mixpanel';
import { AnalyticsEvents } from '@/services/analyticsEvents';
import { COLORS } from '@/constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ANALYTICS_CONSENT_KEY = 'analytics_consent';

export const AnalyticsToggle: React.FC = () => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAnalyticsConsent();
  }, []);

  const loadAnalyticsConsent = async () => {
    try {
      const consent = await AsyncStorage.getItem(ANALYTICS_CONSENT_KEY);
      const hasConsent = consent === 'true';
      setIsEnabled(hasConsent);
      mixpanelService.setUserConsent(hasConsent);
    } catch (error) {
      console.error('Error loading analytics consent:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (value: boolean) => {
    try {
      await AsyncStorage.setItem(ANALYTICS_CONSENT_KEY, value.toString());
      setIsEnabled(value);
      mixpanelService.setUserConsent(value);

      // Track the privacy setting change
      mixpanelService.track(AnalyticsEvents.ANALYTICS_CONSENT_CHANGED, {
        enabled: value,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error saving analytics consent:', error);
    }
  };

  if (isLoading) {
    return null;
  }

  return (
      <Switch
        value={isEnabled}
        onValueChange={handleToggle}
      trackColor={{ false: '#D1D5DB', true: COLORS.primary }}
      thumbColor="#FFFFFF"
      />
  );
};
