import { useState, useCallback } from 'react';
import { 
  RecurringTaskService, 
  RecurringTask, 
  RecurringPattern, 
  GeneratedTask,
  CreateRecurringTaskRequest,
  CreatePatternRequest
} from '../services/RecurringTaskService';

export interface UseRecurringTasksReturn {
  createPattern: (request: CreatePatternRequest) => Promise<RecurringPattern | null>;
  createRecurringTask: (userId: string, request: CreateRecurringTaskRequest) => Promise<RecurringTask | null>;
  getUserRecurringTasks: (userId: string) => Promise<RecurringTask[]>;
  getAvailablePatterns: () => Promise<RecurringPattern[]>;
  updateRecurringTask: (recurringTaskId: string, updates: Partial<RecurringTask>) => Promise<RecurringTask | null>;
  deleteRecurringTask: (recurringTaskId: string) => Promise<void>;
  getGeneratedTasks: (recurringTaskId: string) => Promise<GeneratedTask[]>;
  generateNextTasks: (recurringTaskId: string) => Promise<GeneratedTask[]>;
  getRecurringTaskStats: (userId: string) => Promise<{
    totalActive: number;
    totalGenerated: number;
    upcomingGenerations: number;
    completionRate: number;
  } | null>;
  createCommonPatterns: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

export const useRecurringTasks = (): UseRecurringTasksReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recurringTaskService = RecurringTaskService.getInstance();

  const createPattern = useCallback(async (request: CreatePatternRequest): Promise<RecurringPattern | null> => {
    try {
      setLoading(true);
      setError(null);
      
      return await recurringTaskService.createPattern(request);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create pattern';
      setError(errorMessage);
      console.error('❌ Error creating pattern:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [recurringTaskService]);

  const createRecurringTask = useCallback(async (
    userId: string,
    request: CreateRecurringTaskRequest
  ): Promise<RecurringTask | null> => {
    try {
      setLoading(true);
      setError(null);
      
      return await recurringTaskService.createRecurringTask(userId, request);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create recurring task';
      setError(errorMessage);
      console.error('❌ Error creating recurring task:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [recurringTaskService]);

  const getUserRecurringTasks = useCallback(async (userId: string): Promise<RecurringTask[]> => {
    try {
      setError(null);
      return await recurringTaskService.getUserRecurringTasks(userId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get recurring tasks';
      setError(errorMessage);
      console.error('❌ Error getting recurring tasks:', err);
      return [];
    }
  }, [recurringTaskService]);

  const getAvailablePatterns = useCallback(async (): Promise<RecurringPattern[]> => {
    try {
      setError(null);
      return await recurringTaskService.getAvailablePatterns();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get available patterns';
      setError(errorMessage);
      console.error('❌ Error getting available patterns:', err);
      return [];
    }
  }, [recurringTaskService]);

  const updateRecurringTask = useCallback(async (
    recurringTaskId: string,
    updates: Partial<RecurringTask>
  ): Promise<RecurringTask | null> => {
    try {
      setLoading(true);
      setError(null);
      
      return await recurringTaskService.updateRecurringTask(recurringTaskId, updates);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update recurring task';
      setError(errorMessage);
      console.error('❌ Error updating recurring task:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [recurringTaskService]);

  const deleteRecurringTask = useCallback(async (recurringTaskId: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      await recurringTaskService.deleteRecurringTask(recurringTaskId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete recurring task';
      setError(errorMessage);
      console.error('❌ Error deleting recurring task:', err);
    } finally {
      setLoading(false);
    }
  }, [recurringTaskService]);

  const getGeneratedTasks = useCallback(async (recurringTaskId: string): Promise<GeneratedTask[]> => {
    try {
      setError(null);
      return await recurringTaskService.getGeneratedTasks(recurringTaskId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get generated tasks';
      setError(errorMessage);
      console.error('❌ Error getting generated tasks:', err);
      return [];
    }
  }, [recurringTaskService]);

  const generateNextTasks = useCallback(async (recurringTaskId: string): Promise<GeneratedTask[]> => {
    try {
      setLoading(true);
      setError(null);
      
      return await recurringTaskService.generateNextTasks(recurringTaskId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate next tasks';
      setError(errorMessage);
      console.error('❌ Error generating next tasks:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [recurringTaskService]);

  const getRecurringTaskStats = useCallback(async (userId: string): Promise<{
    totalActive: number;
    totalGenerated: number;
    upcomingGenerations: number;
    completionRate: number;
  } | null> => {
    try {
      setError(null);
      return await recurringTaskService.getRecurringTaskStats(userId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get recurring task stats';
      setError(errorMessage);
      console.error('❌ Error getting recurring task stats:', err);
      return null;
    }
  }, [recurringTaskService]);

  const createCommonPatterns = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      await recurringTaskService.createCommonPatterns();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create common patterns';
      setError(errorMessage);
      console.error('❌ Error creating common patterns:', err);
    } finally {
      setLoading(false);
    }
  }, [recurringTaskService]);

  return {
    createPattern,
    createRecurringTask,
    getUserRecurringTasks,
    getAvailablePatterns,
    updateRecurringTask,
    deleteRecurringTask,
    getGeneratedTasks,
    generateNextTasks,
    getRecurringTaskStats,
    createCommonPatterns,
    loading,
    error,
  };
};
