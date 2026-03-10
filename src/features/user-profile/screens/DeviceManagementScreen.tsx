import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Animated,
  Platform,
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
import { versionedApiClient } from '@/services/VersionedApiClient';
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

interface Device {
  id: string;
  platform: string;
  push_token: string;
  updated_at: string;
  is_current: boolean;
}

export function DeviceManagementScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Edge swipe gesture handlers
  const edgeSwipeTranslateX = useRef(new Animated.Value(0)).current;
  const edgeSwipeOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    if (!user) return;

    try {
      const response = await versionedApiClient.getUserDevices();

      if (response.error) {
        throw new Error(
          response.message || response.error || 'Failed to load devices',
        );
      }

      // Mark current device (simplified - in production, match by push token)
      const devicesWithCurrent = (response.data || []).map((device, index) => ({
        ...device,
        is_current: index === 0, // First device (most recent) is assumed current
      }));

      setDevices(devicesWithCurrent);
    } catch (error: any) {
      console.error('Error loading devices:', error);
      Alert.alert('Error', error.message || 'Failed to load devices');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadDevices();
  };

  const revokeDevice = async (deviceId: string, isCurrent: boolean) => {
    if (isCurrent) {
      Alert.alert(
        'Cannot Remove Current Device',
        "You cannot remove the device you're currently using. Please use another device to remove this one.",
        [{ text: 'OK' }],
      );
      return;
    }

    Alert.alert(
      'Remove Device',
      "Are you sure you want to remove this device? You'll need to sign in again on that device.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await versionedApiClient.deleteDevice(deviceId);

              if (response.error) {
                throw new Error(
                  response.message ||
                    response.error ||
                    'Failed to remove device',
                );
              }

              Alert.alert('Success', 'Device removed successfully');
              loadDevices();
            } catch (error: any) {
              console.error('Error revoking device:', error);
              Alert.alert('Error', error.message || 'Failed to remove device');
            }
          },
        },
      ],
    );
  };

  const revokeAllDevices = () => {
    Alert.alert(
      'Remove All Other Devices',
      "This will sign out all devices except the one you're currently using. Are you sure?",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove All',
          style: 'destructive',
          onPress: async () => {
            try {
              const currentDevice = devices.find(d => d.is_current);
              const devicesToRemove = devices.filter(
                d => !d.is_current && d.id !== currentDevice?.id,
              );

              // Delete devices one by one using API
              const deletePromises = devicesToRemove.map(device =>
                versionedApiClient.deleteDevice(device.id),
              );

              const results = await Promise.allSettled(deletePromises);
              const failed = results.filter(
                r => r.status === 'rejected',
              ).length;

              if (failed > 0) {
                Alert.alert(
                  'Partial Success',
                  `Removed ${devicesToRemove.length - failed} of ${devicesToRemove.length} devices`,
                );
              } else {
                Alert.alert(
                  'Success',
                  'All other devices have been signed out',
                );
              }

              loadDevices();
            } catch (error: any) {
              console.error('Error revoking all devices:', error);
              Alert.alert('Error', error.message || 'Failed to remove devices');
            }
          },
        },
      ],
    );
  };

  const getDeviceIcon = (platform: string) => {
    const platformLower = platform?.toLowerCase() || '';
    if (platformLower.includes('ios') || platformLower.includes('iphone')) {
      return 'phone-portrait-outline';
    }
    if (platformLower.includes('android')) {
      return 'phone-portrait-outline';
    }
    if (platformLower.includes('web')) {
      return 'desktop-outline';
    }
    return 'hardware-chip-outline';
  };

  const handleEdgeSwipe = (event: GestureHandlerGestureEvent) => {
    const translationX = event.nativeEvent.translationX as number;
    if (translationX < -EDGE_SWIPE_THRESHOLD) {
      const progress = Math.min(1, Math.abs(translationX) / screenWidth);
      edgeSwipeTranslateX.setValue(translationX);
      edgeSwipeOpacity.setValue(1 - progress * 0.5);
    }
  };

  const handleEdgeSwipeEnd = (event: GestureHandlerStateChangeEvent) => {
    const translationX = event.nativeEvent.translationX as number;
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
  const bgColor = isDark ? '#101922' : '#F6F7F8';
  const surfaceColor = isDark ? '#1C252E' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#111418';
  const textSecondaryColor = isDark ? '#9CA3AF' : '#6B7280';
  const borderColor = isDark ? '#374151' : '#E5E7EB';

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
    return formatDate(date);
  };

  const renderDevice = ({ item }: { item: Device }) => (
    <View
      style={[
        styles.deviceCard,
        {
          backgroundColor: surfaceColor,
          borderColor: borderColor,
        },
      ]}>
      <View style={styles.deviceInfo}>
        <View
          style={[
            styles.deviceIconContainer,
            {
              backgroundColor: COLORS.primary + (isDark ? '30' : '20'),
            },
          ]}>
          <Ionicons
            name={getDeviceIcon(item.platform) as any}
            size={24}
            color={COLORS.primary}
          />
        </View>
        <View style={styles.deviceDetails}>
          <View style={styles.deviceHeader}>
            <Text style={[styles.deviceName, { color: textColor }]}>
              {item.platform || 'Unknown Device'}
            </Text>
            {item.is_current && (
              <View
                style={[
                  styles.currentBadge,
                  {
                    backgroundColor: '#10B981' + (isDark ? '30' : '20'),
                  },
                ]}>
                <Text style={styles.currentText}>Current</Text>
              </View>
            )}
          </View>
          <Text style={[styles.deviceTime, { color: textSecondaryColor }]}>
            Last active {formatDateRelative(item.updated_at)}
          </Text>
        </View>
      </View>

      {!item.is_current && (
        <TouchableOpacity
          style={styles.revokeButton}
          onPress={() => revokeDevice(item.id, item.is_current)}>
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
        </TouchableOpacity>
      )}
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
            <Ionicons name="arrow-back" size={20} color={textColor} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textColor }]}>
            Device Management
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Device Count */}
        <View style={styles.countContainer}>
          <Text style={[styles.countText, { color: textSecondaryColor }]}>
            {devices.length} {devices.length === 1 ? 'device' : 'devices'}{' '}
            signed in
          </Text>
        </View>

        {/* Device List */}
        <FlatList
          data={devices}
          renderItem={renderDevice}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.primary}
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
                name="phone-portrait-outline"
                size={48}
                color={textSecondaryColor}
              />
              <Text style={[styles.emptyText, { color: textSecondaryColor }]}>
                No devices found
              </Text>
            </View>
          }
        />

        {/* Remove All Button */}
        {devices.length > 1 && (
          <View
            style={[
              styles.footer,
              { paddingBottom: insets.bottom + SPACING.lg },
            ]}>
            <TouchableOpacity
              style={[
                styles.removeAllButton,
                {
                  borderColor: '#EF4444',
                  backgroundColor: surfaceColor,
                },
              ]}
              onPress={revokeAllDevices}>
              <Ionicons name="log-out-outline" size={20} color="#EF4444" />
              <Text style={styles.removeAllText}>
                Sign Out All Other Devices
              </Text>
            </TouchableOpacity>
          </View>
        )}
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
  countContainer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  countText: {
    fontSize: FONT_SIZES.sm,
  },
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: 100,
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    ...SHADOWS.xs,
  },
  deviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  deviceIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  deviceDetails: {
    flex: 1,
  },
  deviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  deviceName: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    marginRight: SPACING.sm,
  },
  currentBadge: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.xs,
  },
  currentText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semibold,
    color: '#10B981',
  },
  deviceTime: {
    fontSize: FONT_SIZES.sm,
  },
  revokeButton: {
    padding: SPACING.sm,
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
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.lg,
  },
  removeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    ...SHADOWS.sm,
  },
  removeAllText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: '#EF4444',
    marginLeft: SPACING.sm,
  },
});
