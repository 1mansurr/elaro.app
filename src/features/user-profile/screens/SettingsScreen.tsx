import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Card from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { authService } from '@/features/auth/services/authService';
import { supabase } from '@/services/supabase';
import { AppError } from '@/utils/AppError';
import { SimpleNotificationSettings } from '@/features/notifications/components/SimpleNotificationSettings';
import { AnalyticsToggle } from '@/features/settings/components/AnalyticsToggle';
import { useTheme } from '@/contexts/ThemeContext';
import { showToast } from '@/utils/showToast';
import { cache } from '@/utils/cache';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';
import { clearExampleData, hasExampleData } from '@/utils/exampleData';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingItemProps {
  label: string;
  description?: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  isDestructive?: boolean;
  disabled?: boolean;
  rightContent?: React.ReactNode;
  showChevron?: boolean;
}

const SettingItem: React.FC<SettingItemProps> = ({
  label,
  description,
  onPress,
  icon,
  isDestructive = false,
  disabled = false,
  rightContent,
  showChevron = true,
}) => {
  const { theme } = useTheme();
  
  return (
    <TouchableOpacity 
      onPress={onPress} 
      style={[styles.settingItem, disabled && styles.settingItemDisabled]}
      disabled={disabled}
    >
      {icon && (
        <View style={[styles.iconContainer, isDestructive && styles.iconContainerDestructive]}>
          <Ionicons 
            name={icon} 
            size={22} 
            color={isDestructive ? '#FF3B30' : theme.accent} 
          />
        </View>
      )}
      <View style={styles.settingContent}>
        <Text style={[styles.settingLabel, isDestructive && styles.settingLabelDestructive]}>
          {label}
        </Text>
        {description && (
          <Text style={styles.settingDescription}>{description}</Text>
        )}
      </View>
      {rightContent || (showChevron && (
        <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
      ))}
    </TouchableOpacity>
  );
};

interface CategoryCardProps {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
}

const CategoryCard: React.FC<CategoryCardProps> = ({ title, icon, children }) => {
  return (
    <View style={styles.categoryCard}>
      <View style={styles.categoryHeader}>
        {icon && <Ionicons name={icon} size={20} color={COLORS.primary} />}
        <Text style={styles.categoryTitle}>{title}</Text>
      </View>
      <View style={styles.categoryContent}>{children}</View>
    </View>
  );
};

