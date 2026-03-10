import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Course } from '@/types';
import { useTheme } from '@/contexts/ThemeContext';
import { FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';

interface CourseSelectorProps {
  selectedCourse: Course | null;
  onSelect: (course: Course) => void;
  isLoading?: boolean;
  label?: string;
  required?: boolean;
  courses: Course[];
  onOpenModal: () => void;
}

export const CourseSelector: React.FC<CourseSelectorProps> = ({
  selectedCourse,
  onSelect,
  isLoading = false,
  label = 'Course',
  required = true,
  courses,
  onOpenModal,
}) => {
  const { theme, isDark } = useTheme();

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: isDark ? '#FFFFFF' : '#374151' }]}>
        {label} {required && '*'}
      </Text>
      <TouchableOpacity
        style={[
          styles.selectButton,
          {
            backgroundColor: isDark ? '#1C252E' : '#FFFFFF',
            borderColor: isDark ? '#3B4754' : 'transparent',
          },
        ]}
        onPress={onOpenModal}
        disabled={isLoading}>
        {isLoading ? (
          <ActivityIndicator
            size="small"
            color={isDark ? '#FFFFFF' : '#111418'}
          />
        ) : (
          <Text
            style={[
              styles.selectButtonText,
              {
                color: !selectedCourse
                  ? isDark
                    ? '#9CA3AF'
                    : '#9CA3AF'
                  : isDark
                    ? '#FFFFFF'
                    : '#111418',
              },
            ]}>
            {isLoading
              ? 'Loading courses...'
              : selectedCourse?.courseName || 'Select Course'}
          </Text>
        )}
        <Ionicons
          name="chevron-down"
          size={24}
          color={isDark ? '#FFFFFF' : '#111418'}
        />
      </TouchableOpacity>
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
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  selectButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.normal,
    flex: 1,
  },
});
