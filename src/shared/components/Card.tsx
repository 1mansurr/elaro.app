// FILE: src/components/Card.tsx
import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import {
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  SHADOWS,
  COLORS,
} from '@/constants/theme';

interface Props {
  title?: string;
  children: React.ReactNode;
  style?: ViewStyle;
}

const Card: React.FC<Props> = ({ title, children, style }) => {
  const { theme } = useTheme();
  const isDark =
    theme.background === '#101922' || theme.background === '#0A0F14';
  const surfaceColor = isDark ? '#1C252E' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#111418';
  const borderColor = isDark ? '#374151' : '#E5E7EB';

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: surfaceColor,
          borderColor: borderColor,
        },
        style,
      ]}>
      {title && (
        <Text
          style={[
            styles.title,
            {
              color: textColor,
              borderBottomColor: borderColor,
            },
          ]}>
          {title}
        </Text>
      )}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    ...SHADOWS.sm,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.md,
    borderBottomWidth: 1,
    paddingBottom: SPACING.md,
  },
});

export default Card;
