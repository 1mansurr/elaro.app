import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  Dimensions,
  Animated,
} from 'react-native';
import {
  PanGestureHandler,
  State,
  GestureHandlerGestureEvent,
  GestureHandlerStateChangeEvent,
} from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { notificationService } from '@/services/notifications';
import { SimpleNotificationSettings } from '../components/SimpleNotificationSettings';
import { ScheduledNotification } from '@/services/notifications/interfaces';
import {
  COLORS,
  FONT_SIZES,
  FONT_WEIGHTS,
  SPACING,
  SHADOWS,
  BORDER_RADIUS,
} from '@/constants/theme';

const { width: screenWidth } = Dimensions.get('window');
const EDGE_SWIPE_THRESHOLD = 50;

export const NotificationManagementScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'settings' | 'scheduled'>(
    'settings',
  );
  const [scheduledNotifications, setScheduledNotifications] = useState<
    ScheduledNotification[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Edge swipe gesture handlers
  const edgeSwipeTranslateX = useRef(new Animated.Value(0)).current;
  const edgeSwipeOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (activeTab === 'scheduled') {
      loadScheduledNotifications();
    }
  }, [activeTab]);

  const loadScheduledNotifications = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const notifications = await notificationService.getScheduledNotifications(
        user.id,
      );
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
        'normal',
      );

      if (success) {
        Alert.alert('Success', 'Test notification sent! Check your device.');
      } else {
        Alert.alert(
          'Error',
          'Failed to send test notification. Check your settings.',
        );
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      Alert.alert('Error', 'Failed to send test notification');
    }
  };

  const handleEdgeSwipe = (event: GestureHandlerGestureEvent) => {
    const { translationX } = event.nativeEvent;
    if (translationX < -EDGE_SWIPE_THRESHOLD) {
      const progress = Math.min(1, Math.abs(translationX) / screenWidth);
      edgeSwipeTranslateX.setValue(translationX);
      edgeSwipeOpacity.setValue(1 - progress * 0.5);
    }
  };

  const handleEdgeSwipeEnd = (event: GestureHandlerStateChangeEvent) => {
    const { translationX } = event.nativeEvent;
    if (Math.abs(translationX) > EDGE_SWIPE_THRESHOLD) {
      // Animate out and go back
      Animated.parallel([
        Animated.timing(edgeSwipeTranslateX, {
          toValue: -screenWidth,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(edgeSwipeOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        navigation.goBack();
        // Reset
        edgeSwipeTranslateX.setValue(0);
        edgeSwipeOpacity.setValue(1);
      });
    } else {
      // Snap back
      Animated.parallel([
        Animated.spring(edgeSwipeTranslateX, {
          toValue: 0,
          useNativeDriver: true,
          friction: 7,
        }),
        Animated.spring(edgeSwipeOpacity, {
          toValue: 1,
          useNativeDriver: true,
          friction: 7,
        }),
      ]).start();
    }
  };

  // Light mode default colors
  const bgColor = theme.isDark ? '#101922' : '#F6F7F8';
  const surfaceColor = theme.isDark ? '#1C252E' : '#FFFFFF';
  const textColor = theme.isDark ? '#FFFFFF' : '#111418';
  const textSecondaryColor = theme.isDark ? '#9CA3AF' : '#6B7280';
  const borderColor = theme.isDark ? '#374151' : '#E5E7EB';

  const renderTabContent = () => {
    switch (activeTab) {
      case 'settings':
        return (
          <SimpleNotificationSettings onClose={() => setShowSettings(false)} />
        );
      case 'scheduled':
        return (
          <ScheduledNotificationsList
            notifications={scheduledNotifications}
            loading={loading}
            onCancel={handleCancelNotification}
            onRefresh={handleRefresh}
            refreshing={refreshing}
          />
        );
      default:
        return null;
    }
  };

  return (
    <PanGestureHandler
      onGestureEvent={handleEdgeSwipe}
      onHandlerStateChange={handleEdgeSwipeEnd}
      activeOffsetX={-10}
      failOffsetY={[-10, 10]}>
      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor: bgColor,
            paddingTop: insets.top,
            transform: [{ translateX: edgeSwipeTranslateX }],
            opacity: edgeSwipeOpacity,
          },
        ]}>
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: bgColor,
              borderBottomColor: borderColor,
              paddingTop: SPACING.md,
            },
          ]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back-ios" size={20} color={textColor} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textColor }]}>
            Notifications
          </Text>
          <TouchableOpacity
            style={[styles.testButton, { backgroundColor: COLORS.primary }]}
            onPress={handleTestNotification}>
            <Ionicons name="send-outline" size={16} color="white" />
            <Text style={styles.testButtonText}>Test</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          {[
            { key: 'settings', label: 'Settings', icon: 'settings-outline' },
            { key: 'scheduled', label: 'Scheduled', icon: 'list-outline' },
          ].map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                {
                  backgroundColor:
                    activeTab === tab.key ? COLORS.primary : surfaceColor,
                  borderColor: borderColor,
                },
              ]}
              onPress={() => {
                setActiveTab(tab.key as any);
                if (tab.key === 'settings') setShowSettings(true);
              }}>
              <Ionicons
                name={tab.icon as any}
                size={16}
                color={activeTab === tab.key ? 'white' : textColor}
              />
              <Text
                style={[
                  styles.tabText,
                  {
                    color: activeTab === tab.key ? 'white' : textColor,
                  },
                ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        <View style={styles.content}>{renderTabContent()}</View>
      </Animated.View>
    </PanGestureHandler>
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
  refreshing,
}) => {
  const { theme } = useTheme();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={[styles.loadingText, { color: theme.text }]}>
          Loading notifications...
        </Text>
      </View>
    );
  }

  if (notifications.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons
          name="notifications-off-outline"
          size={48}
          color={theme.textSecondary}
        />
        <Text style={[styles.emptyTitle, { color: theme.text }]}>
          No Scheduled Notifications
        </Text>
        <Text style={[styles.emptyMessage, { color: theme.textSecondary }]}>
          You don't have any notifications scheduled. Use the Schedule tab to
          create new notifications.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.notificationsList}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
      {notifications.map(notification => (
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
  onCancel,
}) => {
  const { theme } = useTheme();
  
  // Light mode default colors
  const surfaceColor = theme.isDark ? '#1C252E' : '#FFFFFF';
  const textColor = theme.isDark ? '#FFFFFF' : '#111418';
  const textSecondaryColor = theme.isDark ? '#9CA3AF' : '#6B7280';
  const borderColor = theme.isDark ? '#374151' : '#E5E7EB';

  const handleCancel = () => {
    Alert.alert(
      'Cancel Notification',
      'Are you sure you want to cancel this notification?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: () => onCancel(notification.id),
        },
      ],
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
      case 'assignment':
        return 'document-text-outline';
      case 'lecture':
        return 'school-outline';
      case 'srs':
        return 'repeat-outline';
      case 'reminder':
        return 'alarm-outline';
      case 'achievement':
        return 'trophy-outline';
      default:
        return 'notifications-outline';
    }
  };

  const getCategoryColor = (category?: string) => {
    switch (category) {
      case 'assignment':
        return '#FF6B6B';
      case 'lecture':
        return '#4ECDC4';
      case 'srs':
        return '#95E1D3';
      case 'reminder':
        return '#FFE66D';
      case 'achievement':
        return '#FF9800';
      default:
        return '#9E9E9E';
    }
  };

  return (
    <View
      style={[
        styles.notificationItem,
        {
          backgroundColor: surfaceColor,
          borderColor: borderColor,
        },
      ]}>
      <View style={styles.notificationItemLeft}>
        <View
          style={[
            styles.categoryIcon,
            { backgroundColor: getCategoryColor(notification.category) },
          ]}>
          <Ionicons
            name={getCategoryIcon(notification.category) as any}
            size={20}
            color="white"
          />
        </View>
        <View style={styles.notificationContent}>
          <Text style={[styles.notificationTitle, { color: textColor }]}>
            {notification.title}
          </Text>
          <Text
            style={[styles.notificationBody, { color: textSecondaryColor }]}>
            {notification.body}
          </Text>
          <Text style={[styles.notificationTime, { color: COLORS.primary }]}>
            {formatTime(notification.scheduledFor)}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.cancelButton, { backgroundColor: '#EF4444' }]}
        onPress={handleCancel}>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    flex: 1,
    textAlign: 'center',
    paddingRight: 40,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.xl,
    gap: 4,
  },
  testButtonText: {
    color: 'white',
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    gap: 6,
    minHeight: 36,
    maxHeight: 36,
  },
  tabText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
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
    fontSize: FONT_SIZES.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  emptyMessage: {
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  notificationsList: {
    flex: 1,
    padding: SPACING.md,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    ...SHADOWS.xs,
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
    marginRight: SPACING.md,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    marginBottom: 4,
  },
  notificationBody: {
    fontSize: FONT_SIZES.sm,
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
  },
  cancelButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.md,
  },
});
