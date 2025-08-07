import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, SPACING } from '../../constants/theme';

interface ProgressDotsProps {
  totalSections: number;
  currentIndex: number;
  onDotPress: (index: number) => void;
}

export const ProgressDots: React.FC<ProgressDotsProps> = ({
  totalSections,
  currentIndex,
  onDotPress,
}) => {
  return (
    <View style={styles.container}>
      {Array.from({ length: totalSections }).map((_, index) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.dot,
            index === currentIndex && styles.activeDot,
            index < currentIndex && styles.completedDot,
          ]}
          onPress={() => onDotPress(index)}
          accessibilityRole="button"
          accessibilityLabel={`Go to section ${index + 1} of ${totalSections}`}
          accessibilityState={{ selected: index === currentIndex }}
        />
      ))}
    </View>
  );
};

const DOT_SIZE = 8;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    gap: SPACING.xs,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: COLORS.gray200,
  },
  activeDot: {
    backgroundColor: COLORS.primary,
    transform: [{ scale: 1.2 }],
  },
  completedDot: {
    backgroundColor: COLORS.success,
  },
});

export default ProgressDots;
