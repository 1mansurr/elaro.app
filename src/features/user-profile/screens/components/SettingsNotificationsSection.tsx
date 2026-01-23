import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { InlineNotificationSettings } from '@/shared/components';
import { useTheme } from '@/contexts/ThemeContext';
import { FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';

export const SettingsNotificationsSection: React.FC = () => {
  const { theme, isDark } = useTheme();

  return (
    <View style={styles.notificationsSection}>
      <View style={styles.notificationsHeader}>
        <View
          style={[
            styles.notificationsIconContainer,
            {
              backgroundColor: isDark
                ? 'rgba(249, 115, 22, 0.2)'
                : '#FED7AA',
            },
          ]}>
          <Ionicons
            name="notifications"
            size={18}
            color={isDark ? '#FB923C' : '#EA580C'}
          />
        </View>
        <View style={styles.notificationsHeaderText}>
          <Text
            style={[
              styles.notificationsTitle,
              { color: isDark ? '#FFFFFF' : '#111418' },
            ]}>
            Notifications
          </Text>
          <Text
            style={[
              styles.notificationsDescription,
              { color: isDark ? '#9CA3AF' : '#6B7280' },
            ]}>
            Manage how you receive alerts for revisions and schedules.
          </Text>
        </View>
      </View>
      <View style={styles.notificationsContainer}>
        <InlineNotificationSettings />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  notificationsSection: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xs,
  },
  notificationsHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  notificationsIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  notificationsHeaderText: {
    flex: 1,
  },
  notificationsTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    marginBottom: 4,
  },
  notificationsDescription: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 18,
  },
  notificationsContainer: {
    marginTop: 8,
  },
});
