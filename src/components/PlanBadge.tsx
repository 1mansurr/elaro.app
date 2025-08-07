import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  COLORS,
  PLAN_COLORS,
  GRADIENTS,
  FONT_WEIGHTS,
} from '../constants/theme';

interface PlanBadgeProps {
  plan: 'origin' | 'oddity';
  size?: 'small' | 'medium' | 'large';
  showIcon?: boolean;
  style?: ViewStyle;
  backgroundColor?: string;
  textColor?: string;
}

export const PlanBadge: React.FC<PlanBadgeProps> = ({
  plan,
  size = 'medium',
  showIcon = false,
  style,
  backgroundColor,
  textColor,
}) => {
  const isOddity = plan === 'oddity';
  const colors = PLAN_COLORS[plan];
  const sizeStyle = getSizeStyles(size);

  const badgeContent = (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: backgroundColor
            ? backgroundColor
            : isOddity
              ? undefined
              : colors.background,
          borderColor: colors.border,
          borderRadius: sizeStyle.borderRadius,
          paddingHorizontal: sizeStyle.paddingHorizontal,
          paddingVertical: sizeStyle.paddingVertical,
        },
        style,
      ]}
      accessibilityRole="text"
      accessibilityLabel={`${plan === 'oddity' ? 'Oddity Plan' : 'Origin Plan'} badge`}>
      {showIcon && isOddity && <Text style={styles.icon}>👑</Text>}
      <Text
        style={[
          styles.text,
          {
            color: textColor
              ? textColor
              : isOddity
                ? COLORS.white
                : colors.text,
            fontSize: sizeStyle.fontSize,
            fontWeight: (isOddity
              ? FONT_WEIGHTS.bold
              : FONT_WEIGHTS.medium) as any,
          },
        ]}>
        {isOddity ? 'ODDITY' : 'Origin Plan'}
      </Text>
    </View>
  );

  if (isOddity && backgroundColor) {
    // Use solid background color instead of gradient
    return (
      <View
        style={[
          styles.gradientWrapper,
          {
            backgroundColor,
            borderRadius: sizeStyle.borderRadius,
            paddingHorizontal: sizeStyle.paddingHorizontal,
            paddingVertical: sizeStyle.paddingVertical,
          },
          style,
        ]}>
        {badgeContent}
      </View>
    );
  }
  if (isOddity) {
    return (
      <LinearGradient
        colors={[GRADIENTS.oddity.start, GRADIENTS.oddity.end]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.gradientWrapper,
          {
            borderRadius: sizeStyle.borderRadius,
            paddingHorizontal: sizeStyle.paddingHorizontal,
            paddingVertical: sizeStyle.paddingVertical,
          },
          style,
        ]}>
        {badgeContent}
      </LinearGradient>
    );
  }
  return badgeContent;
};

const getSizeStyles = (size: 'small' | 'medium' | 'large') => {
  switch (size) {
    case 'small':
      return {
        paddingHorizontal: 8,
        paddingVertical: 4,
        fontSize: 10,
        borderRadius: 12,
      };
    case 'large':
      return {
        paddingHorizontal: 12,
        paddingVertical: 6,
        fontSize: 14,
        borderRadius: 16,
      };
    case 'medium':
    default:
      return {
        paddingHorizontal: 10,
        paddingVertical: 5,
        fontSize: 12,
        borderRadius: 14,
      };
  }
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  icon: {
    marginRight: 4,
    fontSize: 12,
  },
  gradientWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default PlanBadge;
