import React, { useRef } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  Animated,
  ViewStyle,
  StyleProp,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SHADOWS } from '../constants/theme';

interface FloatingActionButtonProps {
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  size?: number;
  bottom?: number;
  right?: number;
  left?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onPress,
  icon = 'add',
  size = 56,
  bottom = 24,
  right,
  left,
  style,
  accessibilityLabel = 'Floating Action Button',
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const borderRadius = size / 2;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.92,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          bottom,
          right,
          left,
          width: size,
          height: size,
          transform: [{ scale }],
        },
        style,
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        style={[styles.button, { width: size, height: size, borderRadius }]}
      >
        <LinearGradient
          colors={[COLORS.primary, COLORS.secondary]}
          start={{ x: 0.1, y: 0.1 }}
          end={{ x: 0.9, y: 0.9 }}
          style={[StyleSheet.absoluteFill, { borderRadius }]}
        />
        <Ionicons name={icon} size={size * 0.42} color={COLORS.white} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 1000,
    elevation: Platform.OS === 'android' ? 10 : undefined,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.large,
  },
});

