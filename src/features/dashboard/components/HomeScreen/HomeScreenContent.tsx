import React, { memo, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useQueryClient } from '@tanstack/react-query';
import { RootStackParamList, Task } from '@/types';
import NextTaskCard from '../../components/NextTaskCard';
import TodayOverviewCard from '../../components/TodayOverviewCard';
import { SwipeableTaskCard } from '../../components/SwipeableTaskCard';
import { PrimaryButton } from '@/shared/components';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';

import { useStableCallback, useExpensiveMemo } from '@/hooks/useMemoization';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

interface HomeScreenContentProps {
  isGuest: boolean;
  homeData: any;
  isLoading: boolean;
  isFabOpen: boolean;
  monthlyTaskCount: number;
  shouldShowBanner: boolean;
  trialDaysRemaining: number | null;
  onSwipeComplete: () => void;
  onViewDetails: (task: Task) => void;
  onFabStateChange: (state: { isOpen: boolean }) => void;
  onSubscribePress: () => void;
  onDismissBanner: () => void;
}

const HomeScreenContent: React.FC<HomeScreenContentProps> = memo(
  ({
    isGuest,
    homeData,
    isLoading,
    isFabOpen,
    monthlyTaskCount,
    shouldShowBanner,
    trialDaysRemaining,
    onSwipeComplete,
    onViewDetails,
    onFabStateChange,
    onSubscribePress,
    onDismissBanner,
  }) => {
    const navigation = useNavigation<HomeScreenNavigationProp>();
    const queryClient = useQueryClient();

    const handleRefresh = useStableCallback(async () => {
      await queryClient.invalidateQueries({ queryKey: ['homeScreenData'] });
    }, [queryClient]);

    // Optimized data processing with expensive memoization
    const processedHomeData = useExpensiveMemo(() => {
      if (!homeData) {
        return null;
      }

      const processed = {
        nextUpcomingTask: homeData.nextUpcomingTask,
        todayOverview: homeData.todayOverview,
      };

      return processed;
    }, [homeData]);

    return (
      <ScrollView
        style={styles.scrollContainer}
        refreshControl={
          !isGuest ? (
            <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
          ) : undefined
        }
        scrollEnabled={!isFabOpen}>
        <SwipeableTaskCard
          onSwipeComplete={onSwipeComplete}
          enabled={!isGuest && !!processedHomeData?.nextUpcomingTask}>
          <NextTaskCard
            task={isGuest ? null : processedHomeData?.nextUpcomingTask || null}
            isGuestMode={isGuest}
            onAddActivity={() => onFabStateChange({ isOpen: true })}
            onViewDetails={onViewDetails}
          />
        </SwipeableTaskCard>

        <TodayOverviewCard
          overview={processedHomeData?.todayOverview || null}
          monthlyTaskCount={monthlyTaskCount}
          subscriptionTier={'free'}
        />
      </ScrollView>
    );
  },
);

HomeScreenContent.displayName = 'HomeScreenContent';

const styles = StyleSheet.create({
  scrollContainer: {
    padding: SPACING.lg,
    paddingBottom: 120, // Increased padding for better balance after removing calendar button
  },
});

export default HomeScreenContent;
