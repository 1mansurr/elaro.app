import { useState, useCallback } from 'react';
import { Alert } from 'react-native';

export interface UseRemindersReturn {
  reminders: number[];
  addReminder: (minutes: number) => void;
  removeReminder: (minutes: number) => void;
  hasReminder: (minutes: number) => boolean;
  setReminders: (reminders: number[]) => void;
  maxReminders: number;
}

interface UseRemindersOptions {
  maxReminders?: number;
  initialReminders?: number[];
  onRemindersChange?: (reminders: number[]) => void;
}

export const useReminders = (
  options: UseRemindersOptions = {},
): UseRemindersReturn => {
  const {
    maxReminders = 2,
    initialReminders = [],
    onRemindersChange,
  } = options;

  const [reminders, setRemindersState] = useState<number[]>(initialReminders);

  const setReminders = useCallback(
    (newReminders: number[]) => {
      setRemindersState(newReminders);
      onRemindersChange?.(newReminders);
    },
    [onRemindersChange],
  );

  const addReminder = useCallback(
    (minutes: number) => {
      if (reminders.length >= maxReminders) {
        Alert.alert(
          'Limit Reached',
          `You can only add up to ${maxReminders} reminders.`,
        );
        return;
      }

      if (reminders.includes(minutes)) {
        return; // Already exists
      }

      const newReminders = [...reminders, minutes].sort((a, b) => a - b);
      setReminders(newReminders);
    },
    [reminders, maxReminders, setReminders],
  );

  const removeReminder = useCallback(
    (minutes: number) => {
      const newReminders = reminders.filter(r => r !== minutes);
      setReminders(newReminders);
    },
    [reminders, setReminders],
  );

  const hasReminder = useCallback(
    (minutes: number) => {
      return reminders.includes(minutes);
    },
    [reminders],
  );

  return {
    reminders,
    addReminder,
    removeReminder,
    hasReminder,
    setReminders,
    maxReminders,
  };
};
