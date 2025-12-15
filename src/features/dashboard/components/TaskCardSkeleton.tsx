import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SkeletonLoader } from '@/shared/components/SkeletonLoader';
import { useTheme } from '@/contexts/ThemeContext';
import { SPACING, BORDER_RADIUS, SHADOWS, COLORS } from '@/constants/theme';

/**
 * Skeleton loader for the NextTaskCard component.
 * Mimics the layout of a real task card with shimmer animations.
 */
export const TaskCardSkeleton: React.FC = () => {
  const { theme } = useTheme();
  const isDark =
    theme.background === '#101922' || theme.background === '#0A0F14';
  const surfaceColor = isDark ? '#1C252E' : '#FFFFFF';
  const borderColor = isDark ? '#374151' : '#E5E7EB';

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: surfaceColor,
          borderColor: borderColor,
        },
      ]}>
      {/* Header */}
      <SkeletonLoader
        width={120}
        height={16}
        borderRadius={4}
        style={styles.header}
      />

      {/* Task Type Badge */}
      <SkeletonLoader
        width={80}
        height={14}
        borderRadius={4}
        style={styles.taskType}
      />

      {/* Task Name */}
      <SkeletonLoader
        width="85%"
        height={24}
        borderRadius={4}
        style={styles.taskName}
      />

      {/* Divider */}
      <View style={styles.divider} />

      {/* Footer */}
      <View style={styles.footer}>
        <SkeletonLoader width={100} height={16} borderRadius={4} />
        <SkeletonLoader width={60} height={16} borderRadius={4} />
      </View>

      {/* View Details Button */}
      <SkeletonLoader
        width={110}
        height={16}
        borderRadius={4}
        style={styles.viewDetails}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    ...SHADOWS.sm,
  },
  header: {
    marginBottom: SPACING.md,
  },
  taskType: {
    marginBottom: SPACING.sm,
  },
  taskName: {
    marginBottom: SPACING.md,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewDetails: {
    marginTop: 12,
  },
});

export default TaskCardSkeleton;
