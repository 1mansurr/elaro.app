import { useState, useEffect, useCallback } from 'react';
import { User } from '@/types';
import {
  PermissionService,
  PermissionCheckResult,
  TaskLimitCheck,
} from '../permissions/PermissionService';
import { Permission } from '../permissions/PermissionConstants';

export interface UsePermissionsReturn {
  hasPermission: (permission: Permission) => Promise<PermissionCheckResult>;
  canCreateTask: (
    taskType: 'assignments' | 'lectures' | 'study_sessions',
  ) => Promise<PermissionCheckResult>;
  canCreateSRSReminders: () => Promise<PermissionCheckResult>;
  isPremium: () => Promise<boolean>;
  isAdmin: () => Promise<boolean>;
  getTaskLimits: () => Promise<TaskLimitCheck[]>;
  loading: boolean;
  error: string | null;
}

export const usePermissions = (user: User | null): UsePermissionsReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const permissionService = PermissionService.getInstance();

  const hasPermission = useCallback(
    async (permission: Permission): Promise<PermissionCheckResult> => {
      if (!user) {
        return { allowed: false, reason: 'User not authenticated' };
      }

      try {
        setLoading(true);
        setError(null);
        return await permissionService.hasPermission(user, permission);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Permission check failed';
        setError(errorMessage);
        return { allowed: false, reason: errorMessage };
      } finally {
        setLoading(false);
      }
    },
    [user, permissionService],
  );

  const canCreateTask = useCallback(
    async (
      taskType: 'assignments' | 'lectures' | 'study_sessions',
    ): Promise<PermissionCheckResult> => {
      if (!user) {
        return { allowed: false, reason: 'User not authenticated' };
      }

      try {
        setLoading(true);
        setError(null);
        return await permissionService.canCreateTask(user, taskType);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Task creation check failed';
        setError(errorMessage);
        return { allowed: false, reason: errorMessage };
      } finally {
        setLoading(false);
      }
    },
    [user, permissionService],
  );

  const canCreateSRSReminders =
    useCallback(async (): Promise<PermissionCheckResult> => {
      if (!user) {
        return { allowed: false, reason: 'User not authenticated' };
      }

      try {
        setLoading(true);
        setError(null);
        return await permissionService.canCreateSRSReminders(user);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'SRS reminder check failed';
        setError(errorMessage);
        return { allowed: false, reason: errorMessage };
      } finally {
        setLoading(false);
      }
    }, [user, permissionService]);

  const isPremium = useCallback(async (): Promise<boolean> => {
    if (!user) {
      return false;
    }

    try {
      return await permissionService.isPremium(user);
    } catch (err) {
      console.error('❌ Error checking premium status:', err);
      return false;
    }
  }, [user, permissionService]);

  const isAdmin = useCallback(async (): Promise<boolean> => {
    if (!user) {
      return false;
    }

    try {
      return await permissionService.isAdmin(user);
    } catch (err) {
      console.error('❌ Error checking admin status:', err);
      return false;
    }
  }, [user, permissionService]);

  const getTaskLimits = useCallback(async (): Promise<TaskLimitCheck[]> => {
    if (!user) {
      return [];
    }

    try {
      setLoading(true);
      setError(null);
      return await permissionService.getTaskLimits(user);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to get task limits';
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, [user, permissionService]);

  // Clear error when user changes
  useEffect(() => {
    setError(null);
  }, [user]);

  return {
    hasPermission,
    canCreateTask,
    canCreateSRSReminders,
    isPremium,
    isAdmin,
    getTaskLimits,
    loading,
    error,
  };
};
