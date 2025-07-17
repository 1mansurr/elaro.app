import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';

interface ReminderBadgeProps {
  count: number;
  variant?: 'default' | 'success' | 'warning' | 'error';
  style?: ViewStyle;
}

// Restore or properly define variantStyles for ReminderBadge
const variantStyles = {
  default: {
    backgroundColor: COLORS.blue,
    icon: '🔁',
  },
  success: {
    backgroundColor: COLORS.success,
    icon: '✅',
  },
  warning: {
    backgroundColor: COLORS.warning,
    icon: '⚠️',
  },
  error: {
    backgroundColor: COLORS.error,
    icon: '❌',
  },
};

// Centralize variant config
// Separate icon and label
// Improve layout and accessibility
// Use theme tokens for all style values
const ReminderBadge: React.FC<ReminderBadgeProps> = ({
  count,
  variant = 'default',
  style,
}) => {
  const config = variantStyles[variant];

  const label =
    count === 0 ? 'Complete' : `${count} left`;

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: config.backgroundColor },
        style,
      ]}
      accessibilityRole="text"
      accessibilityLabel={`Reminder: ${label}`}
    >
      <Text style={styles.text}>
        {`${config.icon} ${label}`}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.round,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.white,
  },
});

export default ReminderBadge; 