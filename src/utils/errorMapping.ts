/**
 * Error Mapping Utility
 * 
 * Maps backend error codes to user-friendly messages.
 * Provides consistent, actionable error feedback across the app.
 */

interface AppErrorResponse {
  error?: string;
  message?: string;
  code?: string;
  details?: any;
}

/**
 * Map error codes to user-friendly messages
 */
const ERROR_MESSAGES: Record<string, string> = {
  // Authentication Errors
  'UNAUTHORIZED': 'You need to be logged in to perform this action.',
  'AUTH_FAILED': 'Authentication failed. Please log in again.',
  'INVALID_CREDENTIALS': 'Invalid email or password. Please try again.',
  'EMAIL_IN_USE': 'This email address is already registered. Please sign in or use a different email.',
  'CRON_AUTH_ERROR': 'Unauthorized scheduled task.',
  'WEBHOOK_AUTH_ERROR': 'Invalid webhook authorization.',
  
  // Validation Errors
  'VALIDATION_ERROR': 'Please check your input and try again.',
  'MISSING_CUSTOMER_INFO': 'Subscription information is missing.',
  
  // User/Account Errors
  'USER_NOT_FOUND': 'User account not found.',
  'PROFILE_FETCH_ERROR': 'Could not load user profile.',
  'ALREADY_DELETED': 'This account is already deleted.',
  'SUSPENDED_ACCOUNT': 'This account is suspended.',
  'NOT_SUSPENDED': 'This account is not suspended.',
  'ALREADY_SUSPENDED': 'This account is already suspended.',
  'SELF_SUSPENSION_NOT_ALLOWED': 'You cannot suspend your own account.',
  'CANNOT_SUSPEND_DELETED': 'Cannot suspend a deleted account.',
  'INVALID_STATUS': 'Invalid account status.',
  'RESTORATION_EXPIRED': 'Account restoration period has expired.',
  
  // Age/Consent Errors
  'AGE_RESTRICTION': 'You must be at least 13 years old to use this service.',
  'PARENTAL_CONSENT_REQUIRED': 'Parental consent is required for users under 18.',
  
  // Resource Not Found
  'NOT_FOUND': 'The requested item was not found or you do not have permission to access it.',
  'COURSE_NOT_FOUND': 'Course not found.',
  'ASSIGNMENT_NOT_FOUND': 'Assignment not found.',
  'LECTURE_NOT_FOUND': 'Lecture not found.',
  'STUDY_SESSION_NOT_FOUND': 'Study session not found.',
  
  // Rate Limiting
  'TOO_MANY_REQUESTS': 'You\'ve made too many requests. Please wait a moment and try again.',
  'RATE_LIMIT_EXCEEDED': 'Rate limit exceeded. Please try again later.',
  'EXPORT_RATE_LIMIT': 'Data export is limited to once per week. Please try again later.',
  
  // Versioning
  'UNSUPPORTED_VERSION': 'This version of the app is no longer supported. Please update to the latest version.',
  
  // Limits
  'LIMIT_REACHED': 'You have reached your limit for this action. Upgrade to continue.',
  'TASK_LIMIT_REACHED': 'You have reached your monthly task limit. Upgrade to add more tasks.',
  'COURSE_LIMIT_REACHED': 'You have reached your course limit for this plan.',
  'SRS_LIMIT_REACHED': 'You have reached your monthly limit for Spaced Repetition reminders.',
  
  // Database Errors
  'DB_QUERY_ERROR': 'Database query failed. Please try again.',
  'DB_FETCH_ERROR': 'Failed to load data. Please check your connection and try again.',
  'DB_INSERT_ERROR': 'Failed to save data. Please try again.',
  'DB_UPDATE_ERROR': 'Failed to update. Please try again.',
  'DB_DELETE_ERROR': 'Failed to delete. Please try again.',
  'DB_CHECK_ERROR': 'Failed to check availability. Please try again.',
  
  // Configuration Errors
  'CONFIG_ERROR': 'Server configuration error. Please contact support.',
  'WEBHOOK_CONFIG_ERROR': 'Webhook configuration error.',
  
  // RPC Errors
  'RPC_ERROR': 'Failed to retrieve data. Please try again.',
  
  // Admin Errors
  'ADMIN_REQUIRED': 'This action requires administrator privileges.',
  
  // Count Errors
  'COUNT_ERROR': 'Failed to count items.',
  
  // Unknown/Fallback
  'UNKNOWN_ERROR': 'An unexpected error occurred. Please try again.',
};

/**
 * Extract error information from various error formats
 */
