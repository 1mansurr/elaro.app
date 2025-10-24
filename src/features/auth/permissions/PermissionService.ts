import { User } from '@/types';
import { 
  Permission, 
  UserRole, 
  PERMISSIONS, 
  ROLES, 
  getRoleBySubscriptionTier,
  TASK_LIMITS 
} from './PermissionConstants';
import { PermissionCacheService } from './PermissionCacheService';

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  limit?: number;
  current?: number;
}

export interface TaskLimitCheck {
  allowed: boolean;
  limit: number;
  current: number;
  remaining: number;
}

export class PermissionService {
  private static instance: PermissionService;
  private permissionCacheService = PermissionCacheService.getInstance();

  public static getInstance(): PermissionService {
    if (!PermissionService.instance) {
      PermissionService.instance = new PermissionService();
    }
    return PermissionService.instance;
  }

  /**
   * Check if user has a specific permission
   */
  async hasPermission(user: User, permission: Permission): Promise<PermissionCheckResult> {
    try {
      const role = await this.getUserRole(user);
      
      if (!role) {
        return { allowed: false, reason: 'Invalid user role' };
      }

      const hasPermission = role.permissions.some(p => 
        p.resource === permission.resource && 
        p.action === permission.action &&
        this.checkConditions(p.conditions, user)
      );

      return { allowed: hasPermission };
    } catch (error) {
      console.error('❌ Error checking permission:', error);
      return { allowed: false, reason: 'Permission check failed' };
    }
  }

  /**
   * Check if user can create a task (assignment, lecture, or study session)
   */
  async canCreateTask(user: User, taskType: 'assignments' | 'lectures' | 'study_sessions'): Promise<PermissionCheckResult> {
    try {
      // Check basic permission
      const permission = PERMISSIONS[`CREATE_${taskType.toUpperCase().slice(0, -1)}` as keyof typeof PERMISSIONS];
      const hasPermission = await this.hasPermission(user, permission);
      
      if (!hasPermission.allowed) {
        return hasPermission;
      }

      // Check task limits
      const limitCheck = await this.checkTaskLimit(user, taskType);
      if (!limitCheck.allowed) {
        return {
          allowed: false,
          reason: `Monthly limit reached for ${taskType}`,
          limit: limitCheck.limit,
          current: limitCheck.current
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error('❌ Error checking task creation permission:', error);
      return { allowed: false, reason: 'Task creation check failed' };
    }
  }

  /**
   * Check if user can create SRS reminders
   */
  async canCreateSRSReminders(user: User): Promise<PermissionCheckResult> {
    try {
      const hasPermission = await this.hasPermission(user, PERMISSIONS.CREATE_SRS_REMINDERS);
      
      if (!hasPermission.allowed) {
        return hasPermission;
      }

      // Check SRS reminder limits
      const limitCheck = await this.checkTaskLimit(user, 'srs_reminders');
      if (!limitCheck.allowed) {
        return {
          allowed: false,
          reason: 'Monthly SRS reminder limit reached',
          limit: limitCheck.limit,
          current: limitCheck.current
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error('❌ Error checking SRS reminder permission:', error);
      return { allowed: false, reason: 'SRS reminder check failed' };
    }
  }

  /**
   * Check if user is premium
   */
  async isPremium(user: User): Promise<boolean> {
    try {
      const role = await this.getUserRole(user);
      return role?.subscriptionTier === 'oddity';
    } catch (error) {
      console.error('❌ Error checking premium status:', error);
      return false;
    }
  }

  /**
   * Check if user is admin
   */
  async isAdmin(user: User): Promise<boolean> {
    try {
      const role = await this.getUserRole(user);
      return role?.subscriptionTier === 'admin';
    } catch (error) {
      console.error('❌ Error checking admin status:', error);
      return false;
    }
  }

  /**
   * Get user's task limits
   */
  async getTaskLimits(user: User): Promise<TaskLimitCheck[]> {
    try {
      const role = await this.getUserRole(user);
      const subscriptionTier = role?.subscriptionTier || 'free';
      const limits = TASK_LIMITS[subscriptionTier as keyof typeof TASK_LIMITS];

      const taskTypes: (keyof typeof limits)[] = ['assignments', 'lectures', 'study_sessions', 'courses', 'srs_reminders'];
      const results: TaskLimitCheck[] = [];

      for (const taskType of taskTypes) {
        const limitCheck = await this.checkTaskLimit(user, taskType);
        results.push({
          allowed: limitCheck.allowed,
          limit: limitCheck.limit,
          current: limitCheck.current,
          remaining: Math.max(0, limitCheck.limit - limitCheck.current)
        });
      }

      return results;
    } catch (error) {
      console.error('❌ Error getting task limits:', error);
      return [];
    }
  }

  /**
   * Check task limit for a specific type
   */
  private async checkTaskLimit(user: User, taskType: string): Promise<TaskLimitCheck> {
    try {
      const role = await this.getUserRole(user);
      const subscriptionTier = role?.subscriptionTier || 'free';
      const limits = TASK_LIMITS[subscriptionTier as keyof typeof TASK_LIMITS];
      const limit = limits[taskType as keyof typeof limits];

      // Unlimited for admin or -1 limit
      if (subscriptionTier === 'admin' || limit === -1) {
        return { allowed: true, limit: -1, current: 0 };
      }

      // TODO: Implement actual task count query
      // This would query the database to get current task count for the user
      const current = 0; // Placeholder

      return {
        allowed: current < limit,
        limit,
        current
      };
    } catch (error) {
      console.error('❌ Error checking task limit:', error);
      return { allowed: false, limit: 0, current: 0 };
    }
  }

  /**
   * Get user's role with caching
   */
  private async getUserRole(user: User): Promise<UserRole> {
    try {
      // Try to get from cache first
      const cached = await this.permissionCacheService.getCachedPermissions(user.id);
      if (cached) {
        return cached.role;
      }

      // Get role and cache it
      const role = getRoleBySubscriptionTier(user.subscription_tier);
      await this.permissionCacheService.cachePermissions(user.id, role.permissions, role);

      return role;
    } catch (error) {
      console.error('❌ Error getting user role:', error);
      return ROLES.FREE_USER; // Default to free user
    }
  }

  /**
   * Check permission conditions
   */
  private checkConditions(conditions: Record<string, any> | undefined, user: User): boolean {
    if (!conditions) return true;

    // Add condition checks here based on your business logic
    // For example: check user status, account type, etc.
    
    return true;
  }

  /**
   * Invalidate permission cache for user
   */
  async invalidateCache(userId: string): Promise<void> {
    await this.permissionCacheService.invalidateUserCache(userId);
  }

  /**
   * Clear all permission cache
   */
  async clearCache(): Promise<void> {
    await this.permissionCacheService.clearAllCache();
  }
}
