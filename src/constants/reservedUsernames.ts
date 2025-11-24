/**
 * Reserved Usernames List
 *
 * These usernames are blocked to prevent conflicts with system routes,
 * endpoints, and reserved functionality. Matching is case-insensitive
 * and word-boundary aware.
 */

export const RESERVED_USERNAMES = [
  // App/Brand names
  'elaro',

  // System routes
  'settings',
  'support',
  'legal',
  'marketing',
  'admin',
  'api',
  'www',
  'mail',
  'help',
  'contact',
  'about',
  'privacy',
  'terms',
  'faq',

  // User-related routes
  'users',
  'profile',
  'account',
  'analytics',
  'dashboard',

  // Content routes
  'courses',
  'lectures',
  'assignments',
  'sessions',
  'reminders',
  'notifications',
  'messages',
  'chat',
  'inbox',

  // System/Technical
  'root',
  'system',
  'test',
  'demo',
  'guest',
  'null',
  'undefined',
  'app',
  'mobile',
  'web',
  'ios',
  'android',

  // Common web routes
  'blog',
  'news',
  'feed',
  'home',
  'search',
  'explore',

  // Auth routes
  'login',
  'signup',
  'signin',
  'logout',
  'register',
  'auth',
  'password',
  'reset',
  'verify',
  'confirm',
  'activate',

  // Roles/Status
  'moderator',
  'staff',
  'team',
  'official',

  // Development/Status
  'beta',
  'alpha',
  'preview',
  'staging',
  'production',
  'status',
  'health',
  'monitor',
  'metrics',
] as const;

/**
 * Check if a username contains a reserved word (case-insensitive, word-boundary aware)
 * @param username - The username to check (original case preserved)
 * @returns true if username contains a reserved word as a complete word
 *
 * Examples:
 * - "elaro" → true (exact match)
 * - "elaro123" → true (starts with reserved word)
 * - "user_elaro" → true (contains reserved word as complete word)
 * - "elaroman" → false (part of larger word)
 * - "myelaro" → false (part of larger word)
 */
export function isReservedUsername(username: string): boolean {
  // Check against original case (not normalized)
  return RESERVED_USERNAMES.some(reserved => {
    // Use word boundary regex to match complete words only
    // \b matches word boundaries (start, end, or between word/non-word chars)
    // 'i' flag makes it case-insensitive
    const regex = new RegExp(`\\b${reserved}\\b`, 'i');
    return regex.test(username);
  });
}
