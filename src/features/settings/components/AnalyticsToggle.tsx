import React, { useState, useEffect } from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { mixpanelService } from '@/services/mixpanel';
import { AnalyticsEvents } from '@/services/analyticsEvents';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ANALYTICS_CONSENT_KEY = 'analytics_consent';

export const AnalyticsToggle: React.FC = () => {
  const { theme } = useTheme();
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
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error saving analytics consent:', error);
    }
  };

  if (isLoading) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Share Usage Analytics
        </Text>
        <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
          Help us improve the app by sharing anonymous usage data. No personal information is collected.
        </Text>
      </View>
      <Switch
        value={isEnabled}
        onValueChange={handleToggle}
        trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
        thumbColor={isEnabled ? theme.colors.surface : theme.colors.border}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginVertical: 8,
  },
  textContainer: {
    flex: 1,
    marginRight: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
});
