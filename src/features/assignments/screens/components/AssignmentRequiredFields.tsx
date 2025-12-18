import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Course } from '@/types';
import {
  CourseSelector,
  TaskTitleField,
  TaskDateTimeSection,
} from '@/shared/components/task-forms';
import { useTheme } from '@/contexts/ThemeContext';
import { FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';

interface AssignmentRequiredFieldsProps {
  selectedCourse: Course | null;
  onCourseSelect: (course: Course) => void;
  isLoadingCourses: boolean;
  courses: Course[];
  onOpenCourseModal: () => void;

  title: string;
  onTitleChange: (title: string) => void;

  dueDate: Date;
  onDateChange: (date: Date) => void;
  onTimeChange: (time: Date) => void;
}

export const AssignmentRequiredFields: React.FC<AssignmentRequiredFieldsProps> = ({
  selectedCourse,
  onCourseSelect,
  isLoadingCourses,
  courses,
  onOpenCourseModal,
  title,
  onTitleChange,
  dueDate,
  onDateChange,
  onTimeChange,
}) => {
  const { theme } = useTheme();

  return (
    <View style={styles.section}>
      <Text
        style={[
          styles.sectionTitle,
          { color: theme.isDark ? '#FFFFFF' : '#111418' },
        ]}>
        Required Information
      </Text>

      <CourseSelector
        selectedCourse={selectedCourse}
        onSelect={onCourseSelect}
        isLoading={isLoadingCourses}
        courses={courses}
        onOpenModal={onOpenCourseModal}
      />

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

