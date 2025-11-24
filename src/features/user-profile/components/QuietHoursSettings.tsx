import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate } from '@/i18n';

interface QuietHoursSettingsProps {
  onUpdate?: () => void;
}

export function QuietHoursSettings({ onUpdate }: QuietHoursSettingsProps) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [quietStart, setQuietStart] = useState(new Date());
  const [quietEnd, setQuietEnd] = useState(new Date());
  const [weekendNotifications, setWeekendNotifications] = useState(true);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select(
          'quiet_hours_start, quiet_hours_end, weekend_notifications_enabled',
        )
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      if (data?.quiet_hours_start && data?.quiet_hours_end) {
        setQuietHoursEnabled(true);

        // Parse time strings (HH:MM:SS) to Date objects
        const [startHour, startMin] = data.quiet_hours_start
          .split(':')
          .map(Number);
        const [endHour, endMin] = data.quiet_hours_end.split(':').map(Number);

        const startDate = new Date();
        startDate.setHours(startHour, startMin, 0, 0);

        const endDate = new Date();
        endDate.setHours(endHour, endMin, 0, 0);

        setQuietStart(startDate);
        setQuietEnd(endDate);
      } else {
        // Set defaults
        const defaultStart = new Date();
        defaultStart.setHours(22, 0, 0, 0); // 10 PM
        const defaultEnd = new Date();
        defaultEnd.setHours(8, 0, 0, 0); // 8 AM

        setQuietStart(defaultStart);
        setQuietEnd(defaultEnd);
      }

      setWeekendNotifications(data?.weekend_notifications_enabled ?? true);
    } catch (error) {
      console.error('Error loading quiet hours settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!user) return;

    try {
      const startTime = `${quietStart.getHours().toString().padStart(2, '0')}:${quietStart.getMinutes().toString().padStart(2, '0')}:00`;
      const endTime = `${quietEnd.getHours().toString().padStart(2, '0')}:${quietEnd.getMinutes().toString().padStart(2, '0')}:00`;

      const { error } = await supabase
        .from('notification_preferences')
        .update({
          quiet_hours_start: quietHoursEnabled ? startTime : null,
          quiet_hours_end: quietHoursEnabled ? endTime : null,
          weekend_notifications_enabled: weekendNotifications,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      onUpdate?.();
    } catch (error) {
      console.error('Error saving quiet hours:', error);
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const formatTime = (date: Date): string => {
    return formatDate(date, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleQuietHoursToggle = async (value: boolean) => {
    setQuietHoursEnabled(value);
    // Auto-save when toggling
    setTimeout(saveSettings, 100);
  };

  const handleWeekendToggle = async (value: boolean) => {
    setWeekendNotifications(value);
    setTimeout(saveSettings, 100);
  };

  const handleStartTimeChange = (event: unknown, selectedDate?: Date) => {
    setShowStartPicker(Platform.OS === 'ios');
    if (selectedDate) {
      setQuietStart(selectedDate);
      saveSettings();
    }
  };

  const handleEndTimeChange = (event: unknown, selectedDate?: Date) => {
    setShowEndPicker(Platform.OS === 'ios');
    if (selectedDate) {
      setQuietEnd(selectedDate);
      saveSettings();
    }
  };

  if (loading) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.card }]}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="moon-outline" size={24} color={theme.primary} />
        <Text style={[styles.title, { color: theme.text }]}>Quiet Hours</Text>
      </View>

      <Text style={[styles.description, { color: theme.textSecondary }]}>
        Set times when you don't want to receive notifications
      </Text>

      {/* Enable/Disable Quiet Hours */}
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={[styles.settingLabel, { color: theme.text }]}>
            Enable Quiet Hours
          </Text>
          <Text style={[styles.settingSubtext, { color: theme.textSecondary }]}>
            Pause notifications during specific times
          </Text>
        </View>
        <Switch
          value={quietHoursEnabled}
          onValueChange={handleQuietHoursToggle}
          trackColor={{ false: '#767577', true: theme.primary + '80' }}
          thumbColor={quietHoursEnabled ? theme.primary : '#f4f3f4'}
        />
      </View>

      {quietHoursEnabled && (
        <>
          {/* Start Time */}
          <TouchableOpacity
            style={styles.timeButton}
            onPress={() => setShowStartPicker(true)}>
            <View style={styles.timeInfo}>
              <Text style={[styles.timeLabel, { color: theme.text }]}>
                Start Time
              </Text>
              <Text style={[styles.timeValue, { color: theme.primary }]}>
                {formatTime(quietStart)}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={theme.textSecondary}
            />
          </TouchableOpacity>

          {/* End Time */}
          <TouchableOpacity
            style={styles.timeButton}
            onPress={() => setShowEndPicker(true)}>
            <View style={styles.timeInfo}>
              <Text style={[styles.timeLabel, { color: theme.text }]}>
                End Time
              </Text>
              <Text style={[styles.timeValue, { color: theme.primary }]}>
                {formatTime(quietEnd)}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={theme.textSecondary}
            />
          </TouchableOpacity>

          {/* Time Pickers */}
          {showStartPicker && (
            <DateTimePicker
              value={quietStart}
              mode="time"
              is24Hour={false}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleStartTimeChange}
            />
          )}

          {showEndPicker && (
            <DateTimePicker
              value={quietEnd}
              mode="time"
              is24Hour={false}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleEndTimeChange}
            />
          )}

          {/* Example */}
          <View
            style={[styles.exampleBox, { backgroundColor: theme.background }]}>
            <Ionicons
              name="information-circle-outline"
              size={16}
              color={theme.textSecondary}
            />
            <Text style={[styles.exampleText, { color: theme.textSecondary }]}>
              Notifications will be paused from {formatTime(quietStart)} to{' '}
              {formatTime(quietEnd)}
            </Text>
          </View>
        </>
      )}

      {/* Weekend Notifications */}
      <View style={[styles.settingRow, styles.lastSetting]}>
        <View style={styles.settingInfo}>
          <Text style={[styles.settingLabel, { color: theme.text }]}>
            Weekend Notifications
          </Text>
          <Text style={[styles.settingSubtext, { color: theme.textSecondary }]}>
            Receive notifications on weekends
          </Text>
        </View>
        <Switch
          value={weekendNotifications}
          onValueChange={handleWeekendToggle}
          trackColor={{ false: '#767577', true: theme.primary + '80' }}
          thumbColor={weekendNotifications ? theme.primary : '#f4f3f4'}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  description: {
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  lastSetting: {
    marginTop: 12,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingSubtext: {
    fontSize: 13,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  timeInfo: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  exampleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  exampleText: {
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
});
