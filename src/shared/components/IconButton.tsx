import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UnifiedButton } from './UnifiedButton';
import { useTheme } from '@/contexts/ThemeContext';
import { SPACING } from '@/constants/theme';

interface IconButtonProps {
  title: string;
  onPress: () => void;
  icon: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  title,
  onPress,
  icon,
  iconPosition = 'left',
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const { theme } = useTheme();

  const getIconColor = () => {
    switch (variant) {
      case 'primary':
        return theme.white;
      case 'secondary':
        return theme.text;
      case 'outline':
        return theme.accent;
      case 'ghost':
        return theme.accent;
      default:
        return theme.white;
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'small':
        return 16;
      case 'large':
        return 24;
      default: // medium
        return 20;
    }
  };

  const iconElement = (
    <Ionicons
      name={icon}
      size={getIconSize()}
      color={getIconColor()}
      style={iconPosition === 'left' ? styles.iconLeft : styles.iconRight}
    />
  );

  // Use UnifiedButton with icon prop
  return (
    <UnifiedButton
      title={title}
      onPress={onPress}
      variant={variant}
      size={size}
      disabled={disabled}
      loading={loading}
      icon={iconElement}
      iconPosition={iconPosition}
      style={style}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
    />
  );
};

const styles = StyleSheet.create({
  iconLeft: {
    marginHorizontal: 0,
  },
  iconRight: {
    marginHorizontal: SPACING.xs,
  },
});

export default React.memo(IconButton);
