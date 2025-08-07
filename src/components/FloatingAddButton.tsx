import React, { useRef, useEffect } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  View,
  AccessibilityRole,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  COLORS,
  SPACING,
  SHADOWS,
  ANIMATIONS,
  GRADIENTS,
} from '../constants/theme';

interface FloatingAddButtonProps {
  onPress: () => void;
  icon?: keyof typeof Feather.glyphMap;
  size?: 'small' | 'medium' | 'large';
  gradient?: boolean;
  gradientColors?: [string, string];
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  disabled?: boolean;
  animated?: boolean;
  hapticFeedback?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  backgroundColor?: string; // NEW
  iconColor?: string; // NEW
}

export const FloatingAddButton: React.FC<FloatingAddButtonProps> = ({
  onPress,
  icon = 'plus',
  size = 'medium',
  // Remove gradient by default
  gradient = false,
  gradientColors,
  position = 'bottom-right',
  disabled = false,
  animated = true,
  hapticFeedback = true,
  accessibilityLabel = 'Add new item',
  accessibilityHint = 'Double tap to add a new study session or task',
  backgroundColor, // NEW
  iconColor, // NEW
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const [pressed, setPressed] = React.useState(false);

  useEffect(() => {
    if (animated) {
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        ...ANIMATIONS.spring,
      }).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1.05,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    }
  }, [animated, pulse, scale]);

  const handlePressIn = () => {
    setPressed(true);
    if (!disabled) {
      Animated.spring(scale, {
        toValue: 0.92,
        useNativeDriver: true,
        ...ANIMATIONS.spring,
      }).start();
      if (hapticFeedback) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    }
  };

  const handlePressOut = () => {
    setPressed(false);
    if (!disabled) {
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        ...ANIMATIONS.spring,
      }).start();
      Animated.sequence([
        Animated.timing(rotate, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(rotate, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  const getSize = () => {
    switch (size) {
      case 'small':
        return { size: 48, icon: 20 };
      case 'large':
        return { size: 72, icon: 32 };
      default:
        return { size: 56, icon: 24 };
    }
  };

  const getPositionStyle = () => {
    const pos = {
      'bottom-right': { bottom: SPACING.lg, right: SPACING.lg },
      'bottom-left': { bottom: SPACING.lg, left: SPACING.lg },
      'top-right': { top: SPACING.lg, right: SPACING.lg },
      'top-left': { top: SPACING.lg, left: SPACING.lg },
    };
    return pos[position];
  };

  const { size: buttonSize, icon: iconSize } = getSize();
  const rotation = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  const animatedStyle = {
    transform: [{ scale: Animated.multiply(scale, pulse) }],
  };

  const iconAnimatedStyle = {
    transform: [{ rotate: rotation }],
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={[styles.wrapper, getPositionStyle()]}>
      <Animated.View
        style={[
          {
            width: buttonSize,
            height: buttonSize,
            borderRadius: buttonSize / 2,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: pressed
              ? backgroundColor || COLORS.primary
              : backgroundColor || COLORS.white,
            borderWidth: 2,
            borderColor: backgroundColor || COLORS.primary,
            ...SHADOWS.lg,
          },
          disabled && { opacity: 0.5 },
          animatedStyle,
        ]}>
        <Animated.View style={iconAnimatedStyle}>
          <Feather
            name={icon}
            size={iconSize}
            color={
              pressed ? iconColor || COLORS.white : iconColor || COLORS.primary
            }
          />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    zIndex: 1000,
  },
});
