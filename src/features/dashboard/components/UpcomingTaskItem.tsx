import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Task } from '@/types';
import { useTheme } from '@/contexts/ThemeContext';
import {
  FONT_SIZES,
  FONT_WEIGHTS,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
} from '@/constants/theme';
import { format, isToday, isTomorrow, isSameDay, addDays } from 'date-fns';

interface UpcomingTaskItemProps {
  task: Task;
  onPress?: () => void;
}

const getCategoryConfig = (taskType: string) => {
  switch (taskType) {
    case 'lecture':
      return {
        icon: 'school-outline' as const,
        bgColor: '#DCFCE7',
        iconColor: '#166534',
      };
    case 'study_session':
      return {
        icon: 'book-outline' as const,
        bgColor: '#E7F1FF',
        iconColor: '#137FEC',
      };
    case 'assignment':
      return {
        icon: 'document-text-outline' as const,
        bgColor: '#FFEDD5',
        iconColor: '#C2410C',
      };
    default:
      return {
        icon: 'menu-book-outline' as const,
        bgColor: '#E7F1FF',
        iconColor: '#137FEC',
      };
  }
};

const getDateLabel = (date: Date): string => {
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'EEE');
};

const getSubtitle = (task: Task): string => {
  if (task.type === 'lecture') {
    const lecture = task as any;
    const parts: string[] = [];
    if (lecture.venue) parts.push(lecture.venue);
    if (lecture.courses?.courseName) parts.push(lecture.courses.courseName);
    return parts.join(' • ') || task.courses?.courseName || '';
  }
  if (task.type === 'assignment') {
    return task.courses?.courseName || '';
  }
  return task.courses?.courseName || '';
};

export const UpcomingTaskItem: React.FC<UpcomingTaskItemProps> = ({
  task,
  onPress,
}) => {
  const { theme } = useTheme();
  const category = getCategoryConfig(task.type);
  const taskDate = new Date(task.date);
  const timeStr = format(taskDate, 'h:mm a');
  const dateLabel = getDateLabel(taskDate);
  const subtitle = getSubtitle(task);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.container,
        {
          backgroundColor: theme.isDark ? '#1E293B' : '#FFFFFF',
          borderColor: theme.isDark
            ? 'rgba(255, 255, 255, 0.1)'
            : 'transparent',
        },
      ]}>
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: category.bgColor,
          },
        ]}>
        <Ionicons name={category.icon} size={24} color={category.iconColor} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
          {task.name}
        </Text>
        {subtitle && (
          <Text
            style={[
              styles.subtitle,
              { color: theme.isDark ? '#9CA3AF' : '#637588' },
            ]}
            numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      <View style={styles.timeContainer}>
        <Text style={[styles.time, { color: theme.text }]}>{timeStr}</Text>
        <Text
          style={[
            styles.date,
            { color: theme.isDark ? '#9CA3AF' : '#637588' },
          ]}>
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
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
    flexShrink: 0,
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
  subtitle: {
    fontSize: 12,
    lineHeight: 16,
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
