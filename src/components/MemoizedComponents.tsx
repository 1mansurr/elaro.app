import React, { memo, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_WEIGHTS } from '@/constants/theme';

/**
 * Memoized list item component
 * Only re-renders when id or title changes
 */
export const MemoizedListItem = memo<{
  id: string;
  title: string;
  subtitle: string;
  onPress: (id: string) => void;
  icon?: string;
  badge?: number;
}>(({ id, title, subtitle, onPress, icon, badge }) => {
  const handlePress = useCallback(() => {
    onPress(id);
  }, [id, onPress]);

  return (
    <TouchableOpacity style={styles.listItem} onPress={handlePress}>
      {icon && (
        <Ionicons name={icon as any} size={20} color="COLORS.textSecondary" style={styles.icon} />
      )}
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      {badge && badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  // Only re-render if id, title, or badge changes
  return (
    prevProps.id === nextProps.id &&
    prevProps.title === nextProps.title &&
    prevProps.badge === nextProps.badge
  );
});

MemoizedListItem.displayName = 'MemoizedListItem';

/**
 * Memoized card component with deep equality check
 * Prevents re-renders when data object structure is the same
 */
export const MemoizedCard = memo<{
  data: {
    id: string;
    title: string;
    content: string;
    image?: string;
    timestamp: number;
  };
  onAction: (data: any) => void;
  onPress?: (data: any) => void;
}>(({ data, onAction, onPress }) => {
  const handleAction = useCallback(() => {
    onAction(data);
  }, [data, onAction]);

  const handlePress = useCallback(() => {
    onPress?.(data);
  }, [data, onPress]);

  const formattedTime = useMemo(() => {
    return new Date(data.timestamp).toLocaleDateString();
  }, [data.timestamp]);

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress}>
      {data.image && (
        <Image source={{ uri: data.image }} style={styles.cardImage} />
      )}
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{data.title}</Text>
        <Text style={styles.cardText}>{data.content}</Text>
        <Text style={styles.cardTime}>{formattedTime}</Text>
      </View>
      <TouchableOpacity style={styles.actionButton} onPress={handleAction}>
        <Ionicons name="ellipsis-horizontal" size={20} color="COLORS.textSecondary" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  // Deep equality check for data object
  return JSON.stringify(prevProps.data) === JSON.stringify(nextProps.data);
});

MemoizedCard.displayName = 'MemoizedCard';

/**
 * Memoized search result component
 * Optimized for search results with filtering
 */
export const MemoizedSearchResult = memo<{
  item: {
    id: string;
    title: string;
    description: string;
    type: 'course' | 'assignment' | 'lecture' | 'study-session';
    score: number;
  };
  onSelect: (item: any) => void;
  isSelected?: boolean;
}>(({ item, onSelect, isSelected = false }) => {
  const handleSelect = useCallback(() => {
    onSelect(item);
  }, [item, onSelect]);

  const getTypeIcon = useCallback((type: string) => {
    switch (type) {
      case 'course': return 'book-outline';
      case 'assignment': return 'document-text-outline';
      case 'lecture': return 'play-outline';
      case 'study-session': return 'time-outline';
      default: return 'help-outline';
    }
  }, []);

  const getTypeColor = useCallback((type: string) => {
    switch (type) {
      case 'course': return COLORS.success;
      case 'assignment': return COLORS.warning;
      case 'lecture': return COLORS.primary;
      case 'study-session': return COLORS.purple;
      default: return COLORS.textSecondary;
    }
  }, []);

  return (
    <TouchableOpacity
      style={[
        styles.searchResult,
        isSelected && styles.searchResultSelected
      ]}
      onPress={handleSelect}
    >
      <View style={styles.searchResultLeft}>
        <View style={[styles.typeIcon, { backgroundColor: getTypeColor(item.type) }]}>
          <Ionicons 
            name={getTypeIcon(item.type) as any} 
            size={16} 
            color="white" 
          />
        </View>
        <View style={styles.searchResultContent}>
          <Text style={styles.searchResultTitle}>{item.title}</Text>
          <Text style={styles.searchResultDescription}>{item.description}</Text>
        </View>
      </View>
      <View style={styles.searchResultRight}>
        <Text style={styles.scoreText}>{Math.round(item.score * 100)}%</Text>
      </View>
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  // Only re-render if item data or selection state changes
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.isSelected === nextProps.isSelected
  );
});

MemoizedSearchResult.displayName = 'MemoizedSearchResult';

/**
 * Memoized notification item component
 * Optimized for notification lists with real-time updates
 */
export const MemoizedNotificationItem = memo<{
  notification: {
    id: string;
    title: string;
    body: string;
    type: string;
    timestamp: number;
    isRead: boolean;
    actionUrl?: string;
  };
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  onPress: (notification: any) => void;
}>(({ notification, onMarkAsRead, onDelete, onPress }) => {
  const handleMarkAsRead = useCallback(() => {
    onMarkAsRead(notification.id);
  }, [notification.id, onMarkAsRead]);

  const handleDelete = useCallback(() => {
    onDelete(notification.id);
  }, [notification.id, onDelete]);

  const handlePress = useCallback(() => {
    onPress(notification);
  }, [notification, onPress]);

  const formattedTime = useMemo(() => {
    const now = Date.now();
    const diff = now - notification.timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }, [notification.timestamp]);

  const getTypeIcon = useMemo(() => {
    switch (notification.type) {
      case 'assignment': return 'document-text-outline';
      case 'lecture': return 'play-outline';
      case 'study-session': return 'time-outline';
      case 'reminder': return 'alarm-outline';
      default: return 'notifications-outline';
    }
  }, [notification.type]);

  return (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !notification.isRead && styles.notificationItemUnread
      ]}
      onPress={handlePress}
    >
      <View style={styles.notificationLeft}>
        <Ionicons name={getTypeIcon as any} size={20} color="COLORS.textSecondary" />
        <View style={styles.notificationContent}>
          <Text style={styles.notificationTitle}>{notification.title}</Text>
          <Text style={styles.notificationBody}>{notification.body}</Text>
          <Text style={styles.notificationTime}>{formattedTime}</Text>
        </View>
      </View>
      <View style={styles.notificationActions}>
        {!notification.isRead && (
          <TouchableOpacity onPress={handleMarkAsRead} style={styles.actionButton}>
            <Ionicons name="checkmark" size={16} color={COLORS.success} />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={handleDelete} style={styles.actionButton}>
          <Ionicons name="trash-outline" size={16} color="COLORS.error" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  // Only re-render if notification data changes
  return (
    prevProps.notification.id === nextProps.notification.id &&
    prevProps.notification.isRead === nextProps.notification.isRead
  );
});

MemoizedNotificationItem.displayName = 'MemoizedNotificationItem';

const styles = StyleSheet.create({
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
    backgroundColor: COLORS.white,
  },
  icon: {
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: FONT_WEIGHTS.semibold as any,
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  badge: {
    backgroundColor: COLORS.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: FONT_WEIGHTS.semibold as any,
  },
  card: {
    flexDirection: 'row',
    padding: 16,
    margin: 8,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    shadowColor: 'COLORS.black',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: FONT_WEIGHTS.bold as any,
    marginBottom: 4,
    color: COLORS.textPrimary,
  },
  cardText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  cardTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  searchResult: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  searchResultSelected: {
    backgroundColor: 'COLORS.blue50',
  },
  searchResultLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  typeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  searchResultContent: {
    flex: 1,
  },
  searchResultTitle: {
    fontSize: 16,
    fontWeight: FONT_WEIGHTS.semibold as any,
    color: COLORS.textPrimary,
  },
  searchResultDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  searchResultRight: {
    alignItems: 'flex-end',
  },
  scoreText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHTS.semibold as any,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
    backgroundColor: COLORS.white,
  },
  notificationItemUnread: {
    backgroundColor: COLORS.backgroundSecondary,
    borderLeftWidth: 4,
    borderLeftColor: 'COLORS.primary',
  },
  notificationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  notificationContent: {
    flex: 1,
    marginLeft: 12,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: FONT_WEIGHTS.semibold as any,
    color: COLORS.textPrimary,
  },
  notificationBody: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  notificationTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  notificationActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
