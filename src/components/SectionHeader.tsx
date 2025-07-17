import React from 'react';
import { View, Text, StyleSheet, ViewStyle, AccessibilityRole } from 'react-native';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '../constants/theme';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  variant?: 'small' | 'default' | 'large';
  style?: ViewStyle;
  accessibilityLabel?: string;
  accessibilityRole?: AccessibilityRole;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  icon,
  variant = 'default',
  style,
  accessibilityLabel,
  accessibilityRole = 'header',
}) => {
  const variantStyles = {
    small: {
      title: styles.titleSmall,
      subtitle: styles.subtitleSmall,
      spacing: styles.spacingSmall,
    },
    default: {
      title: styles.titleDefault,
      subtitle: styles.subtitleDefault,
      spacing: styles.spacingDefault,
    },
    large: {
      title: styles.titleLarge,
      subtitle: styles.subtitleLarge,
      spacing: styles.spacingLarge,
    },
  }[variant];

  return (
    <View
      style={[styles.container, variantStyles.spacing, style]}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel || title}
    >
      <View style={styles.titleRow}>
        {icon && <View style={styles.icon}>{icon}</View>}
        <Text style={[styles.titleBase, variantStyles.title]}>{title}</Text>
      </View>
      {subtitle && (
        <Text style={[styles.subtitleBase, variantStyles.subtitle]}>{subtitle}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: SPACING.sm,
  },

  // Title base
  titleBase: {
    color: COLORS.text,
    fontWeight: FONT_WEIGHTS.semibold as any,
  },
  titleSmall: {
    fontSize: FONT_SIZES.md,
  },
  titleDefault: {
    fontSize: FONT_SIZES.lg,
  },
  titleLarge: {
    fontSize: FONT_SIZES.xl,
  },

  // Subtitle base
  subtitleBase: {
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  subtitleSmall: {
    fontSize: FONT_SIZES.xs,
  },
  subtitleDefault: {
    fontSize: FONT_SIZES.sm,
  },
  subtitleLarge: {
    fontSize: FONT_SIZES.md,
  },

  // Spacing variants
  spacingSmall: {
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  spacingDefault: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
  },
  spacingLarge: {
    marginTop: SPACING.xl,
    marginBottom: SPACING.md,
  },
});

export default SectionHeader; 