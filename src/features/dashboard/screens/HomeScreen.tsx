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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NotificationBell } from '@/shared/components/NotificationBell';
import { NotificationHistoryModal } from '@/shared/components/NotificationHistoryModal';

import { RootStackParamList, Task } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { useHomeScreenData, useCalendarData } from '@/hooks/useDataQueries';
import { useQueryClient } from '@tanstack/react-query';
import { useMonthlyTaskCount } from '@/hooks/useWeeklyTaskCount';
import { useCompleteTask, useDeleteTask, useRestoreTask } from '@/hooks';
import { useLimitCheck } from '@/hooks/useLimitCheck';
import { useUsageLimitPaywall } from '@/contexts/UsageLimitPaywallContext';
import FloatingActionButton from '@/shared/components/FloatingActionButton';
import { Button, QueryStateWrapper, QuickAddModal } from '@/shared/components';
import { useToast } from '@/contexts/ToastContext';
import { mapErrorCodeToMessage, getErrorTitle } from '@/utils/errorMapping';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';
import { UpNextCard } from '../components/UpNextCard';
import { TodayOverviewGrid } from '../components/TodayOverviewGrid';
import { MonthlyLimitCard } from '../components/MonthlyLimitCard';
import { UpcomingTaskItem } from '../components/UpcomingTaskItem';
import TaskDetailSheet from '@/shared/components/TaskDetailSheet';
import TaskCardSkeleton from '../components/TaskCardSkeleton';
import { SwipeableTaskCard } from '../components/SwipeableTaskCard';
import { HomeScreenEmptyState } from '../components/HomeScreenEmptyState';
import { supabase } from '@/services/supabase';
import { mixpanelService } from '@/services/mixpanel';
import { AnalyticsEvents } from '@/services/analyticsEvents';
import { TASK_EVENTS } from '@/utils/analyticsEvents';
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
  const { session, user } = useAuth();
  const isGuest = !session;
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  // Always fetch data for authenticated users
  const shouldFetchData = !isGuest;

  const {
    data: homeData,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useHomeScreenData(shouldFetchData);
  const { monthlyTaskCount } = useMonthlyTaskCount();

  // Get calendar data for upcoming tasks
  const { data: calendarData } = useCalendarData(new Date());

  // Extract upcoming tasks (next 4, excluding the "Up Next" task)
  const upcomingTasks = useMemo(() => {
    if (!calendarData || isGuest) return [];
    const now = new Date();
    const allTasks = Object.values(calendarData).flat();
    const upcoming = allTasks
      .filter(task => {
        const taskDate = new Date(task.startTime || task.date);
        return isAfter(taskDate, now);
      })
      .sort((a, b) => {
        const dateA = new Date(a.startTime || a.date);
        const dateB = new Date(b.startTime || b.date);
        return dateA.getTime() - dateB.getTime();
      })
      .slice(0, 4);
    return upcoming;
  }, [calendarData, isGuest]);
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);
  const [isQuickAddVisible, setIsQuickAddVisible] = useState(false);
  const [draftCount, setDraftCount] = useState(0);
  const [isNotificationHistoryVisible, setIsNotificationHistoryVisible] =
    useState(false);
  const [isEmptyStateDismissed, setIsEmptyStateDismissed] = useState(false);
  const fabAnimation = useRef(new Animated.Value(0)).current;

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

  const promptSignUp = useCallback(() => {
    mixpanelService.track(AnalyticsEvents.SIGN_UP_PROMPTED, {
      source: 'home_screen',
      user_type: isGuest ? 'guest' : 'authenticated',
      prompt_context: 'home_screen_access',
      timestamp: new Date().toISOString(),
    });
    navigation.navigate('Auth', { mode: 'signup' });
  }, [isGuest, navigation]);

  const { checkCourseLimit, checkActivityLimit } = useLimitCheck();
  const { showUsageLimitPaywall } = useUsageLimitPaywall();

  const handleAddCourse = useCallback(async () => {
    const limitCheck = await checkCourseLimit();
    if (!limitCheck.allowed && limitCheck.limitType) {
      showUsageLimitPaywall(
        limitCheck.limitType,
        limitCheck.currentUsage!,
        limitCheck.maxLimit!,
        limitCheck.actionLabel!,
        { route: 'AddCourseFlow', params: undefined },
      );
      return;
    }
    navigation.navigate('AddCourseFlow');
  }, [checkCourseLimit, showUsageLimitPaywall, navigation]);

  const handleAddActivity = useCallback(
    async (
      flowName: 'AddAssignmentFlow' | 'AddLectureFlow' | 'AddStudySessionFlow',
      eventName: string,
    ) => {
      const limitCheck = await checkActivityLimit();
      if (!limitCheck.allowed && limitCheck.limitType) {
        showUsageLimitPaywall(
          limitCheck.limitType,
          limitCheck.currentUsage!,
          limitCheck.maxLimit!,
          limitCheck.actionLabel!,
          { route: flowName, params: undefined },
        );
        return;
      }
      // Track analytics before navigating
      mixpanelService.track(eventName as any, {
        task_type: flowName
          .replace('Add', '')
          .replace('Flow', '')
          .toLowerCase(),
        source: 'home_screen_fab',
        creation_method: 'manual',
        timestamp: new Date().toISOString(),
      });
      navigation.navigate(flowName);
    },
    [checkActivityLimit, showUsageLimitPaywall, navigation],
  );

  const fabActions = useMemo(
    () => [
      {
        icon: 'book-outline' as const,
        label: 'Add Study Session',
        onPress: () =>
          handleAddActivity(
            'AddStudySessionFlow',
            AnalyticsEvents.STUDY_SESSION_CREATED,
          ),
      },
      {
        icon: 'document-text-outline' as const,
        label: 'Add Assignment',
        onPress: () =>
          handleAddActivity(
            'AddAssignmentFlow',
            AnalyticsEvents.ASSIGNMENT_CREATED,
          ),
      },
      {
        icon: 'school-outline' as const,
        label: 'Add Lecture',
        onPress: () =>
          handleAddActivity('AddLectureFlow', AnalyticsEvents.LECTURE_CREATED),
      },
    ],
    [handleAddActivity],
  );

  // Memoize backdrop opacity interpolation to prevent recalculation
  const backdropOpacity = useMemo(
    () =>
      fabAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1], // Animate opacity to 1 to show the blur view
      }),
    [fabAnimation],
  );

  const handleFabStateChange = useCallback(
    ({ isOpen }: { isOpen: boolean }) => {
      setIsFabOpen(isOpen);
      Animated.spring(fabAnimation, {
        toValue: isOpen ? 1 : 0,
        friction: 7,
        useNativeDriver: false,
      }).start();
    },
    [fabAnimation],
  );

  const handleViewDetails = useCallback((task: Task) => {
    mixpanelService.track(AnalyticsEvents.TASK_DETAILS_VIEWED, {
      task_id: task.id,
      task_type: task.type,
      task_title: task.title,
      source: 'home_screen',
      timestamp: new Date().toISOString(),
    });
    setSelectedTask(task);
  }, []);

  const handleCloseSheet = useCallback(() => {
    setSelectedTask(null);
  }, []);

  const handleEditTask = useCallback(() => {
    if (!selectedTask) return;

    mixpanelService.trackEvent(TASK_EVENTS.TASK_EDIT_INITIATED.name, {
      task_id: selectedTask.id,
      task_type: selectedTask.type,
      task_title: selectedTask.title,
      source: 'task_detail_sheet',
    });

    // Determine which modal to navigate to based on task type
    let modalName:
      | 'AddLectureFlow'
      | 'AddAssignmentFlow'
      | 'AddStudySessionFlow';
    switch (selectedTask.type) {
      case 'lecture':
        modalName = 'AddLectureFlow';
        break;
      case 'assignment':
        modalName = 'AddAssignmentFlow';
        break;
      case 'study_session':
        modalName = 'AddStudySessionFlow';
        break;
      default:
        Alert.alert('Error', 'Cannot edit this type of task.');
        return;
    }

    handleCloseSheet(); // Close the sheet first
    navigation.navigate(modalName, {
      initialData: { taskToEdit: selectedTask },
    });
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
    const nextTask = homeData?.nextUpcomingTask;
    if (!nextTask || isGuest) return;

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
  }, [homeData?.nextUpcomingTask, completeTaskMutation, showToast, isGuest]);

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
    if (isGuest) {
      return "Let's Make Today Count";
    }

    const name = user?.username || user?.first_name || 'there';
    return `${getGreeting()}, ${name}!`;
  }, [isGuest, user?.username, user?.first_name]);

  // Get formatted date for header
  const formattedDate = useMemo(() => {
    return format(new Date(), 'EEEE, MMM d');
  }, []);

  // Get subscription limit
  const subscriptionLimit = useMemo(() => {
    return user?.subscription_tier === 'oddity' ? 70 : 15;
  }, [user?.subscription_tier]);

  // Show one-time "How It Works" prompt for new users
  useEffect(() => {
    const checkAndShowWelcomePrompt = async () => {
      // Only show for authenticated users
      if (isGuest || !user) return;

      try {
        const hasSeenPrompt = await AsyncStorage.getItem(
          'hasSeenHowItWorksPrompt',
        );

        if (!hasSeenPrompt) {
          // Set the flag immediately to prevent showing again
          await AsyncStorage.setItem('hasSeenHowItWorksPrompt', 'true');

          // Small delay to let the screen render first
          setTimeout(() => {
            Alert.alert(
              'Welcome to ELARO!',
              "Ready to get started? We recommend a quick look at 'How ELARO Works' to learn about all the features that will help you succeed.",
              [
                {
                  text: 'Show Me How',
                  onPress: () => {
                    // Navigate to Account screen where "How ELARO Works" is located
                    navigation.navigate('Main');
                    // Then switch to Account tab
                    setTimeout(() => {
                      navigation.dispatch(
                        CommonActions.navigate({
                          name: 'Main',
                          params: {
                            screen: 'Account',
                          },
                        }),
                      );
                    }, 100);
                  },
                },
                {
                  text: 'Got It',
                  style: 'cancel',
                },
              ],
            );
          }, 500);
        }
      } catch (error) {
        console.error('Error checking welcome prompt flag:', error);
      }
    };

    checkAndShowWelcomePrompt();
  }, [isGuest, user, navigation]);

  // Memoized callbacks for better performance
  const handleNotificationBellPress = useCallback(() => {
    setIsNotificationHistoryVisible(true);
  }, []);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['homeScreenData'] });
  }, [queryClient]);

  const handleCalendarPress = useCallback(() => {
    navigation.navigate('Calendar');
  }, [navigation]);

  const handleQuickAddClose = useCallback(() => {
    setIsQuickAddVisible(false);
  }, []);

  const handleNotificationHistoryClose = useCallback(() => {
    setIsNotificationHistoryVisible(false);
  }, []);

  const handleQuickAddDoubleTap = useCallback(() => {
    setIsQuickAddVisible(true);
  }, []);

  const handleDraftBadgePress = useCallback(() => {
    navigation.navigate('Drafts');
  }, [navigation]);

  const handleBackdropPress = useCallback(() => {
    handleFabStateChange({ isOpen: false });
  }, [handleFabStateChange]);

  const handleAddActivity = useCallback(() => {
    handleFabStateChange({ isOpen: true });
  }, [handleFabStateChange]);

  const handleRefetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['homeScreenData'] });
  }, [queryClient]);

  const handleDismissEmptyState = useCallback(() => {
    setIsEmptyStateDismissed(true);
  }, []);

  // Handle Up Next card press
  const handleUpNextPress = useCallback(() => {
    if (homeData?.nextUpcomingTask) {
      handleViewDetails(homeData.nextUpcomingTask);
    }
  }, [homeData?.nextUpcomingTask, handleViewDetails]);

  // Handle upcoming task item press
  const handleUpcomingTaskPress = useCallback(
    (task: Task) => {
      handleViewDetails(task);
    },
    [handleViewDetails],
  );

  // Wrap content with QueryStateWrapper for authenticated users
  const content = (
    <View style={styles.container} testID="home-screen">
      {/* Header with Date, Greeting, and Notification Bell */}
      {!isGuest && (
        <View style={[styles.header, { paddingTop: SPACING.md }]}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerDate}>{formattedDate}</Text>
            <Text style={styles.headerTitle}>{personalizedTitle}</Text>
          </View>
          <NotificationBell onPress={handleNotificationBellPress} />
        </View>
      )}

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          !isGuest ? (
            <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
          ) : undefined
        }
        scrollEnabled={!isFabOpen}>
        {isGuest && <Text style={styles.title}>{personalizedTitle}</Text>}

        {/* Up Next Section */}
        {!isGuest && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Up Next</Text>
            <UpNextCard
              task={homeData?.nextUpcomingTask || null}
              onPress={handleUpNextPress}
            />
          </View>
        )}

        {/* Today's Overview Section */}
        {!isGuest && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Today's Overview</Text>
            <TodayOverviewGrid overview={homeData?.todayOverview || null} />
            <MonthlyLimitCard
              monthlyTaskCount={monthlyTaskCount}
              limit={subscriptionLimit}
            />
          </View>
        )}

        {/* Upcoming Section */}
        {!isGuest && upcomingTasks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upcoming</Text>
            {upcomingTasks.map(task => (
              <UpcomingTaskItem
                key={`${task.type}-${task.id}`}
                task={task}
                onPress={() => handleUpcomingTaskPress(task)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );

  // For authenticated users, wrap with QueryStateWrapper
  if (!isGuest) {
    // Show empty state immediately if error, update when data arrives
    // Don't block UI with error states - show empty state instead for better UX
    const shouldShowLoading = isLoading;
    const shouldShowError = false; // Never show error - show empty state instead
    const displayData = isError ? null : homeData; // Treat errors as empty data
    // If empty state is dismissed, show content even if data is empty
    const finalData =
      isEmptyStateDismissed && !displayData
        ? { _dismissed: true }
        : displayData;

    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <QueryStateWrapper
          isLoading={shouldShowLoading}
          isError={shouldShowError}
          error={null} // Don't show error UI
          data={finalData}
          refetch={handleRefetch}
          isRefetching={isRefetching}
          onRefresh={refetch}
          emptyStateComponent={
            !isEmptyStateDismissed ? (
              <HomeScreenEmptyState
                onAddActivity={handleAddActivity}
                onDismiss={handleDismissEmptyState}
              />
            ) : undefined
          }
          skeletonComponent={<TaskCardSkeleton />}
          skeletonCount={3}>
          {content}
        </QueryStateWrapper>

        {/* FAB and modals rendered outside QueryStateWrapper so they're always visible */}
        {isFabOpen && (
          <TouchableWithoutFeedback onPress={handleBackdropPress}>
            <Animated.View
              style={[styles.backdrop, { opacity: backdropOpacity }]}>
              <BlurView
                intensity={40}
                tint="dark"
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          </TouchableWithoutFeedback>
        )}

        <FloatingActionButton
          actions={fabActions}
          onStateChange={handleFabStateChange}
          onDoubleTap={handleQuickAddDoubleTap}
          draftCount={draftCount}
          onDraftBadgePress={handleDraftBadgePress}
        />

        <QuickAddModal
          isVisible={isQuickAddVisible}
          onClose={handleQuickAddClose}
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
          onClose={handleNotificationHistoryClose}
        />
      </View>
    );
  }

  // For guest users, return content directly
  return content;
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
    paddingBottom: 120,
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
