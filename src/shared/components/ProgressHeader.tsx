import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';

interface ProgressHeaderProps {
  currentStep: number;
  totalSteps: number;
}

export const ProgressHeader: React.FC<ProgressHeaderProps> = ({
  currentStep,
  totalSteps,
}) => {
  return (
    <View style={styles.container}>
      {/* Step text */}
      <Text style={styles.stepText}>
        Step {currentStep} of {totalSteps}
      </Text>

      {/* Progress dots */}
      <View style={styles.dotsContainer}>
        {Array.from({ length: totalSteps }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index < currentStep ? styles.dotActive : styles.dotInactive,
            ]}
          />
        ))}
      </View>

      {/* Progress bar */}
      <View style={styles.progressBarContainer}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${(currentStep / totalSteps) * 100}%` },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.background,
  },
  stepText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold as any,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    gap: SPACING.xs,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotActive: {
    backgroundColor: COLORS.primary,
  },
  dotInactive: {
    backgroundColor: COLORS.lightGray,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: COLORS.lightGray,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
});
