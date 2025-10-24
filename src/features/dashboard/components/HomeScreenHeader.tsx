import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';

interface HomeScreenHeaderProps {
  title: string;
}

export const HomeScreenHeader: React.FC<HomeScreenHeaderProps> = ({ title }) => {
  return (
    <Text style={styles.title}>{title}</Text>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },
});

export default HomeScreenHeader;
