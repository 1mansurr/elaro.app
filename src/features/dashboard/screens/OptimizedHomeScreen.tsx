import React, {
  useRef,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Animated,
  TouchableWithoutFeedback,
  Alert,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { FONT_WEIGHTS } from '@/constants/theme';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions } from '@react-navigation/native';
import { NotificationBell } from '@/shared/components/NotificationBell';
import { NotificationHistoryModal } from '@/shared/components/NotificationHistoryModal';

// Performance optimization imports
import { useExpensiveMemo, useStableCallback } from '@/hooks/useMemoization';
import { requestDeduplicationService } from '@/services/RequestDeduplicationService';
import { performanceMonitoringService } from '@/services/PerformanceMonitoringService';

import { RootStackParamList, Task } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import TrialBanner from '../components/TrialBanner';
import { differenceInCalendarDays } from 'date-fns';
import { useHomeScreenData } from '@/hooks/useDataQueries';
import { useQueryClient } from '@tanstack/react-query';
import { useMonthlyTaskCount } from '@/hooks/useWeeklyTaskCount';
import { useCompleteTask, useDeleteTask, useRestoreTask } from '@/hooks';
import FloatingActionButton from '@/shared/components/FloatingActionButton';
import {
  PrimaryButton,
  QueryStateWrapper,
  QuickAddModal,
} from '@/shared/components';
import { useToast } from '@/contexts/ToastContext';
import { mapErrorCodeToMessage, getErrorTitle } from '@/utils/errorMapping';
import {
  COLORS,
  FONT_SIZES,
  FONT_WEIGHTS as FONT_WEIGHTS_ALL,
  SPACING,
} from '@/constants/theme';
import NextTaskCard from '../components/NextTaskCard';
import TodayOverviewCard from '../components/TodayOverviewCard';
import TaskDetailSheet from '@/shared/components/TaskDetailSheet';
import TaskCardSkeleton from '../components/TaskCardSkeleton';
import { SwipeableTaskCard } from '../components/SwipeableTaskCard';
import { HomeScreenEmptyState } from '../components/HomeScreenEmptyState';
import { supabase } from '@/services/supabase';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

