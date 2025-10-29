import React, { memo, useEffect } from 'react';
import { Task } from '@/types';
import TaskDetailSheet from '@/shared/components/TaskDetailSheet';
import { QuickAddModal } from '@/shared/components';
import { NotificationHistoryModal } from '@/features/notifications/components/NotificationHistoryModal';
import { performanceMonitoringService } from '@/services/PerformanceMonitoringService';

interface HomeScreenModalsProps {
  selectedTask: Task | null;
  isQuickAddVisible: boolean;
  isNotificationHistoryVisible: boolean;
  onCloseSheet: () => void;
  onEditTask: (task: Task) => void;
  onCompleteTask: (task: Task) => Promise<void>;
  onDeleteTask: (task: Task) => Promise<void>;
  onCloseQuickAdd: () => void;
  onCloseNotificationHistory: () => void;
}

const HomeScreenModals: React.FC<HomeScreenModalsProps> = memo(({
  selectedTask,
  isQuickAddVisible,
  isNotificationHistoryVisible,
  onCloseSheet,
  onEditTask,
  onCompleteTask,
  onDeleteTask,
  onCloseQuickAdd,
  onCloseNotificationHistory,
}) => {
  // Enhanced performance monitoring
  useEffect(() => {
    performanceMonitoringService.startTimer('modals-component-mount');
    return () => {
      performanceMonitoringService.endTimer('modals-component-mount');
    };
  }, []);

  // Monitor modal visibility changes
  useEffect(() => {
    if (isQuickAddVisible) {
      performanceMonitoringService.startTimer('quick-add-modal-open');
    } else {
      performanceMonitoringService.endTimer('quick-add-modal-open');
    }
  }, [isQuickAddVisible]);

  useEffect(() => {
    if (isNotificationHistoryVisible) {
      performanceMonitoringService.startTimer('notification-history-modal-open');
    } else {
      performanceMonitoringService.endTimer('notification-history-modal-open');
    }
  }, [isNotificationHistoryVisible]);

  useEffect(() => {
    if (selectedTask) {
      performanceMonitoringService.startTimer('task-detail-sheet-open');
    } else {
      performanceMonitoringService.endTimer('task-detail-sheet-open');
    }
  }, [selectedTask]);

  return (
    <>
      <QuickAddModal
        isVisible={isQuickAddVisible}
        onClose={onCloseQuickAdd}
      />

      <TaskDetailSheet
        task={selectedTask}
        isVisible={!!selectedTask}
        onClose={onCloseSheet}
        onEdit={onEditTask}
        onComplete={onCompleteTask}
        onDelete={onDeleteTask}
      />

      <NotificationHistoryModal
        isVisible={isNotificationHistoryVisible}
        onClose={onCloseNotificationHistory}
      />
    </>
  );
});

HomeScreenModals.displayName = 'HomeScreenModals';

export default HomeScreenModals;
