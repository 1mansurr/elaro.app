import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import {
  COLORS,
  FONT_SIZES,
  FONT_WEIGHTS,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
} from '@/constants/theme';

interface TemplateCardProps {
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  iconBgColor?: string;
}

export const TemplateCard: React.FC<TemplateCardProps> = ({
  title,
  description,
  value,
  onValueChange,
  icon = 'bookmark-outline',
  iconColor = COLORS.primary,
  iconBgColor = '#E5E7EB',
}) => {
  const { theme, isDark } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
          borderColor: isDark ? '#374151' : '#E5E7EB',
        },
      ]}>
      <View style={styles.content}>
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: isDark ? '#374151' : iconBgColor,
            },
          ]}>
          <Ionicons
            name={icon}
            size={20}
            color={isDark ? '#9CA3AF' : iconColor}
          />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          <Text
            style={[
              styles.description,
              { color: isDark ? '#9CA3AF' : '#6B7280' },
            ]}>
            {description}
          </Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{
          false: isDark ? '#374151' : '#E5E7EB',
          true: COLORS.primary,
        }}
        thumbColor="#FFFFFF"
        ios_backgroundColor={isDark ? '#374151' : '#E5E7EB'}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    ...SHADOWS.xs,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: SPACING.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    marginBottom: 2,
  },
  description: {
    fontSize: FONT_SIZES.xs,
    lineHeight: 16,
  },
});
