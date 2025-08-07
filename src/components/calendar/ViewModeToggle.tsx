import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
} from '../../constants/theme';

interface ViewModeToggleProps {
  viewMode: 'daily' | 'weekly';
  setViewMode: (mode: 'daily' | 'weekly') => void;
}

export const ViewModeToggle: React.FC<ViewModeToggleProps> = ({
  viewMode,
  setViewMode,
}) => (
  <View style={styles.toggleContainer}>
    <TouchableOpacity
      style={[styles.toggleButton, viewMode === 'daily' && styles.activeToggle]}
      onPress={() => setViewMode('daily')}
      accessibilityRole="button"
      accessibilityLabel="Daily view"
      accessibilityState={{ selected: viewMode === 'daily' }}>
      <Text
        style={[
          styles.toggleText,
          viewMode === 'daily' && styles.activeToggleText,
        ]}>
        Daily
      </Text>
    </TouchableOpacity>
    <TouchableOpacity
      style={[
        styles.toggleButton,
        viewMode === 'weekly' && styles.activeToggle,
      ]}
      onPress={() => setViewMode('weekly')}
      accessibilityRole="button"
      accessibilityLabel="Weekly view"
      accessibilityState={{ selected: viewMode === 'weekly' }}>
      <Text
        style={[
          styles.toggleText,
          viewMode === 'weekly' && styles.activeToggleText,
        ]}>
        Weekly
      </Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.gray100,
    borderRadius: BORDER_RADIUS.md,
    padding: 4,
    marginBottom: SPACING.md,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
  },
  activeToggle: {
    backgroundColor: COLORS.white,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium as any,
    color: COLORS.textSecondary,
  },
  activeToggleText: {
    color: COLORS.text,
    fontWeight: FONT_WEIGHTS.semibold as any,
  },
});
