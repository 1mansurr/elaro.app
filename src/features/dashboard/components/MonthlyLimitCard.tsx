import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import {
  FONT_SIZES,
  FONT_WEIGHTS,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
  COLORS,
} from '@/constants/theme';

interface MonthlyLimitCardProps {
  monthlyTaskCount: number;
  limit: number;
}

export const MonthlyLimitCard: React.FC<MonthlyLimitCardProps> = ({
  monthlyTaskCount,
  limit,
}) => {
  const { theme, isDark } = useTheme();
  const percentage = Math.min((monthlyTaskCount / limit) * 100, 100);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#F3F4F6',
        },
      ]}>
      <View style={styles.header}>
        <View>
          <Text
            style={[styles.label, { color: isDark ? '#9CA3AF' : '#637588' }]}>
            MONTHLY LIMIT
          </Text>
          <Text style={[styles.countText, { color: theme.text }]}>
            <Text style={[styles.bold, { color: COLORS.primary }]}>
              {monthlyTaskCount}
            </Text>
            <Text
              style={[
                styles.limitText,
                { color: isDark ? '#9CA3AF' : '#9CA3AF' },
              ]}>
              {' '}
              / {limit} tasks used
            </Text>
          </Text>
        </View>
        <View
          style={[
            styles.percentageBadge,
            {
              backgroundColor: COLORS.primary + '1A',
            },
          ]}>
          <Text style={[styles.percentageText, { color: COLORS.primary }]}>
            {Math.round(percentage)}%
          </Text>
        </View>
      </View>
      <View
        style={[
          styles.progressBarContainer,
          {
            backgroundColor: isDark ? '#374151' : '#F3F4F6',
          },
        ]}>
        <View
          style={[
            styles.progressBar,
            {
              width: `${percentage}%`,
              backgroundColor: COLORS.primary,
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    ...SHADOWS.xs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: FONT_WEIGHTS.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  countText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },
  bold: {
    fontWeight: FONT_WEIGHTS.bold,
  },
  limitText: {
    fontSize: FONT_SIZES.sm,
  },
  percentageBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  percentageText: {
    fontSize: 12,
    fontWeight: FONT_WEIGHTS.medium,
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    borderRadius: BORDER_RADIUS.xs,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: BORDER_RADIUS.xs,
  },
});
