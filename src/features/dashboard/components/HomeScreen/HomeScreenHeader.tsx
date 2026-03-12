import React, { memo, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NotificationBell } from '@/shared/components/NotificationBell';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';
import { useStableCallback, useExpensiveMemo } from '@/hooks/useMemoization';

// Helper function to get greeting based on time of day
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning'; // 0:00 - 11:59
  if (hour < 17) return 'Good afternoon'; // 12:00 - 16:59
  return 'Good evening'; // 17:00 - 23:59
};

interface HomeScreenHeaderProps {
  isGuest: boolean;
  onNotificationPress: () => void;
}

const HomeScreenHeader: React.FC<HomeScreenHeaderProps> = memo(
  ({ isGuest, onNotificationPress }) => {
    // Optimized personalized title calculation with expensive memoization
    const personalizedTitle = useExpensiveMemo(() => {
      if (isGuest) {
        return "Let's Make Today Count";
      }

      const title = `${getGreeting()}, there!`;

      return title;
    }, [isGuest]);

    // Stable callback for notification press
    const handleNotificationPress = useStableCallback(() => {
      onNotificationPress();
    }, [onNotificationPress]);

    if (isGuest) {
      return (
        <View style={styles.guestContainer}>
          <Text style={styles.guestTitle}>{personalizedTitle}</Text>
        </View>
      );
    }

    return (
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{personalizedTitle}</Text>
        <NotificationBell onPress={handleNotificationPress} />
      </View>
    );
  },
);

HomeScreenHeader.displayName = 'HomeScreenHeader';

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.background,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: COLORS.textPrimary,
    flex: 1,
  },
  guestContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  guestTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },
});

export default HomeScreenHeader;
