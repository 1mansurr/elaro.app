/**
 * Component Style Constants
 * Static styles that don't depend on theme context
 * Reduces theme context dependency and improves performance
 */

export const COMPONENT_STYLES = {
  button: {
    base: {
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      flexDirection: 'row' as const,
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 24,
      minHeight: 44,
    },
    primary: {
      // Dynamic styles applied via theme
    },
    secondary: {
      // Dynamic styles applied via theme
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: 1,
    },
    danger: {
      // Dynamic styles applied via theme
    },
    ghost: {
      backgroundColor: 'transparent',
    },
    text: {
      fontSize: 16,
      fontWeight: '600' as const,
      textAlign: 'center' as const,
    },
  },
  input: {
    base: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 12,
    },
    default: {
      // Dynamic styles applied via theme
    },
    outlined: {
      backgroundColor: 'transparent',
    },
    filled: {
      // Dynamic styles applied via theme
    },
    text: {
      flex: 1,
      fontSize: 16,
    },
  },
  card: {
    base: {
      borderRadius: 12,
      padding: 16,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
  },
} as const;

export const COMPONENT_SIZES = {
  button: {
    small: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      minHeight: 32,
      fontSize: 14,
    },
    medium: {
      paddingVertical: 12,
      paddingHorizontal: 24,
      minHeight: 44,
      fontSize: 16,
    },
    large: {
      paddingVertical: 16,
      paddingHorizontal: 32,
      minHeight: 56,
      fontSize: 18,
    },
  },
  input: {
    small: {
      paddingVertical: 8,
      fontSize: 14,
    },
    medium: {
      paddingVertical: 12,
      fontSize: 16,
    },
    large: {
      paddingVertical: 16,
      fontSize: 18,
    },
  },
} as const;

export const COMPONENT_VARIANTS = {
  button: ['primary', 'secondary', 'outline', 'danger', 'ghost'] as const,
  input: ['default', 'outlined', 'filled'] as const,
} as const;

export type ButtonVariant = (typeof COMPONENT_VARIANTS.button)[number];
export type InputVariant = (typeof COMPONENT_VARIANTS.input)[number];
export type ComponentSize = 'small' | 'medium' | 'large';
