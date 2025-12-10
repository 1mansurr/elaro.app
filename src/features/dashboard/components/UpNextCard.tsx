import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Task } from '@/types';
import { useTheme } from '@/contexts/ThemeContext';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';
import { format, differenceInMinutes } from 'date-fns';

interface UpNextCardProps {
  task: Task | null;
  onPress?: () => void;
}

const getCategoryConfig = (taskType: string) => {
  switch (taskType) {
    case 'lecture':
      return {
        label: 'LECTURE',
        icon: 'school-outline',
        bgColor: '#DCFCE7',
        textColor: '#166534',
      };
    case 'study_session':
      return {
        label: 'STUDY',
        icon: 'book-outline',
        bgColor: '#E7F1FF',
        textColor: '#137FEC',
      };
    case 'assignment':
      return {
        label: 'ASSIGNMENT',
        icon: 'document-text-outline',
        bgColor: '#FFEDD5',
        textColor: '#C2410C',
      };
    default:
      return {
        label: 'REVIEW',
        icon: 'menu-book-outline',
        bgColor: '#E7F1FF',
        textColor: '#137FEC',
      };
  }
};

export const UpNextCard: React.FC<UpNextCardProps> = ({ task, onPress }) => {
  const { theme } = useTheme();

  const timeRemaining = useMemo(() => {
    if (!task?.date) return null;
    const taskDate = new Date(task.date);
    const now = new Date();
    const diffMinutes = differenceInMinutes(taskDate, now);
    return diffMinutes > 0 ? diffMinutes : null;
  }, [task?.date]);

  const showTimer = useMemo(() => {
    return timeRemaining !== null && timeRemaining < 60;
  }, [timeRemaining]);

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  if (!task) {
    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.isDark ? '#1E293B' : '#FFFFFF',
            borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : '#E5E7EB',
          },
        ]}>
        <Text
          style={[
            styles.emptyText,
            { color: theme.isDark ? '#9CA3AF' : '#6B7280' },
          ]}>
          You're all clear for now. Enjoy the break!
        </Text>
      </View>
    );
  }

  const category = getCategoryConfig(task.type);
  const taskTime = task.date ? format(new Date(task.date), 'h:mm a') : '';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.95}
      style={[
        styles.card,
        {
          backgroundColor: theme.isDark ? '#1E293B' : '#FFFFFF',
          borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : '#E5E7EB',
        },
      ]}>
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <View
            style={[
              styles.categoryBadge,
              {
                backgroundColor: category.bgColor,
              },
            ]}>
            <Ionicons
              name={category.icon as any}
              size={16}
              color={category.textColor}
            />
            <Text
              style={[
                styles.categoryText,
                {
                  color: category.textColor,
                },
              ]}>
              {category.label}
            </Text>
          </View>
          {showTimer && timeRemaining !== null && (
            <View
              style={[
                styles.timerButton,
                {
                  borderColor: COLORS.primary + '33',
                  backgroundColor: COLORS.primary + '0D',
                },
              ]}>
              <Ionicons name="time-outline" size={18} color={COLORS.primary} />
              <Text style={[styles.timerText, { color: COLORS.primary }]}>
                {formatDuration(timeRemaining)}
              </Text>
            </View>
          )}
        </View>

        <Text style={[styles.taskTitle, { color: theme.text }]}>
          {task.name}
        </Text>
        {task.courses?.courseName && (
          <Text
            style={[
              styles.taskSubtitle,
              { color: theme.isDark ? '#9CA3AF' : '#637588' },
            ]}>
            {task.courses.courseName}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 2,
    overflow: 'hidden',
  },
  content: {
    padding: SPACING.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: FONT_WEIGHTS.bold,
    letterSpacing: 0.5,
  },
  timerButton: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    gap: 2,
  },
  timerText: {
    fontSize: 10,
    fontWeight: FONT_WEIGHTS.bold,
    lineHeight: 10,
  },
  taskTitle: {
    fontSize: 20,
    fontWeight: FONT_WEIGHTS.bold,
    lineHeight: 28,
    marginBottom: 4,
  },
  taskSubtitle: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    textAlign: 'center',
    paddingVertical: SPACING.xl,
  },
});
