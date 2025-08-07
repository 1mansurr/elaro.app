import React, { useRef } from 'react';
import { TouchableOpacity, Animated, ViewStyle } from 'react-native';

interface AnimatedTouchableProps {
  children: React.ReactNode;
  onPress: () => void;
  style?: ViewStyle;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export const AnimatedTouchable: React.FC<AnimatedTouchableProps> = ({
  children,
  onPress,
  style,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (!disabled) {
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    }
  };

  const handlePressOut = () => {
    if (!disabled) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    }
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={style}
        disabled={disabled}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled }}>
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

export default AnimatedTouchable;
