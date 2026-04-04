import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import {
  FONT_SIZES,
  FONT_WEIGHTS,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
} from '@/constants/theme';
import { TASK_TYPE_COLORS } from '@/constants/taskTypes';
import { TaskTypeDefinition } from '@/types';

interface OverviewData {
  lectures: number;
  studySessions: number;
  assignments: number;
  reviews: number;
}

export interface CustomTypeCount {
  typeDef: TaskTypeDefinition;
  count: number;
}

interface TodayOverviewGridProps {
  overview: OverviewData | null;
  customTypeCounts?: CustomTypeCount[];
}

const StatCard: React.FC<{
  label: string;
  count: number;
  icon: keyof typeof Ionicons.glyphMap;
  bgColor: string;
  iconColor: string;
}> = ({ label, count, icon, bgColor, iconColor }) => {
  const { theme, isDark } = useTheme();

  return (
    <View
      style={[
        styles.statCard,
        {
          backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#F3F4F6',
        },
      ]}>
      <View style={styles.statHeader}>
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: bgColor,
            },
          ]}>
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>
        <Text
          style={[styles.statLabel, { color: isDark ? '#9CA3AF' : '#637588' }]}>
          {label}
        </Text>
      </View>
      <Text style={[styles.statCount, { color: theme.text }]}>{count}</Text>
    </View>
  );
};

export const TodayOverviewGrid: React.FC<TodayOverviewGridProps> = ({
  overview,
  customTypeCounts = [],
}) => {
  const stats = [
    {
      label: 'Assignments',
      count: overview?.assignments || 0,
      icon: 'document-text-outline' as const,
      bgColor: TASK_TYPE_COLORS.assignment + '22',
      iconColor: TASK_TYPE_COLORS.assignment,
    },
    {
      label: 'Study Sessions',
      count: overview?.studySessions || 0,
      icon: 'book-outline' as const,
      bgColor: TASK_TYPE_COLORS.study_session + '22',
      iconColor: TASK_TYPE_COLORS.study_session,
    },
    // Custom types with at least one task today
    ...customTypeCounts
      .filter(c => c.count > 0)
      .map(c => ({
        label: c.typeDef.name,
        count: c.count,
        icon: (c.typeDef.icon ??
          'ellipse-outline') as keyof typeof Ionicons.glyphMap,
        bgColor: c.typeDef.color + '22',
        iconColor: c.typeDef.color,
      })),
  ];

  return (
    <View style={styles.grid}>
      {stats.map((stat, index) => (
        <StatCard key={index} {...stat} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    ...SHADOWS.xs,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  iconContainer: {
    padding: 6,
    borderRadius: BORDER_RADIUS.sm,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  statCount: {
    fontSize: 24,
    fontWeight: FONT_WEIGHTS.bold,
  },
});
