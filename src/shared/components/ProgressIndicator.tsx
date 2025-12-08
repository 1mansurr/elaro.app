import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  currentStep,
  totalSteps,
}) => {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      {Array.from({ length: totalSteps }).map((_, index) => {
        const isActive = index + 1 === currentStep;
        const isCompleted = index + 1 < currentStep;

        return (
          <View
            key={index}
            style={[
              styles.dot,
              isActive && styles.activeDot,
              {
                backgroundColor:
                  isActive || isCompleted ? '#135bec' : '#dbdfe6',
                width: isActive ? 32 : 8,
                marginRight: index < totalSteps - 1 ? 8 : 0,
              },
            ]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  dot: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#dbdfe6',
  },
  activeDot: {
    width: 32,
  },
});

