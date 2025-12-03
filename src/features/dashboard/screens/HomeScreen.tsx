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
import { NotificationBell } from '@/shared/components/NotificationBell';
import { NotificationHistoryModal } from '@/shared/components/NotificationHistoryModal';

import { RootStackParamList, Task } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import TrialBanner from '../components/TrialBanner';
import { differenceInCalendarDays } from 'date-fns';
import { useHomeScreenData } from '@/hooks/useDataQueries';
import { useQueryClient } from '@tanstack/react-query';
import { useMonthlyTaskCount } from '@/hooks/useWeeklyTaskCount';
import { useCompleteTask, useDeleteTask, useRestoreTask } from '@/hooks';
import FloatingActionButton from '@/shared/components/FloatingActionButton';
import { Button, QueryStateWrapper, QuickAddModal } from '@/shared/components';
import { useToast } from '@/contexts/ToastContext';
import { mapErrorCodeToMessage, getErrorTitle } from '@/utils/errorMapping';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';
import NextTaskCard from '../components/NextTaskCard';
import TodayOverviewCard from '../components/TodayOverviewCard';
import TaskDetailSheet from '@/shared/components/TaskDetailSheet';
import TaskCardSkeleton from '../components/TaskCardSkeleton';
import { SwipeableTaskCard } from '../components/SwipeableTaskCard';
import { HomeScreenEmptyState } from '../components/HomeScreenEmptyState';
import { supabase } from '@/services/supabase';
import { mixpanelService } from '@/services/mixpanel';
import { AnalyticsEvents } from '@/services/analyticsEvents';
import { TASK_EVENTS } from '@/utils/analyticsEvents';
import { createExampleData } from '@/utils/exampleData';
import { getDraftCount } from '@/utils/draftStorage';
import { useJSThreadMonitor } from '@/hooks/useJSThreadMonitor';
import { useMemoryMonitor } from '@/hooks/useMemoryMonitor';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

// Helper function to get greeting based on time of day
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

