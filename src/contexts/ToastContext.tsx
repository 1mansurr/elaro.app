import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { UndoToast } from '@/shared/components/UndoToast';

interface ToastOptions {
  message: string;
  onUndo?: () => void;
  duration?: number; // in milliseconds, default 5000
}

interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [onUndo, setOnUndo] = useState<(() => void) | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const hideToast = useCallback(() => {
    setVisible(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const showToast = useCallback((options: ToastOptions) => {
    const { message, onUndo, duration = 5000 } = options;

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new toast state
    setMessage(message);
    setOnUndo(() => onUndo || null); // Wrap in arrow function to store function reference
    setVisible(true);

    // Auto-dismiss after duration
    timeoutRef.current = setTimeout(() => {
      setVisible(false);
      timeoutRef.current = null;
    }, duration);
  }, []);

  const handleUndo = useCallback(() => {
    if (onUndo) {
      onUndo();
    }
    hideToast();
  }, [onUndo, hideToast]);

  const value: ToastContextValue = {
    showToast,
    hideToast,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <UndoToast
        visible={visible}
        message={message}
        onUndo={handleUndo}
        onDismiss={hideToast}
      />
    </ToastContext.Provider>
  );
};

