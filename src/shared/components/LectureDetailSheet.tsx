import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DetailSheetHeader } from './DetailSheetHeader';
import { DetailSheetFooter } from './DetailSheetFooter';
import { DetailRow } from './DetailRow';
import { ReminderChipsList } from './ReminderChipsList';
import {
  formatTimeOnly,
  formatDateOnly,
  formatDuration,
  formatRecurrenceLabel,
} from '@/utils/taskDetailHelpers';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';
import { Lecture } from '@/types';

interface LectureDetailSheetProps {
  lecture: Lecture & {
    course: { id: string; courseName: string; courseCode?: string } | null;
  };
  reminders: Array<{ id: string; label: string }>;
  isTemplate?: boolean;
  onEdit: () => void;
  onComplete: () => void;
  onClose?: () => void;
  onDelete?: () => void;
  onToggleTemplate?: (value: boolean) => void;
}

export const LectureDetailSheet: React.FC<LectureDetailSheetProps> = ({
  lecture,
  reminders,
  isTemplate = false,
  onEdit,
  onComplete,
  onClose,
  onDelete,
  onToggleTemplate,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [templateEnabled, setTemplateEnabled] = useState(isTemplate);

  const startTime = lecture.startTime ? new Date(lecture.startTime) : null;
  const endTime = lecture.endTime ? new Date(lecture.endTime) : null;
  const lectureDate = lecture.lectureDate
    ? new Date(lecture.lectureDate)
    : startTime;

  const timeRange =
    startTime && endTime
      ? `${formatTimeOnly(startTime)} - ${formatTimeOnly(endTime)}`
      : startTime
        ? formatTimeOnly(startTime)
        : 'Time TBD';

  const dateTimeSubtitle =
    lectureDate && startTime && endTime
      ? `${formatDateOnly(lectureDate)} • ${formatDuration(startTime, endTime)}`
      : lectureDate
        ? formatDateOnly(lectureDate)
        : '';

  const recurrenceLabel = formatRecurrenceLabel(
    lecture.isRecurring || false,
    lecture.recurringPattern,
  );

  const handleToggleTemplate = (value: boolean) => {
    setTemplateEnabled(value);
    onToggleTemplate?.(value);
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.isDark ? '#18212B' : '#FFFFFF' },
      ]}>
      {/* Header */}
      <DetailSheetHeader
        courseName={lecture.course?.courseName || 'Unknown Course'}
        courseCode={lecture.course?.courseCode}
        showCloseButton={false}
        showDeleteButton={!!onDelete}
        onEdit={onEdit}
        onClose={onClose}
        onDelete={onDelete}
      />

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}>
        {/* Title */}
        <Text
          style={[
            styles.title,
            { color: theme.isDark ? '#FFFFFF' : '#111418' },
          ]}>
          {lecture.lectureName || 'Untitled Lecture'}
        </Text>

        {/* Details List */}
        <View style={styles.detailsList}>
          {/* Time Row */}
          {startTime && (
            <DetailRow
              icon="time-outline"
              iconColor={COLORS.primary}
              title={timeRange}
              subtitle={dateTimeSubtitle}
            />
          )}

          {/* Location Row */}
          {lecture.venue && (
            <DetailRow
              icon="location-outline"
              iconColor={COLORS.primary}
              title={lecture.venue}
              subtitle="Venue"
              rightElement={
                <Ionicons
                  name="map-outline"
                  size={20}
                  color={theme.isDark ? '#9CA3AF' : '#6B7280'}
                />
              }
            />
          )}

          {/* Recurrence Row */}
          {lecture.isRecurring && (
            <DetailRow
              icon="repeat-outline"
              iconColor={COLORS.primary}
              title={recurrenceLabel}
              subtitle={
                lecture.recurringPattern === 'weekly'
                  ? 'On Mondays'
                  : lecture.recurringPattern === 'bi-weekly'
                    ? 'Every other week'
                    : ''
              }
            />
          )}

          {/* Reminders Row */}
          {reminders.length > 0 && (
            <View style={styles.remindersRow}>
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: theme.isDark ? '#283039' : '#EFF6FF',
                  },
                ]}>
                <Ionicons
                  name="notifications-outline"
                  size={24}
                  color={COLORS.primary}
                />
              </View>
              <View style={styles.remindersContent}>
                <Text
                  style={[
                    styles.remindersTitle,
                    { color: theme.isDark ? '#FFFFFF' : '#111418' },
                  ]}>
                  Reminders
                </Text>
                <View style={styles.remindersChips}>
                  <ReminderChipsList reminders={reminders} />
                </View>
              </View>
            </View>
          )}

          {/* Template Toggle Row */}
          {onToggleTemplate && (
            <View style={styles.templateRow}>
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: theme.isDark ? '#283039' : '#EFF6FF',
                  },
                ]}>
                <Ionicons
                  name="bookmark-outline"
                  size={24}
                  color={COLORS.primary}
                />
              </View>
              <View style={styles.templateContent}>
                <Text
                  style={[
                    styles.templateTitle,
                    { color: theme.isDark ? '#FFFFFF' : '#111418' },
                  ]}>
                  Save as Template
                </Text>
                <Text
                  style={[
                    styles.templateDescription,
                    { color: theme.isDark ? '#9CA3AF' : '#6B7280' },
                  ]}>
                  Use for future lectures
                </Text>
              </View>
              <Switch
                value={templateEnabled}
                onValueChange={handleToggleTemplate}
                trackColor={{
                  false: theme.isDark ? '#374151' : '#E5E7EB',
                  true: COLORS.primary,
                }}
                thumbColor="#FFFFFF"
                ios_backgroundColor={theme.isDark ? '#374151' : '#E5E7EB'}
              />
            </View>
          )}
        </View>
      </ScrollView>

      {/* Footer */}
      <DetailSheetFooter
        buttonText="Mark as Complete"
        onPress={onComplete}
        icon="checkmark-circle-outline"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
  },
  title: {
    fontSize: 28,
    fontWeight: FONT_WEIGHTS.bold,
    lineHeight: 34,
    marginBottom: SPACING.md,
    marginTop: SPACING.xs,
    paddingHorizontal: SPACING.md,
  },
  detailsList: {
    gap: 4,
    paddingHorizontal: SPACING.xs,
  },
  remindersRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  remindersContent: {
    flex: 1,
  },
  remindersTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium,
    marginBottom: SPACING.sm,
  },
  remindersChips: {
    marginTop: 4,
  },
  templateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: 12,
    marginTop: SPACING.xs,
  },
  templateContent: {
    flex: 1,
  },
  templateTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium,
    marginBottom: 2,
  },
  templateDescription: {
    fontSize: FONT_SIZES.sm,
  },
});
