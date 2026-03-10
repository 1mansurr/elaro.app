import React, { memo } from 'react';
import { Task } from '@/types';
import TaskDetailSheet from '@/shared/components/TaskDetailSheet';
import { QuickAddModal } from '@/shared/components';
import { NotificationHistoryModal } from '@/shared/components/NotificationHistoryModal';

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

const HomeScreenModals: React.FC<HomeScreenModalsProps> = memo(
  ({
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
  },
);

HomeScreenModals.displayName = 'HomeScreenModals';

export default HomeScreenModals;
