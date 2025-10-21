import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';

interface EmptyStateProps {
  title: string;
  message: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

/**
 * A reusable component for displaying empty states throughout the app.
 * 
 * @example
 * ```tsx
 * <EmptyState
 *   title="No assignments yet"
 *   message="Create your first assignment to get started!"
 *   icon="document-text-outline"
 * />
 * ```
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  message,
  icon = "document-outline",
}) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Ionicons 
        name={icon} 
        size={64} 
        color={theme.textSecondary} 
      />
      <Text style={[styles.title, { color: theme.text }]}>
        {title}
      </Text>
      <Text style={[styles.message, { color: theme.textSecondary }]}>
        {message}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  title: {
    marginTop: SPACING.lg,
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold as any,
    textAlign: 'center',
  },
  message: {
    marginTop: SPACING.sm,
    fontSize: FONT_SIZES.md,
    textAlign: 'center',
    maxWidth: 300,
  },
});

