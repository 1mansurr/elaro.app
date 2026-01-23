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

interface OverviewData {
  lectures: number;
  studySessions: number;
  assignments: number;
  reviews: number;
}

interface TodayOverviewGridProps {
  overview: OverviewData | null;
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
          style={[
            styles.statLabel,
            { color: isDark ? '#9CA3AF' : '#637588' },
          ]}>
          {label}
        </Text>
      </View>
      <Text style={[styles.statCount, { color: theme.text }]}>{count}</Text>
    </View>
  );
};

export const TodayOverviewGrid: React.FC<TodayOverviewGridProps> = ({
  overview,
}) => {
  const stats = [
    {
      label: 'Lectures',
      count: overview?.lectures || 0,
      icon: 'school-outline' as const,
      bgColor: '#DCFCE7',
      iconColor: '#166534',
    },
    {
      label: 'Study Sessions',
      count: overview?.studySessions || 0,
      icon: 'book-outline' as const,
      bgColor: '#E7F1FF',
      iconColor: '#137FEC',
    },
    {
      label: 'Assignments',
      count: overview?.assignments || 0,
      icon: 'document-text-outline' as const,
      bgColor: '#FFEDD5',
      iconColor: '#C2410C',
    },
    {
      label: 'Reviews',
      count: overview?.reviews || 0,
      icon: 'clipboard-outline' as const,
      bgColor: '#E7F1FF',
      iconColor: '#137FEC',
    },
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
