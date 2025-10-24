import { useState, useCallback } from 'react';
import { TaskDependencyService, EnhancedTask, TaskDependency, DependencyValidationResult } from '../services/TaskDependencyService';

export interface UseTaskDependenciesReturn {
  createTaskWithDependencies: (task: EnhancedTask, userId: string) => Promise<EnhancedTask | null>;
  completeTask: (taskId: string, taskType: 'assignment' | 'lecture' | 'study_session') => Promise<void>;
  getTaskDependencies: (taskId: string, taskType: 'assignment' | 'lecture' | 'study_session') => Promise<TaskDependency[]>;
  getDependentTasks: (taskId: string, taskType: 'assignment' | 'lecture' | 'study_session') => Promise<EnhancedTask[]>;
  validateDependencies: (dependencies: TaskDependency[], userId: string) => Promise<DependencyValidationResult>;
  loading: boolean;
  error: string | null;
}

export const useTaskDependencies = (): UseTaskDependenciesReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const taskDependencyService = TaskDependencyService.getInstance();

  const createTaskWithDependencies = useCallback(async (
    task: EnhancedTask,
    userId: string
  ): Promise<EnhancedTask | null> => {
    try {
      setLoading(true);
      setError(null);
      
      return await taskDependencyService.createTaskWithDependencies(task, userId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create task with dependencies';
      setError(errorMessage);
      console.error('❌ Error creating task with dependencies:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [taskDependencyService]);

  const completeTask = useCallback(async (
    taskId: string,
    taskType: 'assignment' | 'lecture' | 'study_session'
  ) => {
    try {
      setLoading(true);
      setError(null);
      
      await taskDependencyService.completeTask(taskId, taskType);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to complete task';
      setError(errorMessage);
      console.error('❌ Error completing task:', err);
    } finally {
      setLoading(false);
    }
  }, [taskDependencyService]);

  const getTaskDependencies = useCallback(async (
    taskId: string,
    taskType: 'assignment' | 'lecture' | 'study_session'
  ): Promise<TaskDependency[]> => {
    try {
      setError(null);
      return await taskDependencyService.getTaskDependencies(taskId, taskType);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get task dependencies';
      setError(errorMessage);
      console.error('❌ Error getting task dependencies:', err);
      return [];
    }
  }, [taskDependencyService]);

  const getDependentTasks = useCallback(async (
    taskId: string,
    taskType: 'assignment' | 'lecture' | 'study_session'
  ): Promise<EnhancedTask[]> => {
    try {
      setError(null);
      return await taskDependencyService.getDependentTasks(taskId, taskType);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get dependent tasks';
      setError(errorMessage);
      console.error('❌ Error getting dependent tasks:', err);
      return [];
    }
  }, [taskDependencyService]);

  const validateDependencies = useCallback(async (
    dependencies: TaskDependency[],
    userId: string
  ): Promise<DependencyValidationResult> => {
    try {
      setError(null);
      return await taskDependencyService.validateDependencies(dependencies, userId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to validate dependencies';
      setError(errorMessage);
      console.error('❌ Error validating dependencies:', err);
      return {
        isValid: false,
        errors: [errorMessage],
        warnings: [],
        circularDependencies: [],
      };
    }
  }, [taskDependencyService]);

  return {
    createTaskWithDependencies,
    completeTask,
    getTaskDependencies,
    getDependentTasks,
    validateDependencies,
    loading,
    error,
  };
};
