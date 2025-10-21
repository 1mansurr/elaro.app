import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Animated,
  TouchableOpacity,
  TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
  SHADOWS,
  ANIMATIONS,
  COMPONENTS,
} from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  success?: boolean;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  required?: boolean;
  animated?: boolean;
  variant?: 'default' | 'outlined' | 'filled';
  size?: 'small' | 'medium' | 'large';
  helperText?: string;
  characterCount?: boolean;
  maxLength?: number;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  success,
  leftIcon,
  rightIcon,
  onRightIconPress,
  required = false,
  animated = true,
  variant = 'default',
  size = 'medium',
  helperText,
  characterCount,
  maxLength,
  style,
  ...props
}) => {
  const { theme, isDark } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [isFilled, setIsFilled] = useState(false);
  const focusAnim = useRef(new Animated.Value(0)).current;
  const labelAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animated) {
      const animation = Animated.timing(focusAnim, {
        toValue: isFocused ? 1 : 0,
        duration: ANIMATIONS.duration.fast,
        useNativeDriver: true,
      });
      
      animation.start();
      
      return () => {
        animation.stop();
      };
    }
  }, [isFocused, animated, focusAnim]);

  useEffect(() => {
    if (animated && error) {
      const animation = Animated.sequence([
        Animated.timing(shakeAnim, {
          toValue: 10,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: -10,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]);
      
      animation.start();
      
      return () => {
        animation.stop();
      };
    }
  }, [error, animated, shakeAnim]);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    props.onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    setIsFilled(!!props.value);
    props.onBlur?.(e);
  };

  const handleChangeText = (text: string) => {
    setIsFilled(!!text);
    props.onChangeText?.(text);
  };

  const sizeStyles = useMemo(() => {
    switch (size) {
      case 'small':
        return {
          height: 36,
          fontSize: FONT_SIZES.sm,
          paddingHorizontal: SPACING.sm,
        };
      case 'large':
        return {
          height: 56,
          fontSize: FONT_SIZES.lg,
          paddingHorizontal: SPACING.lg,
        };
      default:
        return {
          height: COMPONENTS.input.height,
          fontSize: FONT_SIZES.md,
          paddingHorizontal: SPACING.md,
        };
    }
  }, [size]);

  const variantStyles = useMemo(() => {
    switch (variant) {
      case 'outlined':
        return {
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderColor: error
            ? theme.destructive
            : isFocused
              ? theme.accent
              : theme.inputBorder,
        };
      case 'filled':
        return {
          backgroundColor: isDark ? theme.input : theme.input,
          borderWidth: 0,
          borderColor: 'transparent',
        };
      default:
        return {
          backgroundColor: theme.input,
          borderWidth: COMPONENTS.input.borderWidth,
          borderColor: error
            ? theme.destructive
            : isFocused
              ? theme.accent
              : theme.inputBorder,
        };
    }
  }, [variant, error, theme.destructive, theme.accent, theme.inputBorder, isFocused, theme.input, isDark]);

  const inputStyle = [
    styles.input,
    {
      height: sizeStyles.height,
      fontSize: sizeStyles.fontSize,
      paddingHorizontal: sizeStyles.paddingHorizontal,
      ...variantStyles,
      borderRadius: COMPONENTS.input.borderRadius,
    },
    style,
  ];

  // Animated style for shake
  const animatedInputContainerStyle =
    animated && typeof shakeAnim === 'object'
      ? {
          transform: [
            {
              translateX: shakeAnim,
            },
          ],
        }
      : {};

  const labelStyle = [
    styles.label,
    {
      color: error
        ? theme.destructive
        : isFocused
          ? theme.accent
          : theme.textSecondary,
      fontSize: isFocused || isFilled ? FONT_SIZES.xs : FONT_SIZES.sm,
      transform: [
        {
          translateY: labelAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -8],
          }),
        },
        {
          scale: labelAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0.85],
          }),
        },
      ],
    },
  ];

  return (
    <View style={styles.container}>
      {label && (
        <Animated.Text style={labelStyle}>
          {label}
          {required && <Text style={{ color: theme.destructive }}> *</Text>}
        </Animated.Text>
      )}

      <Animated.View
        style={[styles.inputContainer, animatedInputContainerStyle]}>
        {leftIcon && (
          <View style={styles.leftIcon}>
            <Ionicons
              name={leftIcon}
              size={20}
              color={
                error
                  ? theme.destructive
                  : isFocused
                    ? theme.accent
                    : theme.textSecondary
              }
            />
          </View>
        )}

        <TextInput
          {...props}
          style={[
            inputStyle,
            leftIcon && styles.inputWithLeftIcon,
            rightIcon && styles.inputWithRightIcon,
            { color: theme.text },
          ]}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChangeText={handleChangeText}
          placeholderTextColor={theme.textSecondary}
          maxLength={maxLength}
        />

        {rightIcon && (
          <TouchableOpacity
            style={styles.rightIcon}
            onPress={onRightIconPress}
            disabled={!onRightIconPress}>
            <Ionicons
              name={rightIcon}
              size={20}
              color={
                error
                  ? theme.destructive
                  : isFocused
                    ? theme.accent
                    : theme.textSecondary
              }
            />
          </TouchableOpacity>
        )}
      </Animated.View>

      {(error || helperText || characterCount) && (
        <View style={styles.helperContainer}>
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons
                name="alert-circle"
                size={14}
                color={theme.destructive}
              />
              <Text style={[styles.errorText, { color: theme.destructive }]}>
                {error}
              </Text>
            </View>
          )}

          {helperText && !error && (
            <Text style={styles.helperText}>{helperText}</Text>
          )}

          {characterCount && maxLength && (
            <Text style={styles.characterCount}>
              {props.value?.length || 0}/{maxLength}
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  label: {
    marginBottom: SPACING.xs,
    fontWeight: '500' as any,
  },
  required: {
    color: COLORS.error,
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    borderRadius: BORDER_RADIUS.md,
    color: COLORS.text,
    fontWeight: '400' as any,
  },
  inputWithLeftIcon: {
    paddingLeft: 48,
  },
  inputWithRightIcon: {
    paddingRight: 48,
  },
  leftIcon: {
    position: 'absolute',
    left: SPACING.md,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  rightIcon: {
    position: 'absolute',
    right: SPACING.md,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  helperContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  errorText: {
    color: COLORS.error,
    fontSize: FONT_SIZES.sm,
    marginLeft: SPACING.xs,
  },
  helperText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    flex: 1,
  },
  characterCount: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
  },
});

export default React.memo(Input);
