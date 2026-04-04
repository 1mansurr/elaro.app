import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  COLORS,
  FONT_SIZES,
  FONT_WEIGHTS,
  SPACING,
  BORDER_RADIUS,
} from '@/constants/theme';
import { QuizAttempt } from '@/types';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const AttemptHistoryRow: React.FC<{ attempt: QuizAttempt }> = ({ attempt }) => (
  <View style={styles.row}>
    <View style={styles.left}>
      <Text style={styles.date}>{formatDate(attempt.attempted_at)}</Text>
      {attempt.is_retake === 1 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Retake</Text>
        </View>
      )}
    </View>
    <View style={styles.right}>
      <Text style={styles.score}>
        {attempt.score} / {attempt.total}
      </Text>
      <Text style={styles.percentage}>{Math.round(attempt.percentage)}%</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  date: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textPrimary,
  },
  badge: {
    backgroundColor: `${COLORS.primary}18`,
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.xs + 2,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.primary,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  right: {
    alignItems: 'flex-end',
  },
  score: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textPrimary,
  },
  percentage: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
});

export default AttemptHistoryRow;
