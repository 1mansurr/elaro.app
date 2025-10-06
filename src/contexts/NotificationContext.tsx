import React, { createContext, useState, useContext, ReactNode } from 'react';
import { Task } from '../types'; // Assuming Task type is in src/types

interface NotificationContextType {
  taskToShow: Task | null;
  setTaskToShow: (task: Task | null) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [taskToShow, setTaskToShow] = useState<Task | null>(null);

  return (
    <NotificationContext.Provider value={{ taskToShow, setTaskToShow }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
