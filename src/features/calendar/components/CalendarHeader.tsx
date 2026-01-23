import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NotificationBell } from '@/shared/components/NotificationBell';
import { useTheme } from '@/contexts/ThemeContext';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';

interface CalendarHeaderProps {
  onNotificationPress: () => void;
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  onNotificationPress,
}) => {
  const { theme, isDark } = useTheme();

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: isDark ? '#101922' : COLORS.background,
        },
      ]}>
      <Text
        style={[
          styles.headerTitle,
          { color: isDark ? '#FFFFFF' : COLORS.textPrimary },
        ]}>
        Schedule
      </Text>
      <NotificationBell onPress={onNotificationPress} />
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
  },
});
