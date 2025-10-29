import { useState, useCallback, useEffect } from 'react';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { CommonActions } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { differenceInCalendarDays } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useCompleteTask, useDeleteTask, useRestoreTask } from '@/hooks';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/services/supabase';
import { mixpanelService } from '@/services/mixpanel';
import { AnalyticsEvents } from '@/services/analyticsEvents';
import { TASK_EVENTS } from '@/utils/analyticsEvents';
import { createExampleData } from '@/utils/exampleData';
import { getDraftCount } from '@/utils/draftStorage';
import { mapErrorCodeToMessage, getErrorTitle } from '@/utils/errorMapping';
import { Task } from '@/types';
import { performanceMonitoringService } from '@/services/PerformanceMonitoringService';
import { requestDeduplicationService } from '@/services/RequestDeduplicationService';
import { useStableCallback, useExpensiveMemo } from '@/hooks/useMemoization';

// Custom hook for trial banner logic with performance monitoring
export const useTrialBanner = (user: any) => {
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);

  // Performance monitoring for trial banner calculations
  const getTrialDaysRemaining = useStableCallback(() => {
    performanceMonitoringService.startTimer('trial-days-calculation');
    
    if (user?.subscription_status !== 'trialing' || !user?.subscription_expires_at) {
      performanceMonitoringService.endTimer('trial-days-calculation');
      return null;
    }
    const today = new Date();
    const expirationDate = new Date(user.subscription_expires_at);
    const days = differenceInCalendarDays(expirationDate, today);
    
    performanceMonitoringService.endTimer('trial-days-calculation');
    return days;
  }, [user?.subscription_status, user?.subscription_expires_at]);

  // Optimized trial days calculation with expensive memoization
  const trialDaysRemaining = useExpensiveMemo(() => getTrialDaysRemaining(), [getTrialDaysRemaining]);

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

  return {
    shouldShowBanner,
    trialDaysRemaining,
    handleDismissBanner,
  };
};

// Custom hook for subscription upgrade
export const useSubscriptionUpgrade = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

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
              queryClient.invalidateQueries({ queryKey: ['homeScreenData'] });

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

  return { handleSubscribePress };
};

// Custom hook for task management
export const useTaskManagement = () => {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const completeTaskMutation = useCompleteTask();
  const deleteTaskMutation = useDeleteTask();
  const restoreTaskMutation = useRestoreTask();
  const { showToast } = useToast();

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
    
    handleCloseSheet();
    // Navigation will be handled by the parent component
    return modalName;
  }, [selectedTask, handleCloseSheet]);

  const handleCompleteTask = useCallback(async () => {
    if (!selectedTask) return;
    
    try {
      await completeTaskMutation.mutateAsync({
        taskId: selectedTask.id,
        taskType: selectedTask.type,
        taskTitle: selectedTask.title || selectedTask.name,
      });
      
      Alert.alert('Success', 'Task marked as complete!');
    } catch (error) {
      console.error('Error completing task:', error);
    }
    
    handleCloseSheet();
  }, [selectedTask, completeTaskMutation, handleCloseSheet]);

  const handleDeleteTask = useCallback(async () => {
    if (!selectedTask) return;
    
    handleCloseSheet();
    
    const taskInfo = {
      id: selectedTask.id,
      type: selectedTask.type,
      title: selectedTask.title || selectedTask.name,
    };
    
    try {
      await deleteTaskMutation.mutateAsync({
        taskId: taskInfo.id,
        taskType: taskInfo.type,
        taskTitle: taskInfo.title,
      });
      
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
        duration: 5000,
      });
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  }, [selectedTask, deleteTaskMutation, restoreTaskMutation, showToast, handleCloseSheet]);

  return {
    selectedTask,
    handleViewDetails,
    handleCloseSheet,
    handleEditTask,
    handleCompleteTask,
    handleDeleteTask,
  };
};

// Custom hook for draft count management
export const useDraftCount = () => {
  const [draftCount, setDraftCount] = useState(0);

  const loadDraftCount = useCallback(async () => {
    const count = await getDraftCount();
    setDraftCount(count);
  }, []);

  useEffect(() => {
    loadDraftCount();
  }, [loadDraftCount]);

  useFocusEffect(
    useCallback(() => {
      loadDraftCount();
    }, [loadDraftCount])
  );

  return { draftCount };
};

// Custom hook for welcome prompt
export const useWelcomePrompt = (isGuest: boolean, user: any, navigation: any) => {
  useEffect(() => {
    const checkAndShowWelcomePrompt = async () => {
      if (isGuest || !user) return;
      
      try {
        const hasSeenPrompt = await AsyncStorage.getItem('hasSeenHowItWorksPrompt');
        
        if (!hasSeenPrompt) {
          await AsyncStorage.setItem('hasSeenHowItWorksPrompt', 'true');
          
          setTimeout(() => {
            Alert.alert(
              'Welcome to ELARO!',
              "Ready to get started? We recommend a quick look at 'How ELARO Works' to learn about all the features that will help you succeed.",
              [
                {
                  text: 'Show Me How',
                  onPress: () => {
                    navigation.navigate('Main');
                    setTimeout(() => {
                      navigation.dispatch(
                        CommonActions.navigate({
                          name: 'Main',
                          params: {
                            screen: 'Account',
                          },
                        })
                      );
                    }, 100);
                  },
                },
                {
                  text: 'Got It',
                  style: 'cancel',
                },
              ]
            );
          }, 500);
        }
      } catch (error) {
        console.error('Error checking welcome prompt flag:', error);
      }
    };

    checkAndShowWelcomePrompt();
  }, [isGuest, user, navigation]);
};

// Custom hook for example data creation
export const useExampleData = (isGuest: boolean, user: any, isLoading: boolean, homeData: any, queryClient: any, showToast: any) => {
  useEffect(() => {
    const checkAndCreateExampleData = async () => {
      if (isGuest || !user || isLoading) return;
      
      try {
        const hasCreatedExamples = await AsyncStorage.getItem('hasCreatedExampleData');
        
        const hasAnyData = homeData && (
          (homeData.nextUpcomingTask) ||
          (homeData.todayOverview && (
            homeData.todayOverview.lectures > 0 ||
            homeData.todayOverview.assignments > 0 ||
            homeData.todayOverview.studySessions > 0
          ))
        );

        if (!hasAnyData && !hasCreatedExamples) {
          console.log('📚 New user with no data detected. Creating example data...');
          
          await AsyncStorage.setItem('hasCreatedExampleData', 'true');
          
          const result = await createExampleData(user.id);
          
          if (result.success) {
            console.log('✅ Example data created successfully');
            
            await queryClient.invalidateQueries({ queryKey: ['homeScreenData'] });
            await queryClient.invalidateQueries({ queryKey: ['courses'] });
            await queryClient.invalidateQueries({ queryKey: ['assignments'] });
            await queryClient.invalidateQueries({ queryKey: ['lectures'] });
            await queryClient.invalidateQueries({ queryKey: ['studySessions'] });
            
            showToast({
              message: '📚 We\'ve added some example tasks to help you get started!',
              duration: 4000,
            });
          } else {
            console.error('Failed to create example data:', result.error);
          }
        }
      } catch (error) {
        console.error('Error in checkAndCreateExampleData:', error);
      }
    };

    const timer = setTimeout(() => {
      checkAndCreateExampleData();
    }, 1500);

    return () => clearTimeout(timer);
  }, [isGuest, user, isLoading, homeData, queryClient, showToast]);
};
