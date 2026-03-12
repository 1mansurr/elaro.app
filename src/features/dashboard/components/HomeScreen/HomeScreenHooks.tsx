import { useState, useCallback, useEffect } from 'react';
import {
  useNavigation,
  useFocusEffect,
  NavigationContainerRef,
} from '@react-navigation/native';
import { CommonActions } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { differenceInCalendarDays } from 'date-fns';
import { useQueryClient, QueryClient } from '@tanstack/react-query';
import { useCompleteTask, useDeleteTask, useRestoreTask } from '@/hooks';
import { useToast, ToastOptions } from '@/contexts/ToastContext';
import { getDraftCount } from '@/utils/draftStorage';
import { mapErrorCodeToMessage, getErrorTitle } from '@/utils/errorMapping';
import { Task, HomeScreenData, RootStackParamList } from '@/types';
import { useStableCallback, useExpensiveMemo } from '@/hooks/useMemoization';

// Trial banner hook removed - no longer using free trials

// Custom hook for subscription upgrade
export const useSubscriptionUpgrade = () => {
  const queryClient = useQueryClient();

  const handleSubscribePress = () => {
    Alert.alert(
      'Offline Mode',
      'Subscription management is not available in offline mode.',
      [{ text: 'OK' }],
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
    setSelectedTask(task);
  }, []);

  const handleCloseSheet = useCallback(() => {
    setSelectedTask(null);
  }, []);

  const handleEditTask = useCallback(() => {
    if (!selectedTask) return;

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
  }, [
    selectedTask,
    deleteTaskMutation,
    restoreTaskMutation,
    showToast,
    handleCloseSheet,
  ]);

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
    }, [loadDraftCount]),
  );

  return { draftCount };
};

// Custom hook for welcome prompt
export const useWelcomePrompt = (
  navigation: NavigationContainerRef<RootStackParamList>,
) => {
  useEffect(() => {
    const checkAndShowWelcomePrompt = async () => {
      try {
        const hasSeenPrompt = await AsyncStorage.getItem(
          'hasSeenHowItWorksPrompt',
        );

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
  }, [navigation]);
};
