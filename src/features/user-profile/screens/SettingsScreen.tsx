import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Card from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { authService } from '@/features/auth/services/authService';
import { supabase } from '@/services/supabase';
import { AppError } from '@/utils/AppError';
import { NotificationSettings } from '@/features/notifications/components/NotificationSettings';
import { AnalyticsToggle } from '@/features/settings/components/AnalyticsToggle';
import { useTheme } from '@/contexts/ThemeContext';
import { showToast } from '@/utils/showToast';
import { PostChatModal } from '@/features/support/components/PostChatModal';
import { getSecureChatLink } from '@/features/support/utils/getSecureChatLink';
import { cache } from '@/utils/cache';

const ListItem = ({ label, onPress, isDestructive = false, disabled = false, rightContent }: { label: string; onPress: () => void; isDestructive?: boolean; disabled?: boolean; rightContent?: React.ReactNode }) => {
  const { theme } = useTheme();
  return (
    <TouchableOpacity 
      onPress={onPress} 
      style={[styles.listItem, disabled && styles.listItemDisabled]}
      disabled={disabled}
    >
      <Text style={[styles.listItemText, isDestructive && { color: theme.error }]}>{label}</Text>
      {rightContent}
    </TouchableOpacity>
  );
};

export function SettingsScreen() {
  const { user, session, signOut } = useAuth();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPostChatModalVisible, setPostChatModalVisible] = useState(false);
  const [isSupportChatLoading, setSupportChatLoading] = useState(false);
  const [isDownloadingData, setIsDownloadingData] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [lastExportDate, setLastExportDate] = useState<string | null>(
    user?.last_data_export_at || null
  );

  const handleEnableMfa = () => {
    (navigation as any).navigate('MfaSetup');
  };

  const handleLogout = async () => {
    await signOut();
  };

  const handleGlobalSignOut = async () => {
    Alert.alert(
      "Log Out From All Devices",
      "Are you sure you want to log out from all other sessions?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log Out",
          onPress: async () => {
            try {
              // TODO: Implement global sign out when backend supports it
              await signOut();
              showToast({ type: 'success', message: 'Logged out from all devices.' });
            } catch (error) {
              showToast({ type: 'error', message: 'Failed to log out from all devices.' });
            }
          },
          style: "destructive",
        },
      ]
    );
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to permanently delete your account? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          onPress: async () => {
            setIsDeleting(true);
            try {
              const { data, error } = await supabase.functions.invoke('soft-delete-account', {
                body: { reason: 'User requested account deletion' }
              });
              if (error) throw new AppError('Failed to delete account.');
              await signOut();
            } catch (error) {
              showToast({ type: 'error', message: error instanceof Error ? error.message : 'An error occurred' });
              setIsDeleting(false);
            }
          },
          style: "destructive",
        },
      ]
    );
  };
  
  const handleContactSupport = useCallback(async () => {
    if (!user) return;
    setSupportChatLoading(true);
    try {
      const secureUrl = await getSecureChatLink(user);
      (navigation as any).navigate('SupportChat', { uri: secureUrl });
    } catch (error) {
      showToast({ type: 'error', message: 'Could not open support chat.' });
    } finally {
      setSupportChatLoading(false);
    }
  }, [user, navigation]);

  const handleDownloadData = useCallback(async () => {
    if (!user) return;
    
    setIsDownloadingData(true);
    
    try {
      // Call the Edge Function to export user data
      const { data, error } = await supabase.functions.invoke('export-user-data');
      
      if (error) {
        // Handle rate limit error (429)
        if (error.message?.includes('429') || error.message?.includes('rate limit')) {
          showToast({ 
            type: 'error', 
            message: 'Data export is limited to once per week. Please try again later.' 
          });
          return;
        }
        
        // Handle other errors
        throw new Error(error.message || 'Failed to export data');
      }
      
      if (!data) {
        throw new Error('No data received from server');
      }
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      const filename = `elaro-data-export-${timestamp}.json`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;
      
      // Write JSON data to file
      await FileSystem.writeAsStringAsync(
        fileUri,
        JSON.stringify(data, null, 2), // Pretty print with 2-space indentation
        { encoding: FileSystem.EncodingType.UTF8 }
      );
      
      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      
      if (!isAvailable) {
        Alert.alert(
          'File Saved',
          `Your data has been saved to: ${fileUri}`,
          [{ text: 'OK' }]
        );
        return;
      }
      
      // Open native share sheet
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Save Your ELARO Data',
        UTI: 'public.json'
      });
      
      // Update last export date
      setLastExportDate(new Date().toISOString());
      
      showToast({ 
        type: 'success', 
        message: 'Data exported successfully!' 
      });
      
    } catch (error: any) {
      console.error('Error exporting data:', error);
      showToast({ 
        type: 'error', 
        message: error.message || 'Failed to export data. Please try again.' 
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
        day: 'numeric' 
      });
    } catch {
      return null;
    }
  };

  const handleClearCache = useCallback(async () => {
    try {
      // Get cache stats first
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
                // Clear AsyncStorage cache
                await cache.clearAll();
                
                // Also clear React Query cache
                queryClient.clear();
                
                showToast({ 
                  type: 'success', 
                  message: 'Cache cleared successfully!' 
                });
              } catch (error) {
                console.error('Error clearing cache:', error);
                showToast({ 
                  type: 'error', 
                  message: 'Failed to clear cache. Please try again.' 
                });
              } finally {
                setIsClearingCache(false);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error getting cache stats:', error);
      showToast({ 
        type: 'error', 
        message: 'Failed to get cache information.' 
      });
    }
  }, [queryClient]);


  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <Card title="Security">
        <Button title="Enable Multi-Factor Authentication" onPress={handleEnableMfa} />
      </Card>

      <Card title="Notifications">
        <NotificationSettings />
      </Card>
      
      <Card title="Privacy & Analytics">
        <AnalyticsToggle />
      </Card>

      <Card title="Support">
        <Button title="Contact Support" onPress={handleContactSupport} loading={isSupportChatLoading} />
      </Card>

      <Card title="Data Management">
        <ListItem 
          label="Recycle Bin" 
          onPress={() => (navigation as any).navigate('RecycleBin')} 
          rightContent={undefined}
        />
        <ListItem 
          label="Download My Data" 
          onPress={handleDownloadData}
          disabled={isDownloadingData}
          rightContent={
            isDownloadingData ? (
              <ActivityIndicator size="small" color={theme.accent} />
            ) : null
          }
        />
        {lastExportDate && (
          <Text style={[styles.lastExportText, { color: theme.textSecondary }]}>
            Last exported: {formatLastExportDate(lastExportDate)}
          </Text>
        )}
        <ListItem 
          label="Clear Cache" 
          onPress={handleClearCache}
          disabled={isClearingCache}
          rightContent={
            isClearingCache ? (
              <ActivityIndicator size="small" color={theme.accent} />
            ) : null
          }
        />
        <Text style={[styles.cacheInfoText, { color: theme.textSecondary }]}>
          Clears cached data to free up storage space. The app will re-download data as needed.
        </Text>
      </Card>

      <Card title="Account Actions">
        <ListItem label="Log Out" onPress={handleLogout} rightContent={undefined} />
        <ListItem label="Log Out From All Devices" onPress={handleGlobalSignOut} rightContent={undefined} />
        <ListItem label="Delete Account" onPress={handleDeleteAccount} isDestructive rightContent={undefined} />
      </Card>
      
      <PostChatModal
        isVisible={isPostChatModalVisible}
        onClose={() => setPostChatModalVisible(false)}
        onFaqPress={() => {
          setPostChatModalVisible(false);
          (navigation as any).navigate('Faq');
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  listItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listItemDisabled: {
    opacity: 0.5,
  },
  listItemText: {
    fontSize: 16,
    color: '#1F2937',
  },
  lastExportText: {
    fontSize: 12,
    marginTop: 8,
    paddingLeft: 16,
    paddingBottom: 8,
  },
  cacheInfoText: {
    fontSize: 12,
    marginTop: 4,
    paddingLeft: 16,
    paddingBottom: 8,
    fontStyle: 'italic',
  },
});

