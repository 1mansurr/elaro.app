import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
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
  testID?: string;
}

const getStyles = (theme: any) => {
  return StyleSheet.create({
    base: {
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      borderRadius: COMPONENTS.button.borderRadius,
      overflow: 'hidden',
    },
    // Variant styles
    primary: {
      backgroundColor: theme.accent,
    },
    secondary: {
      backgroundColor: theme.warning,
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.accent,
    },
    ghost: {
      backgroundColor: 'transparent',
    },
    danger: {
      backgroundColor: theme.destructive,
    },
    success: {
      backgroundColor: theme.success,
    },
    // Size styles
    small: {
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.md,
      minHeight: 36,
    },
    medium: {
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.lg,
      minHeight: COMPONENTS.button.height,
    },
    large: {
      paddingVertical: SPACING.lg,
      paddingHorizontal: SPACING.xl,
      minHeight: 56,
    },
    // Text styles
    text: {
      textAlign: 'center',
      fontWeight: FONT_WEIGHTS.semibold as any,
    },
    primaryText: {
      color: theme.text === '#FFFFFF' ? '#1C1C1E' : '#FFFFFF',
    },
    secondaryText: {
      color: theme.text,
    },
    outlineText: {
      color: theme.accent,
    },
    ghostText: {
      color: theme.accent,
    },
    dangerText: {
      color: theme.text,
    },
    successText: {
      color: theme.text,
    },
    smallText: {
      fontSize: FONT_SIZES.sm,
    },
    mediumText: {
      fontSize: FONT_SIZES.md,
    },
    largeText: {
      fontSize: FONT_SIZES.lg,
    },
    // Other styles
    disabled: {
      opacity: 0.5,
    },
    iconWrapper: {
      marginHorizontal: SPACING.xs,
    },
    contentWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.xs,
    },
    gradientContent: {
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
};

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
  testID,
}) => {
  const { theme } = useTheme();
  const styles = getStyles(theme);

  const handlePress = () => {
    if (hapticFeedback) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (onPress) {
      onPress();
    }
  };

  const variantStyle = styles[variant] || styles.primary;
  const sizeStyle = styles[size] || styles.medium;
  const disabledStyle = disabled ? styles.disabled : {};
  const textVariantStyle = styles[`${variant}Text`];
  const textSizeStyle = styles[`${size}Text`];

  const renderContent = () => {
    if (loading) {
      return <ActivityIndicator color={textVariantStyle?.color || theme.white} />;
    }

    const iconElement = icon ? (
      <View style={styles.iconWrapper}>
        {icon}
      </View>
    ) : null;

    return (
      <>
        {iconPosition === 'left' && iconElement}
        <Text style={[styles.text, textSizeStyle, textVariantStyle, textStyle]}>
          {title}
        </Text>
        {iconPosition === 'right' && iconElement}
      </>
    );
  };

  const buttonContent = (
    <View style={[
      styles.base,
      sizeStyle,
      variantStyle,
      disabledStyle,
      style,
      iconPosition === 'right' ? { flexDirection: 'row-reverse' } : {}
    ]}>
      {renderContent()}
    </View>
  );

  if (gradient && !disabled) {
    const finalGradientColors = gradientColors || (variant === 'primary' ? [theme.elaroGradientStart, theme.elaroGradientEnd] : [theme.oddityGradientStart, theme.oddityGradientEnd]);
    return (
      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled || loading}
        activeOpacity={0.8}
        accessibilityLabel={accessibilityLabel || title}
        accessibilityHint={accessibilityHint}
        accessibilityRole="button"
        accessibilityState={{ disabled: disabled || loading }}
        testID={testID}
      >
        <LinearGradient
          colors={finalGradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.base, sizeStyle, style]}
        >
          <View style={[
            styles.base,
            sizeStyle,
            styles.gradientContent,
            iconPosition === 'right' ? { flexDirection: 'row-reverse' } : {}
          ]}>
            {renderContent()}
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      style={[styles.base, sizeStyle, variantStyle, disabledStyle, style]}
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      testID={testID}
    >
      <View style={[
        styles.contentWrapper,
        iconPosition === 'right' ? { flexDirection: 'row-reverse' } : {}
      ]}>
        {renderContent()}
      </View>
    </TouchableOpacity>
  );
};

export default React.memo(Button);
