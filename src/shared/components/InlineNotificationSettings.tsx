import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, Alert } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useDeviceId } from '@/hooks/useDeviceId';
import { notificationService } from '@/services/notifications';
import { SimpleNotificationPreferences } from '@/services/notifications/interfaces/SimpleNotificationPreferences';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';

export const InlineNotificationSettings: React.FC = () => {
  const { theme, isDark } = useTheme();
  const deviceId = useDeviceId();
  const [preferences, setPreferences] =
    useState<SimpleNotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (deviceId) {
      loadPreferences();
    }
  }, [deviceId]);

  const loadPreferences = async () => {
    if (!deviceId) return;

    try {
      setLoading(true);
      const prefs =
        await notificationService.preferences.getUserPreferences(deviceId);
      setPreferences(prefs);
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (
    key: keyof SimpleNotificationPreferences,
    value: boolean,
  ) => {
    if (!preferences || !deviceId) return;

    try {
      setSaving(true);
      const updatedPreferences = { ...preferences, [key]: value };
      setPreferences(updatedPreferences);

      await notificationService.preferences.updateUserPreferences(deviceId, {
        [key]: value,
      });
    } catch (error) {
      console.error('Error updating preferences:', error);
      Alert.alert('Error', 'Failed to update notification preferences');
      setPreferences(preferences);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !preferences) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Built-in task type toggles */}
      <View style={styles.toggleRow}>
        <Text style={[styles.toggleLabel, { color: theme.text }]}>
          Assignments
        </Text>
        <Switch
          value={preferences.assignments}
          onValueChange={value => handleToggle('assignments', value)}
          disabled={saving || !preferences.enabled}
          trackColor={{ false: '#D1D5DB', true: COLORS.primary }}
          thumbColor="#FFFFFF"
        />
      </View>
      <View
        style={[
          styles.divider,
          { backgroundColor: isDark ? '#1F2937' : '#F3F4F6' },
        ]}
      />
      <View style={styles.toggleRow}>
        <Text style={[styles.toggleLabel, { color: theme.text }]}>
          Study Sessions
        </Text>
        <Switch
          value={preferences.studySessions}
          onValueChange={value => handleToggle('studySessions', value)}
          disabled={saving || !preferences.enabled}
          trackColor={{ false: '#D1D5DB', true: COLORS.primary }}
          thumbColor="#FFFFFF"
        />
      </View>
      <View
        style={[
          styles.divider,
          { backgroundColor: isDark ? '#1F2937' : '#F3F4F6' },
        ]}
      />
      <View style={styles.toggleRow}>
        <Text style={[styles.toggleLabel, { color: theme.text }]}>
          Daily Summaries
        </Text>
        <Switch
          value={preferences.dailySummaries}
          onValueChange={value => handleToggle('dailySummaries', value)}
          disabled={saving || !preferences.enabled}
          trackColor={{ false: '#D1D5DB', true: COLORS.primary }}
          thumbColor="#FFFFFF"
        />
      </View>

      {/*
       * TASK TYPE TOGGLES — coming soon
       * When users create custom task types, a toggle will be automatically
       * inserted here for each type (fetched from user_task_types table).
       * Each entry: { taskTypeId, label, enabled } → calls handleToggle('taskType_<id>', value)
       */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: SPACING.xs,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  toggleLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium,
  },
  divider: {
    height: 1,
    marginHorizontal: SPACING.lg,
  },
});
