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

import { RootStackParamList, Task } from '@/types';
import { useDeviceId } from '@/hooks/useDeviceId';
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

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

const HomeScreen = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const deviceId = useDeviceId();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // State management with performance optimizations
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
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
    if (!homeData) return null;

    const result = {
      nextUpcomingTask: homeData.nextUpcomingTask,
      todayOverview: homeData.todayOverview,
      // Add any other processing here
    };

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

      Alert.alert('Success', 'Task marked as complete!');
    } catch (error) {
      console.error('Error completing task:', error);
    }
  }, [selectedTask, completeTaskMutation]);

  const handleDeleteTask = useStableCallback(async () => {
    if (!selectedTask) return;

    try {
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

      setSelectedTask(null);
      Alert.alert('Success', 'Task deleted successfully!');
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  }, [selectedTask, deleteTaskMutation]);

  const handleRestoreTask = useStableCallback(async () => {
    if (!selectedTask) return;

    try {
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

      setSelectedTask(null);
      Alert.alert('Success', 'Task restored successfully!');
    } catch (error) {
      console.error('Error restoring task:', error);
    }
  }, [selectedTask, restoreTaskMutation]);

  // Memoized UI components
  const MemoizedNextTaskCard = useMemo(() => {
    return (
      <NextTaskCard
        task={processedHomeData?.nextUpcomingTask || null}
        isGuestMode={false}
        onAddActivity={() => setIsFabOpen(true)}
        onViewDetails={task => setSelectedTask(task)}
      />
    );
  }, [processedHomeData?.nextUpcomingTask]);

  const MemoizedTodayOverviewCard = useMemo(() => {
    return (
      <TodayOverviewCard
        overview={processedHomeData?.todayOverview || null}
        monthlyTaskCount={monthlyTaskCount || 0}
        subscriptionTier={'free'}
      />
    );
  }, [processedHomeData?.todayOverview, monthlyTaskCount]);

  // Rest of the component logic...
  const getPersonalizedTitle = useCallback(() => {
    const hour = new Date().getHours();
    if (hour < 12) return `Good morning, there!`;
    if (hour < 17) return `Good afternoon, there!`;
    return `Good evening, there!`;
  }, []);

  // Trial banner logic removed - no longer using free trials

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
    try {
      await queryClient.invalidateQueries({ queryKey: ['homeScreenData'] });
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  }, [queryClient]);

  return (
    <View style={styles.container}>
      {/* Header with Notification Bell */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{getPersonalizedTitle()}</Text>
        <NotificationBell
          onPress={() => setIsNotificationHistoryVisible(true)}
        />
      </View>

      <ScrollView
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
        }
        scrollEnabled={!isFabOpen}>
        <SwipeableTaskCard
          onSwipeComplete={() =>
            processedHomeData?.nextUpcomingTask &&
            handleSwipeComplete(processedHomeData.nextUpcomingTask)
          }
          enabled={!!processedHomeData?.nextUpcomingTask}>
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
        isOpen={isFabOpen}
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
