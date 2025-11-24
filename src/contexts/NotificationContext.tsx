import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useMemo,
  useCallback,
} from 'react';
import { Task } from '@/types';

interface NotificationContextType {
  taskToShow: Task | null;
  setTaskToShow: (task: Task | null) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined,
);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [taskToShow, setTaskToShow] = useState<Task | null>(null);

  // Memoize setter to prevent unnecessary re-renders
  const handleSetTaskToShow = useCallback((task: Task | null) => {
    setTaskToShow(task);
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({
      taskToShow,
      setTaskToShow: handleSetTaskToShow,
    }),
    [taskToShow, handleSetTaskToShow],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      'useNotification must be used within a NotificationProvider',
    );
  }
  return context;
};
