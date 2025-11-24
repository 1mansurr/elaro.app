import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/services/supabase';
import { sendTestPushNotification } from '@/services/notifications';

export function NotificationTestScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [customTitle, setCustomTitle] = useState('Test Notification');
  const [customBody, setCustomBody] = useState(
    'This is a test notification from ELARO',
  );
  const [pushToken, setPushToken] = useState('');

  React.useEffect(() => {
    loadPushToken();
  }, []);

  const loadPushToken = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('user_devices')
        .select('push_token')
        .eq('user_id', user.id)
        .limit(1)
        .single();

      if (data?.push_token) {
        setPushToken(data.push_token);
      }
    } catch (error) {
      console.error('Error loading push token:', error);
    }
  };

  const sendCustomTest = async () => {
    if (!pushToken) {
      Alert.alert('No Push Token', 'Please enable notifications first');
      return;
    }

    setLoading(true);
    try {
      await sendTestPushNotification(pushToken, customTitle, customBody);
      Alert.alert('Success', 'Test notification sent! Check your device.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send test notification');
    } finally {
      setLoading(false);
    }
  };

  const testPreset = async (type: string) => {
    if (!pushToken) {
      Alert.alert('No Push Token', 'Please enable notifications first');
      return;
    }

    setLoading(true);
    try {
      const presets: Record<
        string,
        { title: string; body: string; data?: any }
      > = {
        assignment: {
          title: '📚 Assignment Due Tomorrow',
          body: 'Your assignment "Introduction to Psychology Essay" is due tomorrow at 11:59 PM',
          data: {
            taskType: 'assignment',
            itemId: 'test-123',
            url: 'elaro://assignment/test-123',
          },
        },
        lecture: {
          title: '🎓 Lecture Starting Soon',
          body: 'Your lecture "Advanced Mathematics" starts in 15 minutes',
          data: {
            taskType: 'lecture',
            itemId: 'test-456',
            url: 'elaro://lecture/test-456',
          },
        },
        srs: {
          title: '🧠 Time to Review',
          body: 'Review your study session on "Quantum Physics" to strengthen your memory',
          data: {
            taskType: 'study_session',
            itemId: 'test-789',
            url: 'elaro://study-session/test-789',
          },
        },
        daily_summary: {
          title: '☀️ Your Day at a Glance',
          body: 'You have 3 tasks today: 2 lectures and 1 assignment',
          data: { url: 'elaro://home' },
        },
        streak: {
          title: '🔥 Streak Reminder',
          body: 'Keep your 7-day streak alive! Complete at least one task today.',
          data: { url: 'elaro://home' },
        },
      };

      const preset = presets[type];
      if (preset) {
        await sendTestPushNotification(pushToken, preset.title, preset.body);
        Alert.alert(
          'Test Sent!',
          `${type} notification sent. Check your device.`,
        );
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send test');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Test Notifications
        </Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Warning Banner */}
        <View
          style={[styles.warningBanner, { backgroundColor: '#F59E0B' + '20' }]}>
          <Ionicons name="warning-outline" size={20} color="#F59E0B" />
          <Text style={[styles.warningText, { color: theme.text }]}>
            Development/Testing Only - Not for production use
          </Text>
        </View>

        {/* Push Token Info */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Your Push Token
          </Text>
          <Text
            style={[styles.tokenText, { color: theme.textSecondary }]}
            numberOfLines={2}>
            {pushToken || 'No push token found'}
          </Text>
          {!pushToken && (
            <Text style={[styles.helpText, { color: '#EF4444' }]}>
              Enable notifications in your device settings
            </Text>
          )}
        </View>

        {/* Custom Test */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Custom Test
          </Text>

          <Text style={[styles.label, { color: theme.text }]}>Title</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: theme.background, color: theme.text },
            ]}
            value={customTitle}
            onChangeText={setCustomTitle}
            placeholder="Notification title"
            placeholderTextColor={theme.textSecondary}
          />

          <Text style={[styles.label, { color: theme.text }]}>Body</Text>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              { backgroundColor: theme.background, color: theme.text },
            ]}
            value={customBody}
            onChangeText={setCustomBody}
            placeholder="Notification message"
            placeholderTextColor={theme.textSecondary}
            multiline
            numberOfLines={3}
          />

          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.primary }]}
            onPress={sendCustomTest}
            disabled={loading || !pushToken}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Send Custom Test</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Preset Tests */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Preset Tests
          </Text>

          <TouchableOpacity
            style={[styles.presetButton, { backgroundColor: theme.background }]}
            onPress={() => testPreset('assignment')}
            disabled={loading || !pushToken}>
            <Text style={styles.presetEmoji}>📚</Text>
            <Text style={[styles.presetText, { color: theme.text }]}>
              Assignment Reminder
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.presetButton, { backgroundColor: theme.background }]}
            onPress={() => testPreset('lecture')}
            disabled={loading || !pushToken}>
            <Text style={styles.presetEmoji}>🎓</Text>
            <Text style={[styles.presetText, { color: theme.text }]}>
              Lecture Reminder
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.presetButton, { backgroundColor: theme.background }]}
            onPress={() => testPreset('srs')}
            disabled={loading || !pushToken}>
            <Text style={styles.presetEmoji}>🧠</Text>
            <Text style={[styles.presetText, { color: theme.text }]}>
              SRS Review
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.presetButton, { backgroundColor: theme.background }]}
            onPress={() => testPreset('daily_summary')}
            disabled={loading || !pushToken}>
            <Text style={styles.presetEmoji}>☀️</Text>
            <Text style={[styles.presetText, { color: theme.text }]}>
              Daily Summary
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.presetButton, { backgroundColor: theme.background }]}
            onPress={() => testPreset('streak')}
            disabled={loading || !pushToken}>
            <Text style={styles.presetEmoji}>🔥</Text>
            <Text style={[styles.presetText, { color: theme.text }]}>
              Streak Reminder
            </Text>
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View
          style={[styles.infoBox, { backgroundColor: theme.primary + '10' }]}>
          <Ionicons
            name="information-circle-outline"
            size={20}
            color={theme.primary}
          />
          <Text style={[styles.infoText, { color: theme.textSecondary }]}>
            Test notifications will appear on your device. Tap them to test deep
            linking navigation.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    padding: 20,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    marginLeft: 12,
    fontWeight: '500',
  },
  section: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  tokenText: {
    fontSize: 12,
    fontFamily: 'monospace',
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  helpText: {
    fontSize: 14,
    marginTop: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  button: {
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  presetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  presetEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  presetText: {
    fontSize: 16,
    fontWeight: '500',
  },
  infoBox: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    marginLeft: 12,
    lineHeight: 20,
  },
});
