import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  ANIMATIONS,
  GRADIENTS,
} from '../constants/theme';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  variant?: 'default' | 'gradient' | 'pulse' | 'dots';
  text?: string;
  color?: string;
  showIcon?: boolean;
  iconName?: keyof typeof Ionicons.glyphMap;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  variant = 'default',
  text,
  color = COLORS.primary,
  showIcon = false,
  iconName = 'ellipse',
}) => {
  const spinValue = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;
  const dotValues = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  const getSize = () => {
    switch (size) {
      case 'small':
        return { spinner: 20, icon: 16, text: FONT_SIZES.sm };
      case 'large':
        return { spinner: 48, icon: 32, text: FONT_SIZES.lg };
      default:
        return { spinner: 32, icon: 24, text: FONT_SIZES.md };
    }
  };

  const { spinner: spinnerSize, icon: iconSize, text: textSize } = getSize();

  useEffect(() => {
    switch (variant) {
      case 'gradient':
      case 'default':
        Animated.loop(
          Animated.timing(spinValue, {
            toValue: 1,
            duration: 1000,
            easing: Easing.linear,
            useNativeDriver: true,
          })
        ).start();
        break;

      case 'pulse':
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseValue, {
              toValue: 1.2,
              duration: 600,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(pulseValue, {
              toValue: 1,
              duration: 600,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ])
        ).start();
        break;

      case 'dots':
        dotValues.forEach((dot, index) => {
          Animated.loop(
            Animated.sequence([
              Animated.timing(dot, {
                toValue: 1,
                duration: 400,
                delay: index * 200,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: true,
              }),
              Animated.timing(dot, {
                toValue: 0,
                duration: 400,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: true,
              }),
            ])
          ).start();
        });
        break;
    }
  }, [variant]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const renderSpinner = () => {
    switch (variant) {
      case 'gradient':
        return (
          <Animated.View
            style={[
              styles.gradientSpinner,
              {
                width: spinnerSize,
                height: spinnerSize,
                transform: [{ rotate: spin }],
              },
            ]}
          >
            <LinearGradient
              colors={[GRADIENTS.ocean.start, GRADIENTS.ocean.end]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
          </Animated.View>
        );

      case 'pulse':
        return (
          <Animated.View
            style={[
              styles.pulseSpinner,
              {
                width: spinnerSize,
                height: spinnerSize,
                backgroundColor: color,
                transform: [{ scale: pulseValue }],
              },
            ]}
          >
            {showIcon && (
              <Ionicons name={iconName} size={iconSize * 0.6} color={COLORS.white} />
            )}
          </Animated.View>
        );

      case 'dots':
        return (
          <View style={styles.dotsContainer}>
            {dotValues.map((dot, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.dot,
                  {
                    backgroundColor: color,
                    opacity: dot,
                    transform: [
                      {
                        scale: dot.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.5, 1],
                        }),
                      },
                    ],
                  },
                ]}
              />
            ))}
          </View>
        );

      default:
        return (
          <Animated.View
            style={[
              styles.defaultSpinner,
              {
                width: spinnerSize,
                height: spinnerSize,
                borderColor: color,
                transform: [{ rotate: spin }],
              },
            ]}
          />
        );
    }
  };

  return (
    <View style={styles.container}>
      {renderSpinner()}
      {text && (
        <Text style={[styles.text, { fontSize: textSize, color }]}>
          {text}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  defaultSpinner: {
    borderWidth: 3,
    borderTopColor: 'transparent',
    borderRadius: BORDER_RADIUS.full,
  },
  gradientSpinner: {
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 3,
    borderTopColor: 'transparent',
    borderLeftColor: 'transparent',
  },
  pulseSpinner: {
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  text: {
    fontWeight: FONT_WEIGHTS.medium as any,
    textAlign: 'center',
  },
}); 