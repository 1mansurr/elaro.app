import React, { useState, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { RootStackParamList, Task } from '@/types';
import { useCompleteTask, useDeleteTask } from '@/hooks';
import { mixpanelService } from '@/services/mixpanel';
import { AnalyticsEvents } from '@/services/analyticsEvents';
import { TASK_EVENTS } from '@/utils/analyticsEvents';

import { QuickAddModal } from '@/shared/components';
import TaskDetailSheet from '@/shared/components/TaskDetailSheet';

type HomeScreenModalsNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

interface HomeScreenModalsProps {
  selectedTask: Task | null;
  onCloseSheet: () => void;
}

export const HomeScreenModals: React.FC<HomeScreenModalsProps> = ({ 
  selectedTask, 
  onCloseSheet 
}) => {
  const navigation = useNavigation<HomeScreenModalsNavigationProp>();
  const [isQuickAddVisible, setIsQuickAddVisible] = useState(false);
  
  // Mutation hooks
  const completeTaskMutation = useCompleteTask();
  const deleteTaskMutation = useDeleteTask();

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
        return;
    }
    
    onCloseSheet(); // Close the sheet first
    navigation.navigate(modalName, { taskToEdit: selectedTask } as any);
  }, [selectedTask, onCloseSheet, navigation]);

  const handleCompleteTask = useCallback(async () => {
    if (!selectedTask) return;
    
    try {
      await completeTaskMutation.mutateAsync({
        taskId: selectedTask.id,
        taskType: selectedTask.type,
        taskTitle: selectedTask.title || selectedTask.name,
      });
      
      onCloseSheet();
    } catch (error) {
      console.error('Error completing task:', error);
    }
  }, [selectedTask, completeTaskMutation, onCloseSheet]);

  const handleDeleteTask = useCallback(async () => {
    if (!selectedTask) return;
    
    try {
      await deleteTaskMutation.mutateAsync({
        taskId: selectedTask.id,
        taskType: selectedTask.type,
        taskTitle: selectedTask.title || selectedTask.name,
      });
      
      onCloseSheet();
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  }, [selectedTask, deleteTaskMutation, onCloseSheet]);

  return (
    <>
      <QuickAddModal
        isVisible={isQuickAddVisible}
        onClose={() => setIsQuickAddVisible(false)}
      />

      <TaskDetailSheet
        task={selectedTask}
        isVisible={!!selectedTask}
        onClose={onCloseSheet}
        onEdit={handleEditTask}
        onComplete={handleCompleteTask}
        onDelete={handleDeleteTask}
      />
    </>
  );
};

export default HomeScreenModals;
