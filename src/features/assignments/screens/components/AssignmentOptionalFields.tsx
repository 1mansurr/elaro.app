import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TaskRemindersSection } from '@/shared/components/task-forms';
import { AssignmentDescriptionField } from './AssignmentDescriptionField';
import { AssignmentSubmissionSection } from './AssignmentSubmissionSection';
import { useTheme } from '@/contexts/ThemeContext';
import { FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';

type SubmissionMethod = 'Online' | 'In-person' | null;

interface AssignmentOptionalFieldsProps {
  description: string;
  onDescriptionChange: (description: string) => void;

  submissionMethod: SubmissionMethod;
  submissionLink: string;
  submissionVenue?: string;
  onSubmissionMethodChange: (method: SubmissionMethod) => void;
  onSubmissionLinkChange: (link: string) => void;
  onSubmissionVenueChange?: (venue: string) => void;

  reminders: number[];
  onRemindersChange: (reminders: number[]) => void;
  onAddReminder: () => void;
}

export const AssignmentOptionalFields: React.FC<
  AssignmentOptionalFieldsProps
> = ({
  description,
  onDescriptionChange,
  submissionMethod,
  submissionLink,
  submissionVenue = '',
  onSubmissionMethodChange,
  onSubmissionLinkChange,
  onSubmissionVenueChange,
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

      <AssignmentDescriptionField
        description={description}
        onDescriptionChange={onDescriptionChange}
      />

      <AssignmentSubmissionSection
        submissionMethod={submissionMethod}
        submissionLink={submissionLink}
        submissionVenue={submissionVenue}
        onSubmissionMethodChange={onSubmissionMethodChange}
        onSubmissionLinkChange={onSubmissionLinkChange}
        onSubmissionVenueChange={onSubmissionVenueChange}
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
