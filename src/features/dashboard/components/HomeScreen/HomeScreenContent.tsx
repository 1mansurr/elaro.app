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
import { useAuth } from '@/contexts/AuthContext';
import { RootStackParamList, Task } from '@/types';
import TrialBanner from '../../components/TrialBanner';
import NextTaskCard from '../../components/NextTaskCard';
import TodayOverviewCard from '../../components/TodayOverviewCard';
import { SwipeableTaskCard } from '../../components/SwipeableTaskCard';
import { PrimaryButton } from '@/shared/components';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';
import { performanceMonitoringService } from '@/services/PerformanceMonitoringService';
import { requestDeduplicationService } from '@/services/RequestDeduplicationService';
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
    const { user } = useAuth();
    const queryClient = useQueryClient();

    // Enhanced performance monitoring
    useEffect(() => {
      performanceMonitoringService.startTimer('content-component-mount');
      return () => {
        performanceMonitoringService.endTimer('content-component-mount');
      };
    }, []);

    // Optimized refresh with request deduplication
    const handleRefresh = useStableCallback(async () => {
      performanceMonitoringService.startTimer('home-screen-refresh');

      await requestDeduplicationService.deduplicateRequest(
        'home-screen-refresh',
        () => queryClient.invalidateQueries({ queryKey: ['homeScreenData'] }),
      );

      performanceMonitoringService.endTimer('home-screen-refresh');
    }, [queryClient]);

    // Optimized data processing with expensive memoization
    const processedHomeData = useExpensiveMemo(() => {
      performanceMonitoringService.startTimer('home-data-processing');

      if (!homeData) {
        performanceMonitoringService.endTimer('home-data-processing');
        return null;
      }

      const processed = {
        nextUpcomingTask: homeData.nextUpcomingTask,
        todayOverview: homeData.todayOverview,
      };

      performanceMonitoringService.endTimer('home-data-processing');
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
        {shouldShowBanner && trialDaysRemaining !== null && (
          <TrialBanner
            daysRemaining={trialDaysRemaining}
            onPressSubscribe={onSubscribePress}
            onDismiss={onDismissBanner}
          />
        )}

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
          overview={isGuest ? null : processedHomeData?.todayOverview || null}
          monthlyTaskCount={isGuest ? 0 : monthlyTaskCount}
          subscriptionTier={user?.subscription_tier || 'free'}
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
