import React from 'react';
import { View, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useQueryClient } from '@tanstack/react-query';

import { RootStackParamList } from '@/types';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useHomeScreenData } from '@/hooks/useDataQueries';
import { useMonthlyTaskCount } from '@/hooks/useWeeklyTaskCount';
import { COLORS, SPACING } from '@/constants/theme';

import { TrialBannerWrapper } from '../components/TrialBannerWrapper';
import NextTaskCard from '../components/NextTaskCard';
import TodayOverviewCard from '../components/TodayOverviewCard';
import { Button } from '@/shared/components';
import { HomeScreenEmptyState } from '../components/HomeScreenEmptyState';
import TaskCardSkeleton from '../components/TaskCardSkeleton';
import { QueryStateWrapper } from '@/shared/components';

type HomeScreenContentNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

interface HomeScreenContentProps {
  onFabStateChange: (state: { isOpen: boolean }) => void;
}

export const HomeScreenContent: React.FC<HomeScreenContentProps> = ({ onFabStateChange }) => {
  const navigation = useNavigation<HomeScreenContentNavigationProp>();
  const { session, user } = useAuth();
  const { isPremium } = usePermissions(user);
  const isGuest = !session;
  const { data: homeData, isLoading, isError, error, refetch, isRefetching } = useHomeScreenData(!isGuest);
  const { monthlyTaskCount } = useMonthlyTaskCount();
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['homeScreenData'] });
  };

  const content = (
    <ScrollView
      style={styles.scrollContainer}
      refreshControl={
        !isGuest ? (
          <RefreshControl 
            refreshing={isLoading} 
            onRefresh={handleRefresh}
          />
        ) : undefined
      }
    >
      <TrialBannerWrapper
        user={user}
        isPremium={isPremium}
        onPressSubscribe={() => navigation.navigate('Auth')}
        onDismiss={() => {}}
      />
      
      <NextTaskCard 
        task={isGuest ? null : (homeData?.nextUpcomingTask || null)} 
        isGuestMode={isGuest}
        onAddActivity={() => onFabStateChange({ isOpen: true })}
        onViewDetails={() => {}}
      />
      
      <TodayOverviewCard
        overview={isGuest ? null : (homeData?.todayOverview || null)}
        monthlyTaskCount={isGuest ? 0 : monthlyTaskCount}
        subscriptionTier={user?.subscription_tier || 'free'}
      />
      
      <Button
        title="View Full Calendar"
        onPress={() => navigation.navigate('Calendar')}
      />
    </ScrollView>
  );

  // For authenticated users, wrap with QueryStateWrapper
  if (!isGuest) {
    return (
      <QueryStateWrapper
        isLoading={isLoading}
        isError={isError}
        error={error}
        data={homeData}
        refetch={handleRefresh}
        isRefetching={isRefetching}
        onRefresh={refetch}
        emptyStateComponent={
          <HomeScreenEmptyState onAddActivity={() => onFabStateChange({ isOpen: true })} />
        }
        skeletonComponent={<TaskCardSkeleton />}
        skeletonCount={3}
      >
        {content}
      </QueryStateWrapper>
    );
  }

  // For guest users, return content directly
  return content;
};

const styles = StyleSheet.create({
  scrollContainer: {
    padding: SPACING.lg,
    paddingBottom: 80,
  },
});

export default HomeScreenContent;