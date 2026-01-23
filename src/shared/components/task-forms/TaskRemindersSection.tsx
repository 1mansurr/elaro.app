import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ReminderChip } from '@/shared/components/ReminderChip';
import { formatReminderLabel } from '@/utils/reminderUtils';
import { useTheme } from '@/contexts/ThemeContext';
import { FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';

interface TaskRemindersSectionProps {
  reminders: number[];
  onRemindersChange: (reminders: number[]) => void;
  maxReminders?: number;
  label?: string;
  onAddReminder: () => void;
}

export const TaskRemindersSection: React.FC<TaskRemindersSectionProps> = ({
  reminders,
  onRemindersChange,
  maxReminders = 2,
  label = 'Reminders',
  onAddReminder,
}) => {
  const { theme, isDark } = useTheme();

  const handleRemoveReminder = (minutes: number) => {
    onRemindersChange(reminders.filter(r => r !== minutes));
  };

  return (
    <View style={styles.field}>
      <View style={styles.reminderHeader}>
        <Text
          style={[
            styles.label,
            { color: isDark ? '#FFFFFF' : '#374151' },
          ]}>
          {label}
        </Text>
        <Text
          style={[
            styles.maxReminders,
            { color: isDark ? '#9CA3AF' : '#6B7280' },
          ]}>
          Max {maxReminders}
        </Text>
      </View>
      {reminders.length > 0 && (
        <View style={styles.remindersList}>
          {reminders.map(minutes => (
            <ReminderChip
              key={minutes}
              label={formatReminderLabel(minutes)}
              onRemove={() => handleRemoveReminder(minutes)}
            />
          ))}
        </View>
      )}
      <TouchableOpacity
        style={[
          styles.addReminderButton,
          {
            borderColor: isDark ? '#3B4754' : '#D1D5DB',
            backgroundColor: isDark ? '#1C252E' : '#FFFFFF',
          },
        ]}
        onPress={onAddReminder}
        disabled={reminders.length >= maxReminders}>
        <Ionicons
          name="add-circle-outline"
          size={20}
          color={
            reminders.length >= maxReminders
              ? isDark
                ? '#6B7280'
                : '#9CA3AF'
              : isDark
                ? '#FFFFFF'
                : '#111418'
          }
        />
        <Text
          style={[
            styles.addReminderText,
            {
              color:
                reminders.length >= maxReminders
                  ? isDark
                    ? '#6B7280'
                    : '#9CA3AF'
                  : isDark
                    ? '#FFFFFF'
                    : '#111418',
            },
          ]}>
          Add Reminder
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  field: {
    marginBottom: SPACING.lg,
  },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },
  maxReminders: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
  },
  remindersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  addReminderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    gap: SPACING.xs,
  },
  addReminderText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },
});
