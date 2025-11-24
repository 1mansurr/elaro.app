import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Dimensions,
  Alert,
  Animated,
} from 'react-native';
import {
  PanGestureHandler,
  State,
  GestureHandlerGestureEvent,
  GestureHandlerStateChangeEvent,
} from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeType } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  NotificationHistoryItem,
  NotificationFilter,
  notificationHistoryService,
} from '@/services/notifications/NotificationHistoryService';
import { formatDate } from '@/i18n';

interface NotificationHistoryModalProps {
  isVisible: boolean;
  onClose: () => void;
}

const { width: screenWidth } = Dimensions.get('window');

export const NotificationHistoryModal: React.FC<
  NotificationHistoryModalProps
> = ({ isVisible, onClose }) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationHistoryItem[]>(
    [],
  );
  const [filteredNotifications, setFilteredNotifications] = useState<
    NotificationHistoryItem[]
  >([]);
  const [activeFilter, setActiveFilter] =
    useState<NotificationFilter['type']>('all');
  const [loading, setLoading] = useState(true);
  const [hasUnread, setHasUnread] = useState(false);
  const [swipeAnimations] = useState<{ [key: string]: Animated.Value }>({});

  const filters = notificationHistoryService.getNotificationFilters();

  useEffect(() => {
    if (isVisible && user) {
      loadNotifications();
    }
  }, [isVisible, user]);

  useEffect(() => {
    // Apply filter
    const filtered = notifications.filter(notification => {
      if (activeFilter === 'all') return true;

      const type = notification.notification_type;
      switch (activeFilter) {
        case 'assignments':
          return type === 'assignment' || type === 'assignment_reminder';
        case 'lectures':
          return type === 'lecture' || type === 'lecture_reminder';
        case 'study_sessions':
          return (
            type === 'srs' ||
            type === 'study_session' ||
            type === 'srs_reminder'
          );
        case 'analytics':
          return type === 'weekly_report' || type === 'analytics';
        case 'summaries':
          return (
            type === 'daily_summary' ||
            type === 'achievement' ||
            type === 'update'
          );
        default:
          return true;
      }
    });

    setFilteredNotifications(filtered);
  }, [notifications, activeFilter]);

  const loadNotifications = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const data = await notificationHistoryService.getNotificationHistory(
        user.id,
        {
          limit: 50,
          includeRead: true,
        },
      );

      setNotifications(data);

      // Check if there are unread notifications
      const unreadCount = data.filter(
        (n: NotificationHistoryItem) => !n.opened_at,
      ).length;
      setHasUnread(unreadCount > 0);
    } catch (error) {
      console.error('Error loading notifications:', error);
      Alert.alert('Error', 'Failed to load notifications. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;

    try {
      await notificationHistoryService.markAllAsRead(user.id);
      await loadNotifications();
    } catch (error) {
      console.error('Error marking all as read:', error);
      Alert.alert('Error', 'Failed to mark all notifications as read.');
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    if (!user) return;

    try {
      await notificationHistoryService.markAsRead(notificationId, user.id);
      await loadNotifications();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    if (!user) return;

    try {
      await notificationHistoryService.deleteNotification(
        notificationId,
        user.id,
      );
      await loadNotifications();
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleCompleteTask = async (notificationId: string) => {
    if (!user) return;

    try {
      await notificationHistoryService.completeTaskFromNotification(
        notificationId,
        user.id,
      );
      await loadNotifications();
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'assignment':
      case 'assignment_reminder':
        return '📝';
      case 'lecture':
      case 'lecture_reminder':
        return '👨‍🏫';
      case 'srs':
      case 'study_session':
      case 'srs_reminder':
        return '📚';
      case 'weekly_report':
      case 'analytics':
        return '📈';
      case 'daily_summary':
      case 'achievement':
      case 'update':
        return '📊';
      default:
        return '🔔';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'assignment':
      case 'assignment_reminder':
        return '#FF6B6B';
      case 'lecture':
      case 'lecture_reminder':
        return '#4ECDC4';
      case 'srs':
      case 'study_session':
      case 'srs_reminder':
        return '#45B7D1';
      case 'weekly_report':
      case 'analytics':
        return '#9C27B0';
      case 'daily_summary':
      case 'achievement':
      case 'update':
        return '#FFA726';
      default:
        return theme.accent;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60),
    );

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return formatDate(date);
  };

  const truncateTitle = (title: string) => {
    return title.length > 35 ? title.substring(0, 35) + '...' : title;
  };

  const isTaskNotification = (type: string) => {
    return (
      type === 'assignment' ||
      type === 'assignment_reminder' ||
      type === 'srs' ||
      type === 'study_session'
    );
  };

  if (!isVisible) return null;

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Notifications
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Filter Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
          contentContainerStyle={styles.filterContent}>
          {filters.map((filter: NotificationFilter) => (
            <TouchableOpacity
              key={filter.type}
              style={[
                styles.filterTab,
                activeFilter === filter.type && styles.activeFilterTab,
                {
                  backgroundColor:
                    activeFilter === filter.type ? theme.accent : 'transparent',
                  borderColor:
                    activeFilter === filter.type ? theme.accent : theme.border,
                },
              ]}
              onPress={() => setActiveFilter(filter.type)}>
              <Ionicons
                name={filter.icon}
                size={16}
                color={
                  activeFilter === filter.type ? 'white' : theme.textSecondary
                }
              />
              <Text
                style={[
                  styles.filterText,
                  {
                    color:
                      activeFilter === filter.type
                        ? 'white'
                        : theme.textSecondary,
                  },
                ]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Mark All as Read Button */}
        {hasUnread && (
          <View style={styles.markAllContainer}>
            <TouchableOpacity
              style={[styles.markAllButton, { backgroundColor: theme.surface }]}
              onPress={handleMarkAllAsRead}>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={theme.accent}
              />
              <Text style={[styles.markAllText, { color: theme.accent }]}>
                Mark All as Read
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Notifications List */}
        <ScrollView
          style={styles.notificationsList}
          showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text
                style={[styles.loadingText, { color: theme.textSecondary }]}>
                Loading notifications...
              </Text>
            </View>
          ) : filteredNotifications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons
                name="notifications-outline"
                size={48}
                color={theme.textSecondary}
              />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                {activeFilter === 'all'
                  ? 'No notifications yet'
                  : 'No notifications in this category'}
              </Text>
              <Text
                style={[
                  styles.emptyDescription,
                  { color: theme.textSecondary },
                ]}>
                {activeFilter === 'all'
                  ? 'Your notifications will appear here'
                  : 'Try selecting a different filter'}
              </Text>
            </View>
          ) : (
            filteredNotifications.map(notification => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={() => handleMarkAsRead(notification.id)}
                onDelete={() => handleDeleteNotification(notification.id)}
                onCompleteTask={() => handleCompleteTask(notification.id)}
                isTask={isTaskNotification(notification.notification_type)}
                getIcon={getNotificationIcon}
                getColor={getNotificationColor}
                formatTimestamp={formatTimestamp}
                truncateTitle={truncateTitle}
                theme={theme}
              />
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

// ============================================================================
// NOTIFICATION ITEM COMPONENT
// ============================================================================

interface NotificationItemProps {
  notification: NotificationHistoryItem;
  onMarkAsRead: () => void;
  onDelete: () => void;
  onCompleteTask: () => void;
  isTask: boolean;
  getIcon: (type: string) => string;
  getColor: (type: string) => string;
  formatTimestamp: (timestamp: string) => string;
  truncateTitle: (title: string) => string;
  theme: ThemeType;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkAsRead,
  onDelete,
  onCompleteTask,
  isTask,
  getIcon,
  getColor,
  formatTimestamp,
  truncateTitle,
  theme,
}) => {
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const translateX = useRef(new Animated.Value(0)).current;

  const isRead = !!notification.opened_at;
  const icon = getIcon(notification.notification_type);
  const color = getColor(notification.notification_type);

  const handleSwipeRight = (progress: number) => {
    setSwipeProgress(progress);

    if (progress >= 0.5 && isTask && !isCompleting) {
      setIsCompleting(true);
      // Animate to blue background
      translateX.setValue(progress * screenWidth);
    }
  };

  const handleSwipeComplete = () => {
    if (swipeProgress >= 0.5) {
      if (isTask) {
        onCompleteTask();
        onMarkAsRead();
      }
    }

    // Reset animation
    translateX.setValue(0);
    setSwipeProgress(0);
    setIsCompleting(false);
  };

  const handleTap = () => {
    if (isTask) {
      // Show action options for task notifications
      Alert.alert('Task Notification', 'What would you like to do?', [
        {
          text: 'View Task Details',
          onPress: () => {
            /* Navigate to task details */
          },
        },
        { text: 'Complete Task', onPress: onCompleteTask },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } else {
      // Navigate to relevant screen for other notifications
      if (notification.deep_link_url) {
        // Handle deep linking
        console.log('Navigate to:', notification.deep_link_url);
      }
    }

    if (!isRead) {
      onMarkAsRead();
    }
  };

  return (
    <PanGestureHandler
      onGestureEvent={(event: GestureHandlerGestureEvent) => {
        if (isTask) {
          const progress = Math.max(
            0,
            Math.min(1, event.nativeEvent.translationX / (screenWidth * 0.3)),
          );
          handleSwipeRight(progress);
        }
      }}
      onHandlerStateChange={(event: GestureHandlerStateChangeEvent) => {
        if (event.nativeEvent.state === State.END) {
          handleSwipeComplete();
        }
      }}
      enabled={isTask}>
      <Animated.View
        style={[
          styles.notificationItem,
          {
            backgroundColor: isCompleting ? '#007AFF' : theme.surface,
            transform: [{ translateX }],
          },
        ]}>
        {isCompleting && (
          <View style={styles.completingOverlay}>
            <Text style={styles.completingText}>Task Completed</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.notificationContent}
          onPress={handleTap}
          activeOpacity={0.7}>
          <View style={styles.notificationLeft}>
            <View
              style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
              <Text style={styles.notificationIcon}>{icon}</Text>
            </View>

            <View style={styles.notificationText}>
              <Text
                style={[
                  styles.notificationTitle,
                  {
                    color: isCompleting ? 'white' : theme.text,
                    fontWeight: isRead ? 'normal' : 'bold',
                  },
                ]}>
                {isCompleting
                  ? 'Task Completed'
                  : truncateTitle(notification.title)}
              </Text>

              {!isCompleting && (
                <Text
                  style={[
                    styles.notificationTime,
                    { color: theme.textSecondary },
                  ]}>
                  {formatTimestamp(notification.sent_at)}
                </Text>
              )}
            </View>
          </View>

          {!isCompleting && (
            <View style={styles.notificationRight}>
              {!isRead && (
                <View
                  style={[styles.unreadDot, { backgroundColor: theme.accent }]}
                />
              )}
              <Ionicons
                name="chevron-forward"
                size={16}
                color={theme.textSecondary}
              />
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    </PanGestureHandler>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSpacer: {
    width: 32,
  },
  filterContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  filterContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  activeFilterTab: {
    borderWidth: 1,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  markAllContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  markAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  notificationsList: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  notificationItem: {
    marginHorizontal: 20,
    marginVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  notificationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationIcon: {
    fontSize: 20,
  },
  notificationText: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    lineHeight: 20,
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 14,
  },
  notificationRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  completingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  completingText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default NotificationHistoryModal;
