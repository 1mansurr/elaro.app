import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';

interface SettingsCategoryCardProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
}

export const SettingsCategoryCard: React.FC<SettingsCategoryCardProps> = ({
  title,
  icon,
  children,
}) => {
  const { theme, isDark } = useTheme();

  return (
    <View
      style={[
        styles.categoryCard,
        {
          backgroundColor: isDark ? '#1E2330' : '#FFFFFF',
          borderColor: isDark
            ? 'rgba(255, 255, 255, 0.05)'
            : 'rgba(0, 0, 0, 0.05)',
        },
      ]}>
      <View
        style={[
          styles.categoryHeader,
          {
            borderBottomColor: isDark ? '#374151' : '#F3F4F6',
          },
        ]}>
        <Ionicons name={icon} size={20} color={COLORS.primary} />
        <Text
          style={[
            styles.categoryTitle,
            { color: isDark ? '#9CA3AF' : '#6B7280' },
          ]}>
          {title}
        </Text>
      </View>
      <View style={styles.categoryContent}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  categoryCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  categoryTitle: {
    fontSize: 12,
    fontWeight: FONT_WEIGHTS.bold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  categoryContent: {
    flexDirection: 'column',
  },
});
