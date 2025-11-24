import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { getNotificationAnalytics } from '@/utils/notificationQueue';

export function NotificationAnalyticsScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    if (!user) return;

    try {
      const data = await getNotificationAnalytics(user.id);
      setAnalytics(data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadAnalytics();
  };

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          styles.centered,
          { backgroundColor: theme.background },
        ]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  const getTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      spaced_repetition: 'SRS Reviews',
      assignment: 'Assignments',
      lecture: 'Lectures',
      study_session: 'Study Sessions',
      daily_summary: 'Daily Summary',
      evening_capture: 'Evening Reminder',
    };
    return labels[type] || type;
  };

  const getTypeIcon = (type: string): string => {
    const icons: Record<string, string> = {
      spaced_repetition: 'sync-outline',
      assignment: 'document-text-outline',
      lecture: 'school-outline',
      study_session: 'book-outline',
      daily_summary: 'sunny-outline',
      evening_capture: 'moon-outline',
    };
    return icons[type] || 'notifications-outline';
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Notification Analytics
        </Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
          />
        }>
        {analytics ? (
          <>
            {/* Overall Stats */}
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { backgroundColor: theme.card }]}>
                <Ionicons name="send-outline" size={24} color={theme.primary} />
                <Text style={[styles.statValue, { color: theme.text }]}>
                  {analytics.total_sent}
                </Text>
                <Text
                  style={[styles.statLabel, { color: theme.textSecondary }]}>
                  Total Sent
                </Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: theme.card }]}>
                <Ionicons name="eye-outline" size={24} color="#10B981" />
                <Text style={[styles.statValue, { color: theme.text }]}>
                  {analytics.total_opened}
                </Text>
                <Text
                  style={[styles.statLabel, { color: theme.textSecondary }]}>
                  Opened
                </Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: theme.card }]}>
                <Ionicons
                  name="stats-chart-outline"
                  size={24}
                  color="#F59E0B"
                />
                <Text style={[styles.statValue, { color: theme.text }]}>
                  {analytics.open_rate.toFixed(0)}%
                </Text>
                <Text
                  style={[styles.statLabel, { color: theme.textSecondary }]}>
                  Open Rate
                </Text>
              </View>
            </View>

            {/* By Type */}
            <View style={[styles.section, { backgroundColor: theme.card }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                By Notification Type
              </Text>

              {Object.entries(analytics.by_type).map(
                ([type, stats]: [string, any]) => (
                  <View key={type} style={styles.typeRow}>
                    <View
                      style={[
                        styles.typeIcon,
                        { backgroundColor: theme.primary + '20' },
                      ]}>
                      <Ionicons
                        name={getTypeIcon(type) as any}
                        size={20}
                        color={theme.primary}
                      />
                    </View>
                    <View style={styles.typeInfo}>
                      <Text style={[styles.typeName, { color: theme.text }]}>
                        {getTypeLabel(type)}
                      </Text>
                      <Text
                        style={[
                          styles.typeStats,
                          { color: theme.textSecondary },
                        ]}>
                        {stats.sent} sent • {stats.opened} opened
                        {stats.best_hour && ` • Best: ${stats.best_hour}:00`}
                      </Text>
                    </View>
                    <View style={styles.typeRate}>
                      <Text style={[styles.rateValue, { color: theme.text }]}>
                        {stats.open_rate?.toFixed(0) || 0}%
                      </Text>
                    </View>
                  </View>
                ),
              )}
            </View>

            {/* Insights */}
            <View
              style={[
                styles.infoBox,
                { backgroundColor: theme.primary + '10' },
              ]}>
              <Ionicons name="bulb-outline" size={20} color={theme.primary} />
              <View style={styles.infoContent}>
                <Text style={[styles.infoTitle, { color: theme.text }]}>
                  Insights
                </Text>
                <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                  {analytics.open_rate > 50
                    ? 'Great engagement! Your notifications are working well.'
                    : analytics.open_rate > 20
                      ? 'Good engagement. Consider adjusting notification timing for better results.'
                      : 'Low engagement. Try adjusting when notifications are sent or review your quiet hours settings.'}
                </Text>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons
              name="analytics-outline"
              size={64}
              color={theme.textSecondary}
            />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No analytics data yet
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
              Data will appear as you receive and interact with notifications
            </Text>
          </View>
        )}
      </ScrollView>
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
  content: {
    padding: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    textAlign: 'center',
  },
  section: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  typeInfo: {
    flex: 1,
  },
  typeName: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  typeStats: {
    fontSize: 13,
  },
  typeRate: {
    alignItems: 'flex-end',
  },
  rateValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  infoBox: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
  },
});
