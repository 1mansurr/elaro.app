import React from 'react';
import { View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { UnifiedButton } from './UnifiedButton';
import { BORDER_RADIUS } from '@/constants/theme';

interface GradientButtonProps {
  title: string;
  onPress: () => void;
  gradientColors: [string, string];
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export const GradientButton: React.FC<GradientButtonProps> = ({
  title,
  onPress,
  gradientColors,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  accessibilityLabel,
  accessibilityHint,
}) => {
  if (disabled || loading) {
    // Fall back to regular button when disabled or loading
    return (
      <UnifiedButton
        title={title}
        onPress={onPress}
        variant={variant}
        size={size}
        disabled={disabled}
        loading={loading}
        style={style}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
      />
    );
  }

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[{ borderRadius: BORDER_RADIUS.md }, style]}>
      <UnifiedButton
        title={title}
        onPress={onPress}
        variant="primary" // Always use primary variant for gradient
        size={size}
        disabled={disabled}
        loading={loading}
        style={{ backgroundColor: 'transparent' }} // Override background for gradient
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
      />
    </LinearGradient>
  );
};

export default React.memo(GradientButton);