export function SettingsScreen() {
  const { user, session, signOut } = useAuth();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isDownloadingData, setIsDownloadingData] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [isClearingExamples, setIsClearingExamples] = useState(false);
  const [isResettingSettings, setIsResettingSettings] = useState(false);
  const [hasExamples, setHasExamples] = useState(false);
  const [lastExportDate, setLastExportDate] = useState<string | null>(
    user?.last_data_export_at || null
  );

  // Check if user has example data
  useEffect(() => {
    const checkExamples = async () => {
      if (!user) return;
      const hasEx = await hasExampleData(user.id);
      setHasExamples(hasEx);
    };
    checkExamples();
  }, [user]);

  // Filter settings based on search query
  const filterText = (text: string) => {
    if (!searchQuery) return true;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  };

  const handleEnableMfa = () => {
    (navigation as any).navigate('MfaSetup');
  };

  const handleEditProfile = () => {
    (navigation as any).navigate('Profile');
  };

  const handleChangePassword = () => {
    Alert.alert('Change Password', 'This feature will allow you to update your password. Please check your email for password reset instructions.');
  };

  const handleLogout = async () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          onPress: async () => {
              await signOut();
          },
        },
      ]
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
              showToast({ type: 'success', message: 'Logged out from all devices.' });
            } catch (error) {
              showToast({ type: 'error', message: 'Failed to log out from all devices.' });
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleDownloadData = useCallback(async () => {
    if (!user) return;
    
    setIsDownloadingData(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('export-user-data');
      
      if (error) {
        if (error.message?.includes('429') || error.message?.includes('rate limit')) {
          showToast({ 
            type: 'error', 
            message: 'Data export is limited to once per week. Please try again later.',
          });
          return;
        }
        throw new Error(error.message || 'Failed to export data');
      }
      
      if (!data) {
        throw new Error('No data received from server');
      }
      
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `elaro-data-export-${timestamp}.json`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;
      
      await FileSystem.writeAsStringAsync(
        fileUri,
        JSON.stringify(data, null, 2),
        { encoding: FileSystem.EncodingType.UTF8 }
      );
      
      const isAvailable = await Sharing.isAvailableAsync();
      
      if (!isAvailable) {
        Alert.alert('File Saved', `Your data has been saved to: ${fileUri}`, [{ text: 'OK' }]);
        return;
      }
      
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Save Your ELARO Data',
        UTI: 'public.json',
      });
      
      setLastExportDate(new Date().toISOString());
      showToast({ type: 'success', message: 'Data exported successfully!' });
    } catch (error: any) {
      console.error('Error exporting data:', error);
      showToast({ 
        type: 'error', 
        message: error.message || 'Failed to export data. Please try again.',
      });
    } finally {
      setIsDownloadingData(false);
    }
  }, [user]);

  const formatLastExportDate = (dateString: string | null) => {
    if (!dateString) return null;
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffInDays === 0) return 'Today';
      if (diffInDays === 1) return 'Yesterday';
      if (diffInDays < 7) return `${diffInDays} days ago`;
      
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
      });
    } catch {
      return null;
    }
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
                showToast({ type: 'success', message: 'Cache cleared successfully!' });
              } catch (error) {
                console.error('Error clearing cache:', error);
                showToast({ type: 'error', message: 'Failed to clear cache. Please try again.' });
              } finally {
                setIsClearingCache(false);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error getting cache stats:', error);
      showToast({ type: 'error', message: 'Failed to get cache information.' });
    }
  }, [queryClient]);

  const handleClearExampleData = useCallback(async () => {
    if (!user) return;

    Alert.alert(
      'Clear Example Data',
      'This will remove all example tasks and the sample course. You can always recreate them by clearing your app data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Examples',
          style: 'destructive',
          onPress: async () => {
            setIsClearingExamples(true);
            try {
              const success = await clearExampleData(user.id);
              
              if (success) {
                // Refresh all data
                await queryClient.invalidateQueries({ queryKey: ['homeScreenData'] });
                await queryClient.invalidateQueries({ queryKey: ['courses'] });
                await queryClient.invalidateQueries({ queryKey: ['assignments'] });
                await queryClient.invalidateQueries({ queryKey: ['lectures'] });
                await queryClient.invalidateQueries({ queryKey: ['studySessions'] });
                await queryClient.invalidateQueries({ queryKey: ['calendarData'] });
                
                setHasExamples(false);
                showToast({ type: 'success', message: 'Example data cleared successfully!' });
              } else {
                showToast({ type: 'error', message: 'Failed to clear example data.' });
              }
            } catch (error) {
              console.error('Error clearing example data:', error);
              showToast({ type: 'error', message: 'Failed to clear example data.' });
            } finally {
              setIsClearingExamples(false);
            }
          },
        },
      ]
    );
  }, [user, queryClient]);

  const handleViewDeviceManagement = () => {
    (navigation as any).navigate('DeviceManagement');
  };

  const handleViewLoginHistory = () => {
    (navigation as any).navigate('LoginHistory');
  };

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
                const { error } = await supabase.functions.invoke('reset-notification-preferences');
                if (error) {
                  console.error('Error resetting notification preferences:', error);
                  // Don't throw - continue with other resets
                }
              } catch (notifError) {
                console.error('Failed to reset notification preferences:', notifError);
                // Continue anyway
              }

              // 2. Reset analytics consent to default (true = opted in)
              try {
                await AsyncStorage.setItem('analytics_consent', 'true');
              } catch (analyticsError) {
                console.error('Failed to reset analytics consent:', analyticsError);
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
              await queryClient.invalidateQueries({ queryKey: ['notificationPreferences'] });
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
      ]
    );
  }, [user, queryClient]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.gray} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search settings..."
          placeholderTextColor={COLORS.gray}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color={COLORS.gray} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Profile & Security */}
        {filterText('profile security password mfa authentication') && (
          <CategoryCard title="Profile & Security" icon="shield-checkmark-outline">
            {filterText('edit profile') && (
              <SettingItem
                label="Edit Profile"
                description="Update your personal information and preferences"
                icon="person-outline"
                onPress={handleEditProfile}
              />
            )}
            {filterText('change password') && (
              <SettingItem
                label="Change Password"
                description="Update your account password for better security"
                icon="key-outline"
                onPress={handleChangePassword}
              />
            )}
            {filterText('mfa multi-factor authentication') && (
              <SettingItem
                label="Multi-Factor Authentication"
                description="Add an extra layer of security to your account"
                icon="lock-closed-outline"
                onPress={handleEnableMfa}
              />
            )}
            {filterText('device management sessions') && (
              <SettingItem
                label="Device Management"
                description="View and manage devices that have accessed your account"
                icon="phone-portrait-outline"
                onPress={handleViewDeviceManagement}
              />
            )}
            {filterText('login history activity') && (
              <SettingItem
                label="Login History"
                description="View recent login activity and session details"
                icon="time-outline"
                onPress={handleViewLoginHistory}
              />
            )}
          </CategoryCard>
        )}

        {/* App Settings */}
        {filterText('notifications privacy analytics settings cache reset example') && (
          <CategoryCard title="App Settings" icon="settings-outline">
            {filterText('notifications reminders') && (
              <View style={styles.componentContainer}>
                <View style={styles.componentHeader}>
                  <View style={styles.iconContainer}>
                    <Ionicons name="notifications-outline" size={22} color={theme.accent} />
                  </View>
                  <View style={styles.componentHeaderText}>
                    <Text style={styles.componentLabel}>Notifications</Text>
                    <Text style={styles.componentDescription}>
                      Manage how and when you receive notifications
                    </Text>
                  </View>
                </View>
                <SimpleNotificationSettings />
              </View>
            )}
            {filterText('privacy analytics tracking') && (
              <View style={styles.componentContainer}>
                <View style={styles.componentHeader}>
                  <View style={styles.iconContainer}>
                    <Ionicons name="analytics-outline" size={22} color={theme.accent} />
                  </View>
                  <View style={styles.componentHeaderText}>
                    <Text style={styles.componentLabel}>Privacy & Analytics</Text>
                    <Text style={styles.componentDescription}>
                      Control data collection and analytics preferences
                    </Text>
                  </View>
                </View>
                <AnalyticsToggle />
              </View>
            )}
            {filterText('clear cache storage') && (
              <SettingItem
                label="Clear Cache"
                description="Free up storage space by clearing cached data"
                icon="trash-outline"
                onPress={handleClearCache}
                disabled={isClearingCache}
                rightContent={
                  isClearingCache ? (
                    <ActivityIndicator size="small" color={theme.accent} />
                  ) : undefined
                }
                showChevron={false}
              />
            )}
            {filterText('clear example data sample') && hasExamples && (
              <SettingItem
                label="Clear Example Data"
                description="Remove sample tasks and course created for demonstration"
                icon="sparkles-outline"
                onPress={handleClearExampleData}
                disabled={isClearingExamples}
                rightContent={
                  isClearingExamples ? (
                    <ActivityIndicator size="small" color={theme.accent} />
                  ) : undefined
                }
                showChevron={false}
              />
            )}
            {filterText('reset settings defaults restore') && (
              <SettingItem
                label="Reset All Settings"
                description="Restore all application settings to their original defaults"
                icon="refresh-circle-outline"
                onPress={handleResetSettings}
                disabled={isResettingSettings}
                rightContent={
                  isResettingSettings ? (
                    <ActivityIndicator size="small" color={theme.accent} />
                  ) : undefined
                }
                showChevron={false}
              />
            )}
          </CategoryCard>
        )}

        {/* Account Management */}
        {filterText('account data download export recycle bin logout delete') && (
          <CategoryCard title="Account Management" icon="person-circle-outline">
            {filterText('download export data') && (
              <SettingItem
          label="Download My Data" 
                description={
                  lastExportDate
                    ? `Export all your data (Last: ${formatLastExportDate(lastExportDate)})`
                    : 'Export all your data to a file'
                }
                icon="download-outline"
          onPress={handleDownloadData}
          disabled={isDownloadingData}
          rightContent={
            isDownloadingData ? (
              <ActivityIndicator size="small" color={theme.accent} />
                  ) : undefined
                }
                showChevron={false}
              />
            )}
            {filterText('recycle bin trash deleted') && (
              <SettingItem
                label="Recycle Bin"
                description="View and restore deleted items"
                icon="trash-outline"
                onPress={() => (navigation as any).navigate('RecycleBin')}
              />
            )}
            {filterText('logout sign out') && (
              <SettingItem
                label="Log Out"
                description="Sign out from this device"
                icon="log-out-outline"
                onPress={handleLogout}
                showChevron={false}
              />
            )}
            {filterText('logout all devices sessions') && (
              <SettingItem
                label="Log Out From All Devices"
                description="End all active sessions on all devices"
                icon="phone-portrait-outline"
                onPress={handleGlobalSignOut}
                showChevron={false}
              />
            )}
          </CategoryCard>
        )}

        {/* Danger Zone */}
        {filterText('delete account remove') && (
          <View style={styles.dangerZone}>
            <View style={styles.dangerHeader}>
              <Ionicons name="warning" size={20} color="#FF3B30" />
              <Text style={styles.dangerTitle}>Danger Zone</Text>
            </View>
            <SettingItem
              label="Delete Account"
              description="Permanently delete your account and all data"
              icon="trash-bin-outline"
              onPress={() => (navigation as any).navigate('DeleteAccount')}
              isDestructive
            />
          </View>
        )}

        {/* No Results */}
        {searchQuery && (
          !filterText('profile security password mfa authentication device login history notifications privacy analytics clear cache reset example download export data recycle bin logout delete account')
        ) && (
          <View style={styles.noResults}>
            <Ionicons name="search-outline" size={48} color={COLORS.gray} />
            <Text style={styles.noResultsText}>No settings found</Text>
            <Text style={styles.noResultsSubtext}>Try a different search term</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: SPACING.md,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: {
    marginRight: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  clearButton: {
    padding: SPACING.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  categoryCard: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    marginBottom: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.sm,
  },
  categoryTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold as any,
    color: COLORS.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoryContent: {
    padding: SPACING.sm,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.xs,
  },
  settingItemDisabled: {
    opacity: 0.5,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F0F5FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  iconContainerDestructive: {
    backgroundColor: '#FFF5F5',
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium as any,
    color: COLORS.text,
    marginBottom: 2,
  },
  settingLabelDestructive: {
    color: '#FF3B30',
  },
  settingDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray,
    lineHeight: 18,
  },
  componentContainer: {
    marginBottom: SPACING.sm,
  },
  componentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  componentHeaderText: {
    flex: 1,
  },
  componentLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium as any,
    color: COLORS.text,
    marginBottom: 2,
  },
  componentDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray,
    lineHeight: 18,
  },
  dangerZone: {
    backgroundColor: '#FFF5F5',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFE4E1',
    overflow: 'hidden',
    marginTop: SPACING.lg,
  },
  dangerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: '#FFEBEE',
    gap: SPACING.sm,
  },
  dangerTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold as any,
    color: '#FF3B30',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  noResults: {
    padding: SPACING.xxl,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold as any,
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  noResultsSubtext: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray,
    marginTop: SPACING.xs,
  },
});
