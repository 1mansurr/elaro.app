import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { notificationService } from '../services/notifications';
import { Card } from '../components/Card';
import { SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS, FONT_WEIGHTS } from '../constants/theme';
import { ReminderTime } from '../types';

interface SettingsScreenProps {
  navigation: any;
}

const REMINDER_OPTIONS: { value: ReminderTime; label: string }[] = [
  { value: '30min', label: '30 minutes before' },
  { value: '24hr', label: '24 hours before' },
  { value: '1week', label: '1 week before' },
];

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const { user, signOut } = useAuth();
  const { theme } = useTheme();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [defaultReminderTimes, setDefaultReminderTimes] = useState<ReminderTime[]>(['30min']);
  const [appVersion] = useState('1.0.0');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await AsyncStorage.getItem('appSettings');
      if (settings) {
        const parsed = JSON.parse(settings);
        setNotificationsEnabled(parsed.notificationsEnabled ?? true);
        setDefaultReminderTimes(parsed.defaultReminderTimes ?? ['30min']);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      const settings = {
        notificationsEnabled,
        defaultReminderTimes,
      };
      await AsyncStorage.setItem('appSettings', JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const handleNotificationToggle = async (value: boolean) => {
    setNotificationsEnabled(value);
    await notificationService.setNotificationsEnabled(value);
    await saveSettings();
  };

  const toggleReminderTime = (reminder: ReminderTime) => {
    const newReminders = defaultReminderTimes.includes(reminder)
      ? defaultReminderTimes.filter(r => r !== reminder)
      : [...defaultReminderTimes, reminder];
    
    setDefaultReminderTimes(newReminders);
    saveSettings();
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            await signOut();
            Alert.alert('Signed Out', 'You have been successfully signed out.');
          }
        }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure? This will permanently delete all your data.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete My Account', 
          style: 'destructive',
          onPress: () => {
            Alert.alert('Account Deletion', 'Account deletion functionality will be implemented in the next update.');
          }
        }
      ]
    );
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will clear all your local data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear Data', 
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              Alert.alert('Data Cleared', 'All local data has been cleared.');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear data.');
            }
          }
        }
      ]
    );
  };

  const COLOR_PALETTE = [
    { name: 'green', color: theme.green },
    { name: 'blue', color: theme.blue },
    { name: 'purple', color: theme.purple },
    { name: 'orange', color: theme.orange },
    { name: 'yellow', color: theme.yellow },
    { name: 'pink', color: theme.pink },
  ];

  // Helper: map FONT_WEIGHTS to valid fontWeight values
  const fontWeightBold = '700';
  const fontWeightSemibold = '600';
  const fontWeightMedium = '500';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <Pressable 
          style={({ pressed }) => [
            styles.backButton,
            pressed && { backgroundColor: theme.gray100 }
          ]}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.title, { color: theme.text, fontWeight: fontWeightBold }]}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Notifications Section */}
        <Card style={{ ...styles.section, ...SHADOWS.sm, backgroundColor: theme.card }}>
          <View style={[styles.sectionHeader, { borderBottomColor: theme.border }]}>
            <Ionicons name="notifications-outline" size={20} color={theme.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text, fontWeight: fontWeightSemibold }]}>Notifications</Text>
          </View>
          
          <View style={styles.settingRow}>
            <View style={styles.settingContent}>
              <Text style={[styles.settingLabel, { color: theme.text, fontWeight: fontWeightMedium }]}>Enable Notifications</Text>
              <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
                Get reminders for sessions and tasks
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleNotificationToggle}
              trackColor={{ false: theme.gray200, true: theme.primary }}
              thumbColor={theme.white}
              accessibilityRole="switch"
              accessibilityLabel="Enable notifications"
            />
          </View>

          {notificationsEnabled && (
            <View style={styles.subsection}>
              <Text style={[styles.subsectionTitle, { color: theme.text, fontWeight: fontWeightSemibold }]}>Default Reminder Times</Text>
              <Text style={[styles.subsectionDescription, { color: theme.textSecondary }]}>
                Pre-selected for new study items
              </Text>
              
              {REMINDER_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  style={({ pressed }) => [
                    styles.checkboxRow,
                    pressed && { backgroundColor: theme.gray50 }
                  ]}
                  onPress={() => toggleReminderTime(option.value)}
                  accessibilityRole="checkbox"
                  accessibilityLabel={`${option.label} reminder`}
                  accessibilityState={{ checked: defaultReminderTimes.includes(option.value) }}
                >
                  <View style={[
                    styles.checkbox,
                    defaultReminderTimes.includes(option.value) && { backgroundColor: theme.primary, borderColor: theme.primary }
                  ]}>
                    {defaultReminderTimes.includes(option.value) && (
                      <Ionicons name="checkmark" size={14} color={theme.white} />
                    )}
                  </View>
                  <Text style={[styles.checkboxLabel, { color: theme.text }]}>{option.label}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </Card>

        {/* Appearance Section */}
        <Card style={{ ...styles.section, ...SHADOWS.sm, backgroundColor: theme.card }}>
          <View style={[styles.sectionHeader, { borderBottomColor: theme.border }]}>
            <Ionicons name="color-palette-outline" size={20} color={theme.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text, fontWeight: fontWeightSemibold }]}>Appearance</Text>
          </View>
          
          <Text style={[styles.subsectionTitle, { color: theme.text, fontWeight: fontWeightSemibold }]}>Color Palette (Preview)</Text>
          <Text style={[styles.subsectionDescription, { color: theme.textSecondary }]}>
            Available colors for your study sessions
          </Text>
          
          <View style={styles.colorGrid}>
            {COLOR_PALETTE.map((colorOption) => (
              <View key={colorOption.name} style={styles.colorItem}>
                <View 
                  style={[
                    styles.colorDot, 
                    { backgroundColor: colorOption.color, borderColor: theme.border }
                  ]} 
                />
                <Text style={[styles.colorLabel, { color: theme.textSecondary }]}>{colorOption.name}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Account Section */}
        <Card style={{ ...styles.section, ...SHADOWS.sm, backgroundColor: theme.card }}>
          <View style={[styles.sectionHeader, { borderBottomColor: theme.border }]}>
            <Ionicons name="person-outline" size={20} color={theme.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text, fontWeight: fontWeightSemibold }]}>Account</Text>
          </View>
          
          <View style={styles.settingRow}>
            <View style={styles.settingContent}>
              <Text style={[styles.settingLabel, { color: theme.text, fontWeight: fontWeightMedium }]}>Email</Text>
              <Text style={[styles.settingValue, { color: theme.textSecondary }]}>{user?.email}</Text>
            </View>
          </View>

          <Pressable 
            style={({ pressed }) => [
              styles.settingRow,
              pressed && { backgroundColor: theme.gray50 }
            ]} 
            onPress={handleSignOut}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
          >
            <View style={styles.settingContent}>
              <Ionicons name="log-out-outline" size={20} color={theme.error} />
              <Text style={[styles.settingLabel, { color: theme.error, fontWeight: fontWeightMedium }]}>Sign Out</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
          </Pressable>

          <Pressable 
            style={({ pressed }) => [
              styles.settingRow,
              pressed && { backgroundColor: theme.gray50 }
            ]} 
            onPress={handleDeleteAccount}
            accessibilityRole="button"
            accessibilityLabel="Delete account"
          >
            <View style={styles.settingContent}>
              <Ionicons name="trash-outline" size={20} color={theme.error} />
              <Text style={[styles.settingLabel, { color: theme.error, fontWeight: fontWeightMedium }]}>Delete Account</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
          </Pressable>
        </Card>

        {/* Data Section */}
        <Card style={{ ...styles.section, ...SHADOWS.sm, backgroundColor: theme.card }}>
          <View style={[styles.sectionHeader, { borderBottomColor: theme.border }]}>
            <Ionicons name="folder-outline" size={20} color={theme.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text, fontWeight: fontWeightSemibold }]}>Data</Text>
          </View>
          
          <Pressable 
            style={({ pressed }) => [
              styles.settingRow,
              pressed && { backgroundColor: theme.gray50 }
            ]} 
            onPress={handleClearData}
            accessibilityRole="button"
            accessibilityLabel="Clear all data"
          >
            <View style={styles.settingContent}>
              <Ionicons name="refresh-outline" size={20} color={theme.warning} />
              <Text style={[styles.settingLabel, { color: theme.warning, fontWeight: fontWeightMedium }]}>Clear All Data</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
          </Pressable>
        </Card>

        {/* About Section */}
        <Card style={{ ...styles.section, ...SHADOWS.sm, backgroundColor: theme.card }}>
          <View style={[styles.sectionHeader, { borderBottomColor: theme.border }]}>
            <Ionicons name="information-circle-outline" size={20} color={theme.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text, fontWeight: fontWeightSemibold }]}>About</Text>
          </View>
          
          <View style={styles.settingRow}>
            <View style={styles.settingContent}>
              <Text style={[styles.settingLabel, { color: theme.text, fontWeight: fontWeightMedium }]}>App Version</Text>
              <Text style={[styles.settingValue, { color: theme.textSecondary }]}>{appVersion}</Text>
            </View>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingContent}>
              <Text style={[styles.settingLabel, { color: theme.text, fontWeight: fontWeightMedium }]}>Language</Text>
              <Text style={[styles.settingValue, { color: theme.textSecondary }]}>English</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

// --- StyleSheet: only static values ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  title: {
    fontSize: FONT_SIZES.lg,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
  },
  section: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    marginLeft: SPACING.sm,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  settingContent: {
    flex: 1,
    marginRight: SPACING.md,
  },
  settingLabel: {
    fontSize: FONT_SIZES.md,
  },
  settingValue: {
    fontSize: FONT_SIZES.sm,
    marginLeft: SPACING.sm,
  },
  settingDescription: {
    fontSize: FONT_SIZES.sm,
  },
  dangerText: {
    color: '#D32F2F', // fallback red for danger
  },
  warningText: {
    color: '#FFA000', // fallback amber for warning
  },
  subsection: {
    marginTop: SPACING.md,
  },
  subsectionTitle: {
    fontSize: FONT_SIZES.md,
    marginBottom: SPACING.xs,
  },
  subsectionDescription: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.sm,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: BORDER_RADIUS.xs,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  checkboxLabel: {
    fontSize: FONT_SIZES.md,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.lg,
    marginTop: SPACING.md,
  },
  colorItem: {
    alignItems: 'center',
    minWidth: 60,
  },
  colorDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    marginBottom: SPACING.xs,
  },
  colorLabel: {
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
  },
}); 