const HomeScreen = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { user, isGuest } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Performance monitoring
  useEffect(() => {
    performanceMonitoringService.startTimer('home-screen-render');
    return () => {
      performanceMonitoringService.endTimer('home-screen-render');
    };
  }, []);

  // State management with performance optimizations
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);
  const [isQuickAddVisible, setIsQuickAddVisible] = useState(false);
  const [draftCount, setDraftCount] = useState(0);
  const [isNotificationHistoryVisible, setIsNotificationHistoryVisible] =
    useState(false);
  const fabAnimation = useRef(new Animated.Value(0)).current;

  // Optimized data fetching with memoization
  const { data: homeData, isLoading, error } = useHomeScreenData();
  const { monthlyTaskCount } = useMonthlyTaskCount();

  // Memoized calculations for expensive operations
  const processedHomeData = useExpensiveMemo(() => {
    performanceMonitoringService.startTimer('data-processing');

    if (!homeData) return null;

    const result = {
      nextUpcomingTask: homeData.nextUpcomingTask,
      todayOverview: homeData.todayOverview,
      // Add any other processing here
    };

    performanceMonitoringService.endTimer('data-processing');
    return result;
  }, [homeData]);

  // Optimized mutation hooks
  const completeTaskMutation = useCompleteTask();
  const deleteTaskMutation = useDeleteTask();
  const restoreTaskMutation = useRestoreTask();

  // Performance-optimized callbacks
  const handleCompleteTask = useStableCallback(async () => {
    if (!selectedTask) return;

    try {
      performanceMonitoringService.startTimer('task-completion');

      // Use request deduplication to prevent duplicate completions
      await requestDeduplicationService.deduplicateRequest(
        `complete-task-${selectedTask.id}`,
        async () => {
          return completeTaskMutation.mutateAsync({
            taskId: selectedTask.id,
            taskType: selectedTask.type,
            taskTitle: selectedTask.title || selectedTask.name,
          });
        },
      );

      performanceMonitoringService.endTimer('task-completion');
      Alert.alert('Success', 'Task marked as complete!');
    } catch (error) {
      performanceMonitoringService.endTimer('task-completion');
      console.error('Error completing task:', error);
    }
  }, [selectedTask, completeTaskMutation]);

  const handleDeleteTask = useStableCallback(async () => {
    if (!selectedTask) return;

    try {
      performanceMonitoringService.startTimer('task-deletion');

      await requestDeduplicationService.deduplicateRequest(
        `delete-task-${selectedTask.id}`,
        async () => {
          return deleteTaskMutation.mutateAsync({
            taskId: selectedTask.id,
            taskType: selectedTask.type,
            taskTitle: selectedTask.title || 'Untitled Task',
          });
        },
      );

      performanceMonitoringService.endTimer('task-deletion');
      setSelectedTask(null);
      Alert.alert('Success', 'Task deleted successfully!');
    } catch (error) {
      performanceMonitoringService.endTimer('task-deletion');
      console.error('Error deleting task:', error);
    }
  }, [selectedTask, deleteTaskMutation]);

  const handleRestoreTask = useStableCallback(async () => {
    if (!selectedTask) return;

    try {
      performanceMonitoringService.startTimer('task-restoration');

      await requestDeduplicationService.deduplicateRequest(
        `restore-task-${selectedTask.id}`,
        async () => {
          return restoreTaskMutation.mutateAsync({
            taskId: selectedTask.id,
            taskType: selectedTask.type,
            taskTitle: selectedTask.title || 'Untitled Task',
          });
        },
      );

      performanceMonitoringService.endTimer('task-restoration');
      setSelectedTask(null);
      Alert.alert('Success', 'Task restored successfully!');
    } catch (error) {
      performanceMonitoringService.endTimer('task-restoration');
      console.error('Error restoring task:', error);
    }
  }, [selectedTask, restoreTaskMutation]);

  // Memoized UI components
  const MemoizedNextTaskCard = useMemo(() => {
    return (
      <NextTaskCard
        task={processedHomeData?.nextUpcomingTask || null}
        isGuestMode={isGuest}
        onAddActivity={() => setIsFabOpen(true)}
        onViewDetails={task => setSelectedTask(task)}
      />
    );
  }, [processedHomeData?.nextUpcomingTask, isGuest]);

  const MemoizedTodayOverviewCard = useMemo(() => {
    return (
      <TodayOverviewCard
        overview={processedHomeData?.todayOverview || null}
        monthlyTaskCount={monthlyTaskCount || 0}
        subscriptionTier={user?.subscription_tier || 'free'}
      />
    );
  }, [
    processedHomeData?.todayOverview,
    monthlyTaskCount,
    user?.subscription_tier,
  ]);

  // Performance monitoring for render times
  useEffect(() => {
    const startTime = Date.now();
    return () => {
      const renderTime = Date.now() - startTime;
      performanceMonitoringService.recordRenderTime('HomeScreen', renderTime);
    };
  });

  // Rest of the component logic...
  const getPersonalizedTitle = useCallback(() => {
    const hour = new Date().getHours();
    if (hour < 12) return `Good morning, ${user?.first_name || 'there'}!`;
    if (hour < 18) return `Good afternoon, ${user?.first_name || 'there'}!`;
    return `Good evening, ${user?.first_name || 'there'}!`;
  }, [user?.first_name]);

  const shouldShowBanner = useMemo(() => {
    if (isGuest || isBannerDismissed) return false;
    if (!user?.subscription_tier || user.subscription_tier === 'oddity')
      return false;

    const trialDaysRemaining = user.subscription_expires_at
      ? differenceInCalendarDays(
          new Date(user.subscription_expires_at),
          new Date(),
        )
      : 0;

    return trialDaysRemaining > 0 && trialDaysRemaining <= 7;
  }, [
    isGuest,
    isBannerDismissed,
    user?.subscription_tier,
    user?.subscription_expires_at,
  ]);

  const trialDaysRemaining = useMemo(() => {
    if (!user?.subscription_expires_at) return 0;
    return differenceInCalendarDays(
      new Date(user.subscription_expires_at),
      new Date(),
    );
  }, [user?.subscription_expires_at]);

  const handleSubscribePress = useCallback(() => {
    navigation.navigate('Profile');
  }, [navigation]);

  const handleDismissBanner = useCallback(() => {
    setIsBannerDismissed(true);
  }, []);

  const handleFabStateChange = useCallback((state: { isOpen: boolean }) => {
    setIsFabOpen(state.isOpen);
  }, []);

  const handleViewDetails = useCallback((task: Task) => {
    setSelectedTask(task);
  }, []);

  const handleCloseSheet = useCallback(() => {
    setSelectedTask(null);
  }, []);

  const handleEditTask = useCallback(
    (task: Task) => {
      setSelectedTask(null);
      const modalName =
        task.type === 'assignment'
          ? 'AddAssignmentFlow'
          : task.type === 'lecture'
            ? 'AddLectureFlow'
            : task.type === 'study_session'
              ? 'AddStudySessionFlow'
              : 'AddAssignmentFlow';
      (navigation as any).navigate(modalName, { taskToEdit: task });
    },
    [navigation],
  );

  const handleSwipeComplete = useCallback((task: Task) => {
    setSelectedTask(task);
  }, []);

  // Performance-optimized refresh handler
  const handleRefresh = useStableCallback(async () => {
    performanceMonitoringService.startTimer('home-screen-refresh');

    try {
      await queryClient.invalidateQueries({ queryKey: ['homeScreenData'] });
      performanceMonitoringService.endTimer('home-screen-refresh');
    } catch (error) {
      performanceMonitoringService.endTimer('home-screen-refresh');
      console.error('Error refreshing data:', error);
    }
  }, [queryClient]);

  return (
    <View style={styles.container}>
      {/* Header with Notification Bell */}
      {!isGuest && (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{getPersonalizedTitle()}</Text>
          <NotificationBell
            onPress={() => setIsNotificationHistoryVisible(true)}
          />
        </View>
      )}

      <ScrollView
        style={styles.scrollContainer}
        refreshControl={
          !isGuest ? (
            <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
          ) : undefined
        }
        scrollEnabled={!isFabOpen}>
        {shouldShowBanner && (
          <TrialBanner
            daysRemaining={trialDaysRemaining as number}
            onPressSubscribe={handleSubscribePress}
            onDismiss={handleDismissBanner}
          />
        )}

        {isGuest && <Text style={styles.title}>{getPersonalizedTitle()}</Text>}

        <SwipeableTaskCard
          onSwipeComplete={() =>
            processedHomeData?.nextUpcomingTask &&
            handleSwipeComplete(processedHomeData.nextUpcomingTask)
          }
          enabled={!isGuest && !!processedHomeData?.nextUpcomingTask}>
          {MemoizedNextTaskCard}
        </SwipeableTaskCard>

        {MemoizedTodayOverviewCard}

        <PrimaryButton
          title="View Full Calendar"
          onPress={() => navigation.navigate('Calendar')}
        />
      </ScrollView>

      {/* FAB and Modals */}
      <FloatingActionButton
        actions={[
          {
            label: 'Add Course',
            icon: 'school',
            onPress: () => navigation.navigate('AddCourseFlow'),
          },
          {
            label: 'Add Lecture',
            icon: 'book',
            onPress: () => navigation.navigate('AddLectureFlow'),
          },
          {
            label: 'Add Assignment',
            icon: 'document-text',
            onPress: () => navigation.navigate('AddAssignmentFlow'),
          },
          {
            label: 'Add Study Session',
            icon: 'time',
            onPress: () => navigation.navigate('AddStudySessionFlow'),
          },
        ]}
        onStateChange={handleFabStateChange}
        onDoubleTap={() => {}}
        draftCount={0}
        onDraftBadgePress={() => {}}
      />

      <QuickAddModal
        isVisible={isQuickAddVisible}
        onClose={() => setIsQuickAddVisible(false)}
      />

      <TaskDetailSheet
        task={selectedTask}
        isVisible={!!selectedTask}
        onClose={handleCloseSheet}
        onEdit={handleEditTask}
        onComplete={handleCompleteTask}
        onDelete={handleDeleteTask}
      />

      <NotificationHistoryModal
        isVisible={isNotificationHistoryVisible}
        onClose={() => setIsNotificationHistoryVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: COLORS.white,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: COLORS.textPrimary,
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginTop: 60,
    marginBottom: 20,
  },
  scrollContainer: {
    flex: 1,
  },
});

export default HomeScreen;
