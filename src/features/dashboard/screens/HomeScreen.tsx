import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Animated, TouchableWithoutFeedback, Alert } from 'react-native';
import { BlurView } from 'expo-blur';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { RootStackParamList, Task } from '@/types';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import TrialBanner from '../components/TrialBanner';
import { differenceInCalendarDays } from 'date-fns';
import { useHomeScreenData } from '@/hooks/useDataQueries';
import { useQueryClient } from '@tanstack/react-query';
import { useMonthlyTaskCount } from '@/hooks/useWeeklyTaskCount';
import { useCompleteTask, useDeleteTask, useRestoreTask } from '@/hooks';
import FloatingActionButton from '@/shared/components/FloatingActionButton';
import { Button, QueryStateWrapper } from '@/shared/components';
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
  const { data: homeData, isLoading, isError, error, refetch, isRefetching } = useHomeScreenData(!isGuest);
  const { monthlyTaskCount } = useMonthlyTaskCount();
  const queryClient = useQueryClient();
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);
  const fabAnimation = useRef(new Animated.Value(0)).current;

  // Optimistic mutation hooks
  const completeTaskMutation = useCompleteTask();
  const deleteTaskMutation = useDeleteTask();
  const restoreTaskMutation = useRestoreTask();
  const { showToast } = useToast();

  const promptSignUp = () => {
    mixpanelService.track(AnalyticsEvents.SIGN_UP_PROMPTED, {
      source: 'home_screen',
      user_type: isGuest ? 'guest' : 'authenticated',
      prompt_context: 'home_screen_access',
      timestamp: new Date().toISOString(),
    });
    navigation.navigate('Auth', { mode: 'signup' });
  };

  const fabActions = useMemo(() => [
    {
      icon: 'book-outline' as any,
      label: 'Add Study Session',
      onPress: () => {
        mixpanelService.track(AnalyticsEvents.STUDY_SESSION_CREATED, {
          task_type: 'study_session',
          source: 'home_screen_fab',
          creation_method: 'manual',
          timestamp: new Date().toISOString(),
        });
        navigation.navigate('AddStudySessionFlow');
      }
    },
    {
      icon: 'document-text-outline' as any,
      label: 'Add Assignment',
      onPress: () => {
        mixpanelService.track(AnalyticsEvents.ASSIGNMENT_CREATED, {
          task_type: 'assignment',
          source: 'home_screen_fab',
          creation_method: 'manual',
          timestamp: new Date().toISOString(),
        });
        navigation.navigate('AddAssignmentFlow');
      }
    },
    {
      icon: 'school-outline' as any,
      label: 'Add Lecture',
      onPress: () => {
        mixpanelService.track(AnalyticsEvents.LECTURE_CREATED, {
          task_type: 'lecture',
          source: 'home_screen_fab',
          creation_method: 'manual',
          timestamp: new Date().toISOString(),
        });
        navigation.navigate('AddLectureFlow');
      }
    },
  ], [navigation]);

  const backdropOpacity = fabAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1], // Animate opacity to 1 to show the blur view
  });

  const handleFabStateChange = ({ isOpen }: { isOpen: boolean }) => {
    setIsFabOpen(isOpen);
    Animated.spring(fabAnimation, {
        toValue: isOpen ? 1 : 0,
        friction: 7,
        useNativeDriver: false,
    }).start();
  };


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
    
    mixpanelService.trackEvent(TASK_EVENTS.TASK_EDIT_INITIATED, {
      task_id: selectedTask.id,
      task_type: selectedTask.type,
      task_title: selectedTask.title,
      source: 'task_detail_sheet',
    });
    
    // Determine which modal to navigate to based on task type
    let modalName: 'AddLectureFlow' | 'AddAssignmentFlow' | 'AddStudySessionFlow';
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
    (navigation as any).navigate(modalName, { taskToEdit: selectedTask });
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
  }, [selectedTask, deleteTaskMutation, restoreTaskMutation, showToast, handleCloseSheet]);

  // Trial banner logic
  const getTrialDaysRemaining = () => {
    if (user?.subscription_status !== 'trialing' || !user?.subscription_expires_at) {
      return null;
    }
    const today = new Date();
    const expirationDate = new Date(user.subscription_expires_at);
    return differenceInCalendarDays(expirationDate, today);
  };

  const trialDaysRemaining = getTrialDaysRemaining();
  const shouldShowBanner = trialDaysRemaining !== null && trialDaysRemaining <= 3 && !isBannerDismissed;

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

  const handleDismissBanner = async () => {
    if (!user?.id || trialDaysRemaining === null) return;

    try {
      const storageKey = `@trial_banner_dismissed_${user.id}_${trialDaysRemaining}`;
      await AsyncStorage.setItem(storageKey, 'true');
      setIsBannerDismissed(true);
    } catch (error) {
      console.error('Error saving banner dismissal state:', error);
    }
  };

  const handleSubscribePress = () => {
    Alert.alert(
      'Unlock Premium Access',
      'As an early user, you can unlock all premium features for free. Would you like to upgrade your account?',
      [
        { text: 'Not Now', style: 'cancel' },
        {
          text: 'Upgrade for Free',
          onPress: async () => {
            try {
              const { error } = await supabase.functions.invoke('grant-premium-access');
              if (error) throw new Error(error.message);

              // Invalidate user data to refresh their subscription status and unlock features.
              queryClient.invalidateQueries({ queryKey: ['user'] });
              queryClient.invalidateQueries({ queryKey: ['homeScreenData'] }); // Also refresh home screen data

              Alert.alert('Success!', 'You now have access to all premium features.');

            } catch (error: any) {
              const errorTitle = getErrorTitle(error);
              const errorMessage = mapErrorCodeToMessage(error);
              Alert.alert(errorTitle, errorMessage);
              console.error('Free upgrade error:', error);
            }
          },
        },
      ]
    );
  };

  // Get personalized title
  const getPersonalizedTitle = () => {
    if (isGuest) {
      return "Let's Make Today Count";
    }
    
    const name = user?.username || user?.first_name || 'there';
    return `${getGreeting()}, ${name}!`;
  };

  // Wrap content with QueryStateWrapper for authenticated users
  const content = (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        refreshControl={
          !isGuest ? (
            <RefreshControl 
              refreshing={isLoading} 
              onRefresh={() => queryClient.invalidateQueries({ queryKey: ['homeScreenData'] })}
            />
          ) : undefined
        }
        scrollEnabled={!isFabOpen}
      >
        {shouldShowBanner && (
          <TrialBanner
            daysRemaining={trialDaysRemaining as number}
            onPressSubscribe={handleSubscribePress}
            onDismiss={handleDismissBanner}
          />
        )}
        <Text style={styles.title}>{getPersonalizedTitle()}</Text>
        <SwipeableTaskCard
          onSwipeComplete={handleSwipeComplete}
          enabled={!isGuest && !!homeData?.nextUpcomingTask}
        >
          <NextTaskCard 
            task={isGuest ? null : (homeData?.nextUpcomingTask || null)} 
            isGuestMode={isGuest}
            onAddActivity={() => handleFabStateChange({ isOpen: true })}
            onViewDetails={handleViewDetails}
          />
        </SwipeableTaskCard>
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

      {isFabOpen && (
        <TouchableWithoutFeedback onPress={() => handleFabStateChange({ isOpen: false })}>
          <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
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
      />

      <TaskDetailSheet
        task={selectedTask}
        isVisible={!!selectedTask}
        onClose={handleCloseSheet}
        onEdit={handleEditTask}
        onComplete={handleCompleteTask}
        onDelete={handleDeleteTask}
      />

    </View>
  );

  // For authenticated users, wrap with QueryStateWrapper
  if (!isGuest) {
    return (
      <QueryStateWrapper
        isLoading={isLoading}
        isError={isError}
        error={error}
        data={homeData}
        refetch={() => queryClient.invalidateQueries({ queryKey: ['homeScreenData'] })}
        isRefetching={isRefetching}
        onRefresh={refetch}
        emptyStateComponent={
          <HomeScreenEmptyState onAddActivity={() => handleFabStateChange({ isOpen: true })} />
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
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContainer: {
    padding: SPACING.lg,
    paddingBottom: 80,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold as any,
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
    fontWeight: FONT_WEIGHTS.medium as any,
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
    fontWeight: FONT_WEIGHTS.bold as any,
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