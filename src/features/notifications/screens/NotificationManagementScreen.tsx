import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  RefreshControl,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { notificationService } from '@/services/notifications';
import { SimpleNotificationSettings } from '../components/SimpleNotificationSettings';
import { ScheduledNotification } from '@/services/notifications/interfaces';

export const NotificationManagementScreen: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'settings' | 'scheduled'>('settings');
  const [scheduledNotifications, setScheduledNotifications] = useState<ScheduledNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (activeTab === 'scheduled') {
      loadScheduledNotifications();
    }
  }, [activeTab]);

  const loadScheduledNotifications = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const notifications = await notificationService.getScheduledNotifications(user.id);
      setScheduledNotifications(notifications);
    } catch (error) {
      console.error('Error loading scheduled notifications:', error);
      Alert.alert('Error', 'Failed to load scheduled notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadScheduledNotifications();
    setRefreshing(false);
  };

  const handleCancelNotification = async (notificationId: string) => {
    try {
      await notificationService.cancelNotification(notificationId);
      await loadScheduledNotifications();
      Alert.alert('Success', 'Notification cancelled');
    } catch (error) {
      console.error('Error cancelling notification:', error);
      Alert.alert('Error', 'Failed to cancel notification');
    }
  };

  const handleTestNotification = async () => {
    if (!user) return;
    
    try {
      const success = await notificationService.sendSmartNotification(
        user.id,
        'Test Notification',
        'This is a test notification to verify your settings are working correctly.',
        'test',
        'normal'
      );
      
      if (success) {
        Alert.alert('Success', 'Test notification sent! Check your device.');
      } else {
        Alert.alert('Error', 'Failed to send test notification. Check your settings.');
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      Alert.alert('Error', 'Failed to send test notification');
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'settings':
        return <SimpleNotificationSettings onClose={() => setShowSettings(false)} />;
      case 'scheduled':
        return <ScheduledNotificationsList 
          notifications={scheduledNotifications}
          loading={loading}
          onCancel={handleCancelNotification}
          onRefresh={handleRefresh}
          refreshing={refreshing}
        />;
      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Notification Management</Text>
        <TouchableOpacity
          style={[styles.testButton, { backgroundColor: theme.accent }]}
          onPress={handleTestNotification}
        >
          <Ionicons name="send-outline" size={16} color="white" />
          <Text style={styles.testButtonText}>Test</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {[
          { key: 'settings', label: 'Settings', icon: 'settings-outline' },
          { key: 'scheduled', label: 'Scheduled', icon: 'list-outline' }
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              { 
                backgroundColor: activeTab === tab.key ? theme.accent : theme.card,
                borderColor: theme.border
              }
            ]}
            onPress={() => {
              setActiveTab(tab.key as any);
              if (tab.key === 'settings') setShowSettings(true);
            }}
          >
            <Ionicons 
              name={tab.icon as any} 
              size={16} 
              color={activeTab === tab.key ? 'white' : theme.text} 
            />
            <Text style={[
              styles.tabText,
              { color: activeTab === tab.key ? 'white' : theme.text }
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {renderTabContent()}
      </View>
    </View>
  );
};

// Scheduled Notifications List Component
interface ScheduledNotificationsListProps {
  notifications: ScheduledNotification[];
  loading: boolean;
  onCancel: (id: string) => void;
  onRefresh: () => void;
  refreshing: boolean;
}

const ScheduledNotificationsList: React.FC<ScheduledNotificationsListProps> = ({
  notifications,
  loading,
  onCancel,
  onRefresh,
  refreshing
}) => {
  const { theme } = useTheme();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={[styles.loadingText, { color: theme.text }]}>Loading notifications...</Text>
      </View>
    );
  }

  if (notifications.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="notifications-off-outline" size={48} color={theme.textSecondary} />
        <Text style={[styles.emptyTitle, { color: theme.text }]}>No Scheduled Notifications</Text>
        <Text style={[styles.emptyMessage, { color: theme.textSecondary }]}>
          You don't have any notifications scheduled. Use the Schedule tab to create new notifications.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.notificationsList}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {notifications.map((notification) => (
        <ScheduledNotificationItem
          key={notification.id}
          notification={notification}
          onCancel={onCancel}
        />
      ))}
    </ScrollView>
  );
};

// Scheduled Notification Item Component
interface ScheduledNotificationItemProps {
  notification: ScheduledNotification;
  onCancel: (id: string) => void;
}

const ScheduledNotificationItem: React.FC<ScheduledNotificationItemProps> = ({
  notification,
  onCancel
}) => {
  const { theme } = useTheme();
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const handleCancel = () => {
    Alert.alert(
      'Cancel Notification',
      'Are you sure you want to cancel this notification?',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes', 
          style: 'destructive',
          onPress: () => onCancel(notification.id)
        }
      ]
    );
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `In ${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `In ${minutes}m`;
    } else {
      return 'Now';
    }
  };

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'assignment': return 'document-text-outline';
      case 'lecture': return 'school-outline';
      case 'srs': return 'repeat-outline';
      case 'reminder': return 'alarm-outline';
      case 'achievement': return 'trophy-outline';
      default: return 'notifications-outline';
    }
  };

  const getCategoryColor = (category?: string) => {
    switch (category) {
      case 'assignment': return '#FF6B6B';
      case 'lecture': return '#4ECDC4';
      case 'srs': return '#95E1D3';
      case 'reminder': return '#FFE66D';
      case 'achievement': return '#FF9800';
      default: return '#9E9E9E';
    }
  };

  return (
    <View style={[styles.notificationItem, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.notificationItemLeft}>
        <View style={[styles.categoryIcon, { backgroundColor: getCategoryColor(notification.category) }]}>
          <Ionicons 
            name={getCategoryIcon(notification.category) as any} 
            size={20} 
            color="white" 
          />
        </View>
        <View style={styles.notificationContent}>
          <Text style={[styles.notificationTitle, { color: theme.text }]}>
            {notification.title}
          </Text>
          <Text style={[styles.notificationBody, { color: theme.textSecondary }]}>
            {notification.body}
          </Text>
          <Text style={[styles.notificationTime, { color: theme.accent }]}>
            {formatTime(notification.scheduledFor)}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.cancelButton, { backgroundColor: '#F44336' }]}
        onPress={handleCancel}
      >
        <Ionicons name="close" size={16} color="white" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  testButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  notificationsList: {
    flex: 1,
    padding: 16,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  notificationItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  notificationBody: {
    fontSize: 14,
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    fontWeight: '500',
  },
  cancelButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
});
