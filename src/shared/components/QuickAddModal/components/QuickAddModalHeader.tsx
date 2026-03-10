import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';

interface QuickAddModalHeaderProps {
  onClose: () => void;
}

export const QuickAddModalHeader: React.FC<QuickAddModalHeaderProps> = ({
  onClose,
}) => {
  const { theme, isDark } = useTheme();

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: isDark ? '#1C252E' : '#FFFFFF',
          borderBottomColor: isDark ? '#374151' : '#E5E7EB',
        },
      ]}>
      <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#111418' }]}>
        Quick Add
      </Text>
      <TouchableOpacity
        onPress={onClose}
        style={styles.closeButton}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Ionicons
          name="close"
          size={24}
          color={isDark ? '#FFFFFF' : '#111418'}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
  },
  closeButton: {
    padding: SPACING.xs,
  },
});
