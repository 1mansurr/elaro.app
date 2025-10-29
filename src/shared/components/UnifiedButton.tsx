import React, { useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleSheet,
  Animated,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS, ANIMATIONS } from '@/constants/theme';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import * as Haptics from 'expo-haptics';

interface UnifiedButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  hapticFeedback?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export const UnifiedButton: React.FC<UnifiedButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
  iconPosition = 'left',
  hapticFeedback = true,
  accessibilityLabel,
  accessibilityHint,
}) => {
  // Animation refs for smooth press interactions
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shadowAnim = useRef(new Animated.Value(0)).current;

  // Performance monitoring
  usePerformanceMonitor('UnifiedButton', {
    trackProps: true,
    slowRenderThreshold: 8, // Buttons should render quickly
    enableAnalytics: true,
  });

  // Optimized themed styles with memoization
  const themedStyles = useThemedStyles((theme) => ({
    getVariantStyles: () => {
      switch (variant) {
        case 'primary':
          return {
            backgroundColor: theme.accent,
            borderWidth: 0,
          };
        case 'secondary':
          return {
            backgroundColor: theme.surface,
            borderWidth: 0,
          };
        case 'outline':
          return {
            backgroundColor: 'transparent',
            borderWidth: 1,
            borderColor: theme.accent,
          };
        case 'ghost':
          return {
            backgroundColor: 'transparent',
            borderWidth: 0,
          };
        case 'danger':
          return {
            backgroundColor: theme.destructive,
            borderWidth: 0,
          };
        default:
          return {
            backgroundColor: theme.accent,
            borderWidth: 0,
          };
      }
    },
    getTextColor: () => {
      switch (variant) {
        case 'primary':
        case 'danger':
          return theme.white;
        case 'secondary':
          return theme.text;
        case 'outline':
        case 'ghost':
          return theme.accent;
        default:
          return theme.white;
      }
    },
  }));

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          paddingVertical: SPACING.sm,
          paddingHorizontal: SPACING.md,
          minHeight: 36,
        };
      case 'large':
        return {
          paddingVertical: SPACING.lg,
          paddingHorizontal: SPACING.xl,
          minHeight: 56,
        };
      default: // medium
        return {
          paddingVertical: SPACING.md,
          paddingHorizontal: SPACING.lg,
          minHeight: 44,
        };
    }
  };

  const getTextSize = () => {
    switch (size) {
      case 'small':
        return FONT_SIZES.sm;
      case 'large':
        return FONT_SIZES.lg;
      default: // medium
        return FONT_SIZES.md;
    }
  };

  const handlePress = () => {
    if (hapticFeedback && !disabled && !loading) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (onPress) {
      onPress();
    }
  };

  const handlePressIn = () => {
    if (disabled || loading) return;
    
    // Smooth press-in animation
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.98,
        duration: ANIMATIONS.duration.fast,
        easing: ANIMATIONS.animatedEasing.smooth,
        useNativeDriver: true,
      }),
      Animated.timing(shadowAnim, {
        toValue: 1,
        duration: ANIMATIONS.duration.fast,
        easing: ANIMATIONS.animatedEasing.smooth,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    if (disabled || loading) return;
    
    // Smooth press-out animation
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: ANIMATIONS.duration.fast,
        easing: ANIMATIONS.animatedEasing.smooth,
        useNativeDriver: true,
      }),
      Animated.timing(shadowAnim, {
        toValue: 0,
        duration: ANIMATIONS.duration.fast,
        easing: ANIMATIONS.animatedEasing.smooth,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const variantStyles = themedStyles.getVariantStyles();
  const sizeStyles = getSizeStyles();
  const textColor = themedStyles.getTextColor();
  const textSize = getTextSize();

  // Enhanced shadow system with animation
  const getShadowStyle = () => {
    const baseShadow = SHADOWS.sm; // Base shadow for all buttons
    const pressedShadow = SHADOWS.xs; // Reduced shadow when pressed
    
    return {
      ...baseShadow,
      shadowOpacity: shadowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [baseShadow.shadowOpacity, pressedShadow.shadowOpacity],
      }),
      elevation: shadowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [baseShadow.elevation, pressedShadow.elevation],
      }),
    };
  };

  return (
    <Animated.View
      style={[
        {
          transform: [{ scale: scaleAnim }],
        },
        getShadowStyle(),
      ]}
    >
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={1} // Disable default opacity change, we handle it with animations
        style={[
          styles.base,
          variantStyles,
          sizeStyles,
          disabled && styles.disabled,
          style,
        ]}
        accessibilityLabel={accessibilityLabel || title}
        accessibilityHint={accessibilityHint}
        accessibilityRole="button"
        accessibilityState={{ disabled: disabled || loading }}
      >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          {iconPosition === 'left' && icon}
          <Text
            style={[
              styles.text,
              {
                color: textColor,
                fontSize: textSize,
              },
              textStyle,
            ]}
          >
            {title}
          </Text>
          {iconPosition === 'right' && icon}
        </>
      )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs,
    // Shadow is now handled by animated shadow system
  },
  text: {
    fontWeight: FONT_WEIGHTS.semibold as any,
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});

// Export convenience variants for easier usage
export const PrimaryButton: React.FC<Omit<UnifiedButtonProps, 'variant'>> = (props) => (
  <UnifiedButton {...props} variant="primary" />
);

export const SecondaryButton: React.FC<Omit<UnifiedButtonProps, 'variant'>> = (props) => (
  <UnifiedButton {...props} variant="secondary" />
);

export const OutlineButton: React.FC<Omit<UnifiedButtonProps, 'variant'>> = (props) => (
  <UnifiedButton {...props} variant="outline" />
);

export const GhostButton: React.FC<Omit<UnifiedButtonProps, 'variant'>> = (props) => (
  <UnifiedButton {...props} variant="ghost" />
);

export const DangerButton: React.FC<Omit<UnifiedButtonProps, 'variant'>> = (props) => (
  <UnifiedButton {...props} variant="danger" />
);

export default UnifiedButton;