function extractErrorInfo(error: any): { message?: string; code?: string; details?: any } {
  // Handle null/undefined
  if (!error) {
    return {};
  }

  // Handle AppError from backend (response.error format)
  if (typeof error === 'object') {
    // Format 1: { error: string, code: string, details: any }
    if (error.error || error.code) {
      return {
        message: error.error || error.message,
        code: error.code,
        details: error.details,
      };
    }

    // Format 2: { message: string, code: string }
    if (error.message || error.code) {
      return {
        message: error.message,
        code: error.code,
        details: error.details,
      };
    }

    // Format 3: Supabase error format
    if (error.statusCode || error.status) {
      return {
        message: error.message || error.error_description || error.msg,
        code: error.code || error.error,
      };
    }
  }

  // Handle Error instances
  if (error instanceof Error) {
    return {
      message: error.message,
      code: (error as any).code,
    };
  }

  // Handle string errors
  if (typeof error === 'string') {
    return {
      message: error,
    };
  }

  return {};
}

/**
 * Map error code to user-friendly message
 * 
 * @param error - Error object from API/mutation
 * @returns User-friendly error message
 * 
 * @example
 * ```typescript
 * try {
 *   await createCourse();
 * } catch (error) {
 *   Alert.alert('Error', mapErrorCodeToMessage(error));
 * }
 * ```
 */
export function mapErrorCodeToMessage(error: any): string {
  const { message, code, details } = extractErrorInfo(error);

  // If we have a code, try to map it to a friendly message
  if (code && ERROR_MESSAGES[code]) {
    return ERROR_MESSAGES[code];
  }

  // Check if the message itself contains known error patterns
  if (message) {
    const lowerMessage = message.toLowerCase();
    
    // Email already exists
    if (lowerMessage.includes('email') && (lowerMessage.includes('already') || lowerMessage.includes('exists') || lowerMessage.includes('taken'))) {
      return ERROR_MESSAGES['EMAIL_IN_USE'];
    }
    
    // Rate limiting
    if (lowerMessage.includes('rate limit') || lowerMessage.includes('too many')) {
      return ERROR_MESSAGES['TOO_MANY_REQUESTS'];
    }
    
    // Network/connection errors
    if (lowerMessage.includes('network') || lowerMessage.includes('connection') || lowerMessage.includes('timeout')) {
      return 'Network error. Please check your internet connection and try again.';
    }
    
    // Permission errors
    if (lowerMessage.includes('permission') || lowerMessage.includes('unauthorized') || lowerMessage.includes('forbidden')) {
      return ERROR_MESSAGES['UNAUTHORIZED'];
    }
    
    // Not found errors
    if (lowerMessage.includes('not found')) {
      return ERROR_MESSAGES['NOT_FOUND'];
    }
    
    // Limit reached errors
    if (lowerMessage.includes('limit') && lowerMessage.includes('reached')) {
      return ERROR_MESSAGES['LIMIT_REACHED'];
    }
    
    // If the message is already user-friendly (no technical jargon), use it
    if (message.length < 100 && !lowerMessage.includes('undefined') && !lowerMessage.includes('null')) {
      return message;
    }
  }

  // Validation errors - show details if available
  if (code === 'VALIDATION_ERROR' && details) {
    return 'Please check your input and try again.';
  }

  // Default fallback
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Get a short error title based on error code
 * Useful for Alert.alert titles
 */
export function getErrorTitle(error: any): string {
  const { code } = extractErrorInfo(error);

  const TITLES: Record<string, string> = {
    'UNAUTHORIZED': 'Authentication Required',
    'AUTH_FAILED': 'Authentication Failed',
    'INVALID_CREDENTIALS': 'Invalid Credentials',
    'EMAIL_IN_USE': 'Email Already Registered',
    'VALIDATION_ERROR': 'Validation Error',
    'NOT_FOUND': 'Not Found',
    'TOO_MANY_REQUESTS': 'Too Many Requests',
    'RATE_LIMIT_EXCEEDED': 'Rate Limit Exceeded',
    'LIMIT_REACHED': 'Limit Reached',
    'TASK_LIMIT_REACHED': 'Task Limit Reached',
    'AGE_RESTRICTION': 'Age Restriction',
    'PARENTAL_CONSENT_REQUIRED': 'Consent Required',
    'CONFIG_ERROR': 'Configuration Error',
    'ADMIN_REQUIRED': 'Admin Access Required',
  };

  if (code && TITLES[code]) {
    return TITLES[code];
  }

  return 'Error';
}

/**
 * Check if an error is recoverable (user can retry)
 */
export function isRecoverableError(error: any): boolean {
  const { code } = extractErrorInfo(error);

  const NON_RECOVERABLE_CODES = [
    'UNAUTHORIZED',
    'AUTH_FAILED',
    'AGE_RESTRICTION',
    'PARENTAL_CONSENT_REQUIRED',
    'LIMIT_REACHED',
    'TASK_LIMIT_REACHED',
    'COURSE_LIMIT_REACHED',
    'ADMIN_REQUIRED',
    'RESTORATION_EXPIRED',
  ];

  return !code || !NON_RECOVERABLE_CODES.includes(code);
}

