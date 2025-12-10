import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  Alert,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { notificationService } from '@/services/notifications';
import { SimpleNotificationPreferences } from '@/services/notifications/interfaces/SimpleNotificationPreferences';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';

export const InlineNotificationSettings: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [preferences, setPreferences] =
    useState<SimpleNotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      loadPreferences();
    }
  }, [user]);

  const loadPreferences = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const prefs = await notificationService.preferences.getUserPreferences(
        user.id,
      );
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
    if (!preferences || !user) return;

    try {
      setSaving(true);
      const updatedPreferences = { ...preferences, [key]: value };
      setPreferences(updatedPreferences);

      await notificationService.preferences.updateUserPreferences(user.id, {
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

  const handleQuietHoursToggle = async (enabled: boolean) => {
    if (!preferences || !user) return;

    try {
      setSaving(true);
      const updatedPreferences = {
        ...preferences,
        quietHours: { ...preferences.quietHours, enabled },
      };
      setPreferences(updatedPreferences);

      await notificationService.preferences.updateUserPreferences(user.id, {
        quietHours: { enabled },
      });
    } catch (error) {
      console.error('Error updating quiet hours:', error);
      Alert.alert('Error', 'Failed to update quiet hours');
      setPreferences(preferences);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !preferences) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.isDark ? 'rgba(0, 0, 0, 0.2)' : '#F9FAFB',
          borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : '#E5E7EB',
        },
      ]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled>
        <View style={styles.toggleRow}>
          <Text style={[styles.toggleLabel, { color: theme.text }]}>
            Reminders
          </Text>
          <Switch
            value={preferences.reminders}
            onValueChange={value => handleToggle('reminders', value)}
            disabled={saving || !preferences.enabled}
            trackColor={{ false: '#D1D5DB', true: COLORS.primary }}
            thumbColor="#FFFFFF"
          />
        </View>
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
        <View style={styles.toggleRow}>
          <Text style={[styles.toggleLabel, { color: theme.text }]}>
            Lectures
          </Text>
          <Switch
            value={preferences.lectures}
            onValueChange={value => handleToggle('lectures', value)}
            disabled={saving || !preferences.enabled}
            trackColor={{ false: '#D1D5DB', true: COLORS.primary }}
            thumbColor="#FFFFFF"
          />
        </View>
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
        <View style={styles.toggleRow}>
          <Text style={[styles.toggleLabel, { color: theme.text }]}>
            Marketing
          </Text>
          <Switch
            value={preferences.marketing}
            onValueChange={value => handleToggle('marketing', value)}
            disabled={saving || !preferences.enabled}
            trackColor={{ false: '#D1D5DB', true: COLORS.primary }}
            thumbColor="#FFFFFF"
          />
        </View>
        <View style={styles.toggleRow}>
          <View style={styles.quietHoursLabel}>
            <Text style={[styles.toggleLabel, { color: theme.text }]}>
              Quiet Hours
            </Text>
            <Text
              style={[
                styles.quietHoursTime,
                { color: theme.isDark ? '#9CA3AF' : '#6B7280' },
              ]}>
              {preferences.quietHours.start} - {preferences.quietHours.end}
            </Text>
          </View>
          <Switch
            value={preferences.quietHours.enabled}
            onValueChange={handleQuietHoursToggle}
            disabled={saving || !preferences.enabled}
            trackColor={{ false: '#D1D5DB', true: COLORS.primary }}
            thumbColor="#FFFFFF"
          />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    maxHeight: 240,
  },
  scrollView: {
    flexGrow: 0,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  toggleLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },
  quietHoursLabel: {
    flexDirection: 'column',
    gap: 2,
  },
  quietHoursTime: {
    fontSize: 12,
  },
});

