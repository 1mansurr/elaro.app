import { Alert } from 'react-native';

interface ToastOptions {
  type?: 'success' | 'error' | 'info' | 'warning';
  message: string;
  title?: string;
  duration?: number;
}

/**
 * Shows a toast notification to the user
 * @param options - Toast configuration options
 */
export const showToast = (options: ToastOptions | string) => {
  // Support both object and string signatures
  const config: ToastOptions = typeof options === 'string' 
    ? { message: options } 
    : options;

  const { type = 'info', message, title } = config;

  // Determine title based on type if not provided
  const toastTitle = title || getDefaultTitle(type);

  Alert.alert(toastTitle, message, [{ text: 'OK' }]);
};

/**
 * Helper function to get default titles based on toast type
 */
const getDefaultTitle = (type: string): string => {
  switch (type) {
    case 'success':
      return 'Success';
    case 'error':
      return 'Error';
    case 'warning':
      return 'Warning';
    case 'info':
    default:
      return 'Info';
  }
};

/**
 * Convenience functions for different toast types
 */
export const showSuccessToast = (message: string, title?: string) => {
  showToast({ type: 'success', message, title });
};

export const showErrorToast = (message: string, title?: string) => {
  showToast({ type: 'error', message, title });
};

export const showInfoToast = (message: string, title?: string) => {
  showToast({ type: 'info', message, title });
};

export const showWarningToast = (message: string, title?: string) => {
  showToast({ type: 'warning', message, title });
};

