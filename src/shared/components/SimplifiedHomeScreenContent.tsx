import React, { memo, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { RootStackParamList, Task } from '@/types';
import TrialBanner from '@/features/dashboard/components/TrialBanner';
import NextTaskCard from '@/features/dashboard/components/NextTaskCard';
import TodayOverviewCard from '@/features/dashboard/components/TodayOverviewCard';
import { SwipeableTaskCard } from '@/features/dashboard/components/SwipeableTaskCard';
import { PrimaryButton } from '@/shared/components';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';
import { performanceMonitoringService } from '@/services/PerformanceMonitoringService';
import { requestDeduplicationService } from '@/services/RequestDeduplicationService';
import { useStableCallback, useExpensiveMemo } from '@/hooks/useMemoization';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList>;

// ===========================================
// 🏗️ SIMPLIFIED HOME SCREEN INTERFACES
// ===========================================

// Data configuration
interface HomeDataConfig {
  isGuest: boolean;
  homeData: any;
  isLoading: boolean;
  monthlyTaskCount: number;
}

// UI state configuration
interface HomeUIState {
  isFabOpen: boolean;
  shouldShowBanner: boolean;
  trialDaysRemaining: number | null;
}

// Event handlers configuration
interface HomeEventHandlers {
  onSwipeComplete: () => void;
  onViewDetails: (task: Task) => void;
  onFabStateChange: (state: { isOpen: boolean }) => void;
  onSubscribePress: () => void;
  onDismissBanner: () => void;
}

// Simplified main interface
interface SimplifiedHomeScreenContentProps {
  data: HomeDataConfig;
  uiState: HomeUIState;
  eventHandlers: HomeEventHandlers;
}

// ===========================================
// 🧩 FOCUSED SUB-COMPONENTS
// ===========================================

// Trial Banner Component
const TrialBannerSection: React.FC<{
  shouldShowBanner: boolean;
  trialDaysRemaining: number | null;
  onSubscribePress: () => void;
  onDismissBanner: () => void;
}> = memo(
  ({
    shouldShowBanner,
    trialDaysRemaining,
    onSubscribePress,
    onDismissBanner,
  }) => {
    if (!shouldShowBanner) return null;

    return (
      <TrialBanner
        daysRemaining={trialDaysRemaining}
        onPressSubscribe={onSubscribePress}
        onDismiss={onDismissBanner}
      />
    );
  },
);

TrialBannerSection.displayName = 'TrialBannerSection';

// Next Task Card Component
const NextTaskSection: React.FC<{
  homeData: any;
  isGuest: boolean;
  onViewDetails: (task: Task) => void;
}> = memo(({ homeData, isGuest, onViewDetails }) => {
  const nextTask = homeData?.nextTask;

  if (!nextTask) return null;

  return (
    <NextTaskCard
      task={nextTask}
      isGuestMode={isGuest}
      onViewDetails={onViewDetails}
    />
  );
});

NextTaskSection.displayName = 'NextTaskSection';

// Today Overview Component
const TodayOverviewSection: React.FC<{
  homeData: any;
  monthlyTaskCount: number;
  subscriptionTier: 'free' | 'oddity' | null;
}> = memo(({ homeData, monthlyTaskCount, subscriptionTier }) => {
  const overview = homeData?.overview;

  if (!overview) return null;

  return (
    <TodayOverviewCard
      overview={overview}
      monthlyTaskCount={monthlyTaskCount}
      subscriptionTier={subscriptionTier}
    />
  );
});

TodayOverviewSection.displayName = 'TodayOverviewSection';

// Task List Component
const TaskListSection: React.FC<{
  homeData: any;
  isGuest: boolean;
  onSwipeComplete: () => void;
  onViewDetails: (task: Task) => void;
  onFabStateChange: (state: { isOpen: boolean }) => void;
}> = memo(
  ({ homeData, isGuest, onSwipeComplete, onViewDetails, onFabStateChange }) => {
    // Ensure tasks is always an array - defensive check to prevent crashes
    const tasks = Array.isArray(homeData?.tasks) ? homeData.tasks : [];

    if (tasks.length === 0) return null;

    return (
      <View style={styles.taskListContainer}>
        {tasks.map((task: Task) => (
          <SwipeableTaskCard
            key={task.id}
            onSwipeComplete={onSwipeComplete}
            enabled={!isGuest}>
            <View style={styles.taskCard}>
              <Text style={styles.taskTitle}>{task.title}</Text>
              <Text style={styles.taskDescription}>
                {task.description || 'No description'}
              </Text>
              <TouchableOpacity
                style={styles.viewDetailsButton}
                onPress={() => onViewDetails(task)}
                accessibilityLabel="View task details"
                accessibilityHint={`Shows detailed information about ${task.title || 'this task'}`}
                accessibilityRole="button">
                <Text style={styles.viewDetailsText}>View Details</Text>
              </TouchableOpacity>
            </View>
          </SwipeableTaskCard>
        ))}
      </View>
    );
  },
);

TaskListSection.displayName = 'TaskListSection';

// Empty State Component
const EmptyStateSection: React.FC<{
  isGuest: boolean;
  onAddActivity: () => void;
}> = memo(({ isGuest, onAddActivity }) => (
  <View style={styles.emptyStateContainer}>
    <Text style={styles.emptyStateTitle}>
      {isGuest ? 'Welcome to ELARO!' : 'No tasks yet'}
    </Text>
    <Text style={styles.emptyStateMessage}>
      {isGuest
        ? 'Sign up to start organizing your academic schedule'
        : 'Add your first task to get started'}
    </Text>
    <PrimaryButton
      title={isGuest ? 'Get Started' : 'Add Task'}
      onPress={onAddActivity}
      style={styles.emptyStateButton}
    />
  </View>
));

EmptyStateSection.displayName = 'EmptyStateSection';

// ===========================================
// 🎯 SIMPLIFIED MAIN COMPONENT
// ===========================================

export const SimplifiedHomeScreenContent: React.FC<SimplifiedHomeScreenContentProps> =
  memo(({ data, uiState, eventHandlers }) => {
    const navigation = useNavigation<HomeScreenNavigationProp>();
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const { isGuest, homeData, isLoading, monthlyTaskCount } = data;

    const { isFabOpen, shouldShowBanner, trialDaysRemaining } = uiState;

    const {
      onSwipeComplete,
      onViewDetails,
      onFabStateChange,
      onSubscribePress,
      onDismissBanner,
    } = eventHandlers;

    // Performance monitoring
    useEffect(() => {
      performanceMonitoringService.startTimer('HomeScreenContent');
      return () => {
        performanceMonitoringService.endTimer('HomeScreenContent');
      };
    }, []);

    // Memoized subscription tier
    const subscriptionTier = useExpensiveMemo(() => {
      return user?.subscription_tier || 'free';
    }, [user?.subscription_tier]);

    // Memoized refresh handler
    const handleRefresh = useStableCallback(() => {
      requestDeduplicationService.deduplicateRequest(
        'refresh-home-data',
        async () => {
          await queryClient.invalidateQueries({ queryKey: ['home-data'] });
        },
      );
    }, [queryClient]);

    // Memoized add activity handler
    const handleAddActivity = useStableCallback(() => {
      if (isGuest) {
        navigation.navigate('Auth', { mode: 'signin' });
      } else {
        // TaskCreationFlow is deprecated - use AddAssignmentFlow as default
        // Users can switch to other task types from within the flow
        navigation.navigate('AddAssignmentFlow');
      }
    }, [isGuest, navigation]);

    // Show loading state
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      );
    }

    // Show empty state - improved null checking to handle undefined tasks
    if (
      !homeData ||
      (!Array.isArray(homeData.tasks) &&
        !homeData.tasks?.length &&
        !homeData.nextTask)
    ) {
      return (
        <ScrollView
          style={styles.container}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={handleRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }>
          <TrialBannerSection
            shouldShowBanner={shouldShowBanner}
            trialDaysRemaining={trialDaysRemaining}
            onSubscribePress={onSubscribePress}
            onDismissBanner={onDismissBanner}
          />
          <EmptyStateSection
            isGuest={isGuest}
            onAddActivity={handleAddActivity}
          />
        </ScrollView>
      );
    }

    // Show content
    return (
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }>
        <TrialBannerSection
          shouldShowBanner={shouldShowBanner}
          trialDaysRemaining={trialDaysRemaining}
          onSubscribePress={onSubscribePress}
          onDismissBanner={onDismissBanner}
        />

        <NextTaskSection
          homeData={homeData}
          isGuest={isGuest}
          onViewDetails={onViewDetails}
        />

        <TodayOverviewSection
          homeData={homeData}
          monthlyTaskCount={monthlyTaskCount}
          subscriptionTier={subscriptionTier}
        />

        <TaskListSection
          homeData={homeData}
          isGuest={isGuest}
          onSwipeComplete={onSwipeComplete}
          onViewDetails={onViewDetails}
          onFabStateChange={onFabStateChange}
        />
      </ScrollView>
    );
  });

