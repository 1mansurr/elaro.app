// @ts-expect-error - Deno URL imports are valid at runtime but VS Code TypeScript doesn't recognize them
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface Permission {
  resource: string;
  action: string;
}

export interface UserRole {
  name: string;
  subscriptionTier: string;
  permissions: Permission[];
}

// Permission definitions
export const PERMISSIONS = {
  // Assignment permissions
  CREATE_ASSIGNMENT: { resource: 'assignments', action: 'create' },
  UPDATE_ASSIGNMENT: { resource: 'assignments', action: 'update' },
  DELETE_ASSIGNMENT: { resource: 'assignments', action: 'delete' },
  VIEW_ASSIGNMENT: { resource: 'assignments', action: 'view' },

  // Study session permissions
  CREATE_STUDY_SESSION: { resource: 'study_sessions', action: 'create' },
  UPDATE_STUDY_SESSION: { resource: 'study_sessions', action: 'update' },
  DELETE_STUDY_SESSION: { resource: 'study_sessions', action: 'delete' },
  VIEW_STUDY_SESSION: { resource: 'study_sessions', action: 'view' },

  // Lecture permissions
  CREATE_LECTURE: { resource: 'lectures', action: 'create' },
  UPDATE_LECTURE: { resource: 'lectures', action: 'update' },
  DELETE_LECTURE: { resource: 'lectures', action: 'delete' },
  VIEW_LECTURE: { resource: 'lectures', action: 'view' },

  // Course permissions
  CREATE_COURSE: { resource: 'courses', action: 'create' },
  UPDATE_COURSE: { resource: 'courses', action: 'update' },
  DELETE_COURSE: { resource: 'courses', action: 'delete' },
  VIEW_COURSE: { resource: 'courses', action: 'view' },

  // Premium features
  VIEW_PREMIUM_FEATURES: { resource: 'premium', action: 'view' },
  UNLIMITED_TASKS: { resource: 'tasks', action: 'unlimited' },
  ADVANCED_ANALYTICS: { resource: 'analytics', action: 'advanced' },
  EXPORT_DATA: { resource: 'data', action: 'export' },

  // SRS Reminders
  CREATE_SRS_REMINDERS: { resource: 'srs_reminders', action: 'create' },
  UNLIMITED_SRS_REMINDERS: { resource: 'srs_reminders', action: 'unlimited' },

  // Admin permissions
  ADMIN_ACCESS: { resource: 'admin', action: 'all' },
  VIEW_ALL_USERS: { resource: 'users', action: 'view_all' },
  MANAGE_SYSTEM: { resource: 'system', action: 'manage' },
} as const;

// Free user permissions (base permissions)
const FREE_USER_PERMISSIONS: Permission[] = [
  PERMISSIONS.CREATE_ASSIGNMENT,
  PERMISSIONS.UPDATE_ASSIGNMENT,
  PERMISSIONS.DELETE_ASSIGNMENT,
  PERMISSIONS.VIEW_ASSIGNMENT,
  PERMISSIONS.CREATE_STUDY_SESSION,
  PERMISSIONS.UPDATE_STUDY_SESSION,
  PERMISSIONS.DELETE_STUDY_SESSION,
  PERMISSIONS.VIEW_STUDY_SESSION,
  PERMISSIONS.CREATE_LECTURE,
  PERMISSIONS.UPDATE_LECTURE,
  PERMISSIONS.DELETE_LECTURE,
  PERMISSIONS.VIEW_LECTURE,
  PERMISSIONS.CREATE_COURSE,
  PERMISSIONS.UPDATE_COURSE,
  PERMISSIONS.DELETE_COURSE,
  PERMISSIONS.VIEW_COURSE,
];

