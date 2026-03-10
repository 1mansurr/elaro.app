import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useTheme } from '@/contexts/ThemeContext';
import { Course } from '@/types';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';

type TaskType = 'assignment' | 'lecture' | 'study_session';

interface QuickAddFormFieldsProps {
  taskType: TaskType;
  title: string;
  onTitleChange: (title: string) => void;
  selectedCourse: Course | null;
  onOpenCourseModal: () => void;
  isLoadingCourses: boolean;
  dateTime: Date;
  onOpenDatePicker: () => void;
  onOpenTimePicker: () => void;
}

export const QuickAddFormFields: React.FC<QuickAddFormFieldsProps> = ({
  taskType,
  title,
  onTitleChange,
  selectedCourse,
  onOpenCourseModal,
  isLoadingCourses,
  dateTime,
  onOpenDatePicker,
  onOpenTimePicker,
}) => {
  const { theme, isDark } = useTheme();

  const titleLabel = taskType === 'study_session' ? 'Topic *' : 'Title *';
  const placeholder =
    taskType === 'assignment'
      ? 'e.g., Math Homework'
      : taskType === 'lecture'
        ? 'e.g., Weekly Lecture'
        : 'e.g., Review Chapter 5';
  const dateTimeLabel =
    taskType === 'assignment' ? 'Due Date & Time *' : 'Date & Time *';

  return (
    <View style={styles.container}>
      {/* Title Input */}
      <Text style={[styles.label, { color: isDark ? '#FFFFFF' : '#374151' }]}>
        {titleLabel}
      </Text>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: isDark ? '#1C252E' : '#FFFFFF',
            borderColor: isDark ? '#3B4754' : COLORS.border,
            color: isDark ? '#FFFFFF' : '#111418',
          },
        ]}
        value={title}
        onChangeText={onTitleChange}
        placeholder={placeholder}
        placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
        autoFocus
        maxLength={35}
      />
      <Text
        style={[
          styles.characterCount,
          { color: isDark ? '#9CA3AF' : '#6B7280' },
        ]}>
        {title.length}/35
      </Text>

      {/* Course Selector */}
      <Text style={[styles.label, { color: isDark ? '#FFFFFF' : '#374151' }]}>
        Course *
      </Text>
      <TouchableOpacity
        style={[
          styles.selectButton,
          {
            backgroundColor: isDark ? '#1C252E' : '#FFFFFF',
            borderColor: isDark ? '#3B4754' : COLORS.border,
          },
        ]}
        onPress={onOpenCourseModal}
        disabled={isLoadingCourses}>
        <Text
          style={[
            styles.selectButtonText,
            !selectedCourse && styles.selectButtonPlaceholder,
            {
              color: !selectedCourse
                ? isDark
                  ? '#6B7280'
                  : '#9CA3AF'
                : isDark
                  ? '#FFFFFF'
                  : '#111418',
            },
          ]}>
          {isLoadingCourses
            ? 'Loading...'
            : selectedCourse?.courseName || 'Select a course'}
        </Text>
        <Ionicons
          name="chevron-down"
          size={20}
          color={isDark ? '#9CA3AF' : COLORS.gray}
        />
      </TouchableOpacity>

      {/* Date & Time */}
      <Text style={[styles.label, { color: isDark ? '#FFFFFF' : '#374151' }]}>
        {dateTimeLabel}
      </Text>
      <View style={styles.dateTimeRow}>
        <TouchableOpacity
          style={[
            styles.dateTimeButton,
            {
              flex: 1,
              marginRight: 8,
              backgroundColor: isDark ? '#1C252E' : '#FFFFFF',
              borderColor: isDark ? '#3B4754' : COLORS.border,
            },
          ]}
          onPress={onOpenDatePicker}>
          <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
          <Text
            style={[
              styles.dateTimeButtonText,
              { color: isDark ? '#FFFFFF' : '#111418' },
            ]}>
            {format(dateTime, 'MMM dd')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.dateTimeButton,
            {
              flex: 1,
              backgroundColor: isDark ? '#1C252E' : '#FFFFFF',
              borderColor: isDark ? '#3B4754' : COLORS.border,
            },
          ]}
          onPress={onOpenTimePicker}>
          <Ionicons name="time-outline" size={18} color={COLORS.primary} />
          <Text
            style={[
              styles.dateTimeButtonText,
              { color: isDark ? '#FFFFFF' : '#111418' },
            ]}>
            {format(dateTime, 'h:mm a')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    marginBottom: SPACING.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    marginBottom: SPACING.xs,
  },
  characterCount: {
    fontSize: FONT_SIZES.xs,
    textAlign: 'right',
    marginBottom: SPACING.md,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: SPACING.md,
  },
  selectButtonText: {
    fontSize: FONT_SIZES.md,
    flex: 1,
  },
  selectButtonPlaceholder: {
    opacity: 0.6,
  },
  dateTimeRow: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.sm,
    borderWidth: 1,
    borderRadius: 12,
    gap: SPACING.xs,
  },
  dateTimeButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },
});