const HomeScreen = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { session, user } = useAuth();
  const isGuest = !session;
  const queryClient = useQueryClient();
  
  // Check if user is new (just completed onboarding, no example data yet)
  // Skip API call for new users to avoid unnecessary Edge Function calls
  const [isNewUser, setIsNewUser] = useState<boolean | null>(null);
  
  useEffect(() => {
    const checkIfNewUser = async () => {
      if (isGuest || !user || !user.onboarding_completed) {
        setIsNewUser(false);
        return;
      }
      
      // Check if example data has been created
      const hasCreatedExamples = await AsyncStorage.getItem(
        'hasCreatedExampleData',
      );
      
      // If user just completed onboarding and no example data created yet,
      // they're a new user - skip API call
      const userIsNew = !hasCreatedExamples;
      setIsNewUser(userIsNew);
      
      // If user is new, completely remove query from cache to prevent any retries
      if (userIsNew) {
        queryClient.cancelQueries({ queryKey: ['homeScreenData'] });
        // Remove query from cache completely to prevent retries
        queryClient.removeQueries({ queryKey: ['homeScreenData'] });
      }
    };
    
    checkIfNewUser();
  }, [user, isGuest, queryClient]);
  
  // If user creates data manually (not through example data), update isNewUser
  useEffect(() => {
    if (
      !isGuest &&
      user &&
      homeData &&
      (homeData.nextUpcomingTask ||
        (homeData.todayOverview &&
          (homeData.todayOverview.lectures > 0 ||
            homeData.todayOverview.assignments > 0 ||
            homeData.todayOverview.studySessions > 0)))
    ) {
      // User has data, they're no longer a new user
      if (isNewUser === true) {
        setIsNewUser(false);
      }
    }
  }, [homeData, isGuest, user, isNewUser]);
  
  // Only fetch data if user is not new (has data or example data was created)
  // Wait until we've determined if user is new before enabling query
  const shouldFetchData = !isGuest && isNewUser === false;
  
  const {
    data: homeData,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useHomeScreenData(shouldFetchData);
  const { monthlyTaskCount } = useMonthlyTaskCount();
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);
  const [isQuickAddVisible, setIsQuickAddVisible] = useState(false);
  const [draftCount, setDraftCount] = useState(0);
  const [isNotificationHistoryVisible, setIsNotificationHistoryVisible] =
    useState(false);
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

  const fabActions = useMemo(
    () => [
      {
        icon: 'book-outline' as const,
        label: 'Add Study Session',
        onPress: () => {
          mixpanelService.track(AnalyticsEvents.STUDY_SESSION_CREATED, {
            task_type: 'study_session',
            source: 'home_screen_fab',
            creation_method: 'manual',
            timestamp: new Date().toISOString(),
          });
          navigation.navigate('AddStudySessionFlow');
        },
      },
      {
        icon: 'document-text-outline' as const,
        label: 'Add Assignment',
        onPress: () => {
          mixpanelService.track(AnalyticsEvents.ASSIGNMENT_CREATED, {
            task_type: 'assignment',
            source: 'home_screen_fab',
            creation_method: 'manual',
            timestamp: new Date().toISOString(),
          });
          navigation.navigate('AddAssignmentFlow');
        },
      },
      {
        icon: 'school-outline' as const,
        label: 'Add Lecture',
        onPress: () => {
          mixpanelService.track(AnalyticsEvents.LECTURE_CREATED, {
            task_type: 'lecture',
            source: 'home_screen_fab',
            creation_method: 'manual',
            timestamp: new Date().toISOString(),
          });
          navigation.navigate('AddLectureFlow');
        },
      },
    ],
    [navigation],
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

  // Trial banner logic - memoized to prevent recalculation
  const trialDaysRemaining = useMemo(() => {
    if (
      user?.subscription_status !== 'trialing' ||
      !user?.subscription_expires_at
    ) {
      return null;
    }
    const today = new Date();
    const expirationDate = new Date(user.subscription_expires_at);
    return differenceInCalendarDays(expirationDate, today);
  }, [user?.subscription_status, user?.subscription_expires_at]);

  const shouldShowBanner = useMemo(
    () =>
      trialDaysRemaining !== null &&
      trialDaysRemaining <= 3 &&
      !isBannerDismissed,
    [trialDaysRemaining, isBannerDismissed],
  );

  // Check AsyncStorage for banner dismissal state
  useEffect(() => {
    let isMounted = true;

    const checkBannerDismissal = async () => {
      if (!user?.id || trialDaysRemaining === null) {
        if (isMounted) setIsBannerDismissed(false);
        return;
      }

      try {
        const storageKey = `@trial_banner_dismissed_${user.id}_${trialDaysRemaining}`;
        const dismissed = await AsyncStorage.getItem(storageKey);
        if (isMounted) setIsBannerDismissed(dismissed === 'true');
      } catch (error) {
        console.error('Error checking banner dismissal state:', error);
        if (isMounted) setIsBannerDismissed(false);
      }
    };

    checkBannerDismissal();

    return () => {
      isMounted = false;
    };
  }, [user?.id, trialDaysRemaining]);

  const handleDismissBanner = useCallback(async () => {
    if (!user?.id || trialDaysRemaining === null) return;

    try {
      const storageKey = `@trial_banner_dismissed_${user.id}_${trialDaysRemaining}`;
      await AsyncStorage.setItem(storageKey, 'true');
      setIsBannerDismissed(true);
    } catch (error) {
      console.error('Error saving banner dismissal state:', error);
    }
  }, [user?.id, trialDaysRemaining]);

  const handleSubscribePress = useCallback(() => {
    Alert.alert(
      'Unlock Premium Access',
      'As an early user, you can unlock all premium features for free. Would you like to upgrade your account?',
      [
        { text: 'Not Now', style: 'cancel' },
        {
          text: 'Upgrade for Free',
          onPress: async () => {
            try {
              const { error } = await supabase.functions.invoke(
                'grant-premium-access',
              );
              if (error) throw new Error(error.message);

              // Invalidate user data to refresh their subscription status and unlock features.
              queryClient.invalidateQueries({ queryKey: ['user'] });
              queryClient.invalidateQueries({ queryKey: ['homeScreenData'] }); // Also refresh home screen data

              Alert.alert(
                'Success!',
                'You now have access to all premium features.',
              );
            } catch (error: unknown) {
              if (error instanceof Error) {
                const errorTitle = getErrorTitle(error);
                const errorMessage = mapErrorCodeToMessage(error);
                Alert.alert(errorTitle, errorMessage);
                console.error('Free upgrade error:', error);
              } else {
                Alert.alert(
                  'Error',
                  'An unknown error occurred. Please try again.',
                );
                console.error('Free upgrade error:', error);
              }
            }
          },
        },
      ],
    );
  }, [queryClient]);

  // Get personalized title - memoized to prevent recalculation on every render
  const personalizedTitle = useMemo(() => {
    if (isGuest) {
      return "Let's Make Today Count";
    }

    const name = user?.username || user?.first_name || 'there';
    return `${getGreeting()}, ${name}!`;
  }, [isGuest, user?.username, user?.first_name]);

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

  // Create example data for brand new users
  useEffect(() => {
    const checkAndCreateExampleData = async () => {
      // Only for authenticated users and new users
      if (isGuest || !user || isLoading || isNewUser !== true) return;

      try {
        const hasCreatedExamples = await AsyncStorage.getItem(
          'hasCreatedExampleData',
        );

        // If we haven't created examples yet
        if (!hasCreatedExamples) {
          console.log(
            '📚 New user with no data detected. Creating example data...',
          );

          // Set flag immediately to prevent duplicate creation
          await AsyncStorage.setItem('hasCreatedExampleData', 'true');

          // Create example data
          const result = await createExampleData(user.id);

          if (result.success) {
            console.log('✅ Example data created successfully');
            
            // Update isNewUser state to enable data fetching
            setIsNewUser(false);

            // Refresh home screen data to show examples
            await queryClient.invalidateQueries({
              queryKey: ['homeScreenData'],
            });
            await queryClient.invalidateQueries({ queryKey: ['courses'] });
            await queryClient.invalidateQueries({ queryKey: ['assignments'] });
            await queryClient.invalidateQueries({ queryKey: ['lectures'] });
            await queryClient.invalidateQueries({
              queryKey: ['studySessions'],
            });

            // Show a subtle toast notification
            showToast({
              message:
                "📚 We've added some example tasks to help you get started!",
              duration: 4000,
            });
          } else {
            console.error('Failed to create example data:', result.error);
            // Reset flag if creation failed so user can try again
            await AsyncStorage.removeItem('hasCreatedExampleData');
            // Don't show error to user - it's not critical
          }
        }
      } catch (error) {
        console.error('Error in checkAndCreateExampleData:', error);
        // Reset flag if error occurred
        await AsyncStorage.removeItem('hasCreatedExampleData').catch(() => {});
        // Fail silently - not critical for app function
      }
    };

    // Wait a bit after component mounts to avoid blocking initial render
    const timer = setTimeout(() => {
      checkAndCreateExampleData();
    }, 1500);

    return () => clearTimeout(timer);
  }, [isGuest, user, isLoading, isNewUser, queryClient, showToast]);

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

  // Wrap content with QueryStateWrapper for authenticated users
  const content = (
    <View style={styles.container} testID="home-screen">
      {/* Header with Notification Bell */}
      {!isGuest && (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{personalizedTitle}</Text>
          <NotificationBell onPress={handleNotificationBellPress} />
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
        {isGuest && <Text style={styles.title}>{personalizedTitle}</Text>}
        <SwipeableTaskCard
          onSwipeComplete={handleSwipeComplete}
          enabled={!isGuest && !!homeData?.nextUpcomingTask}>
          <NextTaskCard
            task={isGuest ? null : homeData?.nextUpcomingTask || null}
            isGuestMode={isGuest}
            onAddActivity={handleAddActivity}
            onViewDetails={handleViewDetails}
          />
        </SwipeableTaskCard>
        <TodayOverviewCard
          overview={isGuest ? null : homeData?.todayOverview || null}
          monthlyTaskCount={isGuest ? 0 : monthlyTaskCount}
          subscriptionTier={user?.subscription_tier || 'free'}
        />
        {/* Only show calendar button for authenticated users */}
        {!isGuest && (
          <Button title="View Full Calendar" onPress={handleCalendarPress} />
        )}
      </ScrollView>

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

  // For authenticated users, wrap with QueryStateWrapper
  if (!isGuest) {
    // For new users (just completed onboarding, no data yet), show empty state immediately
    // Skip API call to avoid unnecessary Edge Function errors
    if (isNewUser === true) {
      return (
        <QueryStateWrapper
          isLoading={false}
          isError={false}
          error={null}
          data={null}
          refetch={handleRefetch}
          isRefetching={false}
          emptyStateComponent={
            <HomeScreenEmptyState onAddActivity={handleAddActivity} />
          }>
          {content}
        </QueryStateWrapper>
      );
    }
    
    // For existing users or while checking, use normal QueryStateWrapper
    return (
      <QueryStateWrapper
        isLoading={isLoading || isNewUser === null}
        isError={isError}
        error={error}
        data={homeData}
        refetch={handleRefetch}
        isRefetching={isRefetching}
        onRefresh={refetch}
        emptyStateComponent={
          <HomeScreenEmptyState onAddActivity={handleAddActivity} />
        }
        skeletonComponent={<TaskCardSkeleton />}
        skeletonCount={3}>
        {content}
      </QueryStateWrapper>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.background,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    flex: 1,
  },
  scrollContainer: {
    padding: SPACING.lg,
    paddingBottom: 80,
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
