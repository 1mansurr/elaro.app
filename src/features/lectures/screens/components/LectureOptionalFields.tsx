import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  TaskRemindersSection,
} from '@/shared/components/task-forms';
import { LectureVenueField } from './LectureVenueField';
import { LectureRecurrenceSection } from './LectureRecurrenceSection';
import { useTheme } from '@/contexts/ThemeContext';
import { FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';

interface LectureOptionalFieldsProps {
  venue: string;
  onVenueChange: (venue: string) => void;

  recurrence: 'none' | 'weekly' | 'bi-weekly';
  onRecurrenceChange: (recurrence: 'none' | 'weekly' | 'bi-weekly') => void;

  reminders: number[];
  onRemindersChange: (reminders: number[]) => void;
  onAddReminder: () => void;
}

export const LectureOptionalFields: React.FC<LectureOptionalFieldsProps> = ({
  venue,
  onVenueChange,
  recurrence,
  onRecurrenceChange,
  reminders,
  onRemindersChange,
  onAddReminder,
}) => {
  const { theme } = useTheme();

  return (
    <View style={styles.section}>
      <Text
        style={[
          styles.sectionTitle,
          { color: theme.isDark ? '#FFFFFF' : '#111418' },
        ]}>
        Optional Details
      </Text>

      <LectureVenueField venue={venue} onVenueChange={onVenueChange} />

      <LectureRecurrenceSection
        recurrence={recurrence}
        onRecurrenceChange={onRecurrenceChange}
      />

      <TaskRemindersSection
        reminders={reminders}
        onRemindersChange={onRemindersChange}
        maxReminders={2}
        label="Reminders"
        onAddReminder={onAddReminder}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.md,
    paddingLeft: SPACING.xs,
  },
});

