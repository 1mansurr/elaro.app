import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Task } from '@/types';
import { format } from 'date-fns';

// Enable LayoutAnimation on Android
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Props {
  task: Task;
  position: { top: number; left: number; height: number; width: number };
  onPress: () => void;
  onViewDetails: () => void;
  isExpanded: boolean;
  isLocked?: boolean;
}

const EventItem: React.FC<Props> = ({
  task,
  position,
  onPress,
  onViewDetails,
  isExpanded,
  isLocked = false,
}) => {
  const eventColor = {
    lecture: '#007AFF',
    study_session: '#34C759',
    assignment: '#FF9500',
  };

  const backgroundColor = isLocked
    ? '#8E8E93'
    : eventColor[task.type] || '#8E8E93';
  const isCompleted = task.status === 'completed';
  const isExample =
    'is_example' in task &&
    (task as Task & { is_example?: boolean }).is_example === true;

  // Calculate duration and time range
  const startTime = new Date(task.startTime || task.date);
  const endTime = task.endTime ? new Date(task.endTime) : null;

  const timeRange = endTime
    ? `${format(startTime, 'h:mm a')} - ${format(endTime, 'h:mm a')}`
    : format(startTime, 'h:mm a');

  const durationMinutes = endTime
    ? Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60))
    : null;

  const handlePress = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onPress();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[
        styles.container,
        {
          top: position.top,
          left: position.left,
          minHeight: position.height,
          width: position.width,
          backgroundColor,
          height: isExpanded ? 'auto' : position.height,
        },
        isLocked && styles.lockedContainer,
        isCompleted && styles.completedContainer,
      ]}
      activeOpacity={0.7}>
      {isLocked && (
        <View style={styles.lockIconContainer}>
          <Ionicons name="lock-closed" size={14} color="#fff" />
        </View>
      )}

      {/* Main Content */}
      <View style={styles.content}>
        {/* Header Row */}
        <View style={styles.headerRow}>
          <Text
            style={[
              styles.title,
              isCompleted && styles.completedText,
              isLocked && styles.lockedText,
            ]}
            numberOfLines={isExpanded ? undefined : 1}>
            {task.name || task.title}
          </Text>
          <View style={styles.badges}>
            {isExample && (
              <View style={styles.exampleBadge}>
                <Text style={styles.exampleBadgeText}>EX</Text>
              </View>
            )}
            {durationMinutes && (
              <View style={styles.durationBadge}>
                <Text style={styles.durationText}>{durationMinutes}m</Text>
              </View>
            )}
          </View>
        </View>

        {/* Course Name */}
        {task.courses && (
          <Text style={styles.courseName} numberOfLines={1}>
            {task.courses.courseName}
          </Text>
        )}

        {/* Time Range */}
        <View style={styles.infoRow}>
          <Ionicons
            name="time-outline"
            size={12}
            color="rgba(255, 255, 255, 0.8)"
          />
          <Text style={styles.timeRange}>{timeRange}</Text>
        </View>

        {/* Location (for lectures) */}
        {task.type === 'lecture' && (task as any).location && (
          <View style={styles.infoRow}>
            <Ionicons
              name="location-outline"
              size={12}
              color="rgba(255, 255, 255, 0.8)"
            />
            <Text style={styles.locationText} numberOfLines={1}>
              {(task as any).location}
            </Text>
          </View>
        )}

        {/* Expanded Section */}
        {isExpanded && (
          <View style={styles.expandedSection}>
            {/* Description/Notes */}
            {(task.description || (task as any).notes) && (
              <View style={styles.descriptionContainer}>
                <Text style={styles.descriptionLabel}>
                  {task.type === 'study_session' ? 'Notes:' : 'Description:'}
                </Text>
                <Text style={styles.descriptionText} numberOfLines={3}>
                  {task.description || (task as any).notes}
                </Text>
              </View>
            )}

            {/* Submission Method (Assignments) */}
            {task.type === 'assignment' && (task as any).submission_method && (
              <View style={styles.metadataRow}>
                <Ionicons
                  name="send-outline"
                  size={12}
                  color="rgba(255, 255, 255, 0.8)"
                />
                <Text style={styles.metadataText}>
                  {(task as any).submission_method}
                </Text>
              </View>
            )}

            {/* Recurrence (Lectures) */}
            {task.type === 'lecture' && (task as any).recurrence_rule && (
              <View style={styles.metadataRow}>
                <Ionicons
                  name="repeat-outline"
                  size={12}
                  color="rgba(255, 255, 255, 0.8)"
                />
                <Text style={styles.metadataText}>
                  Recurring: {(task as any).recurrence_rule}
                </Text>
              </View>
            )}

            {/* Spaced Repetition (Study Sessions) */}
            {task.type === 'study_session' &&
              (task as any).has_spaced_repetition && (
                <View style={styles.metadataRow}>
                  <Ionicons
                    name="refresh-outline"
                    size={12}
                    color="rgba(255, 255, 255, 0.8)"
                  />
                  <Text style={styles.metadataText}>
                    Spaced Repetition Enabled
                  </Text>
                </View>
              )}

            {/* View Full Details Button */}
            <TouchableOpacity
              style={styles.viewDetailsButton}
              onPress={e => {
                e.stopPropagation();
                onViewDetails();
              }}>
              <Text style={styles.viewDetailsText}>View Full Details</Text>
              <Ionicons name="arrow-forward" size={14} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {/* Chevron */}
        <View style={styles.chevronContainer}>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color="rgba(255, 255, 255, 0.7)"
          />
        </View>
      </View>
    </TouchableOpacity>
  );
};

import {
  BORDER_RADIUS,
  SHADOWS,
} from '@/constants/theme';

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderLeftWidth: 4,
    borderLeftColor: 'rgba(255, 255, 255, 0.5)',
    ...SHADOWS.sm,
  },
  lockedContainer: {
    opacity: 0.6,
    backgroundColor: '#8E8E93',
  },
  completedContainer: {
    opacity: 0.7,
  },
  lockIconContainer: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: BORDER_RADIUS.md,
    padding: 3,
  },
  content: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  title: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
    flex: 1,
    marginRight: 4,
  },
  badges: {
    flexDirection: 'row',
    gap: 4,
  },
  exampleBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.xs,
  },
  exampleBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  durationBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.xs,
  },
  durationText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '600',
  },
  courseName: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    marginBottom: 4,
    fontWeight: '500',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  timeRange: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 11,
    fontWeight: '500',
  },
  locationText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    flex: 1,
  },
  lockedText: {
    opacity: 0.7,
  },
  completedText: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  chevronContainer: {
    position: 'absolute',
    bottom: 4,
    right: 6,
  },
  expandedSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.3)',
  },
  descriptionContainer: {
    marginBottom: 6,
  },
  descriptionLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  descriptionText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 11,
    lineHeight: 15,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  metadataText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 10,
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: BORDER_RADIUS.sm,
    marginTop: 6,
    gap: 4,
  },
  viewDetailsText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
});

export default memo(EventItem);
