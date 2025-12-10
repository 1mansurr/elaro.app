import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Task } from '@/types';
import { useTheme } from '@/contexts/ThemeContext';
import { FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';
import { format } from 'date-fns';

interface CalendarTaskCardProps {
  task: Task;
  onPress?: () => void;
  onMorePress?: () => void;
  isLocked?: boolean;
}

const getCategoryConfig = (taskType: string) => {
  switch (taskType) {
    case 'lecture':
      return {
        label: 'LECTURE',
        borderColor: '#10B981',
        bgColor: '#DCFCE7',
        textColor: '#166534',
      };
    case 'study_session':
      return {
        label: 'STUDY',
        borderColor: '#137FEC',
        bgColor: '#E7F1FF',
        textColor: '#137FEC',
      };
    case 'assignment':
      return {
        label: 'ASSIGNMENT',
        borderColor: '#F97316',
        bgColor: '#FFEDD5',
        textColor: '#C2410C',
      };
    default:
      // Review sessions also use blue
      return {
        label: 'REVIEW',
        borderColor: '#137FEC',
        bgColor: '#E7F1FF',
        textColor: '#137FEC',
      };
  }
};

const formatDuration = (startTime: string, endTime?: string): string => {
  if (!endTime) return '';
  const start = new Date(startTime);
  const end = new Date(endTime);
  const minutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

export const CalendarTaskCard: React.FC<CalendarTaskCardProps> = ({
  task,
  onPress,
  onMorePress,
  isLocked = false,
}) => {
  const { theme } = useTheme();
  const category = getCategoryConfig(task.type);
  const startTime = task.startTime || task.date;
  const endTime = task.endTime;
  const duration = endTime ? formatDuration(startTime, endTime) : '';
  const taskDate = new Date(startTime);
  const timeStr = format(taskDate, 'h:mm a');
  const endTimeStr = endTime ? format(new Date(endTime), 'h:mm a') : '';

  const lecture = task.type === 'lecture' ? (task as any) : null;
  const venue = lecture?.venue || '';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.98}
      style={[
        styles.card,
        {
          borderLeftColor: category.borderColor,
          backgroundColor: theme.isDark ? '#1E293B' : '#FFFFFF',
        },
      ]}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View
              style={[
                styles.categoryBadge,
                {
                  backgroundColor: category.bgColor,
                },
              ]}>
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
            <Text style={[styles.title, { color: theme.text }]}>
              {task.name}
            </Text>
          </View>
          {!isLocked && (
            <TouchableOpacity
              onPress={e => {
                e.stopPropagation();
                onMorePress?.();
              }}
              style={styles.moreButton}>
              <Ionicons
                name="ellipsis-horizontal"
                size={20}
                color={theme.isDark ? '#9CA3AF' : '#9DABB9'}
              />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.metadata}>
          {duration && (
            <View style={styles.metadataItem}>
              <Ionicons
                name="time-outline"
                size={16}
                color={theme.isDark ? '#9CA3AF' : '#9DABB9'}
              />
              <Text
                style={[
                  styles.metadataText,
                  { color: theme.isDark ? '#9CA3AF' : '#9DABB9' },
                ]}>
                {duration}
              </Text>
            </View>
          )}
          {venue && (
            <View style={styles.metadataItem}>
              <Ionicons
                name="location-outline"
                size={16}
                color={theme.isDark ? '#9CA3AF' : '#9DABB9'}
              />
              <Text
                style={[
                  styles.metadataText,
                  { color: theme.isDark ? '#9CA3AF' : '#9DABB9' },
                ]}>
                {venue}
              </Text>
            </View>
          )}
          {task.type === 'assignment' && (
            <View style={styles.metadataItem}>
              <Ionicons
                name="globe-outline"
                size={16}
                color={theme.isDark ? '#9CA3AF' : '#9DABB9'}
              />
              <Text
                style={[
                  styles.metadataText,
                  { color: theme.isDark ? '#9CA3AF' : '#9DABB9' },
                ]}>
                Online Submission
              </Text>
            </View>
          )}
        </View>
      </View>
      {isLocked && (
        <View style={styles.lockedOverlay}>
          <View style={styles.lockedContent}>
            <View style={styles.lockIconContainer}>
              <Ionicons name="lock-closed" size={24} color="#F59E0B" />
            </View>
            <Text style={styles.lockedText}>Premium Content</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderLeftWidth: 6,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  content: {
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
    gap: 4,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: FONT_WEIGHTS.bold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    lineHeight: 20,
  },
  moreButton: {
    padding: 4,
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 8,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metadataText: {
    fontSize: 12,
    fontWeight: FONT_WEIGHTS.medium,
  },
  lockedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    backdropFilter: 'blur(2px)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  lockedContent: {
    alignItems: 'center',
    gap: 8,
  },
  lockIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  lockedText: {
    fontSize: 12,
    fontWeight: FONT_WEIGHTS.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#D97706',
  },
});
