import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  TaskTitleField,
  TaskDateTimeSection,
} from '@/shared/components/task-forms';
import { useTheme } from '@/contexts/ThemeContext';
import { FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';

interface AssignmentRequiredFieldsProps {
  title: string;
  onTitleChange: (title: string) => void;

  dueDate: Date;
  onDateChange: (date: Date) => void;
  onTimeChange: (time: Date) => void;
}

export const AssignmentRequiredFields: React.FC<
  AssignmentRequiredFieldsProps
> = ({ title, onTitleChange, dueDate, onDateChange, onTimeChange }) => {
  const { isDark } = useTheme();

  return (
    <View style={styles.section}>
      <Text
        style={[
          styles.sectionTitle,
          { color: isDark ? '#FFFFFF' : '#111418' },
        ]}>
        Required Information
      </Text>

      <TaskTitleField
        title={title}
        onChange={onTitleChange}
        placeholder="e.g., History Essay"
        maxLength={35}
        label="Assignment Title"
        showCharacterCount={true}
      />

      <TaskDateTimeSection
        date={dueDate}
        onDateChange={onDateChange}
        mode="single"
        label="Due Date & Time"
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
