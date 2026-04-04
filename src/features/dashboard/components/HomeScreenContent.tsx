import React from 'react';
import { View, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useQueryClient } from '@tanstack/react-query';

import { RootStackParamList } from '@/types';
import { useHomeScreenData } from '@/hooks/useDataQueries';
import { useMonthlyTaskCount } from '@/hooks/useWeeklyTaskCount';
import { COLORS, SPACING } from '@/constants/theme';

import NextTaskCard from '../components/NextTaskCard';
import TodayOverviewCard from '../components/TodayOverviewCard';
import { Button } from '@/shared/components';
import { HomeScreenEmptyState } from '../components/HomeScreenEmptyState';
import TaskCardSkeleton from '../components/TaskCardSkeleton';
import { QueryStateWrapper } from '@/shared/components';

type HomeScreenContentNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Main'
>;

interface HomeScreenContentProps {
  onFabStateChange: (state: { isOpen: boolean }) => void;
}

export const HomeScreenContent: React.FC<HomeScreenContentProps> = ({
  onFabStateChange,
}) => {
  const navigation = useNavigation<HomeScreenContentNavigationProp>();
  const { todaysTasks, upcomingTasks, isLoading, refetch } =
    useHomeScreenData(true);
  const { monthlyTaskCount } = useMonthlyTaskCount();
  const queryClient = useQueryClient();

  const nextUpcomingTask = todaysTasks[0] ?? upcomingTasks[0] ?? null;
  const todayOverview =
    todaysTasks.length > 0
      ? {
          lectures: 0,
          studySessions: todaysTasks.filter(t => t.type === 'study_session')
            .length,
          assignments: todaysTasks.filter(t => t.type === 'assignment').length,
          reviews: 0,
        }
      : null;

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['homeScreenData'] });
  };

  const content = (
    <ScrollView
      style={styles.scrollContainer}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
      }>
      <NextTaskCard
        task={nextUpcomingTask}
        isGuestMode={false}
        onAddActivity={() => onFabStateChange({ isOpen: true })}
        onViewDetails={() => {}}
      />

      <TodayOverviewCard
        overview={todayOverview}
        monthlyTaskCount={monthlyTaskCount}
        subscriptionTier={'free'}
      />

      <Button
        title="View Full Calendar"
        onPress={() => navigation.navigate('Calendar')}
      />
    </ScrollView>
  );

  const hasData = todaysTasks.length > 0 || upcomingTasks.length > 0;

  return (
    <QueryStateWrapper
      isLoading={isLoading}
      isError={false}
      error={null}
      data={hasData ? { hasData: true } : null}
      refetch={handleRefresh}
      isRefetching={false}
      onRefresh={refetch}
      emptyStateComponent={
        <HomeScreenEmptyState
          onAddActivity={() => onFabStateChange({ isOpen: true })}
        />
      }
      skeletonComponent={<TaskCardSkeleton />}
      skeletonCount={3}>
      {content}
    </QueryStateWrapper>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    padding: SPACING.lg,
    paddingBottom: 80,
  },
});

export default HomeScreenContent;
