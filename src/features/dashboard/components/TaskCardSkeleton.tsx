import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SkeletonLoader } from '@/shared/components/SkeletonLoader';
import { SPACING } from '@/constants/theme';

/**
 * Skeleton loader for the NextTaskCard component.
 * Mimics the layout of a real task card with shimmer animations.
 */
export const TaskCardSkeleton: React.FC = () => {
  return (
    <View style={styles.card}>
      {/* Header */}
      <SkeletonLoader width={120} height={16} borderRadius={4} style={styles.header} />
      
      {/* Task Type Badge */}
      <SkeletonLoader width={80} height={14} borderRadius={4} style={styles.taskType} />
      
      {/* Task Name */}
      <SkeletonLoader width="85%" height={24} borderRadius={4} style={styles.taskName} />
      
      {/* Divider */}
      <View style={styles.divider} />
      
      {/* Footer */}
      <View style={styles.footer}>
        <SkeletonLoader width={100} height={16} borderRadius={4} />
        <SkeletonLoader width={60} height={16} borderRadius={4} />
      </View>
      
      {/* View Details Button */}
      <SkeletonLoader width={110} height={16} borderRadius={4} style={styles.viewDetails} />
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    marginBottom: 16,
  },
  taskType: {
    marginBottom: 8,
  },
  taskName: {
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#e9ecef',
    marginVertical: 16,
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

