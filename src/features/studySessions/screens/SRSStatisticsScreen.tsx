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
import { getSRSStatistics } from '@/utils/reminderUtils';

interface SRSStats {
  total_reviews: number;
  average_quality: number;
  retention_rate: number;
  topics_reviewed: number;
  average_ease_factor: number;
  strongest_topics: Array<{
    session_id: string;
    topic: string;
    avg_quality: number;
    ease_factor: number;
  }>;
  weakest_topics: Array<{
    session_id: string;
    topic: string;
    avg_quality: number;
    ease_factor: number;
  }>;
}

export function SRSStatisticsScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { user } = useAuth();
  const [stats, setStats] = useState<SRSStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    if (!user) return;

    try {
      const data = await getSRSStatistics(user.id);
      setStats(data);
    } catch (error) {
      console.error('Error loading SRS statistics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadStatistics();
  };

  const getQualityColor = (quality: number): string => {
    if (quality >= 4.5) return '#10B981'; // Green
    if (quality >= 3.5) return '#FBBF24'; // Yellow
    if (quality >= 2.5) return '#F59E0B'; // Orange
    return '#EF4444'; // Red
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

  if (!stats) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            SRS Statistics
          </Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons
            name="analytics-outline"
            size={64}
            color={theme.textSecondary}
          />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            No SRS data yet
          </Text>
          <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
            Complete some spaced repetition reviews to see your statistics
          </Text>
        </View>
      </View>
    );
  }

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
          SRS Statistics
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
        {/* Overview Stats */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: theme.card }]}>
            <Ionicons name="sync-outline" size={24} color={theme.primary} />
            <Text style={[styles.statValue, { color: theme.text }]}>
              {stats.total_reviews}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
              Total Reviews
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: theme.card }]}>
            <Ionicons name="trending-up-outline" size={24} color="#10B981" />
            <Text style={[styles.statValue, { color: theme.text }]}>
              {stats.retention_rate.toFixed(0)}%
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
              Retention Rate
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: theme.card }]}>
            <Ionicons name="library-outline" size={24} color={theme.primary} />
            <Text style={[styles.statValue, { color: theme.text }]}>
              {stats.topics_reviewed}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
              Topics Reviewed
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: theme.card }]}>
            <Ionicons name="star-outline" size={24} color="#FBBF24" />
            <Text style={[styles.statValue, { color: theme.text }]}>
              {stats.average_quality.toFixed(1)}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
              Avg Quality
            </Text>
          </View>
        </View>

        {/* Strongest Topics */}
        {stats.strongest_topics && stats.strongest_topics.length > 0 && (
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="trophy-outline" size={20} color="#10B981" />
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Strongest Topics
              </Text>
            </View>
            {stats.strongest_topics.map((topic, index) => (
              <View key={topic.session_id} style={styles.topicRow}>
                <View style={styles.topicRank}>
                  <Text
                    style={[styles.rankText, { color: theme.textSecondary }]}>
                    {index + 1}
                  </Text>
                </View>
                <View style={styles.topicInfo}>
                  <Text style={[styles.topicName, { color: theme.text }]}>
                    {topic.topic}
                  </Text>
                  <Text
                    style={[styles.topicStats, { color: theme.textSecondary }]}>
                    Quality: {topic.avg_quality?.toFixed(1)} • Ease:{' '}
                    {topic.ease_factor?.toFixed(1)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.qualityBadge,
                    {
                      backgroundColor:
                        getQualityColor(topic.avg_quality) + '20',
                    },
                  ]}>
                  <Text
                    style={{
                      color: getQualityColor(topic.avg_quality),
                      fontWeight: '600',
                    }}>
                    {topic.avg_quality?.toFixed(1)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Weakest Topics */}
        {stats.weakest_topics && stats.weakest_topics.length > 0 && (
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="alert-circle-outline" size={20} color="#F59E0B" />
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Topics Needing Practice
              </Text>
            </View>
            {stats.weakest_topics.map((topic, index) => (
              <View key={topic.session_id} style={styles.topicRow}>
                <View style={styles.topicRank}>
                  <Text
                    style={[styles.rankText, { color: theme.textSecondary }]}>
                    {index + 1}
                  </Text>
                </View>
                <View style={styles.topicInfo}>
                  <Text style={[styles.topicName, { color: theme.text }]}>
                    {topic.topic}
                  </Text>
                  <Text
                    style={[styles.topicStats, { color: theme.textSecondary }]}>
                    Quality: {topic.avg_quality?.toFixed(1)} • Ease:{' '}
                    {topic.ease_factor?.toFixed(1)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.qualityBadge,
                    {
                      backgroundColor:
                        getQualityColor(topic.avg_quality) + '20',
                    },
                  ]}>
                  <Text
                    style={{
                      color: getQualityColor(topic.avg_quality),
                      fontWeight: '600',
                    }}>
                    {topic.avg_quality?.toFixed(1)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Info Box */}
        <View
          style={[styles.infoBox, { backgroundColor: theme.primary + '10' }]}>
          <Ionicons
            name="information-circle-outline"
            size={20}
            color={theme.primary}
          />
          <View style={styles.infoContent}>
            <Text style={[styles.infoTitle, { color: theme.text }]}>
              How SRS Works
            </Text>
            <Text style={[styles.infoText, { color: theme.textSecondary }]}>
              Our adaptive system adjusts review intervals based on your
              performance. Topics you find easy get longer intervals, while
              challenging topics are reviewed more frequently.
            </Text>
          </View>
        </View>
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
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  topicRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 14,
    fontWeight: '600',
  },
  topicInfo: {
    flex: 1,
  },
  topicName: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  topicStats: {
    fontSize: 13,
  },
  qualityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  infoBox: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
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
