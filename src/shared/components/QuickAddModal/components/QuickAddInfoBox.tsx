import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { COLORS, FONT_SIZES, SPACING } from '@/constants/theme';

export const QuickAddInfoBox: React.FC = () => {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.infoBox,
        {
          backgroundColor: theme.isDark ? '#1E3A5F' : '#F0F5FF',
        },
      ]}>
      <Ionicons
        name="information-circle-outline"
        size={16}
        color={COLORS.primary}
      />
      <Text
        style={[
          styles.infoText,
          { color: theme.isDark ? '#E0E7FF' : COLORS.gray },
        ]}>
        Quick add creates a task with default settings. Tap "Add More Details"
        to customize reminders, descriptions, and more.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: SPACING.sm,
    borderRadius: 8,
    marginTop: SPACING.md,
    gap: SPACING.xs,
  },
  infoText: {
    flex: 1,
    fontSize: FONT_SIZES.xs,
    lineHeight: 16,
  },
});

