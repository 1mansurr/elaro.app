// FILE: src/components/TrialBanner.tsx
// ACTION: Create a new component for the trial ending banner.

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TrialBannerProps {
  daysRemaining: number;
  onPressSubscribe: () => void;
}

const TrialBanner: React.FC<TrialBannerProps> = ({ daysRemaining, onPressSubscribe }) => {
  const isExpired = daysRemaining < 0;
  const message = isExpired
    ? "Your Oddity trial has ended."
    : `Your Oddity trial ends in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}.`;

  return (
    <View className="bg-yellow-100 border border-yellow-300 p-4 mx-4 my-2 rounded-lg flex-row items-center">
      <Ionicons name="warning-outline" size={24} color="#f59e0b" />
      <View className="flex-1 ml-4">
        <Text className="text-yellow-800 font-bold">{message}</Text>
        <Text className="text-yellow-700 text-sm">Subscribe to keep your Oddity access.</Text>
      </View>
      <TouchableOpacity
        onPress={onPressSubscribe}
        className="bg-yellow-400 px-4 py-2 rounded-full"
      >
        <Text className="text-yellow-900 font-bold">Subscribe</Text>
      </TouchableOpacity>
    </View>
  );
};

export default TrialBanner;


