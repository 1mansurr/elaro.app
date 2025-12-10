import React from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Task } from '@/types';
import { useTaskDetail } from '@/hooks/useTaskDetail';
import { useTaskReminders } from '@/hooks/useTaskReminders';
import { useCompleteTask } from '@/hooks/useTaskMutations';
import { AssignmentDetailSheet } from './AssignmentDetailSheet';
import { LectureDetailSheet } from './LectureDetailSheet';
import { StudySessionDetailSheet } from './StudySessionDetailSheet';
import { useTheme } from '@/contexts/ThemeContext';
import { Lecture } from '@/types';

interface TaskDetailSheetProps {
  task: Task | null;
  isVisible: boolean;
  onClose: () => void;
  onEdit: (task: Task) => void;
  onComplete: (task: Task) => Promise<void>;
  onDelete?: (task: Task) => Promise<void>;
}

const TaskDetailSheet: React.FC<TaskDetailSheetProps> = ({
  task,
  isVisible,
  onClose,
  onEdit,
  onComplete,
  onDelete,
}) => {
  const { theme } = useTheme();

  // Map Task type to the format expected by hooks
  const taskType =
    task?.type === 'study_session'
      ? 'study_session'
      : task?.type === 'lecture'
        ? 'lecture'
        : task?.type === 'assignment'
          ? 'assignment'
          : null;

  // Fetch full task data
  const {
    data: taskData,
    isLoading: isLoadingTask,
    error: taskError,
  } = useTaskDetail(task?.id, taskType, { enabled: isVisible && !!task });

  // Fetch reminders
  const {
    data: reminders = [],
    isLoading: isLoadingReminders,
  } = useTaskReminders(task?.id, taskType);

  if (!task || !isVisible) {
    return null;
  }

  const handleEdit = () => {
    onEdit(task);
  };

  const completeTaskMutation = useCompleteTask();

  const handleComplete = async () => {
    // For recurring lectures, we need special handling
    // The backend should mark only the current instance as complete
    // and keep future occurrences scheduled
    if (taskType === 'lecture' && taskData) {
      const lecture = taskData as Lecture & {
        course: { id: string; courseName: string; courseCode?: string } | null;
      };
      
      // If recurring, we still complete it but the backend should handle
      // instance-specific completion. We skip notification cancellation
      // so future reminders remain scheduled.
      if (lecture.isRecurring) {
        // For recurring lectures, we complete the current instance
        // but don't cancel future reminders (handled by backend)
        try {
          await completeTaskMutation.mutateAsync({
            taskId: task.id,
            taskType: 'lecture',
            taskTitle: lecture.lectureName || task.name,
            skipNotificationCancellation: true, // Don't cancel future reminders
          });
          // Close the sheet after successful completion
          onClose();
        } catch (error) {
          console.error('Error completing recurring lecture:', error);
        }
        return;
      }
    }

    // For non-recurring tasks, use the standard completion handler
    await onComplete(task);
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(task);
    }
  };

  // Show loading state
  if (isLoadingTask || isLoadingReminders) {
    return (
      <Modal
        transparent
        visible={isVisible}
        animationType="fade"
        onRequestClose={onClose}>
        <TouchableWithoutFeedback onPress={onClose}>
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#137FEC" />
        </View>
      </Modal>
    );
  }

  // Show error state or no data
  if (taskError || !taskData) {
    return (
      <Modal
        transparent
        visible={isVisible}
        animationType="fade"
        onRequestClose={onClose}>
        <TouchableWithoutFeedback onPress={onClose}>
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>
        <View style={styles.errorContainer}>
          {/* Could add error message UI here */}
        </View>
      </Modal>
    );
  }

  // Format reminders for display
  const formattedReminders = reminders.map(reminder => ({
    id: reminder.id,
    label: reminder.label || 'Reminder',
  }));

  // Route to appropriate detail sheet component
  const renderDetailSheet = () => {
    if (taskType === 'assignment') {
      return (
        <AssignmentDetailSheet
          assignment={taskData as any}
          reminders={formattedReminders}
          onEdit={handleEdit}
          onComplete={handleComplete}
          onClose={onClose}
          onDelete={handleDelete}
        />
      );
    }

    if (taskType === 'lecture') {
      return (
        <LectureDetailSheet
          lecture={taskData as any}
          reminders={formattedReminders}
          onEdit={handleEdit}
          onComplete={handleComplete}
          onClose={onClose}
          onDelete={handleDelete}
        />
      );
    }

    if (taskType === 'study_session') {
      return (
        <StudySessionDetailSheet
          studySession={taskData as any}
          reminders={formattedReminders}
          onEdit={handleEdit}
          onComplete={handleComplete}
          onClose={onClose}
          onDelete={handleDelete}
        />
      );
    }

    return null;
  };

  return (
    <Modal
      transparent
      visible={isVisible}
      animationType="slide"
      onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
      </TouchableWithoutFeedback>
      <View
        style={[
          styles.sheetContainer,
          {
            backgroundColor: theme.isDark ? '#18212B' : '#FFFFFF',
          },
        ]}>
        {renderDetailSheet()}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  sheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '92%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default TaskDetailSheet;
