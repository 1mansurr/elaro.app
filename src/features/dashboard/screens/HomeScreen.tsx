import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { RootStackParamList, Task, OverviewData } from '@/types';
import { format } from 'date-fns';
import { useHomeScreenData } from '@/hooks/useDataQueries';
import { AddTaskSheet } from '@/features/tasks/components/AddTaskSheet';
import { useQueryClient } from '@tanstack/react-query';
import { useMonthlyTaskCount } from '@/hooks/useWeeklyTaskCount';
import { useCompleteTask, useDeleteTask, useRestoreTask } from '@/hooks';
import FloatingActionButton from '@/shared/components/FloatingActionButton';
import { QueryStateWrapper } from '@/shared/components';
import { useToast } from '@/contexts/ToastContext';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';
import { UpNextCard } from '../components/UpNextCard';
import { TodayOverviewGrid } from '../components/TodayOverviewGrid';
import { MonthlyLimitCard } from '../components/MonthlyLimitCard';
import { UpcomingTaskItem } from '../components/UpcomingTaskItem';
import TaskDetailSheet from '@/shared/components/TaskDetailSheet';
import TaskCardSkeleton from '../components/TaskCardSkeleton';
import { HomeScreenEmptyState } from '../components/HomeScreenEmptyState';
import { getDraftCount } from '@/utils/draftStorage';
import { useJSThreadMonitor } from '@/hooks/useJSThreadMonitor';
import { useMemoryMonitor } from '@/hooks/useMemoryMonitor';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

// Helper function to get greeting based on time of day
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning'; // 0:00 - 11:59
  if (hour < 17) return 'Good afternoon'; // 12:00 - 16:59
  return 'Good evening'; // 17:00 - 23:59
};

