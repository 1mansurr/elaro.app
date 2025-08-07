import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
} from '../../constants/theme';

interface NavigationButtonsProps {
  currentIndex: number;
  totalSections: number;
  onPrevious: () => void;
  onNext: () => void;
}

export const NavigationButtons: React.FC<NavigationButtonsProps> = ({
  currentIndex,
  totalSections,
  onPrevious,
  onNext,
}) => {
  const isFirstSection = currentIndex === 0;
  const isLastSection = currentIndex === totalSections - 1;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, isFirstSection && styles.disabledButton]}
        onPress={onPrevious}
        disabled={isFirstSection}
        accessibilityRole="button"
        accessibilityLabel="Go to previous section"
        accessibilityState={{ disabled: isFirstSection }}>
        <Ionicons name="chevron-back" size={20} color={COLORS.white} />
        <Text style={styles.buttonText}>Previous</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, isLastSection && styles.disabledButton]}
        onPress={onNext}
        disabled={isLastSection}
        accessibilityRole="button"
        accessibilityLabel="Go to next section"
        accessibilityState={{ disabled: isLastSection }}>
        <Text style={styles.buttonText}>Next</Text>
        <Ionicons name="chevron-forward" size={20} color={COLORS.white} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: SPACING.lg,
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.xs,
  },
  buttonText: {
    color: COLORS.white,
    fontWeight: FONT_WEIGHTS.semibold as any,
    fontSize: FONT_SIZES.md,
  },
  disabledButton: {
    backgroundColor: COLORS.gray200,
  },
});

export default NavigationButtons;
