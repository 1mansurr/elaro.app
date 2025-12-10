import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DetailSheetHeader } from './DetailSheetHeader';
import { DetailSheetFooter } from './DetailSheetFooter';
import { ReminderChipsList } from './ReminderChipsList';
import {
  formatCountdown,
  formatDateOnly,
  formatTimeOnly,
} from '@/utils/taskDetailHelpers';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';
import { Assignment } from '@/types';

interface AssignmentDetailSheetProps {
  assignment: Assignment & {
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

export const AssignmentDetailSheet: React.FC<AssignmentDetailSheetProps> = ({
  assignment,
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
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [templateEnabled, setTemplateEnabled] = useState(isTemplate);

  const dueDate = new Date(assignment.dueDate);
  const countdown = formatCountdown(dueDate);
  const isOverdue = countdown === 'Overdue';

  const handleSubmissionLinkPress = () => {
    if (assignment.submissionLink) {
      Linking.openURL(assignment.submissionLink).catch(err =>
        console.error('Failed to open link:', err),
      );
    }
  };

  const handleToggleTemplate = (value: boolean) => {
    setTemplateEnabled(value);
    onToggleTemplate?.(value);
  };

  const description = assignment.description || '';
  const shouldTruncate = description.length > 150;
  const displayDescription = showFullDescription
    ? description
    : shouldTruncate
      ? description.substring(0, 150) + '...'
      : description;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.isDark ? '#18212B' : '#FFFFFF' },
      ]}>
      {/* Header */}
      <DetailSheetHeader
        courseName={assignment.course?.courseName || 'Unknown Course'}
        courseCode={assignment.course?.courseCode}
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
          {assignment.title}
        </Text>

        {/* Due Date & Countdown */}
        <View style={styles.dateSection}>
          <View style={styles.dateRow}>
            <Ionicons
              name="calendar-outline"
              size={20}
              color={theme.isDark ? '#9CA3AF' : '#6B7280'}
            />
            <Text
              style={[
                styles.dateText,
                { color: theme.isDark ? '#9CA3AF' : '#6B7280' },
              ]}>
              Due {formatDateOnly(dueDate)} at {formatTimeOnly(dueDate)}
            </Text>
          </View>
          <View style={styles.countdownRow}>
            <View
              style={[
                styles.countdownDot,
                {
                  backgroundColor: isOverdue ? '#EF4444' : COLORS.primary,
                },
              ]}
            />
            <Text
              style={[
                styles.countdownText,
                {
                  color: isOverdue ? '#EF4444' : COLORS.primary,
                },
              ]}>
              {countdown}
            </Text>
          </View>
        </View>

        {/* Divider */}
        <View
          style={[
            styles.divider,
            { backgroundColor: theme.isDark ? '#374151' : '#E5E7EB' },
          ]}
        />

        {/* Description Section */}
        {description && (
          <View style={styles.section}>
            <Text
              style={[
                styles.sectionTitle,
                { color: theme.isDark ? '#FFFFFF' : '#111418' },
              ]}>
              Description
            </Text>
            <Text
              style={[
                styles.descriptionText,
                { color: theme.isDark ? '#D1D5DB' : '#374151' },
              ]}>
              {displayDescription}
            </Text>
            {shouldTruncate && (
              <TouchableOpacity
                onPress={() => setShowFullDescription(!showFullDescription)}>
                <Text style={[styles.readMoreText, { color: COLORS.primary }]}>
                  {showFullDescription ? 'Read less' : 'Read more'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Submission Method Card */}
        {assignment.submissionMethod && (
          <View style={styles.section}>
            <Text
              style={[
                styles.sectionTitle,
                { color: theme.isDark ? '#FFFFFF' : '#111418' },
              ]}>
              Submission
            </Text>
            <View
              style={[
                styles.submissionCard,
                {
                  backgroundColor: theme.isDark ? '#202A36' : '#F9FAFB',
                  borderColor: theme.isDark ? '#374151' : '#E5E7EB',
                },
              ]}>
              <View style={styles.submissionHeader}>
                <View
                  style={[
                    styles.submissionIconContainer,
                    {
                      backgroundColor: theme.isDark
                        ? COLORS.primary + '33'
                        : '#DBEAFE',
                    },
                  ]}>
                  <Ionicons
                    name="cloud-upload-outline"
                    size={22}
                    color={COLORS.primary}
                  />
                </View>
                <View style={styles.submissionTextContainer}>
                  <Text
                    style={[
                      styles.submissionMethod,
                      { color: theme.isDark ? '#FFFFFF' : '#111418' },
                    ]}>
                    {assignment.submissionMethod === 'Online'
                      ? 'Online Upload'
                      : 'In-Person'}
                  </Text>
                  {assignment.submissionMethod === 'Online' && (
                    <Text
                      style={[
                        styles.submissionPlatform,
                        { color: theme.isDark ? '#9CA3AF' : '#6B7280' },
                      ]}>
                      {assignment.submissionLink
                        ? new URL(assignment.submissionLink).hostname
                        : 'Link provided'}
                    </Text>
                  )}
                </View>
              </View>
              {assignment.submissionMethod === 'Online' &&
                assignment.submissionLink && (
                  <TouchableOpacity
                    style={styles.linkRow}
                    onPress={handleSubmissionLinkPress}>
                    <Ionicons
                      name="link-outline"
                      size={18}
                      color={COLORS.primary}
                    />
                    <Text
                      style={[styles.linkText, { color: COLORS.primary }]}
                      numberOfLines={1}>
                      {assignment.submissionLink}
                    </Text>
                  </TouchableOpacity>
                )}
            </View>
          </View>
        )}

        {/* Reminders Section */}
        {reminders.length > 0 && (
          <View style={styles.section}>
            <Text
              style={[
                styles.sectionTitle,
                { color: theme.isDark ? '#FFFFFF' : '#111418' },
              ]}>
              Reminders
            </Text>
            <ReminderChipsList reminders={reminders} />
          </View>
        )}

        {/* Template Toggle */}
        {onToggleTemplate && (
          <View style={styles.templateSection}>
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
                Reuse these settings later
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
  title: {
    fontSize: 28,
    fontWeight: FONT_WEIGHTS.bold,
    lineHeight: 34,
    marginBottom: SPACING.md,
    marginTop: SPACING.xs,
  },
  dateSection: {
    marginBottom: SPACING.lg,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  dateText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 30,
  },
  countdownDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  countdownText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    marginBottom: SPACING.lg,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.md,
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 24,
    fontWeight: FONT_WEIGHTS.light,
  },
  readMoreText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    marginTop: SPACING.xs,
  },
  submissionCard: {
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
  },
  submissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: SPACING.md,
  },
  submissionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submissionTextContainer: {
    flex: 1,
  },
  submissionMethod: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    marginBottom: 2,
  },
  submissionPlatform: {
    fontSize: FONT_SIZES.xs,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 54,
    marginTop: SPACING.xs,
  },
  linkText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    textDecorationLine: 'underline',
    flex: 1,
  },
  templateSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.xs,
    marginBottom: SPACING.md,
  },
  templateContent: {
    flex: 1,
  },
  templateTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    marginBottom: 2,
  },
  templateDescription: {
    fontSize: FONT_SIZES.xs,
  },
});
