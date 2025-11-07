import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSimplePushNotifications } from '../hooks/usePushNotifications';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * Example component showing how to use the new notification service.
 * This component automatically registers for push notifications when mounted.
 */
export const NotificationSetup: React.FC = () => {
  const { registerForPushNotifications, isLoading } =
    useSimplePushNotifications();
  const { theme } = useTheme();

  useEffect(() => {
    // Automatically register for push notifications when component mounts
    registerForPushNotifications();
  }, [registerForPushNotifications]);

  return (
    <View style={styles.container}>
      <Text style={[styles.text, { color: theme.text }]}>
        {isLoading ? 'Setting up notifications...' : 'Notifications ready!'}
      </Text>
    </View>
  );
};

/**
 * Example component with manual notification registration button.
 * Shows how to handle user interaction for notification setup.
 */
export const NotificationSettingsButton: React.FC = () => {
  const { registerForPushNotifications, isLoading } =
    useSimplePushNotifications();
  const { theme } = useTheme();

  const handlePress = () => {
    registerForPushNotifications();
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: theme.accent,
          opacity: isLoading ? 0.6 : 1,
        },
      ]}
      onPress={handlePress}
      disabled={isLoading}>
      <Text style={[styles.buttonText, { color: 'white' }]}>
        {isLoading ? 'Setting up...' : 'Enable Notifications'}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    alignItems: 'center',
  },
  text: {
    fontSize: 16,
    textAlign: 'center',
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
