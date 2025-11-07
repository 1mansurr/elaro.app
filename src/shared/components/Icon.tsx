import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import {
  ICON_SIZES,
  ICON_COLORS,
  ICON_PRESETS,
  getIconSize,
  getIconColorKey,
  type IconSize,
  type IconColor,
  type IconPreset,
  type IconName,
} from '@/constants/icons';

interface IconProps {
  name: IconName;
  size?: IconSize | IconPreset | number;
  color?: IconColor | string;
  style?: any;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

/**
 * Standardized Icon component with consistent sizing and theming
 *
 * Usage:
 * <Icon name="home" size="large" color="primary" />
 * <Icon name="checkmark" size="button" color="success" />
 * <Icon name="trash" size={24} color="#FF0000" />
 */
export const Icon: React.FC<IconProps> = ({
  name,
  size = 'medium',
  color = 'text',
  style,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const { theme } = useTheme();

  // Determine icon size
  const iconSize = typeof size === 'number' ? size : getIconSize(size);

  // Determine icon color
  const iconColor = (() => {
    if (typeof color === 'string' && color.startsWith('#')) {
      // Direct hex color
      return color;
    }

    if (typeof color === 'string' && color in ICON_COLORS) {
      // Theme color key
      const colorKey = getIconColorKey(color as IconColor);
      return theme[colorKey as keyof typeof theme] || color;
    }

    // Fallback to theme color or direct string
    return theme[color as keyof typeof theme] || color;
  })();

  return (
    <Ionicons
      name={name}
      size={iconSize}
      color={iconColor}
      style={style}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
    />
  );
};

// Convenience components for common icon patterns
export const TabBarIcon: React.FC<{
  name: IconName;
  color?: IconColor | string;
}> = ({ name, color = 'textSecondary' }) => (
  <Icon name={name} size="tabBar" color={color} />
);

export const ButtonIcon: React.FC<{
  name: IconName;
  color?: IconColor | string;
  size?: 'small' | 'medium' | 'large';
}> = ({ name, color = 'primary', size = 'medium' }) => (
  <Icon
    name={name}
    size={`button${size.charAt(0).toUpperCase() + size.slice(1)}` as IconPreset}
    color={color}
  />
);

export const ListItemIcon: React.FC<{
  name: IconName;
  color?: IconColor | string;
  size?: 'small' | 'medium';
}> = ({ name, color = 'textSecondary', size = 'medium' }) => (
  <Icon
    name={name}
    size={
      `listItem${size.charAt(0).toUpperCase() + size.slice(1)}` as IconPreset
    }
    color={color}
  />
);

export const InputIcon: React.FC<{
  name: IconName;
  color?: IconColor | string;
}> = ({ name, color = 'textSecondary' }) => (
  <Icon name={name} size="input" color={color} />
);

export const HeaderIcon: React.FC<{
  name: IconName;
  color?: IconColor | string;
}> = ({ name, color = 'text' }) => (
  <Icon name={name} size="header" color={color} />
);

export const StatusIcon: React.FC<{
  name: IconName;
  color?: IconColor | string;
  size?: 'small' | 'large';
}> = ({ name, color = 'textSecondary', size = 'small' }) => (
  <Icon
    name={name}
    size={`status${size.charAt(0).toUpperCase() + size.slice(1)}` as IconPreset}
    color={color}
  />
);

export default Icon;
