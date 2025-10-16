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
      <Text style={styles.header}>Today&apos;s Overview</Text>
      
      <View style={styles.statsGrid}>
        <StatItem label="Lectures" count={overview?.lectures || 0} />
        <StatItem label="Study Sessions" count={overview?.studySessions || 0} />
        <StatItem label="Assignments" count={overview?.assignments || 0} />
        <StatItem label="Reviews" count={overview?.reviews || 0} />
      </View>
      
      <View style={styles.divider} />
      
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
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  header: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6c757d',
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 20,
  },
  statCount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#343a40',
  },
  statLabel: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 4,
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#e9ecef',
    marginVertical: 8,
  },
  monthlyCountContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    alignItems: 'center',
  },
  monthlyCountText: {
    fontSize: 14,
    color: '#495057',
    fontStyle: 'italic',
  },
  limitText: {
    color: '#6D6D72', // A slightly lighter color for the non-bold part
  },
  bold: {
    fontWeight: 'bold',
  },
});

export default TodayOverviewCard;
