/**
 * Cache Configuration
 * Defines TTL (Time To Live) and size limits for different data types
 */

export const CACHE_TTL = {
  // User data
  USER_PROFILE: 1000 * 60 * 60 * 24, // 24 hours
  USER_SETTINGS: 1000 * 60 * 60 * 24, // 24 hours

  // Course data
  COURSES: 1000 * 60 * 30, // 30 minutes
  COURSE_DETAIL: 1000 * 60 * 15, // 15 minutes

  // Task data
  ASSIGNMENTS: 1000 * 60 * 15, // 15 minutes
  LECTURES: 1000 * 60 * 15, // 15 minutes
  STUDY_SESSIONS: 1000 * 60 * 15, // 15 minutes

  // UI data
  HOME_SCREEN: 1000 * 60 * 5, // 5 minutes
  CALENDAR_DATA: 1000 * 60 * 30, // 30 minutes

  // Navigation
  NAVIGATION_STATE: 1000 * 60 * 60, // 1 hour

  // Templates
  TEMPLATES: 1000 * 60 * 60 * 24, // 24 hours

  // Notifications
  NOTIFICATION_PREFERENCES: 1000 * 60 * 60 * 24, // 24 hours
} as const;

/**
 * Cache size limits
 */
export const CACHE_LIMITS = {
  MAX_CACHE_SIZE_BYTES: 50 * 1024 * 1024, // 50MB
  MAX_ITEMS: 1000,
  EVICTION_THRESHOLD: 0.8, // Start evicting at 80% capacity
} as const;

/**
 * Get TTL for a specific cache key pattern
 */
export function getCacheTTL(key: string): number {
  // User profile
  if (key.includes('user_profile') || key.includes('user/settings')) {
    return CACHE_TTL.USER_PROFILE;
  }

  // Courses
  if (key.includes('courses')) {
    return key.includes('detail') ? CACHE_TTL.COURSE_DETAIL : CACHE_TTL.COURSES;
  }

  // Assignments
  if (key.includes('assignments')) {
    return CACHE_TTL.ASSIGNMENTS;
  }

  // Lectures
  if (key.includes('lectures')) {
    return CACHE_TTL.LECTURES;
  }

  // Study sessions
  if (key.includes('study_sessions')) {
    return CACHE_TTL.STUDY_SESSIONS;
  }

  // Home screen
  if (key.includes('home') || key.includes('dashboard')) {
    return CACHE_TTL.HOME_SCREEN;
  }

  // Calendar
  if (key.includes('calendar')) {
    return CACHE_TTL.CALENDAR_DATA;
  }

  // Templates
  if (key.includes('templates')) {
    return CACHE_TTL.TEMPLATES;
  }

  // Default: 1 hour
  return 1000 * 60 * 60;
}
