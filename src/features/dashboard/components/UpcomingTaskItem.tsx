import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Task } from '@/types';
import { useTheme } from '@/contexts/ThemeContext';
import {
  FONT_SIZES,
  FONT_WEIGHTS,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
} from '@/constants/theme';
import { format, isToday, isTomorrow } from 'date-fns';
import {
  TASK_TYPE_COLORS,
  TASK_TYPE_COLOR_NEUTRAL,
} from '@/constants/taskTypes';

interface UpcomingTaskItemProps {
  task: Task;
  onPress?: () => void;
}

const getDateLabel = (date: Date): string => {
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'EEE');
};

export const UpcomingTaskItem: React.FC<UpcomingTaskItemProps> = ({
  task,
  onPress,
}) => {
  const { theme, isDark } = useTheme();
  const typeColor =
    task.color ?? TASK_TYPE_COLORS[task.type] ?? TASK_TYPE_COLOR_NEUTRAL;
  const taskDate = new Date(task.date);
  const timeStr = format(taskDate, 'h:mm a');
  const dateLabel = getDateLabel(taskDate);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.container,
        {
          backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#F3F4F6',
          borderLeftColor: typeColor,
          borderLeftWidth: 4,
        },
      ]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
          {task.name}
        </Text>
      </View>
      <View style={styles.timeContainer}>
        <Text style={[styles.time, { color: theme.text }]}>{timeStr}</Text>
        <Text style={[styles.date, { color: isDark ? '#9CA3AF' : '#637588' }]}>
          {dateLabel}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.md,
    ...SHADOWS.xs,
  },
  content: {
    flex: 1,
    minWidth: 0,
    marginRight: SPACING.sm,
  },
  title: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: 2,
  },
  timeContainer: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  time: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: 2,
  },
  date: {
    fontSize: 12,
    fontWeight: FONT_WEIGHTS.medium,
  },
});
