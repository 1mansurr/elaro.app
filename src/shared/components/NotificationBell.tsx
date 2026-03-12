import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useDeviceId } from '@/hooks/useDeviceId';
import { notificationHistoryService } from '@/services/notifications/NotificationHistoryService';

interface NotificationBellProps {
  onPress: () => void;
}

interface NotificationCount {
  count: number;
  lastUpdated: string;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  onPress,
}) => {
  const { theme } = useTheme();
  const deviceId = useDeviceId();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [badgeAnimation] = useState(new Animated.Value(1));

  useEffect(() => {
    if (!deviceId) return;
    loadUnreadCount();
  }, [deviceId]);

  const loadUnreadCount = async () => {
    if (!deviceId) return;

    try {
      setLoading(true);

      // Get unread count using the notification service
      const count = await notificationHistoryService.getUnreadCount(deviceId);
      setUnreadCount(count);

      // Animate badge if count changed
      if (count > 0) {
        badgeAnimation.setValue(1.2);
        Animated.spring(badgeAnimation, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }).start();
      }
    } catch (error) {
      // Silently handle Edge Function failures (backend issue)
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (
        errorMessage.includes('Function failed to start') ||
        errorMessage.includes('please check logs')
      ) {
        // Backend Edge Function issue - don't log as error
        if (__DEV__) {
          console.warn('⚠️ Notification service temporarily unavailable');
        }
      } else {
        console.error('Error loading unread count:', error);
      }
      setUnreadCount(0); // Default to 0 on error
    } finally {
      setLoading(false);
    }
  };

  const getResponsiveSpacing = () => {
    const { width } = Dimensions.get('window');
    // Scale spacing based on screen width (24px base for 375px width)
    return Math.max(16, (width / 375) * 24);
  };

  if (!deviceId) return null;

  return (
    <TouchableOpacity
      style={[styles.bellContainer, { marginLeft: getResponsiveSpacing() }]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityLabel="Notifications"
      accessibilityHint={`You have ${unreadCount} unread notifications`}
      accessibilityRole="button">
      <View style={styles.bellWrapper}>
        <Ionicons name="notifications-outline" size={32} color={theme.text} />

        {unreadCount > 0 && (
          <Animated.View
            style={[
              styles.badge,
              {
                backgroundColor: '#FF3B30',
                transform: [{ scale: badgeAnimation }],
              },
            ]}
            accessibilityLabel={`${unreadCount} unread notifications`}>
            <Text style={styles.badgeText}>
              {unreadCount > 99 ? '99+' : unreadCount.toString()}
            </Text>
          </Animated.View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  bellContainer: {
    position: 'relative',
    padding: 8,
  },
  bellWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default NotificationBell;
