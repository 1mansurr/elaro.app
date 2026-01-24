import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';

type TaskType = 'assignment' | 'lecture' | 'study_session';

interface QuickAddTaskTypeSelectorProps {
  taskType: TaskType;
  onTaskTypeChange: (type: TaskType) => void;
}

export const QuickAddTaskTypeSelector: React.FC<
  QuickAddTaskTypeSelectorProps
> = ({ taskType, onTaskTypeChange }) => {
  const { theme, isDark } = useTheme();

  const taskTypes: Array<{ type: TaskType; icon: string; label: string }> = [
    { type: 'assignment', icon: 'document-text-outline', label: 'Assignment' },
    { type: 'lecture', icon: 'school-outline', label: 'Lecture' },
    { type: 'study_session', icon: 'book-outline', label: 'Study' },
  ];

  return (
    <View style={styles.container}>
      {taskTypes.map(({ type, icon, label }) => {
        const isActive = taskType === type;
        return (
          <TouchableOpacity
            key={type}
            style={[
              styles.typeButton,
              isActive && styles.typeButtonActive,
              {
                backgroundColor: isActive
                  ? COLORS.primary + '1A'
                  : isDark
                    ? '#1C252E'
                    : '#F9FAFB',
                borderColor: isActive
                  ? COLORS.primary
                  : isDark
                    ? '#3B4754'
                    : '#E5E7EB',
              },
            ]}
            onPress={() => onTaskTypeChange(type)}>
            <Ionicons
              name={icon as any}
              size={20}
              color={isActive ? COLORS.primary : isDark ? '#9CA3AF' : '#6B7280'}
            />
            <Text
              style={[
                styles.typeButtonText,
                isActive && styles.typeButtonTextActive,
                {
                  color: isActive
                    ? COLORS.primary
                    : isDark
                      ? '#FFFFFF'
                      : '#111418',
                },
              ]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderRadius: 12,
    borderWidth: 1,
  },
  typeButtonActive: {
    borderWidth: 2,
  },
  typeButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },
  typeButtonTextActive: {
    fontWeight: FONT_WEIGHTS.semibold,
  },
});
