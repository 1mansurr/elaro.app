import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  TextStyle,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, COMPONENT_TOKENS, SHADOWS, ANIMATIONS } from '@/constants/theme';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';

interface UnifiedInputProps extends TextInputProps {
  label?: string;
  error?: string;
  success?: boolean;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  required?: boolean;
  variant?: 'default' | 'outlined' | 'filled';
  size?: 'small' | 'medium' | 'large';
  helperText?: string;
  characterCount?: boolean;
  maxLength?: number;
  containerStyle?: ViewStyle;
  inputContainerStyle?: ViewStyle;
  labelStyle?: TextStyle;
  inputStyle?: TextStyle;
}

export const UnifiedInput: React.FC<UnifiedInputProps> = ({
  label,
  error,
  success,
  leftIcon,
  rightIcon,
  onRightIconPress,
  required = false,
  variant = 'default',
  size = 'medium',
  helperText,
  characterCount,
  maxLength,
  containerStyle,
  inputContainerStyle,
  labelStyle,
  inputStyle,
  style,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isFilled, setIsFilled] = useState(false);
  
  // Animation refs for smooth focus interactions
  const focusAnim = useRef(new Animated.Value(0)).current;
  const shadowAnim = useRef(new Animated.Value(0)).current;

  // Performance monitoring
  usePerformanceMonitor('UnifiedInput', {
    trackProps: true,
    slowRenderThreshold: 12, // Inputs can be slightly slower due to complexity
    enableAnalytics: true,
  });

  // Optimized themed styles with memoization
  const themedStyles = useThemedStyles((theme) => ({
    getBorderColor: () => {
      if (error) return theme.destructive;
      if (success) return theme.success;
      if (isFocused) return theme.accent;
      return theme.border;
    },
    getTextColor: () => {
      if (error) return theme.destructive;
      if (success) return theme.success;
      return theme.text;
    },
    getLabelColor: () => {
      if (error) return theme.destructive;
      if (success) return theme.success;
      return theme.textSecondary;
    },
    destructive: theme.destructive,
    textSecondary: theme.textSecondary,
    text: theme.text,
  }));

  const handleFocus = (e: any) => {
    setIsFocused(true);
    
    // Smooth focus animation
    Animated.parallel([
      Animated.timing(focusAnim, {
        toValue: 1,
        duration: ANIMATIONS.duration.fast,
        easing: ANIMATIONS.animatedEasing.smooth,
        useNativeDriver: false,
      }),
      Animated.timing(shadowAnim, {
        toValue: 1,
        duration: ANIMATIONS.duration.fast,
        easing: ANIMATIONS.animatedEasing.smooth,
        useNativeDriver: false,
      }),
    ]).start();
    
    props.onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    setIsFilled(!!props.value);
    
    // Smooth blur animation
    Animated.parallel([
      Animated.timing(focusAnim, {
        toValue: 0,
        duration: ANIMATIONS.duration.fast,
        easing: ANIMATIONS.animatedEasing.smooth,
        useNativeDriver: false,
      }),
      Animated.timing(shadowAnim, {
        toValue: 0,
        duration: ANIMATIONS.duration.fast,
        easing: ANIMATIONS.animatedEasing.smooth,
        useNativeDriver: false,
      }),
    ]).start();
    
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
      default: // medium
        return {
          height: COMPONENT_TOKENS.input.height,
          fontSize: FONT_SIZES.md,
          paddingHorizontal: COMPONENT_TOKENS.input.paddingHorizontal,
        };
    }
  }, [size]);

  const variantStyles = useMemo(() => {
    const baseStyles = {
      borderColor: themedStyles.getBorderColor(),
    };

    switch (variant) {
      case 'outlined':
        return {
          ...baseStyles,
          backgroundColor: 'transparent',
          borderWidth: 2,
        };
      case 'filled':
        return {
          ...baseStyles,
          backgroundColor: themedStyles.textSecondary === '#757575' ? '#F8F9FA' : 'rgba(0,0,0,0.05)', // Use theme-aware background
          borderWidth: 0,
        };
      default: // default
        return {
          ...baseStyles,
          backgroundColor: themedStyles.textSecondary === '#757575' ? '#F8F9FA' : 'rgba(0,0,0,0.05)', // Use theme-aware background
          borderWidth: COMPONENT_TOKENS.input.borderWidth,
        };
    }
  }, [variant, themedStyles]);

  // Enhanced shadow system with animation
  const getShadowStyle = () => {
    const baseShadow = SHADOWS.xs; // Subtle shadow for inputs
    const focusedShadow = SHADOWS.sm; // Enhanced shadow when focused
    
    return {
      ...baseShadow,
      shadowOpacity: shadowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [baseShadow.shadowOpacity, focusedShadow.shadowOpacity],
      }),
      elevation: shadowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [baseShadow.elevation, focusedShadow.elevation],
      }),
    };
  };

  const getTextColor = () => {
    return themedStyles.getTextColor();
  };

  const getLabelColor = () => {
    return themedStyles.getLabelColor();
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, { color: getLabelColor() }, labelStyle]}>
          {label}
          {required && <Text style={[styles.required, { color: themedStyles.destructive }]}> *</Text>}
        </Text>
      )}

      <Animated.View
        style={[
          styles.inputContainer,
          variantStyles,
          sizeStyles,
          getShadowStyle(),
          inputContainerStyle,
        ]}
      >
        {leftIcon && (
          <View style={styles.iconContainer}>
            <Ionicons
              name={leftIcon}
              size={20}
              color={getTextColor()}
            />
          </View>
        )}

        <TextInput
          {...props}
          style={[
            styles.input,
            {
              paddingLeft: leftIcon ? SPACING.lg : sizeStyles.paddingHorizontal,
              paddingRight: rightIcon ? SPACING.lg : sizeStyles.paddingHorizontal,
              color: themedStyles.text,
            },
            { fontSize: sizeStyles.fontSize },
            inputStyle,
          ]}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChangeText={handleChangeText}
          placeholderTextColor={themedStyles.textSecondary}
          maxLength={maxLength}
        />

        {rightIcon && (
          <TouchableOpacity
            style={styles.iconContainer}
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
          >
            <Ionicons
              name={rightIcon}
              size={20}
              color={onRightIconPress ? getTextColor() : themedStyles.textSecondary}
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
                color={themedStyles.destructive}
              />
              <Text style={[styles.errorText, { color: themedStyles.destructive }]}>
                {error}
              </Text>
            </View>
          )}

          {helperText && !error && (
            <Text style={[styles.helperText, { color: themedStyles.textSecondary }]}>
              {helperText}
            </Text>
          )}

          {characterCount && maxLength && (
            <Text style={[styles.characterCount, { color: themedStyles.textSecondary }]}>
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
    fontWeight: FONT_WEIGHTS.medium as any,
    fontSize: FONT_SIZES.sm,
  },
  required: {
    fontWeight: FONT_WEIGHTS.semibold as any,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: COMPONENT_TOKENS.input.borderRadius,
  },
  input: {
    flex: 1,
    fontWeight: FONT_WEIGHTS.normal as any,
  },
  iconContainer: {
    paddingHorizontal: SPACING.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  helperContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.xs,
    minHeight: 20,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  errorText: {
    fontSize: FONT_SIZES.sm,
    marginLeft: SPACING.xs,
  },
  helperText: {
    fontSize: FONT_SIZES.sm,
    flex: 1,
  },
  characterCount: {
    fontSize: FONT_SIZES.sm,
  },
});

export default UnifiedInput;


