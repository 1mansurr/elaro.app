import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, BORDER_RADIUS, FONT_SIZES } from '../constants/theme';

interface SpacedRepetitionBadgeProps {
  type: 'basic' | 'advanced';
  size?: 'small' | 'medium';
  style?: ViewStyle;
}

const SpacedRepetitionBadge: React.FC<SpacedRepetitionBadgeProps> = ({
  type, 
  size = 'medium',
  style,
}) => {
  const isAdvanced = type === 'advanced';
  
  const sizeStyles =
    size === 'small'
      ? {
          paddingHorizontal: 6,
          paddingVertical: 2,
          fontSize: FONT_SIZES.xs,
          borderRadius: BORDER_RADIUS.sm,
        }
      : {
          paddingHorizontal: 8,
          paddingVertical: 3,
          fontSize: FONT_SIZES.sm,
          borderRadius: BORDER_RADIUS.md,
        };

  const label = isAdvanced ? 'SR+' : 'SR';

  const badgeContent = (
    <View
      style={[
        styles.inner,
      {
          backgroundColor: isAdvanced ? 'transparent' : COLORS.green100,
          borderRadius: sizeStyles.borderRadius,
          paddingHorizontal: sizeStyles.paddingHorizontal,
          paddingVertical: sizeStyles.paddingVertical,
        },
      ]}
    >
      <Text
        style={[
        styles.text,
        {
            fontSize: sizeStyles.fontSize,
          color: isAdvanced ? COLORS.white : COLORS.green600,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );

  return isAdvanced ? (
    <LinearGradient
      colors={[GRADIENTS.oddity.start, GRADIENTS.oddity.end]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.container,
        {
          borderRadius: sizeStyles.borderRadius,
        },
        style,
      ]}
      accessibilityLabel="Advanced spaced repetition"
    >
      {badgeContent}
    </LinearGradient>
  ) : (
    <View
      style={[styles.container, style]}
      accessibilityLabel="Basic spaced repetition"
    >
      {badgeContent}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: 'bold',
  },
});

export default SpacedRepetitionBadge; 