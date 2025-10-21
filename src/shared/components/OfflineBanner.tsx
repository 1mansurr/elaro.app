/**
 * OfflineBanner Component
 * 
 * Displays a non-intrusive banner when the device is offline.
 * Provides immediate visual feedback to users about their connectivity status.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNetwork } from '@/contexts/NetworkContext';
import { useTheme } from '@/contexts/ThemeContext';

export const OfflineBanner: React.FC = () => {
  const { isOffline } = useNetwork();
  const { theme } = useTheme();

  if (!isOffline) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.warning }]}>
      <Text style={[styles.text, { color: '#FFFFFF' }]}>
        📴 You are offline. Changes will sync when online.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  text: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
});

