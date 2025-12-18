import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { Task } from '@/types';
import { useTheme } from '@/contexts/ThemeContext';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';

interface CalendarTaskItemProps {
  task: Task;
  onPress: () => void;
  isLocked?: boolean;
}

const getTaskColor = (type: string) => {
  switch (type) {
    case 'lecture':
      return '#10B981'; // Green
    case 'assignment':
      return '#F97316'; // Orange
    case 'study_session':
      return '#137FEC'; // Blue
    default:
      return '#137FEC';
  }
};

export const CalendarTaskItem: React.FC<CalendarTaskItemProps> = ({
  task,
  onPress,
  isLocked = false,
}) => {
  const { theme } = useTheme();
  const taskTime = format(new Date(task.date), 'h:mm a');
  const isExample =
    'is_example' in task &&
    (task as Task & { is_example?: boolean }).is_example === true;

  return (
    <TouchableOpacity
      style={[
        styles.taskItem,
        isLocked && styles.taskItemLocked,
        {
          backgroundColor: theme.isDark ? '#1C252E' : '#FFFFFF',
          borderColor: theme.isDark ? '#3B4754' : '#E5E7EB',
        },
      ]}
      onPress={onPress}
      accessibilityLabel={`${task.name || task.title}, ${task.type}, ${taskTime}`}
      accessibilityHint={
        isLocked ? 'This task is locked. Upgrade to access.' : 'Opens task details'
      }
      accessibilityRole="button"
      accessibilityState={{ disabled: isLocked }}>
      <View style={styles.taskItemContent}>
        <View
          style={[
            styles.taskTypeBadge,
            { backgroundColor: getTaskColor(task.type) },
          ]}>
          <Text style={styles.taskTypeBadgeText}>
            {task.type === 'study_session' ? 'Study' : task.type}
          </Text>
        </View>
        <View style={styles.taskItemDetails}>
          <View style={styles.taskTitleRow}>
            <Text
              style={[
                styles.taskItemTitle,
                isLocked && styles.taskItemTitleLocked,
                { color: theme.isDark ? '#FFFFFF' : '#111418' },
              ]}
              numberOfLines={2}>
              {task.name || task.title}
            </Text>
            {isExample && (
              <View style={styles.exampleBadgeSmall}>
                <Text style={styles.exampleBadgeText}>EXAMPLE</Text>
              </View>
            )}
          </View>
          <Text
            style={[
              styles.taskItemTime,
              { color: theme.isDark ? '#9CA3AF' : '#6B7280' },
            ]}>
            {taskTime}
          </Text>
          {task.courses && (
            <Text
              style={[
                styles.taskItemCourse,
                { color: theme.isDark ? '#9CA3AF' : '#6B7280' },
              ]}
              numberOfLines={1}>
              {task.courses.courseName}
            </Text>
          )}
        </View>
        {isLocked && (
          <Ionicons name="lock-closed" size={20} color={COLORS.gray} />
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  taskItem: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: SPACING.sm,
    overflow: 'hidden',
  },
  taskItemLocked: {
    opacity: 0.6,
  },
  taskItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  taskTypeBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  taskTypeBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semibold,
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  taskItemDetails: {
    flex: 1,
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  taskItemTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    flex: 1,
  },
  taskItemTitleLocked: {
    opacity: 0.6,
  },
  taskItemTime: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.xs,
  },
  taskItemCourse: {
    fontSize: FONT_SIZES.xs,
  },
  exampleBadgeSmall: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  exampleBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: '#FFFFFF',
  },
});