// Premium user permissions (includes free user permissions)
const PREMIUM_USER_PERMISSIONS: Permission[] = [
  ...FREE_USER_PERMISSIONS,
  PERMISSIONS.VIEW_PREMIUM_FEATURES,
  PERMISSIONS.UNLIMITED_TASKS,
  PERMISSIONS.ADVANCED_ANALYTICS,
  PERMISSIONS.EXPORT_DATA,
  PERMISSIONS.CREATE_SRS_REMINDERS,
  PERMISSIONS.UNLIMITED_SRS_REMINDERS,
];

// Role definitions
export const ROLES: Record<string, UserRole> = {
  FREE_USER: {
    name: 'free_user',
    subscriptionTier: 'free',
    permissions: FREE_USER_PERMISSIONS,
  },
  PREMIUM_USER: {
    name: 'premium_user',
    subscriptionTier: 'oddity',
    permissions: PREMIUM_USER_PERMISSIONS,
  },
  ADMIN: {
    name: 'admin',
    subscriptionTier: 'admin',
    permissions: [
      PERMISSIONS.ADMIN_ACCESS,
      PERMISSIONS.VIEW_ALL_USERS,
      PERMISSIONS.MANAGE_SYSTEM,
      ...PREMIUM_USER_PERMISSIONS,
    ],
  },
};

// Task limits by subscription tier
export const TASK_LIMITS = {
  free: {
    assignments: 15,
    lectures: 15,
    study_sessions: 15,
    courses: 2,
    srs_reminders: 5,
  },
  oddity: {
    assignments: 70,
    lectures: 70,
    study_sessions: 70,
    courses: 10,
    srs_reminders: 50,
  },
  admin: {
    assignments: -1, // unlimited
    lectures: -1,
    study_sessions: -1,
    courses: -1,
    srs_reminders: -1,
  },
} as const;

/**
 * Get role by subscription tier
 */
export const getRoleBySubscriptionTier = (
  subscriptionTier: string,
): UserRole => {
  switch (subscriptionTier) {
    case 'oddity':
      return ROLES.PREMIUM_USER;
    case 'admin':
      return ROLES.ADMIN;
    default:
      return ROLES.FREE_USER;
  }
};

/**
 * Check if user has a specific permission
 */
export const hasPermission = (
  role: UserRole,
  permission: Permission,
): boolean => {
  return role.permissions.some(
    p => p.resource === permission.resource && p.action === permission.action,
  );
};

/**
 * Check if user is admin
 */
export const isAdmin = (subscriptionTier: string): boolean => {
  return subscriptionTier === 'admin';
};

/**
 * Check if user is premium
 */
export const isPremium = (subscriptionTier: string): boolean => {
  return subscriptionTier === 'oddity';
};

/**
 * Get user's task limits
 */
export const getTaskLimits = (subscriptionTier: string) => {
  return (
    TASK_LIMITS[subscriptionTier as keyof typeof TASK_LIMITS] ||
    TASK_LIMITS.free
  );
};

/**
 * Check if user can create a task based on subscription tier
 */
export const canCreateTask = async (
  supabaseClient: SupabaseClient,
  userId: string,
  taskType: string,
): Promise<{ allowed: boolean; reason?: string }> => {
  try {
    // Get user's subscription tier
    const { data: userData, error } = await supabaseClient
      .from('users')
      .select('subscription_tier')
      .eq('id', userId)
      .single();

    if (error || !userData) {
      return { allowed: false, reason: 'User not found' };
    }

    const limits = getTaskLimits(userData.subscription_tier);

    // Check if unlimited (admin)
    if (limits[taskType as keyof typeof limits] === -1) {
      return { allowed: true };
    }

    // Check current task count
    const { count, error: countError } = await supabaseClient
      .from(taskType)
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('deleted_at', null);

    if (countError) {
      return { allowed: false, reason: 'Failed to check task limit' };
    }

    const limit = limits[taskType as keyof typeof limits];
    if (count && count >= limit) {
      return {
        allowed: false,
        reason: `Monthly limit reached for ${taskType}`,
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error('Error checking task creation permission:', error);
    return { allowed: false, reason: 'Permission check failed' };
  }
};
