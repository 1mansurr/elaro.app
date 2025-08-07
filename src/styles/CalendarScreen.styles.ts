import { StyleSheet } from 'react-native';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  LAYOUT,
} from '../constants/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  headerTitleContainer: {
    flex: 1,
  },
  scrollArea: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  weeklyOverview: {
    paddingVertical: SPACING.lg,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xl * 2,
  },
  emptyStateText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.medium as any,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.lg,
  },
  emptyStateSubtext: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
});
