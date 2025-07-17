import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, PLAN_COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../constants/theme';

interface UsageTrackerProps {
  plan: 'origin' | 'oddity';
  used: number;
  total?: number;
  showDetails?: boolean;
  style?: ViewStyle;
}

const UsageTracker: React.FC<UsageTrackerProps> = ({
  plan, 
  used, 
  total = 14, 
  showDetails = true,
  style,
}) => {
  const isOddity = plan === 'oddity';
  const planColors = PLAN_COLORS[plan];
  const remaining = isOddity ? '∞' : Math.max(0, total - used);

  const bgColor = isOddity ? COLORS.yellow50 : planColors.background;
  const borderColor = isOddity ? COLORS.yellow200 : planColors.border;
  const textColor = isOddity ? COLORS.yellow700 : planColors.text;
  const detailColor = isOddity ? COLORS.yellow600 : planColors.text;

  const mainText = isOddity
    ? 'Oddity Plan: More study sessions'
    : `Origin Plan: ${used}/${total} used`;

  const detailText = isOddity
    ? 'Full AI guide access • Premium features'
    : `${remaining} more tasks/events available`;

  return (
    <View
      style={[
      styles.container,
      {
          backgroundColor: bgColor,
          borderColor: borderColor,
        },
        style,
      ]}
      accessibilityRole="summary"
      accessibilityLabel={mainText}
    >
      <Text style={[styles.mainText, { color: textColor }]}> 
        {mainText}
        </Text>
        {showDetails && (
        <Text style={[styles.detailText, { color: detailColor }]}> 
          {detailText}
          </Text>
        )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
  },
  mainText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold as any,
    marginBottom: SPACING.xs,
  },
  detailText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium as any,
  },
});

export default UsageTracker; 