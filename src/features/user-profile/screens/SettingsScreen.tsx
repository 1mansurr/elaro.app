import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/types/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/services/authService';
import { supabase } from '@/services/supabase';
import {
  ExpandableDetails,
  InlineNotificationSettings,
} from '@/shared/components';
import { AnalyticsToggle } from '@/shared/components/AnalyticsToggle';
import { useTheme } from '@/contexts/ThemeContext';
import { showToast } from '@/utils/showToast';
import { cache } from '@/utils/cache';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

type SettingsScreenNavigationProp = StackNavigationProp<RootStackParamList>;

interface SettingItemProps {
  label: string;
  onPress: () => void;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  iconBgColor?: string;
  isDestructive?: boolean;
  disabled?: boolean;
  rightContent?: React.ReactNode;
  showChevron?: boolean;
}

const SettingItem: React.FC<SettingItemProps> = ({
  label,
  onPress,
  icon,
  iconColor,
  iconBgColor,
  isDestructive = false,
  disabled = false,
  rightContent,
  showChevron = true,
}) => {
  const { theme } = useTheme();

  const defaultIconColor = isDestructive
    ? '#EF4444'
    : iconColor || (theme.isDark ? '#9CA3AF' : '#4B5563');
  const defaultIconBg = isDestructive
    ? theme.isDark
      ? 'rgba(239, 68, 68, 0.2)'
      : '#FEE2E2'
    : iconBgColor || (theme.isDark ? '#374151' : '#F3F4F6');

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.settingItem,
        disabled && styles.settingItemDisabled,
        isDestructive && styles.settingItemDestructive,
      ]}
      disabled={disabled}
      activeOpacity={0.7}>
      <View style={[styles.iconContainer, { backgroundColor: defaultIconBg }]}>
        <Ionicons name={icon} size={22} color={defaultIconColor} />
      </View>
      <Text
        style={[
          styles.settingLabel,
          isDestructive && styles.settingLabelDestructive,
        ]}>
        {label}
      </Text>
      {rightContent ||
        (showChevron && (
          <Ionicons
            name="chevron-forward"
            size={20}
            color={theme.isDark ? '#6B7280' : '#9CA3AF'}
          />
        ))}
    </TouchableOpacity>
  );
};

interface CategoryCardProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
}

const CategoryCard: React.FC<CategoryCardProps> = ({
  title,
  icon,
  children,
}) => {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.categoryCard,
        {
          backgroundColor: theme.isDark ? '#1E2330' : '#FFFFFF',
          borderColor: theme.isDark
            ? 'rgba(255, 255, 255, 0.05)'
            : 'rgba(0, 0, 0, 0.05)',
        },
      ]}>
      <View
        style={[
          styles.categoryHeader,
          {
            borderBottomColor: theme.isDark ? '#374151' : '#F3F4F6',
          },
        ]}>
        <Ionicons name={icon} size={20} color={COLORS.primary} />
        <Text
          style={[
            styles.categoryTitle,
            { color: theme.isDark ? '#9CA3AF' : '#6B7280' },
          ]}>
          {title}
        </Text>
      </View>
      <View style={styles.categoryContent}>{children}</View>
    </View>
  );
};

