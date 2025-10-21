import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

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
  const [history, setHistory] = useState<LoginRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadLoginHistory();
  }, []);

  const loadLoginHistory = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .rpc('get_recent_login_activity', {
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
    
    return date.toLocaleDateString('en-US', {
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
        { backgroundColor: theme.card },
        !item.success && styles.failedCard,
      ]}
    >
      <View style={styles.recordHeader}>
        <View
          style={[
            styles.statusIcon,
            {
              backgroundColor: item.success
                ? '#10B981' + '20'
                : '#EF4444' + '20',
            },
          ]}
        >
          <Ionicons
            name={item.success ? 'checkmark-circle' : 'close-circle'}
            size={24}
            color={item.success ? '#10B981' : '#EF4444'}
          />
        </View>
        <View style={styles.recordInfo}>
          <Text style={[styles.recordTitle, { color: theme.text }]}>
            {item.success ? 'Successful Login' : 'Failed Login Attempt'}
          </Text>
          <Text style={[styles.recordTime, { color: theme.textSecondary }]}>
            {formatDate(item.created_at)}
          </Text>
        </View>
      </View>

      <View style={styles.recordDetails}>
        {/* Method */}
        <View style={styles.detailRow}>
          <Ionicons
            name={getMethodIcon(item.method) as any}
            size={16}
            color={theme.textSecondary}
          />
          <Text style={[styles.detailText, { color: theme.textSecondary }]}>
            {item.method || 'Email'}
          </Text>
        </View>

        {/* Device */}
        {item.device_info && (
          <View style={styles.detailRow}>
            <Ionicons
              name={getDeviceIcon(item.device_info.platform) as any}
              size={16}
              color={theme.textSecondary}
            />
            <Text style={[styles.detailText, { color: theme.textSecondary }]}>
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
              color={theme.textSecondary}
            />
            <Text style={[styles.detailText, { color: theme.textSecondary }]}>
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
              color={theme.textSecondary}
            />
            <Text style={[styles.detailText, { color: theme.textSecondary }]}>
              {item.location}
            </Text>
          </View>
        )}
      </View>
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
          Login History
        </Text>
        <View style={styles.backButton} />
      </View>

      {/* Info Banner */}
      <View style={[styles.infoBanner, { backgroundColor: theme.primary + '20' }]}>
        <Ionicons name="shield-checkmark-outline" size={20} color={theme.primary} />
        <Text style={[styles.infoText, { color: theme.text }]}>
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
            tintColor={theme.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="time-outline" size={48} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No login history found
            </Text>
          </View>
        }
      />
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
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 24,
    marginBottom: 16,
    borderRadius: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    marginLeft: 12,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  recordCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  failedCard: {
    borderWidth: 1,
    borderColor: '#EF4444' + '40',
  },
  recordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  recordInfo: {
    flex: 1,
  },
  recordTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  recordTime: {
    fontSize: 14,
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
    fontSize: 14,
    marginLeft: 8,
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
});

