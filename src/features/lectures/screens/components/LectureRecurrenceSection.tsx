import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';

type RecurrenceType = 'none' | 'weekly' | 'bi-weekly';

interface LectureRecurrenceSectionProps {
  recurrence: RecurrenceType;
  onRecurrenceChange: (recurrence: RecurrenceType) => void;
}

export const LectureRecurrenceSection: React.FC<LectureRecurrenceSectionProps> = ({
  recurrence,
  onRecurrenceChange,
}) => {
  const { theme } = useTheme();

  const recurrenceOptions: RecurrenceType[] = ['none', 'weekly', 'bi-weekly'];

  return (
    <View style={styles.field}>
      <Text
        style={[
          styles.label,
          { color: theme.isDark ? '#FFFFFF' : '#374151' },
        ]}>
        Recurrence
      </Text>
      <View style={styles.recurrenceGrid}>
        {recurrenceOptions.map(option => {
          const isSelected = recurrence === option;
          return (
            <TouchableOpacity
              key={option}
              style={[
                styles.recurrenceOption,
                isSelected && styles.recurrenceOptionSelected,
                {
                  backgroundColor: isSelected
                    ? COLORS.primary + '1A'
                    : theme.isDark
                      ? '#1C252E'
                      : '#FFFFFF',
                  borderColor: isSelected
                    ? COLORS.primary + '33'
                    : theme.isDark
                      ? '#3B4754'
                      : '#E5E7EB',
                },
              ]}
              onPress={() => onRecurrenceChange(option)}>
              <Text
                style={[
                  styles.recurrenceOptionText,
                  {
                    color: isSelected
                      ? COLORS.primary
                      : theme.isDark
                        ? '#FFFFFF'
                        : '#111418',
                    fontWeight: isSelected ? '600' : '500',
                  },
                ]}>
                {option === 'none'
                  ? 'None'
                  : option === 'weekly'
                    ? 'Weekly'
                    : 'Bi-weekly'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  field: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    marginBottom: SPACING.sm,
  },
  recurrenceGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  recurrenceOption: {
    flex: 1,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recurrenceOptionSelected: {
    borderWidth: 2,
  },
  recurrenceOptionText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },
});

