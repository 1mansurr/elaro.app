import React, { useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  ANIMATIONS,
  COMPONENTS,
} from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?:
    | 'primary'
    | 'secondary'
    | 'outline'
    | 'ghost'
    | 'danger'
    | 'success';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  gradient?: boolean;
  gradientColors?: [string, string];
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  hapticFeedback?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
  gradient = false,
  gradientColors,
  icon,
  iconPosition = 'left',
  hapticFeedback = true,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const { theme, isDark } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (!disabled && !loading) {
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        useNativeDriver: true,
        ...ANIMATIONS.spring,
      }).start();
      if (hapticFeedback) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  };

  const handlePressOut = () => {
    if (!disabled && !loading) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        ...ANIMATIONS.spring,
      }).start();
    }
  };

  const getVariantStyles = () => {
    const map = {
      primary: {
        backgroundColor: theme.accent,
        borderColor: theme.accent,
        textColor: theme.text === '#FFFFFF' ? '#1C1C1E' : '#FFFFFF',
      },
      secondary: {
        backgroundColor: isDark ? theme.success : theme.warning,
        borderColor: isDark ? theme.success : theme.warning,
        textColor: theme.text,
      },
      outline: {
        backgroundColor: 'transparent',
        borderColor: theme.accent,
        textColor: theme.accent,
      },
      ghost: {
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        textColor: theme.accent,
      },
      danger: {
        backgroundColor: theme.destructive,
        borderColor: theme.destructive,
        textColor: theme.text,
      },
      success: {
        backgroundColor: theme.success,
        borderColor: theme.success,
        textColor: theme.text,
      },
    };
    return map[variant] || map.primary;
  };

  const getSizeStyles = () => {
    const map = {
      small: {
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.md,
        fontSize: FONT_SIZES.sm,
        minHeight: 36,
      },
      medium: {
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.lg,
        fontSize: FONT_SIZES.md,
        minHeight: COMPONENTS.button.height,
      },
      large: {
        paddingVertical: SPACING.lg,
        paddingHorizontal: SPACING.xl,
        fontSize: FONT_SIZES.lg,
        minHeight: 56,
      },
    };
    return map[size] || map.medium;
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  const baseStyle = {
    backgroundColor: variantStyles.backgroundColor,
    borderColor: variantStyles.borderColor,
    borderWidth: variant === 'outline' ? 1 : 0,
    paddingVertical: sizeStyles.paddingVertical,
    paddingHorizontal: sizeStyles.paddingHorizontal,
    minHeight: sizeStyles.minHeight,
    borderRadius: COMPONENTS.button.borderRadius,
  };

  const accessibilityProps = {
    accessible: true,
    accessibilityRole: 'button' as const,
    accessibilityLabel: accessibilityLabel || title,
    accessibilityHint: accessibilityHint || undefined,
    accessibilityState: { disabled, busy: loading },
  };

  const content = (
    <Animated.View style={[styles.innerContent]}>
      {loading && (
        <ActivityIndicator
          size="small"
          color={variantStyles.textColor}
          style={styles.loader}
        />
      )}
      {!loading && icon && iconPosition === 'left' && (
        <Animated.View style={styles.icon}>{icon}</Animated.View>
      )}
      <Text
        style={[
          styles.text,
          { color: variantStyles.textColor, fontSize: sizeStyles.fontSize },
          textStyle,
        ]}>
        {title}
      </Text>
      {!loading && icon && iconPosition === 'right' && (
        <Animated.View style={styles.icon}>{icon}</Animated.View>
      )}
    </Animated.View>
  );

  const TouchableWrapper = (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.9}
      disabled={disabled || loading}
      style={[styles.base, baseStyle, disabled && styles.disabled, style]}
      {...accessibilityProps}>
      {gradient && !disabled && !loading ? (
        <LinearGradient
          colors={
            gradientColors || [
              theme.accent,
              isDark ? theme.text : theme.background,
            ]
          }
          style={[
            StyleSheet.absoluteFill,
            { borderRadius: COMPONENTS.button.borderRadius },
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      ) : null}
      {content}
    </TouchableOpacity>
  );

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      {TouchableWrapper}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    textAlign: 'center',
    fontWeight: FONT_WEIGHTS.semibold as any,
  },
  loader: {
    marginRight: SPACING.sm,
  },
  icon: {
    marginHorizontal: SPACING.xs,
  },
  innerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
});

export default React.memo(Button);
