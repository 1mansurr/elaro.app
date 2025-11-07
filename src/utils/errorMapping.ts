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
  details?: Record<string, unknown>;
}

/**
 * Map error codes to user-friendly messages
 */
const ERROR_MESSAGES: Record<string, string> = {
  // Authentication & Authorization Errors
  UNAUTHORIZED:
    'You need to be logged in to perform this action. Please sign in and try again.',
  FORBIDDEN:
    'You do not have permission to perform this action. If you believe this is an error, please contact support.',
  AUTH_FAILED: 'Authentication failed. Please log in again.',
  INVALID_CREDENTIALS:
    'Invalid email or password. Please check your credentials and try again.',
  TOKEN_EXPIRED: 'Your session has expired. Please sign in again.',
  INVALID_TOKEN: 'Your session is invalid. Please sign in again.',
  ACCOUNT_LOCKED:
    'Your account has been temporarily locked due to multiple failed login attempts. Please try again later or contact support.',
  EMAIL_IN_USE:
    'This email address is already registered. Please sign in or use a different email.',
  CRON_AUTH_ERROR: 'Unauthorized scheduled task.',
  WEBHOOK_AUTH_ERROR: 'Invalid webhook authorization.',

  // Validation Errors
  VALIDATION_ERROR:
    'Please check your input and try again. Some fields may be missing or invalid.',
  VALIDATION_SCHEMA_MISSING:
    'Server configuration error. Please contact support if this problem persists.',
  INVALID_INPUT:
    'The information you entered is invalid. Please check your input and try again.',
  MISSING_REQUIRED_FIELD: 'Please fill in all required fields.',
  INVALID_FORMAT:
    'The format of your input is incorrect. Please check and try again.',
  MISSING_CUSTOMER_INFO:
    'Subscription information is missing. Please contact support.',

  // User/Account Errors
  USER_NOT_FOUND: 'User account not found.',
  PROFILE_FETCH_ERROR: 'Could not load user profile.',
  ALREADY_DELETED: 'This account is already deleted.',
  SUSPENDED_ACCOUNT: 'This account is suspended.',
  NOT_SUSPENDED: 'This account is not suspended.',
  ALREADY_SUSPENDED: 'This account is already suspended.',
  SELF_SUSPENSION_NOT_ALLOWED: 'You cannot suspend your own account.',
  CANNOT_SUSPEND_DELETED: 'Cannot suspend a deleted account.',
  INVALID_STATUS: 'Invalid account status.',
  RESTORATION_EXPIRED: 'Account restoration period has expired.',

  // Age/Consent Errors
  AGE_RESTRICTION: 'You must be at least 13 years old to use this service.',
  PARENTAL_CONSENT_REQUIRED: 'Parental consent is required for users under 18.',

  // Resource Not Found
  NOT_FOUND:
    'The requested item was not found or you do not have permission to access it.',
  COURSE_NOT_FOUND:
    "The course you're looking for doesn't exist or has been deleted.",
  ASSIGNMENT_NOT_FOUND:
    "The assignment you're looking for doesn't exist or has been deleted.",
  LECTURE_NOT_FOUND:
    "The lecture you're looking for doesn't exist or has been deleted.",
  STUDY_SESSION_NOT_FOUND:
    "The study session you're looking for doesn't exist or has been deleted.",
  ALREADY_EXISTS:
    'This item already exists. Please use a different name or identifier.',
  DUPLICATE_RECORD:
    'A record with this information already exists. Please check and try again.',
  RECORD_NOT_FOUND:
    "The record you're looking for doesn't exist or has been removed.",

  // Rate Limiting
  TOO_MANY_REQUESTS:
    "You've made too many requests. Please wait a moment and try again.",
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded. Please try again later.',
  EXPORT_RATE_LIMIT:
    'Data export is limited to once per week. Please try again later.',

  // Versioning
  UNSUPPORTED_VERSION:
    'This version of the app is no longer supported. Please update to the latest version.',

  // Limits
  LIMIT_REACHED:
    'You have reached your limit for this action. Upgrade to continue.',
  TASK_LIMIT_REACHED:
    'You have reached your monthly task limit. Upgrade to add more tasks.',
  COURSE_LIMIT_REACHED: 'You have reached your course limit for this plan.',
  SRS_LIMIT_REACHED:
    'You have reached your monthly limit for Spaced Repetition reminders.',

  // Database Errors
  DB_ERROR: 'A database error occurred. Please try again in a moment.',
  DB_QUERY_ERROR:
    'Failed to retrieve data. Please check your connection and try again.',
  DB_FETCH_ERROR:
    'Failed to load data. Please check your connection and try again.',
  DB_CONNECTION_ERROR: 'Database connection failed. Please try again later.',
  DB_CONSTRAINT_VIOLATION:
    'This operation cannot be completed due to data constraints. Please check your input.',
  DB_NOT_FOUND: 'The requested data was not found.',
  DB_INSERT_ERROR:
    'Failed to save data. Please check your input and try again.',
  DB_UPDATE_ERROR: 'Failed to update. Please try again.',
  DB_DELETE_ERROR: 'Failed to delete. Please try again.',
  DB_CHECK_ERROR: 'Failed to check availability. Please try again.',
  DATABASE_ERROR: 'A database error occurred. Please try again.',

  // External Service Errors
  EXTERNAL_SERVICE_ERROR: 'A service error occurred. Please try again later.',
  EXTERNAL_SERVICE_TIMEOUT:
    'Service request timed out. Please check your connection and try again.',
  EXTERNAL_SERVICE_UNAVAILABLE:
    'Service is temporarily unavailable. Please try again later.',

  // Network Errors
  NETWORK_ERROR:
    'Network error. Please check your internet connection and try again.',
  TIMEOUT: 'Request timed out. Please check your connection and try again.',
  TIMEOUT_ERROR: 'The request took too long. Please try again.',
  SERVICE_UNAVAILABLE:
    'Service is temporarily unavailable. Please try again later.',

  // Configuration Errors
  CONFIG_ERROR:
    'Server configuration error. Please contact support if this problem persists.',
  MISSING_ENV_VAR: 'Server configuration error. Please contact support.',
  WEBHOOK_CONFIG_ERROR: 'Webhook configuration error.',
  CONFIGURATION_ERROR: 'Configuration error. Please contact support.',

  // System Errors
  INTERNAL_ERROR:
    'An internal error occurred. Please try again. If the problem persists, contact support.',
  DEPENDENCY_ERROR:
    'A system dependency error occurred. Please try again later.',

  // RPC Errors
  RPC_ERROR: 'Failed to retrieve data. Please try again.',

  // Idempotency Errors
  IDEMPOTENCY_KEY_REQUIRED:
    'A request ID is required for this operation. Please try again.',
  IDEMPOTENCY_KEY_INVALID: 'Invalid request ID format. Please try again.',

  // Admin Errors
  ADMIN_REQUIRED: 'This action requires administrator privileges.',
  INSUFFICIENT_PERMISSIONS:
    'You do not have sufficient permissions to perform this action.',
  OPERATION_NOT_ALLOWED:
    'This operation is not allowed in your current context.',

  // Resource Limits
  RESOURCE_LIMIT_EXCEEDED:
    'You have reached your resource limit. Please upgrade or contact support.',
  QUOTA_EXCEEDED:
    'You have exceeded your quota. Please upgrade your plan to continue.',

  // Count Errors
  COUNT_ERROR: 'Failed to count items. Please try again.',

  // Unknown/Fallback
  UNKNOWN_ERROR:
    'An unexpected error occurred. Please try again. If the problem persists, contact support.',
};

