import AsyncStorage from '@react-native-async-storage/async-storage';

const TASK_DATA_KEY = 'pending_task_data';

export interface PendingTaskData {
  taskData: any;
  taskType: 'assignment' | 'study_session' | 'lecture' | 'course';
  timestamp: number;
}

export const savePendingTask = async (
  taskData: any,
  taskType: 'assignment' | 'study_session' | 'lecture' | 'course',
) => {
  try {
    await AsyncStorage.setItem(
      TASK_DATA_KEY,
      JSON.stringify({
        taskData,
        taskType,
        timestamp: Date.now(),
      }),
    );
  } catch (error) {
    console.error('Failed to save pending task:', error);
  }
};

export const getPendingTask = async (): Promise<PendingTaskData | null> => {
  try {
    const data = await AsyncStorage.getItem(TASK_DATA_KEY);
    if (!data) return null;

    const parsed = JSON.parse(data);

    // Check if data is older than 1 hour (3600000 ms)
    const isExpired = Date.now() - parsed.timestamp > 3600000;
    if (isExpired) {
      await clearPendingTask();
      return null;
    }

    return parsed;
  } catch (error) {
    console.error('Failed to get pending task:', error);
    return null;
  }
};

export const clearPendingTask = async () => {
  try {
    await AsyncStorage.removeItem(TASK_DATA_KEY);
  } catch (error) {
    console.error('Failed to clear pending task:', error);
  }
};
