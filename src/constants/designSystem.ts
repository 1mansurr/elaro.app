/**
 * Design System Constants
 * Provides consistent visual hierarchy, spacing, and typography
 */

export const DESIGN_SYSTEM = {
  typography: {
    h1: {
      fontSize: 32,
      fontWeight: 'bold' as const,
      lineHeight: 40,
    },
    h2: {
      fontSize: 24,
      fontWeight: '600' as const,
      lineHeight: 32,
    },
    h3: {
      fontSize: 20,
      fontWeight: '500' as const,
      lineHeight: 28,
    },
    h4: {
      fontSize: 18,
      fontWeight: '500' as const,
      lineHeight: 24,
    },
    body: {
      fontSize: 16,
      fontWeight: 'normal' as const,
      lineHeight: 24,
    },
    bodySmall: {
      fontSize: 14,
      fontWeight: 'normal' as const,
      lineHeight: 20,
    },
    caption: {
      fontSize: 12,
      fontWeight: 'normal' as const,
      lineHeight: 16,
    },
    button: {
      fontSize: 16,
      fontWeight: '600' as const,
      lineHeight: 24,
    },
    buttonSmall: {
      fontSize: 14,
      fontWeight: '600' as const,
      lineHeight: 20,
    },
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    xxxl: 64,
  },

  layout: {
    section: {
      marginBottom: 24,
    },
    card: {
      padding: 16,
      borderRadius: 12,
      marginBottom: 16,
    },
    container: {
      padding: 16,
    },
    screen: {
      padding: 16,
      paddingBottom: 80,
    },
  },

  elevation: {
    none: 0,
    low: 2,
    medium: 4,
    high: 8,
    highest: 12,
  },

  borderRadius: {
    none: 0,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },

  shadows: {
    low: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 4,
    },
    high: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 8,
    },
  },
} as const;

export const VISUAL_HIERARCHY = {
  // Header styles
  pageTitle: {
    ...DESIGN_SYSTEM.typography.h1,
    marginBottom: DESIGN_SYSTEM.spacing.lg,
  },
  sectionTitle: {
    ...DESIGN_SYSTEM.typography.h2,
    marginBottom: DESIGN_SYSTEM.spacing.md,
  },
  cardTitle: {
    ...DESIGN_SYSTEM.typography.h3,
    marginBottom: DESIGN_SYSTEM.spacing.sm,
  },

  // Body styles
  bodyText: {
    ...DESIGN_SYSTEM.typography.body,
    marginBottom: DESIGN_SYSTEM.spacing.md,
  },
  bodySmall: {
    ...DESIGN_SYSTEM.typography.bodySmall,
    marginBottom: DESIGN_SYSTEM.spacing.sm,
  },
  caption: {
    ...DESIGN_SYSTEM.typography.caption,
    marginBottom: DESIGN_SYSTEM.spacing.xs,
  },

  // Layout styles
  section: {
    ...DESIGN_SYSTEM.layout.section,
  },
  card: {
    ...DESIGN_SYSTEM.layout.card,
    ...DESIGN_SYSTEM.shadows.low,
  },
  container: {
    ...DESIGN_SYSTEM.layout.container,
  },
  screen: {
    ...DESIGN_SYSTEM.layout.screen,
  },
} as const;

export const COMPONENT_PATTERNS = {
  // Button patterns
  button: {
    primary: {
      ...DESIGN_SYSTEM.typography.button,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: DESIGN_SYSTEM.borderRadius.md,
    },
    secondary: {
      ...DESIGN_SYSTEM.typography.button,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: DESIGN_SYSTEM.borderRadius.md,
    },
    small: {
      ...DESIGN_SYSTEM.typography.buttonSmall,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: DESIGN_SYSTEM.borderRadius.sm,
    },
  },

  // Input patterns
  input: {
    base: {
      ...DESIGN_SYSTEM.typography.body,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: DESIGN_SYSTEM.borderRadius.md,
      borderWidth: 1,
    },
    label: {
      ...DESIGN_SYSTEM.typography.bodySmall,
      marginBottom: DESIGN_SYSTEM.spacing.sm,
      fontWeight: '500' as const,
    },
  },

  // Card patterns
  card: {
    base: {
      ...DESIGN_SYSTEM.layout.card,
      ...DESIGN_SYSTEM.shadows.low,
    },
    elevated: {
      ...DESIGN_SYSTEM.layout.card,
      ...DESIGN_SYSTEM.shadows.medium,
    },
  },

  // List patterns
  listItem: {
    base: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
    },
    last: {
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
  },
} as const;

export type TypographyVariant = keyof typeof DESIGN_SYSTEM.typography;
export type SpacingSize = keyof typeof DESIGN_SYSTEM.spacing;
export type ElevationLevel = keyof typeof DESIGN_SYSTEM.elevation;
export type BorderRadiusSize = keyof typeof DESIGN_SYSTEM.borderRadius;