SimplifiedHomeScreenContent.displayName = 'SimplifiedHomeScreenContent';

// ===========================================
// 🎨 STYLES
// ===========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  taskListContainer: {
    padding: SPACING.md,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
    marginTop: SPACING.xxl,
  },
  emptyStateTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: COLORS.text,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  emptyStateMessage: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 20,
  },
  emptyStateButton: {
    minWidth: 200,
  },
  taskCard: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gray300,
  },
  taskTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold as any,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  taskDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  viewDetailsButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  viewDetailsText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.white,
    fontWeight: FONT_WEIGHTS.medium as any,
  },
});

// ===========================================
// 🔄 BACKWARD COMPATIBILITY
// ===========================================

// Legacy HomeScreenContent for backward compatibility
export const HomeScreenContent: React.FC<{
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
}> = props => {
  const {
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
  } = props;

  return (
    <SimplifiedHomeScreenContent
      data={{
        isGuest,
        homeData,
        isLoading,
        monthlyTaskCount,
      }}
      uiState={{
        isFabOpen,
        shouldShowBanner,
        trialDaysRemaining,
      }}
      eventHandlers={{
        onSwipeComplete,
        onViewDetails,
        onFabStateChange,
        onSubscribePress,
        onDismissBanner,
      }}
    />
  );
};

export default SimplifiedHomeScreenContent;
