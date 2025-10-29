import React from 'react';
import { render } from '@testing-library/react-native';
import { HomeScreenModals } from '../HomeScreenModals';

// Mock the modal components
jest.mock('@/shared/components/TaskDetailSheet', () => {
  return function MockTaskDetailSheet({ isVisible, task }: any) {
    return isVisible ? <div data-testid="task-detail-sheet">Task Detail Sheet</div> : null;
  };
});

jest.mock('@/shared/components', () => ({
  QuickAddModal: function MockQuickAddModal({ isVisible }: any) {
    return isVisible ? <div data-testid="quick-add-modal">Quick Add Modal</div> : null;
  },
}));

jest.mock('@/features/notifications/components/NotificationHistoryModal', () => {
  return function MockNotificationHistoryModal({ isVisible }: any) {
    return isVisible ? <div data-testid="notification-history-modal">Notification History Modal</div> : null;
  };
});

describe('HomeScreenModals', () => {
  it('renders all modals when visible', () => {
    const mockTask = {
      id: 'task-1',
      title: 'Test Task',
      type: 'assignment',
    };

    const { getByTestId } = render(
      <HomeScreenModals
        selectedTask={mockTask}
        isQuickAddVisible={true}
        isNotificationHistoryVisible={true}
        onCloseSheet={jest.fn()}
        onEditTask={jest.fn()}
        onCompleteTask={jest.fn()}
        onDeleteTask={jest.fn()}
        onCloseQuickAdd={jest.fn()}
        onCloseNotificationHistory={jest.fn()}
      />
    );

    expect(getByTestId('task-detail-sheet')).toBeTruthy();
    expect(getByTestId('quick-add-modal')).toBeTruthy();
    expect(getByTestId('notification-history-modal')).toBeTruthy();
  });

  it('does not render modals when not visible', () => {
    const { queryByTestId } = render(
      <HomeScreenModals
        selectedTask={null}
        isQuickAddVisible={false}
        isNotificationHistoryVisible={false}
        onCloseSheet={jest.fn()}
        onEditTask={jest.fn()}
        onCompleteTask={jest.fn()}
        onDeleteTask={jest.fn()}
        onCloseQuickAdd={jest.fn()}
        onCloseNotificationHistory={jest.fn()}
      />
    );

    expect(queryByTestId('task-detail-sheet')).toBeNull();
    expect(queryByTestId('quick-add-modal')).toBeNull();
    expect(queryByTestId('notification-history-modal')).toBeNull();
  });

  it('renders only visible modals', () => {
    const mockTask = {
      id: 'task-1',
      title: 'Test Task',
      type: 'assignment',
    };

    const { getByTestId, queryByTestId } = render(
      <HomeScreenModals
        selectedTask={mockTask}
        isQuickAddVisible={false}
        isNotificationHistoryVisible={true}
        onCloseSheet={jest.fn()}
        onEditTask={jest.fn()}
        onCompleteTask={jest.fn()}
        onDeleteTask={jest.fn()}
        onCloseQuickAdd={jest.fn()}
        onCloseNotificationHistory={jest.fn()}
      />
    );

    expect(getByTestId('task-detail-sheet')).toBeTruthy();
    expect(queryByTestId('quick-add-modal')).toBeNull();
    expect(getByTestId('notification-history-modal')).toBeTruthy();
  });
});
