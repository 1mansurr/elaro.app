export interface Permission {
  resource: string;
  action: string;
  conditions?: Record<string, any>;
}

export interface UserRole {
  name: string;
  permissions: Permission[];
  subscriptionTier?: string;
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

  // Generic task permissions
  CREATE_TASK: { resource: 'tasks', action: 'create' },
  EDIT_TASK: { resource: 'tasks', action: 'update' },
  DELETE_TASK: { resource: 'tasks', action: 'delete' },
  VIEW_TASK: { resource: 'tasks', action: 'view' },

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

  // Notification permissions
  MANAGE_NOTIFICATIONS: { resource: 'notifications', action: 'manage' },
  PUSH_NOTIFICATIONS: { resource: 'notifications', action: 'push' },
} as const;

// Role definitions
export const ROLES: Record<string, UserRole> = {
  FREE_USER: {
    name: 'free_user',
    subscriptionTier: 'free',
    permissions: [
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
      PERMISSIONS.MANAGE_NOTIFICATIONS,
    ],
  },
  PREMIUM_USER: {
    name: 'premium_user',
    subscriptionTier: 'oddity',
    permissions: [
      PERMISSIONS.VIEW_COURSE,
      PERMISSIONS.CREATE_TASK,
      PERMISSIONS.EDIT_TASK,
      PERMISSIONS.DELETE_TASK,
      PERMISSIONS.VIEW_TASK,
      PERMISSIONS.MANAGE_NOTIFICATIONS,
      PERMISSIONS.VIEW_PREMIUM_FEATURES,
      PERMISSIONS.UNLIMITED_TASKS,
      PERMISSIONS.ADVANCED_ANALYTICS,
      PERMISSIONS.EXPORT_DATA,
      PERMISSIONS.CREATE_SRS_REMINDERS,
      PERMISSIONS.UNLIMITED_SRS_REMINDERS,
      PERMISSIONS.PUSH_NOTIFICATIONS,
    ],
  },
  ADMIN: {
    name: 'admin',
    subscriptionTier: 'admin',
    permissions: [
      PERMISSIONS.ADMIN_ACCESS,
      PERMISSIONS.VIEW_ALL_USERS,
      PERMISSIONS.MANAGE_SYSTEM,
      PERMISSIONS.VIEW_COURSE,
      PERMISSIONS.CREATE_TASK,
      PERMISSIONS.EDIT_TASK,
      PERMISSIONS.DELETE_TASK,
      PERMISSIONS.VIEW_TASK,
      PERMISSIONS.MANAGE_NOTIFICATIONS,
      PERMISSIONS.VIEW_PREMIUM_FEATURES,
      PERMISSIONS.UNLIMITED_TASKS,
      PERMISSIONS.ADVANCED_ANALYTICS,
      PERMISSIONS.EXPORT_DATA,
      PERMISSIONS.CREATE_SRS_REMINDERS,
      PERMISSIONS.UNLIMITED_SRS_REMINDERS,
      PERMISSIONS.PUSH_NOTIFICATIONS,
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

// Helper function to get role by subscription tier
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

// Helper function to check if permission is allowed for role
export const isPermissionAllowed = (
  role: UserRole,
  permission: Permission,
): boolean => {
  return role.permissions.some(
    p => p.resource === permission.resource && p.action === permission.action,
  );
};