/**
 * Extract error information from various error formats
 */
function extractErrorInfo(error: unknown): {
  message?: string;
  code?: string;
  details?: Record<string, unknown>;
} {
  // Handle null/undefined
  if (!error) {
    return {};
  }

  // Handle AppError from backend (response.error format)
  if (typeof error === 'object' && error !== null) {
    const errorObj = error as Record<string, unknown>;

    // Format 1: { error: string, code: string, details: Record<string, unknown> }
    if (errorObj.error || errorObj.code) {
      return {
        message:
          (typeof errorObj.error === 'string' ? errorObj.error : undefined) ||
          (typeof errorObj.message === 'string' ? errorObj.message : undefined),
        code: typeof errorObj.code === 'string' ? errorObj.code : undefined,
        details:
          errorObj.details && typeof errorObj.details === 'object'
            ? (errorObj.details as Record<string, unknown>)
            : undefined,
      };
    }

    // Format 2: { message: string, code: string }
    if (errorObj.message || errorObj.code) {
      return {
        message:
          typeof errorObj.message === 'string' ? errorObj.message : undefined,
        code: typeof errorObj.code === 'string' ? errorObj.code : undefined,
        details:
          errorObj.details && typeof errorObj.details === 'object'
            ? (errorObj.details as Record<string, unknown>)
            : undefined,
      };
    }

    // Format 3: Supabase error format
    if (errorObj.statusCode || errorObj.status) {
      return {
        message:
          (typeof errorObj.message === 'string'
            ? errorObj.message
            : undefined) ||
          (typeof errorObj.error_description === 'string'
            ? errorObj.error_description
            : undefined) ||
          (typeof errorObj.msg === 'string' ? errorObj.msg : undefined),
        code:
          (typeof errorObj.code === 'string' ? errorObj.code : undefined) ||
          (typeof errorObj.error === 'string' ? errorObj.error : undefined),
      };
    }
  }

  // Handle Error instances
  if (error instanceof Error) {
    const errorWithCode = error as Error & { code?: string };
    return {
      message: error.message,
      code: errorWithCode.code,
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
export function mapErrorCodeToMessage(error: unknown): string {
  const { message, code, details } = extractErrorInfo(error);

  // If we have a code, try to map it to a friendly message
  if (code && ERROR_MESSAGES[code]) {
    return ERROR_MESSAGES[code];
  }

  // Check if the message itself contains known error patterns
  if (message) {
    const lowerMessage = message.toLowerCase();

    // Email already exists
    if (
      lowerMessage.includes('email') &&
      (lowerMessage.includes('already') ||
        lowerMessage.includes('exists') ||
        lowerMessage.includes('taken'))
    ) {
      return ERROR_MESSAGES['EMAIL_IN_USE'];
    }

    // Rate limiting
    if (
      lowerMessage.includes('rate limit') ||
      lowerMessage.includes('too many')
    ) {
      return ERROR_MESSAGES['TOO_MANY_REQUESTS'];
    }

    // Database errors (check before network errors to avoid false positives)
    // Check for "database" or "db" or "sql" first, and also check that "connection" is part of database context
    if (
      lowerMessage.includes('database') ||
      lowerMessage.includes('db') ||
      lowerMessage.includes('sql') ||
      (lowerMessage.includes('connection') &&
        (lowerMessage.includes('database') || lowerMessage.includes('db')))
    ) {
      return ERROR_MESSAGES['DB_ERROR'] || 'Database error. Please try again.';
    }

    // Network/connection errors (but not database connection errors)
    if (
      lowerMessage.includes('network') ||
      (lowerMessage.includes('connection') &&
        !lowerMessage.includes('database') &&
        !lowerMessage.includes('db')) ||
      lowerMessage.includes('timeout') ||
      lowerMessage.includes('fetch')
    ) {
      return (
        ERROR_MESSAGES['NETWORK_ERROR'] ||
        'Network error. Please check your internet connection and try again.'
      );
    }

    // External service errors
    if (
      lowerMessage.includes('external service') ||
      lowerMessage.includes('third party')
    ) {
      return (
        ERROR_MESSAGES['EXTERNAL_SERVICE_ERROR'] ||
        'Service error. Please try again later.'
      );
    }

    // Token/session errors
    if (
      lowerMessage.includes('token') ||
      lowerMessage.includes('session') ||
      lowerMessage.includes('expired')
    ) {
      return (
        ERROR_MESSAGES['TOKEN_EXPIRED'] ||
        'Your session has expired. Please sign in again.'
      );
    }

    // Permission errors
    if (
      lowerMessage.includes('permission') ||
      lowerMessage.includes('unauthorized') ||
      lowerMessage.includes('forbidden')
    ) {
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
    // But only if it's not an Error instance or raw string (those should use default)
    if (
      message.length < 100 &&
      !lowerMessage.includes('undefined') &&
      !lowerMessage.includes('null')
    ) {
      // Check if error is an Error instance or raw string - these should use default message
      if (error instanceof Error || typeof error === 'string') {
        // Use default for Error instances and strings
        return 'An unexpected error occurred. Please try again.';
      }
      return message;
    }
  }

  // Validation errors - show details if available
  if (code === 'VALIDATION_ERROR' && details) {
    return 'Please check your input and try again.';
  }

  // Default fallback for Error instances and strings
  if (error instanceof Error || typeof error === 'string') {
    return 'An unexpected error occurred. Please try again.';
  }

  // Default fallback
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Get a short error title based on error code
 * Useful for Alert.alert titles
 */
export function getErrorTitle(error: unknown): string {
  const { code } = extractErrorInfo(error);

  const TITLES: Record<string, string> = {
    UNAUTHORIZED: 'Authentication Required',
    FORBIDDEN: 'Access Denied',
    AUTH_FAILED: 'Authentication Failed',
    INVALID_CREDENTIALS: 'Invalid Credentials',
    TOKEN_EXPIRED: 'Session Expired',
    INVALID_TOKEN: 'Invalid Session',
    ACCOUNT_LOCKED: 'Account Locked',
    EMAIL_IN_USE: 'Email Already Registered',
    VALIDATION_ERROR: 'Validation Error',
    INVALID_INPUT: 'Invalid Input',
    MISSING_REQUIRED_FIELD: 'Missing Information',
    NOT_FOUND: 'Not Found',
    ALREADY_EXISTS: 'Already Exists',
    TOO_MANY_REQUESTS: 'Too Many Requests',
    RATE_LIMIT_EXCEEDED: 'Rate Limit Exceeded',
    LIMIT_REACHED: 'Limit Reached',
    TASK_LIMIT_REACHED: 'Task Limit Reached',
    RESOURCE_LIMIT_EXCEEDED: 'Resource Limit Reached',
    QUOTA_EXCEEDED: 'Quota Exceeded',
    NETWORK_ERROR: 'Network Error',
    TIMEOUT: 'Request Timeout',
    SERVICE_UNAVAILABLE: 'Service Unavailable',
    DB_ERROR: 'Database Error',
    EXTERNAL_SERVICE_ERROR: 'Service Error',
    INTERNAL_ERROR: 'Internal Error',
    CONFIG_ERROR: 'Configuration Error',
    AGE_RESTRICTION: 'Age Restriction',
    PARENTAL_CONSENT_REQUIRED: 'Consent Required',
    ADMIN_REQUIRED: 'Admin Access Required',
    INSUFFICIENT_PERMISSIONS: 'Insufficient Permissions',
  };

  if (code && TITLES[code]) {
    return TITLES[code];
  }

  return 'Error';
}

/**
 * Check if an error is recoverable (user can retry)
 */
export function isRecoverableError(error: unknown): boolean {
  const { code } = extractErrorInfo(error);

  const NON_RECOVERABLE_CODES = [
    'UNAUTHORIZED',
    'FORBIDDEN',
    'AUTH_FAILED',
    'TOKEN_EXPIRED',
    'INVALID_TOKEN',
    'ACCOUNT_LOCKED',
    'AGE_RESTRICTION',
    'PARENTAL_CONSENT_REQUIRED',
    'LIMIT_REACHED',
    'TASK_LIMIT_REACHED',
    'COURSE_LIMIT_REACHED',
    'SRS_LIMIT_REACHED',
    'RESOURCE_LIMIT_EXCEEDED',
    'QUOTA_EXCEEDED',
    'ADMIN_REQUIRED',
    'INSUFFICIENT_PERMISSIONS',
    'OPERATION_NOT_ALLOWED',
    'RESTORATION_EXPIRED',
    'ALREADY_DELETED',
    'SUSPENDED_ACCOUNT',
  ];

  return !code || !NON_RECOVERABLE_CODES.includes(code);
}
