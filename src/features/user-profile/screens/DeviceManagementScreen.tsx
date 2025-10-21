import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Platform } from 'react-native';

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
  const { theme } = useTheme();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_devices')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Mark current device (simplified - in production, match by push token)
      const devicesWithCurrent = data?.map((device, index) => ({
        ...device,
        is_current: index === 0, // First device (most recent) is assumed current
      })) || [];

      setDevices(devicesWithCurrent);
    } catch (error: any) {
      console.error('Error loading devices:', error);
      Alert.alert('Error', 'Failed to load devices');
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
        'You cannot remove the device you\'re currently using. Please use another device to remove this one.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Remove Device',
      'Are you sure you want to remove this device? You\'ll need to sign in again on that device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('user_devices')
                .delete()
                .eq('id', deviceId);

              if (error) throw error;

              Alert.alert('Success', 'Device removed successfully');
              loadDevices();
            } catch (error: any) {
              console.error('Error revoking device:', error);
              Alert.alert('Error', 'Failed to remove device');
            }
          },
        },
      ]
    );
  };

  const revokeAllDevices = () => {
    Alert.alert(
      'Remove All Other Devices',
      'This will sign out all devices except the one you\'re currently using. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove All',
          style: 'destructive',
          onPress: async () => {
            try {
              const currentDevice = devices.find(d => d.is_current);
              
              const { error } = await supabase
                .from('user_devices')
                .delete()
                .eq('user_id', user?.id)
                .neq('id', currentDevice?.id || '');

              if (error) throw error;

              Alert.alert('Success', 'All other devices have been signed out');
              loadDevices();
            } catch (error: any) {
              console.error('Error revoking all devices:', error);
              Alert.alert('Error', 'Failed to remove devices');
            }
          },
        },
      ]
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

  const formatDate = (dateString: string) => {
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
    return date.toLocaleDateString();
  };

  const renderDevice = ({ item }: { item: Device }) => (
    <View style={[styles.deviceCard, { backgroundColor: theme.card }]}>
      <View style={styles.deviceInfo}>
        <View style={[styles.deviceIconContainer, { backgroundColor: theme.primary + '20' }]}>
          <Ionicons
            name={getDeviceIcon(item.platform) as any}
            size={24}
            color={theme.primary}
          />
        </View>
        <View style={styles.deviceDetails}>
          <View style={styles.deviceHeader}>
            <Text style={[styles.deviceName, { color: theme.text }]}>
              {item.platform || 'Unknown Device'}
            </Text>
            {item.is_current && (
              <View style={[styles.currentBadge, { backgroundColor: '#10B981' + '20' }]}>
                <Text style={styles.currentText}>Current</Text>
              </View>
            )}
          </View>
          <Text style={[styles.deviceTime, { color: theme.textSecondary }]}>
            Last active {formatDate(item.updated_at)}
          </Text>
        </View>
      </View>
      
      {!item.is_current && (
        <TouchableOpacity
          style={styles.revokeButton}
          onPress={() => revokeDevice(item.id, item.is_current)}
        >
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Device Management
        </Text>
        <View style={styles.backButton} />
      </View>

      {/* Device Count */}
      <View style={styles.countContainer}>
        <Text style={[styles.countText, { color: theme.textSecondary }]}>
          {devices.length} {devices.length === 1 ? 'device' : 'devices'} signed in
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
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="phone-portrait-outline" size={48} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No devices found
            </Text>
          </View>
        }
      />

      {/* Remove All Button */}
      {devices.length > 1 && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.removeAllButton, { borderColor: '#EF4444' }]}
            onPress={revokeAllDevices}
          >
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            <Text style={styles.removeAllText}>Sign Out All Other Devices</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
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
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  countContainer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  countText: {
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
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
    marginRight: 12,
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
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  currentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  currentText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  deviceTime: {
    fontSize: 14,
  },
  revokeButton: {
    padding: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  removeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  removeAllText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
    marginLeft: 8,
  },
});

