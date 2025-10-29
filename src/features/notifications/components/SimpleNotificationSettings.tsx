import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Switch, 
  TouchableOpacity, 
  ScrollView,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { notificationService } from '@/services/notifications';
import { SimpleNotificationPreferences } from '@/services/notifications/interfaces/SimpleNotificationPreferences';

interface SimpleNotificationSettingsProps {
  onClose?: () => void;
}

export const SimpleNotificationSettings: React.FC<SimpleNotificationSettingsProps> = ({ onClose }) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<SimpleNotificationPreferences | null>(null);
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
      const prefs = await notificationService.preferences.getUserPreferences(user.id);
      setPreferences(prefs);
    } catch (error) {
      console.error('Error loading notification preferences:', error);
      Alert.alert('Error', 'Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (key: keyof SimpleNotificationPreferences, value: boolean) => {
    if (!preferences || !user) return;
    
    try {
      setSaving(true);
      const updatedPreferences = { ...preferences, [key]: value };
      setPreferences(updatedPreferences);
      
      await notificationService.preferences.updateUserPreferences(user.id, { [key]: value });
    } catch (error) {
      console.error('Error updating preferences:', error);
      Alert.alert('Error', 'Failed to update notification preferences');
      // Revert the change
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
        quietHours: { ...preferences.quietHours, enabled }
      };
      setPreferences(updatedPreferences);
      
      await notificationService.preferences.updateUserPreferences(user.id, {
        quietHours: { enabled }
      });
    } catch (error) {
      console.error('Error updating quiet hours:', error);
      Alert.alert('Error', 'Failed to update quiet hours');
      setPreferences(preferences);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.loadingText, { color: theme.text }]}>
          Loading notification settings...
        </Text>
      </View>
    );
  }

  if (!preferences) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.text }]}>
          Failed to load notification settings
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Notification Settings</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
        )}
      </View>

      {/* Master Toggle */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Master Controls</Text>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingLabel, { color: theme.text }]}>Enable Notifications</Text>
            <Text style={[styles.settingDescription, { color: theme.gray }]}>
              Turn all notifications on or off
            </Text>
          </View>
          <Switch
            value={preferences.enabled}
            onValueChange={(value) => handleToggle('enabled', value)}
            disabled={saving}
          />
        </View>
      </View>

      {/* Notification Types */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Notification Types</Text>
        
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingLabel, { color: theme.text }]}>Reminders</Text>
            <Text style={[styles.settingDescription, { color: theme.gray }]}>
              Study reminders and SRS notifications
            </Text>
          </View>
          <Switch
            value={preferences.reminders}
            onValueChange={(value) => handleToggle('reminders', value)}
            disabled={saving || !preferences.enabled}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingLabel, { color: theme.text }]}>Assignments</Text>
            <Text style={[styles.settingDescription, { color: theme.gray }]}>
              Assignment due dates and updates
            </Text>
          </View>
          <Switch
            value={preferences.assignments}
            onValueChange={(value) => handleToggle('assignments', value)}
            disabled={saving || !preferences.enabled}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingLabel, { color: theme.text }]}>Lectures</Text>
            <Text style={[styles.settingDescription, { color: theme.gray }]}>
              Lecture reminders and updates
            </Text>
          </View>
          <Switch
            value={preferences.lectures}
            onValueChange={(value) => handleToggle('lectures', value)}
            disabled={saving || !preferences.enabled}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingLabel, { color: theme.text }]}>Study Sessions</Text>
            <Text style={[styles.settingDescription, { color: theme.gray }]}>
              Study session reminders
            </Text>
          </View>
          <Switch
            value={preferences.studySessions}
            onValueChange={(value) => handleToggle('studySessions', value)}
            disabled={saving || !preferences.enabled}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingLabel, { color: theme.text }]}>Daily Summaries</Text>
            <Text style={[styles.settingDescription, { color: theme.gray }]}>
              Daily progress summaries
            </Text>
          </View>
          <Switch
            value={preferences.dailySummaries}
            onValueChange={(value) => handleToggle('dailySummaries', value)}
            disabled={saving || !preferences.enabled}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingLabel, { color: theme.text }]}>Marketing</Text>
            <Text style={[styles.settingDescription, { color: theme.gray }]}>
              Product updates and special offers
            </Text>
          </View>
          <Switch
            value={preferences.marketing}
            onValueChange={(value) => handleToggle('marketing', value)}
            disabled={saving || !preferences.enabled}
          />
        </View>
      </View>

      {/* Quiet Hours */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Quiet Hours</Text>
        
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingLabel, { color: theme.text }]}>Enable Quiet Hours</Text>
            <Text style={[styles.settingDescription, { color: theme.gray }]}>
              Pause notifications during specified hours
            </Text>
          </View>
          <Switch
            value={preferences.quietHours.enabled}
            onValueChange={handleQuietHoursToggle}
            disabled={saving || !preferences.enabled}
          />
        </View>

        {preferences.quietHours.enabled && (
          <View style={styles.quietHoursInfo}>
            <Text style={[styles.quietHoursText, { color: theme.gray }]}>
              Quiet Hours: {preferences.quietHours.start} - {preferences.quietHours.end}
            </Text>
            <Text style={[styles.quietHoursNote, { color: theme.gray }]}>
              Note: Quiet hours can be configured in your device settings
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingInfo: {
    flex: 1,
    marginRight: 15,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  quietHoursInfo: {
    marginTop: 10,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  quietHoursText: {
    fontSize: 14,
    fontWeight: '500',
  },
  quietHoursNote: {
    fontSize: 12,
    marginTop: 4,
  },
  loadingText: {
    textAlign: 'center',
    fontSize: 16,
    marginTop: 50,
  },
  errorText: {
    textAlign: 'center',
    fontSize: 16,
    marginTop: 50,
    color: '#ff6b6b',
  },
});
