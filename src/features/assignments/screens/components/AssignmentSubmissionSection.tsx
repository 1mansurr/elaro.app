import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';

type SubmissionMethod = 'Online' | 'In-person' | null;

interface AssignmentSubmissionSectionProps {
  submissionMethod: SubmissionMethod;
  submissionLink: string;
  submissionVenue?: string;
  onSubmissionMethodChange: (method: SubmissionMethod) => void;
  onSubmissionLinkChange: (link: string) => void;
  onSubmissionVenueChange?: (venue: string) => void;
}

export const AssignmentSubmissionSection: React.FC<
  AssignmentSubmissionSectionProps
> = ({
  submissionMethod,
  submissionLink,
  submissionVenue = '',
  onSubmissionMethodChange,
  onSubmissionLinkChange,
  onSubmissionVenueChange,
}) => {
  const { theme } = useTheme();

  return (
    <View style={styles.field}>
      <Text
        style={[styles.label, { color: theme.isDark ? '#FFFFFF' : '#374151' }]}>
        Submission Method
      </Text>
      <View style={styles.submissionGrid}>
        <TouchableOpacity
          style={[
            styles.submissionOption,
            submissionMethod === 'Online' && styles.submissionOptionSelected,
            {
              backgroundColor:
                submissionMethod === 'Online'
                  ? COLORS.primary + '1A'
                  : theme.isDark
                    ? '#1C252E'
                    : '#FFFFFF',
              borderColor:
                submissionMethod === 'Online'
                  ? COLORS.primary + '33'
                  : theme.isDark
                    ? '#3B4754'
                    : '#E5E7EB',
            },
          ]}
          onPress={() => onSubmissionMethodChange('Online')}>
          <Ionicons
            name="globe-outline"
            size={20}
            color={
              submissionMethod === 'Online'
                ? COLORS.primary
                : theme.isDark
                  ? '#FFFFFF'
                  : '#111418'
            }
          />
          <Text
            style={[
              styles.submissionOptionText,
              {
                color:
                  submissionMethod === 'Online'
                    ? COLORS.primary
                    : theme.isDark
                      ? '#FFFFFF'
                      : '#111418',
                fontWeight: submissionMethod === 'Online' ? '600' : '500',
              },
            ]}>
            Online
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.submissionOption,
            submissionMethod === 'In-person' && styles.submissionOptionSelected,
            {
              backgroundColor:
                submissionMethod === 'In-person'
                  ? COLORS.primary + '1A'
                  : theme.isDark
                    ? '#1C252E'
                    : '#FFFFFF',
              borderColor:
                submissionMethod === 'In-person'
                  ? COLORS.primary + '33'
                  : theme.isDark
                    ? '#3B4754'
                    : '#E5E7EB',
            },
          ]}
          onPress={() => onSubmissionMethodChange('In-person')}>
          <Ionicons
            name="location-outline"
            size={20}
            color={
              submissionMethod === 'In-person'
                ? COLORS.primary
                : theme.isDark
                  ? '#FFFFFF'
                  : '#111418'
            }
          />
          <Text
            style={[
              styles.submissionOptionText,
              {
                color:
                  submissionMethod === 'In-person'
                    ? COLORS.primary
                    : theme.isDark
                      ? '#FFFFFF'
                      : '#111418',
                fontWeight: submissionMethod === 'In-person' ? '600' : '500',
              },
            ]}>
            In-person
          </Text>
        </TouchableOpacity>
      </View>

      {submissionMethod === 'Online' && (
        <View style={styles.linkField}>
          <Text
            style={[
              styles.label,
              { color: theme.isDark ? '#FFFFFF' : '#374151' },
            ]}>
            Submission Link
          </Text>
          <View style={styles.linkInputContainer}>
            <Ionicons
              name="link-outline"
              size={20}
              color={theme.isDark ? '#9CA3AF' : '#6B7280'}
              style={styles.linkIcon}
            />
            <TextInput
              style={[
                styles.linkInput,
                {
                  backgroundColor: theme.isDark ? '#1C252E' : '#FFFFFF',
                  borderColor: theme.isDark ? '#3B4754' : 'transparent',
                  color: theme.isDark ? '#FFFFFF' : '#111418',
                },
              ]}
              value={submissionLink}
              onChangeText={onSubmissionLinkChange}
              placeholder="https://..."
              placeholderTextColor={theme.isDark ? '#6B7280' : '#9CA3AF'}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          </View>
        </View>
      )}

      {submissionMethod === 'In-person' && onSubmissionVenueChange && (
        <View style={styles.linkField}>
          <Text
            style={[
              styles.label,
              { color: theme.isDark ? '#FFFFFF' : '#374151' },
            ]}>
            Submission Venue
          </Text>
          <View style={styles.linkInputContainer}>
            <Ionicons
              name="location-outline"
              size={20}
              color={theme.isDark ? '#9CA3AF' : '#6B7280'}
              style={styles.linkIcon}
            />
            <TextInput
              style={[
                styles.linkInput,
                {
                  backgroundColor: theme.isDark ? '#1C252E' : '#FFFFFF',
                  borderColor: theme.isDark ? '#3B4754' : 'transparent',
                  color: theme.isDark ? '#FFFFFF' : '#111418',
                },
              ]}
              value={submissionVenue}
              onChangeText={onSubmissionVenueChange}
              placeholder="e.g., Room 101, Building A"
              placeholderTextColor={theme.isDark ? '#6B7280' : '#9CA3AF'}
              autoCapitalize="words"
            />
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  field: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    marginBottom: SPACING.sm,
  },
  submissionGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  submissionOption: {
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
  submissionOptionSelected: {
    borderWidth: 2,
  },
  submissionOptionText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },
  linkField: {
    marginTop: SPACING.md,
  },
  linkInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  linkIcon: {
    position: 'absolute',
    left: SPACING.md,
    zIndex: 1,
  },
  linkInput: {
    flex: 1,
    height: 56,
    paddingLeft: SPACING.md + 24,
    paddingRight: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: FONT_SIZES.md,
  },
});
