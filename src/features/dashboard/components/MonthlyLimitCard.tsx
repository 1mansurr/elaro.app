import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';
import { COLORS } from '@/constants/theme';

interface MonthlyLimitCardProps {
  monthlyTaskCount: number;
  limit: number;
}

export const MonthlyLimitCard: React.FC<MonthlyLimitCardProps> = ({
  monthlyTaskCount,
  limit,
}) => {
  const { theme } = useTheme();
  const percentage = Math.min((monthlyTaskCount / limit) * 100, 100);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.isDark ? '#1E293B' : '#FFFFFF',
          borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : '#F3F4F6',
        },
      ]}>
      <View style={styles.header}>
        <View>
          <Text
            style={[
              styles.label,
              { color: theme.isDark ? '#9CA3AF' : '#637588' },
            ]}>
            MONTHLY LIMIT
          </Text>
          <Text style={[styles.countText, { color: theme.text }]}>
            <Text style={[styles.bold, { color: COLORS.primary }]}>
              {monthlyTaskCount}
            </Text>
            <Text
              style={[
                styles.limitText,
                { color: theme.isDark ? '#9CA3AF' : '#9CA3AF' },
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
            backgroundColor: theme.isDark ? '#374151' : '#F3F4F6',
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
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
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
    borderRadius: 6,
  },
  percentageText: {
    fontSize: 12,
    fontWeight: FONT_WEIGHTS.medium,
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
});
