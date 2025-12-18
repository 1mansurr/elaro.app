import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';

interface SettingsItemProps {
  label: string;
  onPress: () => void;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  iconBgColor?: string;
  isDestructive?: boolean;
  disabled?: boolean;
  rightContent?: React.ReactNode;
  showChevron?: boolean;
}

export const SettingsItem: React.FC<SettingsItemProps> = ({
  label,
  onPress,
  icon,
  iconColor,
  iconBgColor,
  isDestructive = false,
  disabled = false,
  rightContent,
  showChevron = true,
}) => {
  const { theme } = useTheme();

  const defaultIconColor = isDestructive
    ? '#EF4444'
    : iconColor || (theme.isDark ? '#9CA3AF' : '#4B5563');
  const defaultIconBg = isDestructive
    ? theme.isDark
      ? 'rgba(239, 68, 68, 0.2)'
      : '#FEE2E2'
    : iconBgColor || (theme.isDark ? '#374151' : '#F3F4F6');

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.settingItem,
        disabled && styles.settingItemDisabled,
        isDestructive && styles.settingItemDestructive,
      ]}
      disabled={disabled}
      activeOpacity={0.7}>
      <View style={[styles.iconContainer, { backgroundColor: defaultIconBg }]}>
        <Ionicons name={icon} size={22} color={defaultIconColor} />
      </View>
      <Text
        style={[
          styles.settingLabel,
          isDestructive && styles.settingLabelDestructive,
          { color: theme.isDark ? '#FFFFFF' : COLORS.text },
        ]}>
        {label}
      </Text>
      {rightContent ||
        (showChevron && (
          <Ionicons
            name="chevron-forward"
            size={20}
            color={theme.isDark ? '#6B7280' : '#9CA3AF'}
          />
        ))}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  settingItemDisabled: {
    opacity: 0.5,
  },
  settingItemDestructive: {
    backgroundColor: 'transparent',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  settingLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium,
    flex: 1,
  },
  settingLabelDestructive: {
    color: '#EF4444',
  },
});

