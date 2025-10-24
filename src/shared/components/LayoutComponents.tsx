import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { DESIGN_SYSTEM, VISUAL_HIERARCHY } from '@/constants/designSystem';

// Semantic layout components for consistent visual hierarchy

interface LayoutProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const HeaderSection: React.FC<LayoutProps> = ({ children, style }) => (
  <View style={[styles.headerSection, style]}>
    {children}
  </View>
);

export const ContentSection: React.FC<LayoutProps> = ({ children, style }) => (
  <View style={[styles.contentSection, style]}>
    {children}
  </View>
);

export const ActionSection: React.FC<LayoutProps> = ({ children, style }) => (
  <View style={[styles.actionSection, style]}>
    {children}
  </View>
);

export const CardSection: React.FC<LayoutProps> = ({ children, style }) => (
  <View style={[styles.cardSection, style]}>
    {children}
  </View>
);

export const ListSection: React.FC<LayoutProps> = ({ children, style }) => (
  <View style={[styles.listSection, style]}>
    {children}
  </View>
);

export const ScreenContainer: React.FC<LayoutProps> = ({ children, style }) => (
  <View style={[styles.screenContainer, style]}>
    {children}
  </View>
);

export const CardContainer: React.FC<LayoutProps> = ({ children, style }) => (
  <View style={[styles.cardContainer, style]}>
    {children}
  </View>
);

const styles = StyleSheet.create({
  headerSection: {
    ...VISUAL_HIERARCHY.section,
    paddingBottom: DESIGN_SYSTEM.spacing.lg,
  },
  contentSection: {
    ...VISUAL_HIERARCHY.section,
    flex: 1,
  },
  actionSection: {
    ...VISUAL_HIERARCHY.section,
    paddingTop: DESIGN_SYSTEM.spacing.lg,
  },
  cardSection: {
    ...VISUAL_HIERARCHY.section,
  },
  listSection: {
    ...VISUAL_HIERARCHY.section,
  },
  screenContainer: {
    ...VISUAL_HIERARCHY.screen,
  },
  cardContainer: {
    ...VISUAL_HIERARCHY.card,
  },
});

// Export all components
export {
  HeaderSection,
  ContentSection,
  ActionSection,
  CardSection,
  ListSection,
  ScreenContainer,
  CardContainer,
};
