import React, { useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  Animated,
  Platform,
  TouchableWithoutFeedback,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  COLORS,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
  COMPONENTS,
  ANIMATIONS,
} from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: keyof typeof SPACING;
  shadow?: keyof typeof SHADOWS | boolean;
  borderRadius?: keyof typeof BORDER_RADIUS;
  gradient?: [string, string];
  gradientDirection?: 'horizontal' | 'vertical' | 'diagonal';
  animated?: boolean;
  delay?: number;
  onPress?: () => void;
  pressable?: boolean;
  elevation?: number;
  borderColor?: string;
  backgroundColor?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  padding = 'md',
  shadow = 'md',
  borderRadius = 'lg',
  gradient,
  gradientDirection = 'diagonal',
  animated = false,
  delay = 0,
  onPress,
  pressable = false,
  elevation,
  borderColor,
  backgroundColor,
}) => {
  const { theme } = useTheme();
  const animatedOpacity = useRef(new Animated.Value(animated ? 0 : 1)).current;
  const animatedTranslate = useRef(new Animated.Value(animated ? 20 : 0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (animated) {
      Animated.parallel([
        Animated.timing(animatedOpacity, {
          toValue: 1,
          duration: ANIMATIONS.duration.normal,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(animatedTranslate, {
          toValue: 0,
          duration: ANIMATIONS.duration.normal,
          delay,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [animated, delay]);

  const handlePressIn = () => {
    if (pressable && onPress) {
      Animated.spring(scaleAnim, {
        toValue: 0.96,
        useNativeDriver: true,
        ...ANIMATIONS.spring,
      }).start();
    }
  };

  const handlePressOut = () => {
    if (pressable && onPress) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        ...ANIMATIONS.spring,
      }).start();
    }
  };

  const getShadowStyle = () => {
    if (typeof shadow === 'boolean') return shadow ? SHADOWS.md : SHADOWS.none;
    return SHADOWS[shadow] || SHADOWS.none;
  };

  const getGradientDirection = () => {
    switch (gradientDirection) {
      case 'horizontal':
        return { start: { x: 0, y: 0 }, end: { x: 1, y: 0 } };
      case 'vertical':
        return { start: { x: 0, y: 0 }, end: { x: 0, y: 1 } };
      default:
        return { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } };
    }
  };

  const sharedStyle: ViewStyle = {
      padding: SPACING[padding],
      borderRadius: BORDER_RADIUS[borderRadius],
    backgroundColor: backgroundColor || theme.card,
    borderColor: borderColor || theme.border,
    borderWidth: 1,
    ...(Platform.OS === 'android'
      ? { elevation: elevation ?? getShadowStyle().elevation }
      : {}),
    ...getShadowStyle(),
  };

  const animatedStyle = {
    opacity: animatedOpacity,
    transform: [
      { translateY: animatedTranslate },
      { scale: scaleAnim },
    ],
  };

  const Container = pressable && onPress ? TouchableWithoutFeedback : React.Fragment;
  const containerProps = pressable && onPress ? {
    onPress: onPress,
    onPressIn: handlePressIn,
    onPressOut: handlePressOut,
  } : {};

  if (gradient) {
    const { start, end } = getGradientDirection();
    return (
      <Animated.View style={[animatedStyle, { transform: [{ scale: scaleAnim }] }]}> {/* All animations at root */}
        <LinearGradient
          colors={gradient || [theme.card, theme.surface]}
          start={start}
          end={end}
          style={[styles.gradient, { borderRadius: BORDER_RADIUS[borderRadius] }]}
        >
          <View style={{ padding: SPACING[padding] }}>
            {children}
          </View>
        </LinearGradient>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[animatedStyle]}>
      <Container {...containerProps}>
        <View style={[sharedStyle, style]}>
          {children}
        </View>
      </Container>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  inner: {
    overflow: 'hidden',
  },
  gradient: {
    width: '100%',
  },
});

