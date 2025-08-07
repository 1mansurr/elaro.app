import React, { useRef } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  Animated,
  AccessibilityRole,
} from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS } from '../constants/theme';

interface IconButtonProps {
  icon: React.ReactElement;
  onPress: () => void;
  size?: number;
  color?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  rounded?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
  accessibilityRole?: AccessibilityRole;
}

const IconButton: React.FC<IconButtonProps> = ({
  icon,
  onPress,
  size = 24,
  color,
  variant = 'ghost',
  disabled = false,
  rounded = false,
  style,
  accessibilityLabel,
  accessibilityRole = 'button',
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.92,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const containerStyle = [
    styles.base,
    styles[variant],
    rounded && styles.rounded,
    disabled && styles.disabled,
    style,
  ];

  const resolvedColor = disabled
    ? COLORS.gray400
    : color ||
      (variant === 'primary'
        ? COLORS.white
        : variant === 'secondary'
          ? COLORS.text
          : COLORS.text);

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      activeOpacity={0.75}
      style={{ overflow: 'hidden' }}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Double tap to activate">
      <Animated.View
        style={[containerStyle, { transform: [{ scale: scaleAnim }] }]}>
        {React.cloneElement(icon as React.ReactElement<any>, {
          size,
          color: resolvedColor,
        })}
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: COLORS.primary,
  },
  secondary: {
    backgroundColor: COLORS.gray100,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  rounded: {
    borderRadius: 999,
  },
  disabled: {
    opacity: 0.5,
  },
});

export default IconButton;
