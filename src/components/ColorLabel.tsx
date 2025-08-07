import React from 'react';
import { View, StyleSheet, ViewStyle, AccessibilityRole } from 'react-native';
import { COLORS, SPACING } from '../constants/theme';

interface ColorLabelProps {
  color: string;
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
  accessibilityLabel?: string;
  accessibilityRole?: AccessibilityRole;
}

const ColorLabel: React.FC<ColorLabelProps> = ({
  color,
  size = 'medium',
  style,
  accessibilityLabel,
  accessibilityRole = 'image',
}) => {
  const sizeStyle = getSizeStyle(size);

  return (
    <View
      style={[
        styles.base,
        sizeStyle,
        { backgroundColor: color, borderRadius: sizeStyle.width / 2 },
        style,
      ]}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel || `Color label: ${color}`}
    />
  );
};

const getSizeStyle = (size: 'small' | 'medium' | 'large') => {
  switch (size) {
    case 'small':
      return { width: 8, height: 8 };
    case 'large':
      return { width: 16, height: 16 };
    case 'medium':
    default:
      return { width: 12, height: 12 };
  }
};

const styles = StyleSheet.create({
  base: {
    marginRight: SPACING.xs,
  },
});

export default ColorLabel;