export function SettingsScreen() {
  const { user, session, signOut } = useAuth();
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const [isClearingCache, setIsClearingCache] = useState(false);
  const [isResettingSettings, setIsResettingSettings] = useState(false);

  const handleEnableMfa = () => {
    navigation.navigate('MFAEnrollmentScreen');
  };

  const handleChangePassword = () => {
    Alert.alert(
      'Change Password',
      'This feature will allow you to update your password. Please check your email for password reset instructions.',
    );
  };

  const handleGlobalSignOut = async () => {
    Alert.alert(
      'Log Out From All Devices',
      'Are you sure you want to log out from all your devices? This will end all active sessions.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out Everywhere',
          onPress: async () => {
            try {
              await authService.signOutFromAllDevices();
              await signOut();
              showToast({
                type: 'success',
                message: 'Logged out from all devices.',
              });
            } catch (error) {
              showToast({
                type: 'error',
                message: 'Failed to log out from all devices.',
              });
            }
          },
          style: 'destructive',
        },
      ],
    );
  };

  const handleClearCache = useCallback(async () => {
    try {
      const stats = await cache.getStats();
      const sizeMB = (stats.totalSize / 1024 / 1024).toFixed(2);

      Alert.alert(
        'Clear Cache',
        `This will clear ${stats.totalEntries} cached items (${sizeMB} MB). The app will re-download data as needed.\n\nThis can help resolve issues and free up storage space.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Clear Cache',
            style: 'destructive',
            onPress: async () => {
              setIsClearingCache(true);
              try {
                await cache.clearAll();
                queryClient.clear();
                showToast({
                  type: 'success',
                  message: 'Cache cleared successfully!',
                });
              } catch (error) {
                console.error('Error clearing cache:', error);
                showToast({
                  type: 'error',
                  message: 'Failed to clear cache. Please try again.',
                });
              } finally {
                setIsClearingCache(false);
              }
            },
          },
        ],
      );
    } catch (error) {
      console.error('Error getting cache stats:', error);
      showToast({ type: 'error', message: 'Failed to get cache information.' });
    }
  }, [queryClient]);

  const handleResetSettings = useCallback(async () => {
    if (!user) return;

    Alert.alert(
      'Reset All Settings',
      'Are you sure you want to reset all settings to their defaults? This will not affect your tasks, courses, or account data.\n\nThis will reset:\n• Notification preferences\n• Privacy & Analytics settings\n• Clear cached data',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Settings',
          style: 'destructive',
          onPress: async () => {
            setIsResettingSettings(true);

            try {
              // 1. Reset notification preferences to defaults (all enabled)
              try {
                const { error } = await supabase.functions.invoke(
                  'reset-notification-preferences',
                );
                if (error) {
                  console.error(
                    'Error resetting notification preferences:',
                    error,
                  );
                }
              } catch (notifError) {
                console.error(
                  'Failed to reset notification preferences:',
                  notifError,
                );
              }

              // 2. Reset analytics consent to default (true = opted in)
              try {
                await AsyncStorage.setItem('analytics_consent', 'true');
              } catch (analyticsError) {
                console.error(
                  'Failed to reset analytics consent:',
                  analyticsError,
                );
              }

              // 3. Clear cache
              try {
                await cache.clearAll();
                queryClient.clear();
              } catch (cacheError) {
                console.error('Failed to clear cache:', cacheError);
              }

              // 4. Reset quiet hours if stored in AsyncStorage
              try {
                await AsyncStorage.removeItem('quiet_hours_enabled');
                await AsyncStorage.removeItem('quiet_hours_start');
                await AsyncStorage.removeItem('quiet_hours_end');
              } catch (quietError) {
                console.error('Failed to reset quiet hours:', quietError);
              }

              // 5. Invalidate queries to refresh UI
              await queryClient.invalidateQueries({
                queryKey: ['notificationPreferences'],
              });
              await queryClient.invalidateQueries({ queryKey: ['user'] });

              showToast({
                type: 'success',
                message: 'Settings have been reset to defaults!',
              });
            } catch (error) {
              console.error('Error resetting settings:', error);
              showToast({
                type: 'error',
                message: 'Failed to reset some settings. Please try again.',
              });
            } finally {
              setIsResettingSettings(false);
            }
          },
        },
      ],
    );
  }, [user, queryClient]);

  // If no session, show empty state
  if (!session || !user) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: theme.background, paddingTop: insets.top },
        ]}>
        <View style={styles.emptyState}>
          <Ionicons name="settings-outline" size={64} color={COLORS.gray} />
          <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
            Please sign in to access settings
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.background, paddingTop: insets.top },
      ]}>
      {/* Header with backdrop blur */}
      <View style={styles.header}>
        <BlurView
          intensity={80}
          tint={theme.isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            activeOpacity={0.7}>
            <Ionicons
              name="arrow-back-ios"
              size={24}
              color={theme.isDark ? '#FFFFFF' : '#111318'}
            />
          </TouchableOpacity>
          <Text
            style={[
              styles.headerTitle,
              { color: theme.isDark ? '#FFFFFF' : '#111318' },
            ]}>
            Settings
          </Text>
          <View style={styles.headerSpacer} />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Profile & Security */}
        <CategoryCard title="PROFILE & SECURITY" icon="shield">
          <SettingItem
            label="Change Password"
            onPress={handleChangePassword}
            icon="key"
            iconColor={COLORS.primary}
            iconBgColor={theme.isDark ? 'rgba(19, 91, 236, 0.2)' : '#EFF6FF'}
            showChevron
          />
          <View
            style={[
              styles.divider,
              { backgroundColor: theme.isDark ? '#374151' : '#F3F4F6' },
            ]}
          />
          <SettingItem
            label="Multi-Factor Authentication"
            onPress={handleEnableMfa}
            icon="lock-closed"
            iconColor={COLORS.primary}
            iconBgColor={theme.isDark ? 'rgba(19, 91, 236, 0.2)' : '#EFF6FF'}
            showChevron
          />
        </CategoryCard>

        {/* App Settings */}
        <CategoryCard title="APP SETTINGS" icon="settings">
          {/* Notifications */}
          <View style={styles.notificationsSection}>
            <View style={styles.notificationsHeader}>
              <View
                style={[
                  styles.notificationsIconContainer,
                  {
                    backgroundColor: theme.isDark
                      ? 'rgba(249, 115, 22, 0.2)'
                      : '#FED7AA',
                  },
                ]}>
                <Ionicons
                  name="notifications"
                  size={18}
                  color={theme.isDark ? '#FB923C' : '#EA580C'}
                />
              </View>
              <View style={styles.notificationsHeaderText}>
                <Text
                  style={[styles.notificationsTitle, { color: theme.text }]}>
                  Notifications
                </Text>
                <Text
                  style={[
                    styles.notificationsDescription,
                    { color: theme.isDark ? '#9CA3AF' : '#6B7280' },
                  ]}>
                  Manage how you receive alerts for revisions and schedules.
                </Text>
              </View>
            </View>
            <View style={styles.notificationsContainer}>
              <InlineNotificationSettings />
            </View>
          </View>

          <View
            style={[
              styles.divider,
              { backgroundColor: theme.isDark ? '#374151' : '#F3F4F6' },
            ]}
          />

          {/* Privacy & Analytics - Expandable */}
          <ExpandableDetails
            summary={
              <View style={styles.privacySummary}>
                <View
                  style={[
                    styles.privacyIconContainer,
                    {
                      backgroundColor: theme.isDark
                        ? 'rgba(168, 85, 247, 0.2)'
                        : '#F3E8FF',
                    },
                  ]}>
                  <Ionicons
                    name="bar-chart"
                    size={22}
                    color={theme.isDark ? '#A855F7' : '#9333EA'}
                  />
                </View>
                <Text style={[styles.privacyTitle, { color: theme.text }]}>
                  Share Usage Analytics
                </Text>
              </View>
            }>
            <Text
              style={[
                styles.privacyDescription,
                { color: theme.isDark ? '#9CA3AF' : '#6B7280' },
              ]}>
              Help us improve the app by sharing anonymous usage data. No
              personal information is collected.
            </Text>
            <View
              style={[
                styles.analyticsToggleContainer,
                {
                  backgroundColor: theme.isDark
                    ? 'rgba(0, 0, 0, 0.2)'
                    : '#F9FAFB',
                  borderColor: theme.isDark
                    ? 'rgba(255, 255, 255, 0.05)'
                    : '#E5E7EB',
                },
              ]}>
              <Text
                style={[styles.analyticsToggleLabel, { color: theme.text }]}>
                Share Data
              </Text>
              <AnalyticsToggle />
            </View>
          </ExpandableDetails>

          <View
            style={[
              styles.divider,
              { backgroundColor: theme.isDark ? '#374151' : '#F3F4F6' },
            ]}
          />

          {/* Clear Cache */}
          <SettingItem
            label="Clear Cache"
            onPress={handleClearCache}
            icon="trash-outline"
            iconColor={theme.isDark ? '#9CA3AF' : '#4B5563'}
            iconBgColor={theme.isDark ? '#374151' : '#F3F4F6'}
            disabled={isClearingCache}
            rightContent={
              isClearingCache ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : undefined
            }
            showChevron={false}
          />

          <View
            style={[
              styles.divider,
              { backgroundColor: theme.isDark ? '#374151' : '#F3F4F6' },
            ]}
          />

          {/* Reset All Settings */}
          <SettingItem
            label="Reset All Settings"
            onPress={handleResetSettings}
            icon="refresh"
            iconColor="#EF4444"
            iconBgColor={theme.isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2'}
            isDestructive
            disabled={isResettingSettings}
            showChevron={false}
          />
        </CategoryCard>

        {/* Account Management */}
        <CategoryCard title="ACCOUNT MANAGEMENT" icon="person-circle">
          <SettingItem
            label="Recycle Bin"
            onPress={() => navigation.navigate('RecycleBin')}
            icon="trash-outline"
            iconColor={theme.isDark ? '#9CA3AF' : '#4B5563'}
            iconBgColor={theme.isDark ? '#374151' : '#F3F4F6'}
            showChevron
          />
          <View
            style={[
              styles.divider,
              { backgroundColor: theme.isDark ? '#374151' : '#F3F4F6' },
            ]}
          />
          <SettingItem
            label="Log Out From All Devices"
            onPress={handleGlobalSignOut}
            icon="phone-portrait-outline"
            iconColor="#EF4444"
            iconBgColor={theme.isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEE2E2'}
            isDestructive
            showChevron={false}
          />
        </CategoryCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    position: 'relative',
    zIndex: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xs,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: FONT_WEIGHTS.bold,
    letterSpacing: -0.015,
    flex: 1,
    textAlign: 'center',
    paddingRight: 40,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: 200, // Extra padding so bottom buttons sit above nav bar
    gap: 24,
  },
  categoryCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  categoryTitle: {
    fontSize: 12,
    fontWeight: FONT_WEIGHTS.bold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  categoryContent: {
    flexDirection: 'column',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  settingItemDisabled: {
    opacity: 0.5,
  },
  settingItemDestructive: {
    backgroundColor: 'transparent',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  settingLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium,
    flex: 1,
    color: COLORS.text,
  },
  settingLabelDestructive: {
    color: '#EF4444',
  },
  divider: {
    height: 1,
    marginHorizontal: SPACING.lg,
  },
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
  privacySummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  privacyIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  privacyTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium,
  },
  privacyDescription: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
    marginBottom: 16,
  },
  analyticsToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  analyticsToggleLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xxl * 2,
    paddingHorizontal: SPACING.xl,
  },
  emptyStateText: {
    fontSize: FONT_SIZES.md,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
});
