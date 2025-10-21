// FILE: src/components/TodayOverviewCard.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface OverviewData {
  lectures: number;
  studySessions: number;
  assignments: number;
  reviews: number;
}

interface Props {
  overview: OverviewData | null;
  monthlyTaskCount: number;
  subscriptionTier: 'free' | 'oddity' | null;
}

const StatItem: React.FC<{ label: string; count: number }> = ({ label, count }) => (
  <View style={styles.statItem}>
    <Text style={styles.statCount}>{count}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const TodayOverviewCard: React.FC<Props> = ({ overview, monthlyTaskCount, subscriptionTier }) => {
  const TASK_LIMITS = {
    free: 15,
    oddity: 70,
  };

  let limitText;
  if (subscriptionTier === 'free') {
    limitText = (
      <Text style={styles.limitText}>
        of <Text style={styles.bold}>{TASK_LIMITS.free}</Text> activities used this month
      </Text>
    );
  } else if (subscriptionTier === 'oddity') {
    limitText = (
      <Text style={styles.limitText}>
        of <Text style={styles.bold}>{TASK_LIMITS.oddity}</Text> activities used this month
      </Text>
    );
  } else {
    // Fallback for any other case (e.g., null, or future tiers)
    limitText = <Text style={styles.limitText}>activities used this month</Text>;
  }

  return (
    <View style={styles.card}>
      <Text style={styles.header}>Today at a Glance</Text>
      
      <View style={styles.statsRow}>
        <View style={styles.statCompact}>
          <Text style={styles.statCountCompact}>{overview?.lectures || 0}</Text>
          <Text style={styles.statLabelCompact}>Lectures</Text>
        </View>
        <View style={styles.statCompact}>
          <Text style={styles.statCountCompact}>{overview?.studySessions || 0}</Text>
          <Text style={styles.statLabelCompact}>Study</Text>
        </View>
        <View style={styles.statCompact}>
          <Text style={styles.statCountCompact}>{overview?.assignments || 0}</Text>
          <Text style={styles.statLabelCompact}>Assignments</Text>
        </View>
        <View style={styles.statCompact}>
          <Text style={styles.statCountCompact}>{overview?.reviews || 0}</Text>
          <Text style={styles.statLabelCompact}>Reviews</Text>
        </View>
      </View>
      
      <View style={styles.monthlyCountContainer}>
        <Text style={styles.monthlyCountText}>
          <Text style={styles.bold}>{monthlyTaskCount} </Text>
          {limitText}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#E8E8ED',
  },
  header: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statCompact: {
    alignItems: 'center',
  },
  statCountCompact: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  statLabelCompact: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 2,
  },
  monthlyCountContainer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E8E8ED',
    alignItems: 'center',
  },
  monthlyCountText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  limitText: {
    color: '#8E8E93',
  },
  bold: {
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
});

export default TodayOverviewCard;
