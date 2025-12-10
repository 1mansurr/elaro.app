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
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  NotificationHistoryItem,
  NotificationFilter,
  notificationHistoryService,
} from '@/services/notifications/NotificationHistoryService';
import { formatDate } from '@/i18n';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';

interface NotificationHistoryModalProps {
  isVisible: boolean;
  onClose: () => void;
}

const { width: screenWidth } = Dimensions.get('window');
const SWIPE_THRESHOLD = screenWidth * 0.3; // 30% of screen width for completion
const EDGE_SWIPE_THRESHOLD = 50; // Pixels from right edge to trigger back

// Map Material Symbols to Ionicons
const getFilterIcon = (type: string): keyof typeof Ionicons.glyphMap => {
  switch (type) {
    case 'all':
      return 'notifications-outline';
    case 'assignments':
      return 'document-text-outline';
    case 'lectures':
      return 'school-outline';
    case 'study_sessions':
      return 'people-outline';
    case 'analytics':
      return 'stats-chart-outline';
    case 'summaries':
      return 'document-text-outline';
    default:
      return 'notifications-outline';
  }
};

export const NotificationHistoryModal: React.FC<
  NotificationHistoryModalProps
> = ({ isVisible, onClose }) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
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

  // Swipe from right edge to go back
  const edgeSwipeTranslateX = useRef(new Animated.Value(0)).current;
  const edgeSwipeOpacity = useRef(new Animated.Value(1)).current;

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
        return '🧑‍🏫';
      case 'srs':
      case 'study_session':
      case 'srs_reminder':
        return '👥';
      case 'weekly_report':
      case 'analytics':
        return '📊';
      case 'daily_summary':
      case 'achievement':
      case 'update':
        return '📊';
      default:
        return '🔔';
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

  const isTaskNotification = (type: string) => {
    return (
      type === 'assignment' ||
      type === 'assignment_reminder' ||
      type === 'srs' ||
      type === 'study_session'
    );
  };

  // Handle swipe from right edge to go back
  const handleEdgeSwipe = (event: GestureHandlerGestureEvent) => {
    const { translationX, x } = event.nativeEvent;
    // Check if swipe starts from right edge (within 20px of right edge)
    if (x > screenWidth - 20 && translationX < 0) {
      const progress = Math.min(1, Math.abs(translationX) / screenWidth);
      edgeSwipeTranslateX.setValue(translationX);
      edgeSwipeOpacity.setValue(1 - progress * 0.5);
    }
  };

  const handleEdgeSwipeEnd = (event: GestureHandlerStateChangeEvent) => {
    if (event.nativeEvent.state === State.END) {
      const { translationX } = event.nativeEvent;
      if (Math.abs(translationX) > EDGE_SWIPE_THRESHOLD) {
        // Animate out and close
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
          onClose();
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
    }
  };

  if (!isVisible) return null;

  // Light mode default colors
  const bgColor = theme.isDark ? '#101922' : '#F6F7F8';
  const surfaceColor = theme.isDark ? 'rgba(30, 41, 59, 0.5)' : '#FFFFFF';
  const textColor = theme.isDark ? '#FFFFFF' : '#111418';
  const textSecondaryColor = theme.isDark ? '#9CA3AF' : '#6B7280';
  const borderColor = theme.isDark ? '#374151' : '#E5E7EB';

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}>
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
                paddingTop: insets.top + SPACING.md,
              },
            ]}>
            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.closeButton,
                {
                  backgroundColor: theme.isDark
                    ? 'rgba(255, 255, 255, 0.1)'
                    : 'transparent',
                },
              ]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={textColor} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: textColor }]}>
              Notifications
            </Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Filter Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterContainer}
            contentContainerStyle={styles.filterContent}>
            {filters.map((filter: NotificationFilter) => {
              const isActive = activeFilter === filter.type;
              return (
                <TouchableOpacity
                  key={filter.type}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: isActive
                        ? COLORS.primary
                        : theme.isDark
                          ? '#1F2937'
                          : '#E5E7EB',
                    },
                  ]}
                  onPress={() => setActiveFilter(filter.type)}>
                  <Ionicons
                    name={getFilterIcon(filter.type)}
                    size={20}
                    color={isActive ? '#FFFFFF' : textSecondaryColor}
                  />
                  <Text
                    style={[
                      styles.filterText,
                      {
                        color: isActive ? '#FFFFFF' : textSecondaryColor,
                      },
                    ]}>
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Mark All as Read Button */}
          {hasUnread && (
            <View style={styles.markAllContainer}>
              <TouchableOpacity
                style={styles.markAllButton}
                onPress={handleMarkAllAsRead}>
                <Text style={[styles.markAllText, { color: COLORS.primary }]}>
                  Mark All as Read
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Notifications List */}
          <ScrollView
            style={styles.notificationsList}
            contentContainerStyle={styles.notificationsContent}
            showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <Text style={[styles.loadingText, { color: textSecondaryColor }]}>
                  Loading notifications...
                </Text>
              </View>
            ) : filteredNotifications.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons
                  name="notifications-outline"
                  size={48}
                  color={textSecondaryColor}
                />
                <Text style={[styles.emptyTitle, { color: textColor }]}>
                  You have no notifications...
                </Text>
              </View>
            ) : (
              filteredNotifications.map(notification => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={() => handleMarkAsRead(notification.id)}
                  onCompleteTask={() => handleCompleteTask(notification.id)}
                  isTask={isTaskNotification(notification.notification_type)}
                  getIcon={getNotificationIcon}
                  formatTimestamp={formatTimestamp}
                  surfaceColor={surfaceColor}
                  textColor={textColor}
                  textSecondaryColor={textSecondaryColor}
                  borderColor={borderColor}
                />
              ))
            )}
          </ScrollView>
        </Animated.View>
      </PanGestureHandler>
    </Modal>
  );
};