const HomeScreen = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  // Always fetch data
  const shouldFetchData = true;

  const { todaysTasks, upcomingTasks, isLoading, refetch } =
    useHomeScreenData(shouldFetchData);
  const { monthlyTaskCount, monthlyLimit } = useMonthlyTaskCount();

  const nextUpcomingTask = useMemo<Task | null>(
    () => todaysTasks[0] ?? upcomingTasks[0] ?? null,
    [todaysTasks, upcomingTasks],
  );

  const todayOverview = useMemo<OverviewData | null>(() => {
    if (!todaysTasks.length) return null;
    return {
      lectures: 0,
      studySessions: todaysTasks.filter(t => t.type === 'study_session').length,
      assignments: todaysTasks.filter(t => t.type === 'assignment').length,
      reviews: 0,
    };
  }, [todaysTasks]);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [draftCount, setDraftCount] = useState(0);
  // null = still loading from storage, true = show welcome, false = already seen
  const [isWelcomeVisible, setIsWelcomeVisible] = useState<boolean | null>(
    null,
  );

  // Check on mount whether this is the user's first launch
  useEffect(() => {
    AsyncStorage.getItem('hasSeenWelcomeScreen').then(value => {
      setIsWelcomeVisible(value === null);
    });
  }, []);

  const handleDismissWelcome = useCallback(async () => {
    await AsyncStorage.setItem('hasSeenWelcomeScreen', 'true');
    setIsWelcomeVisible(false);
  }, []);

  // Optimistic mutation hooks
  const completeTaskMutation = useCompleteTask();
  const deleteTaskMutation = useDeleteTask();
  const restoreTaskMutation = useRestoreTask();
  const { showToast } = useToast();

  // JS Thread monitoring (dev only) - warnings disabled for cleaner console
  useJSThreadMonitor({
    enabled: false, // Disabled to reduce overhead and warnings
    logSlowFrames: false,
    slowFrameThreshold: 20,
  });

  // Memory monitoring (dev only)
  useMemoryMonitor(__DEV__, 50, 30000); // 50% threshold, check every 30s

  // Load draft count on mount
  useEffect(() => {
    const loadDraftCount = async () => {
      const count = await getDraftCount();
      setDraftCount(count);
    };

    loadDraftCount();
  }, []);

  // Refresh draft count when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const loadDraftCount = async () => {
        const count = await getDraftCount();
        setDraftCount(count);
      };

      loadDraftCount();
    }, []),
  );

  const handleViewDetails = useCallback((task: Task) => {
    setSelectedTask(task);
  }, []);

  const handleCloseSheet = useCallback(() => {
    setSelectedTask(null);
  }, []);

  const handleEditTask = useCallback(() => {
    if (!selectedTask) return;

    if (selectedTask.type === 'lecture') {
      handleCloseSheet();
      navigation.navigate('AddLectureFlow', {
        initialData: { taskToEdit: selectedTask },
      });
    } else {
      Alert.alert('Edit', 'Use the task form to create a new task.');
    }
  }, [selectedTask, handleCloseSheet, navigation]);

  const handleCompleteTask = useCallback(async () => {
    if (!selectedTask) return;

    try {
      // The mutation handles optimistic updates automatically
      await completeTaskMutation.mutateAsync({
        taskId: selectedTask.id,
        taskType: selectedTask.type,
        taskTitle: selectedTask.title || selectedTask.name,
      });

      // Show success message
      Alert.alert('Success', 'Task marked as complete!');
    } catch (error) {
      // Error is already handled by the mutation hook
      console.error('Error completing task:', error);
    }

    handleCloseSheet();
  }, [selectedTask, completeTaskMutation, handleCloseSheet]);

  // Handle swipe-to-complete for next task card
  const handleSwipeComplete = useCallback(async () => {
    const nextTask = nextUpcomingTask;
    if (!nextTask) return;

    try {
      await completeTaskMutation.mutateAsync({
        taskId: nextTask.id,
        taskType: nextTask.type,
        taskTitle: nextTask.title || nextTask.name,
      });

      // Show success toast
      showToast({
        message: `${nextTask.name} completed! 🎉`,
        duration: 3000,
      });
    } catch (error) {
      console.error('Error completing task via swipe:', error);
    }
  }, [nextUpcomingTask, completeTaskMutation, showToast]);

  const handleDeleteTask = useCallback(async () => {
    if (!selectedTask) return;

    // Close the sheet first
    handleCloseSheet();

    // Store task info for undo
    const taskInfo = {
      id: selectedTask.id,
      type: selectedTask.type,
      title: selectedTask.title || selectedTask.name,
    };

    try {
      // Delete the task (optimistic update)
      await deleteTaskMutation.mutateAsync({
        taskId: taskInfo.id,
        taskType: taskInfo.type,
        taskTitle: taskInfo.title,
      });

      // Show undo toast
      showToast({
        message: `${taskInfo.title} moved to Recycle Bin`,
        onUndo: async () => {
          try {
            await restoreTaskMutation.mutateAsync({
              taskId: taskInfo.id,
              taskType: taskInfo.type,
              taskTitle: taskInfo.title,
            });
          } catch (error) {
            console.error('Error restoring task:', error);
          }
        },
        duration: 5000, // 5 seconds to undo
      });
    } catch (error) {
      // Error is already handled by the mutation hook
      console.error('Error deleting task:', error);
    }
  }, [
    selectedTask,
    deleteTaskMutation,
    restoreTaskMutation,
    showToast,
    handleCloseSheet,
  ]);

  // Get personalized title - memoized to prevent recalculation on every render
  const personalizedTitle = useMemo(() => {
    return `${getGreeting()}, there!`;
  }, []);

  // Get formatted date for header
  const formattedDate = useMemo(() => {
    return format(new Date(), 'EEEE, MMM d');
  }, []);

  // Memoized callbacks for better performance
  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['homeScreenData'] });
  }, [queryClient]);

  const handleSettingsPress = useCallback(() => {
    navigation.navigate('Settings');
  }, [navigation]);

  const handleDraftBadgePress = useCallback(() => {
    navigation.navigate('Drafts');
  }, [navigation]);

  const handleRefetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['homeScreenData'] });
  }, [queryClient]);

  // Handle Up Next card press
  const handleUpNextPress = useCallback(() => {
    if (nextUpcomingTask) {
      handleViewDetails(nextUpcomingTask);
    }
  }, [nextUpcomingTask, handleViewDetails]);

  // Handle upcoming task item press
  const handleUpcomingTaskPress = useCallback(
    (task: Task) => {
      handleViewDetails(task);
    },
    [handleViewDetails],
  );

  const content = (
    <View style={styles.container} testID="home-screen">
      {/* Header with Date, Greeting, and Notification Bell */}
      <View style={[styles.header, { paddingTop: SPACING.md }]}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerDate}>{formattedDate}</Text>
          <Text style={styles.headerTitle}>{personalizedTitle}</Text>
        </View>
        <TouchableOpacity
          onPress={handleSettingsPress}
          style={styles.settingsButton}
          activeOpacity={0.7}
          accessibilityLabel="Settings"
          accessibilityRole="button">
          <Ionicons
            name="settings-outline"
            size={26}
            color={COLORS.textPrimary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
        }
        scrollEnabled={true}>
        {/* Up Next Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Up Next</Text>
          <UpNextCard task={nextUpcomingTask} onPress={handleUpNextPress} />
        </View>

        {/* Today's Overview Section */}
        <View style={[styles.section, { marginTop: SPACING.xl }]}>
          <Text style={styles.sectionTitle}>Today's Overview</Text>
          {todaysTasks.length === 0 ? (
            <Text style={styles.emptyText}>Nothing scheduled for today</Text>
          ) : (
            <TodayOverviewGrid overview={todayOverview} />
          )}
          <View style={{ marginTop: SPACING.lg }}>
            <MonthlyLimitCard
              monthlyTaskCount={monthlyTaskCount}
              limit={monthlyLimit}
            />
          </View>
        </View>

        {/* Upcoming Section */}
        <View style={[styles.section, { marginTop: SPACING.xl }]}>
          <Text style={styles.sectionTitle}>Upcoming</Text>
          {upcomingTasks.length > 0 ? (
            upcomingTasks.map(task => (
              <UpcomingTaskItem
                key={`${task.type}-${task.id}`}
                task={task}
                onPress={() => handleUpcomingTaskPress(task)}
              />
            ))
          ) : (
            <Text style={styles.emptyText}>You're all caught up</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <QueryStateWrapper
        isLoading={isLoading}
        isError={false}
        error={null}
        data={{ loaded: true }}
        refetch={handleRefetch}
        isRefetching={false}
        onRefresh={refetch}
        skeletonComponent={<TaskCardSkeleton />}
        skeletonCount={3}>
        {content}
      </QueryStateWrapper>

      {/* FAB and modals rendered outside QueryStateWrapper so they're always visible */}
      <FloatingActionButton
        onPress={() => setSheetVisible(true)}
        draftCount={draftCount}
        onDraftBadgePress={handleDraftBadgePress}
      />

      <AddTaskSheet
        isVisible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onSave={() => {
          setSheetVisible(false);
          refetch();
        }}
      />

      <TaskDetailSheet
        task={selectedTask}
        isVisible={!!selectedTask}
        onClose={handleCloseSheet}
        onEdit={handleEditTask}
        onComplete={handleCompleteTask}
        onDelete={handleDeleteTask}
      />

      {/* Welcome screen — full-screen modal, covers tab bar, shown only on first launch */}
      <Modal
        visible={isWelcomeVisible === true}
        animationType="fade"
        statusBarTranslucent>
        <HomeScreenEmptyState
          onAddActivity={() => {
            handleDismissWelcome();
            setSheetVisible(true);
          }}
          onDismiss={handleDismissWelcome}
        />
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.background,
  },
  headerLeft: {
    flex: 1,
  },
  settingsButton: {
    padding: 8,
    marginLeft: 16,
  },
  headerDate: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    lineHeight: 28,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: 200,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.xs,
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.md,
    paddingVertical: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  loadingText: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHTS.medium,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  errorText: {
    fontSize: FONT_SIZES.xl,
    color: COLORS.textPrimary,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
});

export default HomeScreen;
