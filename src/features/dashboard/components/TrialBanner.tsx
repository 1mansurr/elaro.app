// FILE: src/components/TrialBanner.tsx
// ACTION: Create a new component for the trial ending banner.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TrialBannerProps {
  daysRemaining: number;
  onPressSubscribe: () => void;
  onDismiss?: () => void;
}

const TrialBanner: React.FC<TrialBannerProps> = ({ daysRemaining, onPressSubscribe, onDismiss }) => {
  const isExpired = daysRemaining < 0;
  const message = isExpired
    ? "Your Oddity trial has ended."
    : `Your Oddity trial ends in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}.`;

  return (
    <View style={styles.container}>
      {onDismiss && (
        <TouchableOpacity
          onPress={onDismiss}
          style={styles.closeButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={24} color="#92400e" />
        </TouchableOpacity>
      )}
      <Ionicons name="warning-outline" size={24} color="#f59e0b" />
      <View style={styles.content}>
        <Text style={styles.message}>{message}</Text>
      </View>
      <View style={styles.buttonContainer}>
        <Text style={styles.priceText}>$1.99 / month</Text>
        <TouchableOpacity
          onPress={onPressSubscribe}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Join Oddity</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fef3c7', // bg-yellow-100
    borderWidth: 1,
    borderColor: '#fcd34d', // border-yellow-300
    padding: 16, // p-4
    marginHorizontal: 16, // mx-4
    marginVertical: 8, // my-2
    borderRadius: 8, // rounded-lg
    flexDirection: 'row', // flex-row
    alignItems: 'center', // items-center
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
    padding: 4,
  },
  content: {
    flex: 1, // flex-1
    marginLeft: 16, // ml-4
  },
  message: {
    color: '#92400e', // text-yellow-800
    fontWeight: 'bold', // font-bold
  },
  subtitle: {
    color: '#a16207', // text-yellow-700
    fontSize: 14, // text-sm
  },
  buttonContainer: {
    alignItems: 'center',
  },
  priceText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#78350f',
    marginBottom: 8,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#fbbf24', // bg-yellow-400
    paddingHorizontal: 16, // px-4
    paddingVertical: 8, // py-2
    borderRadius: 20, // rounded-full
  },
  buttonText: {
    color: '#78350f', // text-yellow-900
    fontWeight: 'bold', // font-bold
  },
});

export default TrialBanner;


