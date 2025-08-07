import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONT_SIZES, FONT_WEIGHTS } from '../../constants/theme';

interface ProgressBarProps {
  currentIndex: number;
  totalSections: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  currentIndex,
  totalSections,
}) => {
  const progressPercentage = Math.round(
    ((currentIndex + 1) / totalSections) * 100,
  );

  return (
    <View style={styles.container}>
      <Text style={styles.progressText}>{progressPercentage}%</Text>
      <View style={styles.progressBar}>
        <View
          style={[styles.progressFill, { width: `${progressPercentage}%` }]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-end',
  },
  progressText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium as any,
    color: COLORS.white,
    marginBottom: 4,
  },
  progressBar: {
    width: 60,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 2,
  },
});

export default ProgressBar;
