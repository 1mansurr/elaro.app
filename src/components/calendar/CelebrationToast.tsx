import React from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  SHADOWS,
} from '../../constants/theme';

interface CelebrationToastProps {
  visible: boolean;
  animation: Animated.Value;
}

export const CelebrationToast: React.FC<CelebrationToastProps> = ({
  visible,
  animation,
}) => {
  if (!visible) return null;

  const scale = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1.2],
  });

  const opacity = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ scale }],
          opacity,
        },
      ]}>
      <View style={styles.content}>
        <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
        <Text style={styles.text}>Task completed! 🎉</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    left: SPACING.lg,
    right: SPACING.lg,
    zIndex: 1000,
  },
  content: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    ...SHADOWS.lg,
  },
  text: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold as any,
    color: COLORS.text,
  },
});