// ============================================================================
// NOTIFICATION ITEM COMPONENT
// ============================================================================

interface NotificationItemProps {
  notification: NotificationHistoryItem;
  onMarkAsRead: () => void;
  onCompleteTask: () => void;
  isTask: boolean;
  getIcon: (type: string) => string;
  formatTimestamp: (timestamp: string) => string;
  surfaceColor: string;
  textColor: string;
  textSecondaryColor: string;
  borderColor: string;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkAsRead,
  onCompleteTask,
  isTask,
  getIcon,
  formatTimestamp,
  surfaceColor,
  textColor,
  textSecondaryColor,
  borderColor,
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const swipeActionOpacity = useRef(new Animated.Value(0)).current;
  const [isCompleting, setIsCompleting] = useState(false);

  const isRead = !!notification.opened_at;
  const icon = getIcon(notification.notification_type);

  const handleSwipe = (event: GestureHandlerGestureEvent) => {
    if (!isTask) return;

    const { translationX } = event.nativeEvent;
    if (translationX < 0) {
      // Right to left swipe
      const progress = Math.min(1, Math.abs(translationX) / SWIPE_THRESHOLD);
      translateX.setValue(translationX);
      swipeActionOpacity.setValue(progress);
    }
  };

  const handleSwipeEnd = (event: GestureHandlerStateChangeEvent) => {
    if (event.nativeEvent.state === State.END) {
      const { translationX } = event.nativeEvent;
      if (Math.abs(translationX) > SWIPE_THRESHOLD && isTask) {
        // Complete task
        setIsCompleting(true);
        onCompleteTask();
        onMarkAsRead();
        // Animate out
        Animated.timing(translateX, {
          toValue: -screenWidth,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          // Reset after animation
          setTimeout(() => {
            translateX.setValue(0);
            swipeActionOpacity.setValue(0);
            setIsCompleting(false);
          }, 100);
        });
      } else {
        // Snap back
        Animated.parallel([
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            friction: 7,
          }),
          Animated.spring(swipeActionOpacity, {
            toValue: 0,
            useNativeDriver: true,
            friction: 7,
          }),
        ]).start();
      }
    }
  };

  const handleTap = () => {
    if (!isRead) {
      onMarkAsRead();
    }
  };

  return (
    <View style={styles.notificationWrapper}>
      {/* Swipe Action Background */}
      {isTask && (
        <Animated.View
          style={[
            styles.swipeActionBackground,
            {
              opacity: swipeActionOpacity,
              backgroundColor: COLORS.primary,
            },
          ]}>
          <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
          <Text style={styles.swipeActionText}>Complete</Text>
        </Animated.View>
      )}

      <PanGestureHandler
        onGestureEvent={handleSwipe}
        onHandlerStateChange={handleSwipeEnd}
        enabled={isTask}
        activeOffsetX={-10}>
        <Animated.View
          style={[
            styles.notificationItem,
            {
              backgroundColor: surfaceColor,
              borderColor: borderColor,
              transform: [{ translateX }],
            },
          ]}>
          <TouchableOpacity
            style={styles.notificationContent}
            onPress={handleTap}
            activeOpacity={0.7}>
            {/* Unread Indicator */}
            <View
              style={[
                styles.unreadIndicator,
                {
                  backgroundColor: isRead ? 'transparent' : COLORS.primary,
                },
              ]}
            />

            <View style={styles.notificationLeft}>
              {/* Icon */}
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: surfaceColor === '#FFFFFF' ? '#E5E7EB' : '#374151',
                  },
                ]}>
                <Text style={styles.notificationIcon}>{icon}</Text>
              </View>

              {/* Text Content */}
              <View style={styles.notificationText}>
                <Text
                  style={[
                    styles.notificationTitle,
                    {
                      color: textColor,
                      fontWeight: isRead ? FONT_WEIGHTS.medium : FONT_WEIGHTS.bold,
                    },
                  ]}
                  numberOfLines={1}>
                  {notification.title}
                </Text>
                <Text
                  style={[
                    styles.notificationSubtitle,
                    { color: textSecondaryColor },
                  ]}>
                  {formatTimestamp(notification.sent_at)}
                </Text>
              </View>
            </View>

            {/* Chevron */}
            <Ionicons
              name="chevron-forward"
              size={24}
              color={textSecondaryColor}
            />
          </TouchableOpacity>
        </Animated.View>
      </PanGestureHandler>
    </View>
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
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: FONT_WEIGHTS.bold,
    flex: 1,
    textAlign: 'center',
    paddingRight: 40,
  },
  headerSpacer: {
    width: 40,
  },
  filterContainer: {
    paddingVertical: SPACING.sm,
  },
  filterContent: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 40,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    flexShrink: 0,
  },
  filterText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },
  markAllContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  markAllButton: {
    height: 32,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  markAllText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    letterSpacing: 0.5,
  },
  notificationsList: {
    flex: 1,
  },
  notificationsContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: FONT_SIZES.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    marginTop: SPACING.md,
  },
  notificationWrapper: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 12,
  },
  swipeActionBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: SPACING.lg,
    gap: SPACING.sm,
    zIndex: 1,
  },
  swipeActionText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  notificationItem: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    gap: SPACING.md,
  },
  unreadIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    flexShrink: 0,
  },
  notificationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: SPACING.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  notificationIcon: {
    fontSize: 18,
  },
  notificationText: {
    flex: 1,
    minWidth: 0,
  },
  notificationTitle: {
    fontSize: FONT_SIZES.md,
    lineHeight: 20,
    marginBottom: 2,
  },
  notificationSubtitle: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 18,
  },
});

export default NotificationHistoryModal;
