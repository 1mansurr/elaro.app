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

interface LectureRequiredFieldsProps {
  selectedCourse: Course | null;
  onCourseSelect: (course: Course) => void;
  isLoadingCourses: boolean;
  courses: Course[];
  onOpenCourseModal: () => void;

  lectureName: string;
  onLectureNameChange: (name: string) => void;

  startTime: Date;
  endTime: Date;
  onStartTimeChange: (time: Date) => void;
  onEndTimeChange: (time: Date) => void;
  onDateChange: (date: Date) => void;
}

export const LectureRequiredFields: React.FC<LectureRequiredFieldsProps> = ({
  selectedCourse,
  onCourseSelect,
  isLoadingCourses,
  courses,
  onOpenCourseModal,
  lectureName,
  onLectureNameChange,
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  onDateChange,
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
        title={lectureName}
        onChange={onLectureNameChange}
        placeholder="e.g., Introduction to Psychology"
        maxLength={35}
        label="Lecture Name"
        showCharacterCount={true}
      />

      <TaskDateTimeSection
        startTime={startTime}
        endTime={endTime}
        onStartTimeChange={onStartTimeChange}
        onEndTimeChange={onEndTimeChange}
        onDateChange={onDateChange}
        mode="range"
        label="Date & Time"
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

