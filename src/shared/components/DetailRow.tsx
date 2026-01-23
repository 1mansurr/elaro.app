import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';

interface DetailRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  iconBgColor?: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
}

export const DetailRow: React.FC<DetailRowProps> = ({
  icon,
  iconColor = COLORS.primary,
  iconBgColor,
  title,
  subtitle,
  onPress,
  rightElement,
}) => {
  const { theme, isDark } = useTheme();

  const defaultIconBg = isDark ? '#283039' : '#EFF6FF';
  const finalIconBg = iconBgColor || defaultIconBg;

  const content = (
    <View
      style={[
        styles.container,
        onPress && {
          backgroundColor: isDark ? 'transparent' : 'transparent',
        },
      ]}>
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: finalIconBg,
          },
        ]}>
        <Ionicons
          name={icon}
          size={24}
          color={isDark && !iconColor ? '#FFFFFF' : iconColor}
        />
      </View>
      <View style={styles.textContainer}>
        <Text
          style={[
            styles.title,
            { color: isDark ? '#FFFFFF' : '#111418' },
          ]}>
          {title}
        </Text>
        {subtitle && (
          <Text
            style={[
              styles.subtitle,
              { color: isDark ? '#9DABB9' : '#6B7280' },
            ]}>
            {subtitle}
          </Text>
        )}
      </View>
      {rightElement && <View style={styles.rightElement}>{rightElement}</View>}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={[
          styles.touchable,
          {
            backgroundColor: isDark ? 'transparent' : 'transparent',
          },
        ]}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: 12,
  },
  touchable: {
    borderRadius: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 18,
  },
  rightElement: {
    marginLeft: 'auto',
  },
});
