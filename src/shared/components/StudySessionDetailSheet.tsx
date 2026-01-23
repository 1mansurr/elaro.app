import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DetailSheetHeader } from './DetailSheetHeader';
import { DetailSheetFooter } from './DetailSheetFooter';
import { formatDateTime, formatTimeOnly } from '@/utils/taskDetailHelpers';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';
import { StudySession } from '@/types';

interface StudySessionDetailSheetProps {
  studySession: StudySession & {
    course: { id: string; courseName: string; courseCode?: string } | null;
  };
  reminders: Array<{ id: string; label: string }>;
  isTemplate?: boolean;
  onEdit: () => void;
  onComplete: () => void;
  onClose?: () => void;
  onDelete?: () => void;
}

export const StudySessionDetailSheet: React.FC<
  StudySessionDetailSheetProps
> = ({
  studySession,
  reminders,
  isTemplate = false,
  onEdit,
  onComplete,
  onClose,
  onDelete,
}) => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const sessionDate = studySession.sessionDate
    ? new Date(studySession.sessionDate)
    : null;

  const scheduledTime = sessionDate
    ? formatDateTime(sessionDate)
    : 'Not scheduled';

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? '#18212B' : '#FFFFFF' },
      ]}>
      {/* Header */}
      <DetailSheetHeader
        courseName={studySession.course?.courseName || 'Unknown Course'}
        courseCode={studySession.course?.courseCode}
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
        {/* Course & Topic */}
        <View style={styles.titleSection}>
          <Text
            style={[
              styles.courseTitle,
              { color: isDark ? '#FFFFFF' : '#111418' },
            ]}>
            {studySession.course?.courseName || 'Unknown Course'}
          </Text>
          <Text
            style={[
              styles.topicTitle,
              { color: isDark ? '#9CA3AF' : '#6B7280' },
            ]}>
            {studySession.topic || 'Untitled Session'}
          </Text>
        </View>

        {/* Timing Row */}
        {sessionDate && (
          <View
            style={[
              styles.timingCard,
              {
                backgroundColor: isDark ? '#151C24' : '#F9FAFB',
                borderColor: isDark ? '#374151' : '#E5E7EB',
              },
            ]}>
            <View
              style={[
                styles.timingIconContainer,
                {
                  backgroundColor: isDark
                    ? COLORS.primary + '33'
                    : COLORS.primary + '1A',
                },
              ]}>
              <Ionicons
                name="calendar-outline"
                size={24}
                color={COLORS.primary}
              />
            </View>
            <View style={styles.timingContent}>
              <Text
                style={[
                  styles.timingLabel,
                  { color: isDark ? '#9CA3AF' : '#6B7280' },
                ]}>
                SCHEDULED FOR
              </Text>
              <Text
                style={[
                  styles.timingValue,
                  { color: isDark ? '#FFFFFF' : '#111418' },
                ]}>
                {scheduledTime}
              </Text>
            </View>
          </View>
        )}

        {/* Notes Section */}
        {studySession.description && (
          <View style={styles.notesSection}>
            <Text
              style={[
                styles.sectionLabel,
                { color: isDark ? '#9CA3AF' : '#6B7280' },
              ]}>
              NOTES
            </Text>
            <View
              style={[
                styles.notesCard,
                {
                  backgroundColor: isDark ? '#151C24' : '#F9FAFB',
                  borderColor: isDark ? '#374151' : '#E5E7EB',
                },
              ]}>
              <Text
                style={[
                  styles.notesText,
                  { color: isDark ? '#D1D5DB' : '#374151' },
                ]}>
                {studySession.description}
              </Text>
            </View>
          </View>
        )}

        {/* Settings List */}
        <View style={styles.settingsSection}>
          <Text
            style={[
              styles.sectionLabel,
              { color: isDark ? '#9CA3AF' : '#6B7280' },
            ]}>
            SETTINGS
          </Text>
          <View style={styles.settingsList}>
            {/* Spaced Repetition Item */}
            <View
              style={[
                styles.settingItem,
                {
                  backgroundColor: isDark ? 'transparent' : 'transparent',
                },
              ]}>
              <View
                style={[
                  styles.settingIconContainer,
                  {
                    backgroundColor: isDark ? '#374151' : '#F3F4F6',
                  },
                ]}>
                <Ionicons
                  name="bulb-outline"
                  size={20}
                  color={isDark ? '#D1D5DB' : '#6B7280'}
                />
              </View>
              <Text
                style={[
                  styles.settingLabel,
                  { color: isDark ? '#FFFFFF' : '#111418' },
                ]}>
                Spaced Repetition
              </Text>
              <View style={styles.settingRight}>
                <Text
                  style={[
                    styles.settingValue,
                    {
                      color: studySession.hasSpacedRepetition
                        ? COLORS.primary
                        : isDark
                          ? '#9CA3AF'
                          : '#6B7280',
                    },
                  ]}>
                  {studySession.hasSpacedRepetition ? 'Active' : 'Inactive'}
                </Text>
                <View
                  style={[
                    styles.toggleIndicator,
                    {
                      backgroundColor: studySession.hasSpacedRepetition
                        ? COLORS.primary
                        : isDark
                          ? '#374151'
                          : '#E5E7EB',
                    },
                  ]}>
                  <View
                    style={[
                      styles.toggleThumb,
                      {
                        transform: [
                          {
                            translateX: studySession.hasSpacedRepetition
                              ? 20
                              : 0,
                          },
                        ],
                      },
                    ]}
                  />
                </View>
              </View>
            </View>

            {/* Reminders Item */}
            {reminders.length > 0 && (
              <View
                style={[
                  styles.settingItem,
                  {
                    backgroundColor: isDark
                      ? 'transparent'
                      : 'transparent',
                  },
                ]}>
                <View
                  style={[
                    styles.settingIconContainer,
                    {
                      backgroundColor: isDark ? '#374151' : '#F3F4F6',
                    },
                  ]}>
                  <Ionicons
                    name="notifications-outline"
                    size={20}
                    color={isDark ? '#D1D5DB' : '#6B7280'}
                  />
                </View>
                <Text
                  style={[
                    styles.settingLabel,
                    { color: isDark ? '#FFFFFF' : '#111418' },
                  ]}>
                  Reminders
                </Text>
                <View style={styles.settingRight}>
                  <Text
                    style={[
                      styles.settingValue,
                      { color: isDark ? '#9CA3AF' : '#6B7280' },
                    ]}>
                    {reminders[0]?.label || 'None'}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={isDark ? '#9CA3AF' : '#6B7280'}
                  />
                </View>
              </View>
            )}

            {/* Template Item */}
            <View
              style={[
                styles.settingItem,
                {
                  backgroundColor: isDark ? 'transparent' : 'transparent',
                },
              ]}>
              <View
                style={[
                  styles.settingIconContainer,
                  {
                    backgroundColor: isDark ? '#374151' : '#F3F4F6',
                  },
                ]}>
                <Ionicons
                  name="bookmark-outline"
                  size={20}
                  color={isDark ? '#D1D5DB' : '#6B7280'}
                />
              </View>
              <Text
                style={[
                  styles.settingLabel,
                  { color: isDark ? '#FFFFFF' : '#111418' },
                ]}>
                Saved as Template
              </Text>
              <View style={styles.settingRight}>
                <Text
                  style={[
                    styles.settingValue,
                    { color: isDark ? '#9CA3AF' : '#6B7280' },
                  ]}>
                  {isTemplate ? 'Yes' : 'No'}
                </Text>
                {isTemplate && (
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                )}
              </View>
            </View>
          </View>
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
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  titleSection: {
    marginBottom: SPACING.lg,
    marginTop: SPACING.xs,
  },
  courseTitle: {
    fontSize: 28,
    fontWeight: FONT_WEIGHTS.bold,
    lineHeight: 34,
    marginBottom: 4,
  },
  topicTitle: {
    fontSize: 20,
    fontWeight: FONT_WEIGHTS.medium,
    lineHeight: 26,
  },
  timingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: SPACING.lg,
  },
  timingIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  timingContent: {
    flex: 1,
  },
  timingLabel: {
    fontSize: 10,
    fontWeight: FONT_WEIGHTS.bold,
    letterSpacing: 1,
    marginBottom: 4,
  },
  timingValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  notesSection: {
    marginBottom: SPACING.lg,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: FONT_WEIGHTS.bold,
    letterSpacing: 1,
    marginBottom: SPACING.sm,
    marginLeft: 4,
  },
  notesCard: {
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 100,
  },
  notesText: {
    fontSize: FONT_SIZES.md,
    lineHeight: 24,
  },
  settingsSection: {
    marginBottom: SPACING.md,
  },
  settingsList: {
    gap: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.sm,
    borderRadius: 12,
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  settingLabel: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },
  toggleIndicator: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
});
