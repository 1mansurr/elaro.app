import React from 'react';
import {
  TouchableOpacity,
  ViewStyle,
  ActivityIndicator,
  View,
  StyleProp,
} from 'react-native';
import * as Haptics from 'expo-haptics';

interface BaseButtonProps {
  children: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  hapticFeedback?: boolean;
}

export const BaseButton: React.FC<BaseButtonProps> = ({
  children,
  onPress,
  disabled = false,
  loading = false,
  style,
  accessibilityLabel,
  accessibilityHint,
  hapticFeedback = true,
}) => {
  const handlePress = () => {
    if (hapticFeedback) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (onPress) {
      onPress();
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      style={[styles.base, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        children
      )}
    </TouchableOpacity>
  );
};

const styles = {
  base: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexDirection: 'row' as const,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minHeight: 44,
  },
};
