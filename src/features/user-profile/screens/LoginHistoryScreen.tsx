import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import {
  PanGestureHandler,
  State,
  GestureHandlerGestureEvent,
  GestureHandlerStateChangeEvent,
} from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { formatDate } from '@/i18n';
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

interface LoginRecord {
  id: string;
  success: boolean;
  method: string;
  ip_address: string;
  device_info: {
    platform?: string;
    version?: string;
  };
  location: string;
  created_at: string;
}

export function LoginHistoryScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [history, setHistory] = useState<LoginRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Edge swipe gesture handlers
  const edgeSwipeTranslateX = useRef(new Animated.Value(0)).current;
  const edgeSwipeOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadLoginHistory();
  }, []);

  const loadLoginHistory = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('get_recent_login_activity', {
        p_user_id: user.id,
        p_limit: 50,
      });

      if (error) throw error;

      setHistory(data || []);
    } catch (error: any) {
      console.error('Error loading login history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadLoginHistory();
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

  const formatDateRelative = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return formatDate(date, {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'email':
        return 'mail-outline';
      case 'oauth':
      case 'google':
        return 'logo-google';
      case 'apple':
        return 'logo-apple';
      case 'biometric':
        return 'finger-print-outline';
      default:
        return 'log-in-outline';
    }
  };

  const getDeviceIcon = (platform?: string) => {
    const platformLower = platform?.toLowerCase() || '';
    if (platformLower.includes('ios')) return 'logo-apple';
    if (platformLower.includes('android')) return 'logo-android';
    if (platformLower.includes('web')) return 'desktop-outline';
    return 'phone-portrait-outline';
  };

  const renderLoginRecord = ({ item }: { item: LoginRecord }) => (
    <View
      style={[
        styles.recordCard,
        {
          backgroundColor: surfaceColor,
          borderColor: !item.success ? '#EF4444' + '40' : borderColor,
        },
        !item.success && styles.failedCard,
      ]}>
      <View style={styles.recordHeader}>
        <View
          style={[
            styles.statusIcon,
            {
              backgroundColor: item.success
                ? '#10B981' + (theme.isDark ? '30' : '20')
                : '#EF4444' + (theme.isDark ? '30' : '20'),
            },
          ]}>
          <Ionicons
            name={item.success ? 'checkmark-circle' : 'close-circle'}
            size={24}
            color={item.success ? '#10B981' : '#EF4444'}
          />
        </View>
        <View style={styles.recordInfo}>
          <Text style={[styles.recordTitle, { color: textColor }]}>
            {item.success ? 'Successful Login' : 'Failed Login Attempt'}
          </Text>
          <Text style={[styles.recordTime, { color: textSecondaryColor }]}>
            {formatDateRelative(item.created_at)}
          </Text>
        </View>
      </View>

      <View style={styles.recordDetails}>
        {/* Method */}
        <View style={styles.detailRow}>
          <Ionicons
            name={getMethodIcon(item.method) as any}
            size={16}
            color={textSecondaryColor}
          />
          <Text style={[styles.detailText, { color: textSecondaryColor }]}>
            {item.method || 'Email'}
          </Text>
        </View>

        {/* Device */}
        {item.device_info && (
          <View style={styles.detailRow}>
            <Ionicons
              name={getDeviceIcon(item.device_info.platform) as any}
              size={16}
              color={textSecondaryColor}
            />
            <Text style={[styles.detailText, { color: textSecondaryColor }]}>
              {item.device_info.platform || 'Unknown Device'}
              {item.device_info.version ? ` ${item.device_info.version}` : ''}
            </Text>
          </View>
        )}

        {/* IP Address */}
        {item.ip_address && (
          <View style={styles.detailRow}>
            <Ionicons
              name="globe-outline"
              size={16}
              color={textSecondaryColor}
            />
            <Text style={[styles.detailText, { color: textSecondaryColor }]}>
              {item.ip_address}
            </Text>
          </View>
        )}

        {/* Location */}
        {item.location && (
          <View style={styles.detailRow}>
            <Ionicons
              name="location-outline"
              size={16}
              color={textSecondaryColor}
            />
            <Text style={[styles.detailText, { color: textSecondaryColor }]}>
              {item.location}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          styles.centered,
          {
            backgroundColor: bgColor,
            paddingTop: insets.top,
          },
        ]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

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
            Login History
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Info Banner */}
        <View
          style={[
            styles.infoBanner,
            {
              backgroundColor: theme.isDark
                ? 'rgba(59, 130, 246, 0.1)'
                : '#F0F5FF',
            },
          ]}>
          <Ionicons
            name="shield-checkmark-outline"
            size={20}
            color={COLORS.primary}
          />
          <Text
            style={[
              styles.infoText,
              { color: theme.isDark ? '#93C5FD' : COLORS.primary },
            ]}>
            Monitor your account activity for suspicious logins
          </Text>
        </View>

        {/* History List */}
        <FlatList
          data={history}
          renderItem={renderLoginRecord}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.primary}
            />
          }
          // Performance optimizations
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
          updateCellsBatchingPeriod={50}
          initialNumToRender={10}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons
                name="time-outline"
                size={48}
                color={textSecondaryColor}
              />
              <Text style={[styles.emptyText, { color: textSecondaryColor }]}>
                No login history found
              </Text>
            </View>
          }
        />
      </Animated.View>
    </PanGestureHandler>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    flex: 1,
    textAlign: 'center',
    paddingRight: 40,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
    ...SHADOWS.xs,
  },
  infoText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
  },
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  recordCard: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    ...SHADOWS.xs,
  },
  failedCard: {
    borderWidth: 1,
  },
  recordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  recordInfo: {
    flex: 1,
  },
  recordTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    marginBottom: 2,
  },
  recordTime: {
    fontSize: FONT_SIZES.sm,
  },
  recordDetails: {
    paddingLeft: 52,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    fontSize: FONT_SIZES.sm,
    marginLeft: SPACING.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    marginTop: SPACING.md,
  },
});
