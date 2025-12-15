import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import {
  COLORS,
  FONT_SIZES,
  FONT_WEIGHTS,
  SPACING,
  BORDER_RADIUS,
} from '@/constants/theme';

interface ReminderChip {
  id: string;
  label: string;
}

interface ReminderChipsListProps {
  reminders: ReminderChip[];
}

export const ReminderChipsList: React.FC<ReminderChipsListProps> = ({
  reminders,
}) => {
  const { theme } = useTheme();

  if (reminders.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {reminders.map(reminder => (
        <View
          key={reminder.id}
          style={[
            styles.chip,
            {
              backgroundColor: theme.isDark ? '#1A2632' : '#F3F4F6',
              borderColor: theme.isDark ? '#3B4754' : '#E5E7EB',
            },
          ]}>
          <Ionicons
            name="notifications-outline"
            size={18}
            color={theme.isDark ? '#9CA3AF' : '#6B7280'}
          />
          <Text
            style={[
              styles.chipText,
              { color: theme.isDark ? '#D1D5DB' : '#374151' },
            ]}>
            {reminder.label}
          </Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 36,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
  },
  chipText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },
});
