/**
 * Standardized Error Codes
 *
 * All error codes used across Edge Functions for consistent error handling.
 * Client applications can use these codes to provide user-friendly messages.
 */

export const ERROR_CODES = {
  // Authentication & Authorization (4xx)
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',

  // Validation (4xx)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  VALIDATION_SCHEMA_MISSING: 'VALIDATION_SCHEMA_MISSING',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',

  // Resource Management (4xx)
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  RESOURCE_LIMIT_EXCEEDED: 'RESOURCE_LIMIT_EXCEEDED',

  // Rate Limiting (4xx)
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // Idempotency (4xx)
  IDEMPOTENCY_KEY_REQUIRED: 'IDEMPOTENCY_KEY_REQUIRED',
  IDEMPOTENCY_KEY_INVALID: 'IDEMPOTENCY_KEY_INVALID',

  // Database (5xx)
  DB_ERROR: 'DB_ERROR',
  DB_CONNECTION_ERROR: 'DB_CONNECTION_ERROR',
  DB_CONSTRAINT_VIOLATION: 'DB_CONSTRAINT_VIOLATION',
  DB_NOT_FOUND: 'DB_NOT_FOUND',
  DB_INSERT_ERROR: 'DB_INSERT_ERROR',
  DB_UPDATE_ERROR: 'DB_UPDATE_ERROR',
  DB_DELETE_ERROR: 'DB_DELETE_ERROR',
  DB_QUERY_ERROR: 'DB_QUERY_ERROR',

  // External Services (5xx)
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  EXTERNAL_SERVICE_TIMEOUT: 'EXTERNAL_SERVICE_TIMEOUT',
  EXTERNAL_SERVICE_UNAVAILABLE: 'EXTERNAL_SERVICE_UNAVAILABLE',

  // Configuration (5xx)
  CONFIG_ERROR: 'CONFIG_ERROR',
  MISSING_ENV_VAR: 'MISSING_ENV_VAR',

  // System (5xx)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  TIMEOUT: 'TIMEOUT',

  // Versioning (4xx)
  UNSUPPORTED_VERSION: 'UNSUPPORTED_VERSION',

  // Cron/Scheduled Jobs (4xx)
  CRON_AUTH_ERROR: 'CRON_AUTH_ERROR',

  // Webhooks (4xx)
  WEBHOOK_CONFIG_ERROR: 'WEBHOOK_CONFIG_ERROR',
  WEBHOOK_AUTH_ERROR: 'WEBHOOK_AUTH_ERROR',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/**
 * HTTP status codes mapped to error categories
 */
export const ERROR_STATUS_CODES: Record<ErrorCode, number> = {
  // Authentication & Authorization
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  TOKEN_EXPIRED: 401,
  INVALID_TOKEN: 401,

  // Validation
  VALIDATION_ERROR: 400,
  VALIDATION_SCHEMA_MISSING: 500,
  INVALID_INPUT: 400,
  MISSING_REQUIRED_FIELD: 400,
  INVALID_FORMAT: 400,

  // Resource Management
  NOT_FOUND: 404,
  ALREADY_EXISTS: 409,
  RESOURCE_LIMIT_EXCEEDED: 429,

  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 429,

  // Idempotency
  IDEMPOTENCY_KEY_REQUIRED: 400,
  IDEMPOTENCY_KEY_INVALID: 400,

  // Database
  DB_ERROR: 500,
  DB_CONNECTION_ERROR: 503,
  DB_CONSTRAINT_VIOLATION: 400,
  DB_NOT_FOUND: 404,
  DB_INSERT_ERROR: 500,
  DB_UPDATE_ERROR: 500,
  DB_DELETE_ERROR: 500,
  DB_QUERY_ERROR: 500,

  // External Services
  EXTERNAL_SERVICE_ERROR: 502,
  EXTERNAL_SERVICE_TIMEOUT: 504,
  EXTERNAL_SERVICE_UNAVAILABLE: 503,

  // Configuration
  CONFIG_ERROR: 500,
  MISSING_ENV_VAR: 500,

  // System
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
  TIMEOUT: 504,

  // Versioning
  UNSUPPORTED_VERSION: 400,

  // Cron
  CRON_AUTH_ERROR: 401,

  // Webhooks
  WEBHOOK_CONFIG_ERROR: 500,
  WEBHOOK_AUTH_ERROR: 401,
};

/**
 * User-friendly error messages for each error code
 */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  // Authentication & Authorization
  UNAUTHORIZED: 'Authentication required. Please sign in.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  TOKEN_EXPIRED: 'Your session has expired. Please sign in again.',
  INVALID_TOKEN: 'Invalid authentication token.',

  // Validation
  VALIDATION_ERROR: 'The provided data is invalid. Please check your input.',
  VALIDATION_SCHEMA_MISSING:
    'Server configuration error. Please contact support.',
  INVALID_INPUT: 'Invalid input provided.',
  MISSING_REQUIRED_FIELD: 'Required field is missing.',
  INVALID_FORMAT: 'Invalid data format.',

  // Resource Management
  NOT_FOUND: 'The requested resource was not found.',
  ALREADY_EXISTS: 'A record with this information already exists.',
  RESOURCE_LIMIT_EXCEEDED: 'You have reached your resource limit.',

  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please try again later.',

  // Idempotency
  IDEMPOTENCY_KEY_REQUIRED: 'Idempotency key is required for this operation.',
  IDEMPOTENCY_KEY_INVALID: 'Invalid idempotency key format.',

  // Database
  DB_ERROR: 'A database error occurred. Please try again.',
  DB_CONNECTION_ERROR:
    'Database temporarily unavailable. Please try again later.',
  DB_CONSTRAINT_VIOLATION: 'The operation violates a data constraint.',
  DB_NOT_FOUND: 'The requested resource was not found.',
  DB_INSERT_ERROR: 'Failed to create record. Please try again.',
  DB_UPDATE_ERROR: 'Failed to update record. Please try again.',
  DB_DELETE_ERROR: 'Failed to delete record. Please try again.',
  DB_QUERY_ERROR: 'Failed to retrieve data. Please try again.',

  // External Services
  EXTERNAL_SERVICE_ERROR:
    'An external service error occurred. Please try again later.',
  EXTERNAL_SERVICE_TIMEOUT: 'External service timed out. Please try again.',
  EXTERNAL_SERVICE_UNAVAILABLE: 'External service is temporarily unavailable.',

  // Configuration
  CONFIG_ERROR: 'Server configuration error. Please contact support.',
  MISSING_ENV_VAR: 'Server configuration error. Please contact support.',

  // System
  INTERNAL_ERROR: 'An internal error occurred. Please try again later.',
  SERVICE_UNAVAILABLE:
    'Service is temporarily unavailable. Please try again later.',
  TIMEOUT: 'The request timed out. Please try again.',

  // Versioning
  UNSUPPORTED_VERSION:
    'Unsupported API version. Please update your application.',

  // Cron
  CRON_AUTH_ERROR: 'Unauthorized cron job execution.',

  // Webhooks
  WEBHOOK_CONFIG_ERROR: 'Webhook configuration error.',
  WEBHOOK_AUTH_ERROR: 'Invalid webhook authentication.',
};

/**
 * Map database errors to user-friendly error codes and messages
 *
 * @param error - Database error object from Supabase
 * @returns Mapped error with code, message, and status code
 */
export function mapDatabaseError(error: any): {
  code: ErrorCode;
  message: string;
  statusCode: number;
} {
  if (!error || typeof error !== 'object') {
    return {
      code: ERROR_CODES.DB_ERROR,
      message: ERROR_MESSAGES.DB_ERROR,
      statusCode: ERROR_STATUS_CODES.DB_ERROR,
    };
  }

  const errorCode = error.code || '';
  const errorMessage = error.message || '';

  // PostgreSQL error codes
  // https://www.postgresql.org/docs/current/errcodes-appendix.html

  // Unique constraint violation
  if (
    errorCode === '23505' ||
    errorMessage.includes('duplicate key') ||
    errorMessage.includes('unique constraint')
  ) {
    return {
      code: ERROR_CODES.ALREADY_EXISTS,
      message: ERROR_MESSAGES.ALREADY_EXISTS,
      statusCode: ERROR_STATUS_CODES.ALREADY_EXISTS,
    };
  }

  // Foreign key violation
  if (
    errorCode === '23503' ||
    errorMessage.includes('foreign key constraint')
  ) {
    return {
      code: ERROR_CODES.DB_CONSTRAINT_VIOLATION,
      message: 'The operation references a resource that does not exist.',
      statusCode: ERROR_STATUS_CODES.DB_CONSTRAINT_VIOLATION,
    };
  }

  // Check constraint violation
  if (errorCode === '23514' || errorMessage.includes('check constraint')) {
    return {
      code: ERROR_CODES.DB_CONSTRAINT_VIOLATION,
      message: 'The provided data does not meet required constraints.',
      statusCode: ERROR_STATUS_CODES.DB_CONSTRAINT_VIOLATION,
    };
  }

  // Not null violation
  if (errorCode === '23502' || errorMessage.includes('not null')) {
    return {
      code: ERROR_CODES.MISSING_REQUIRED_FIELD,
      message: ERROR_MESSAGES.MISSING_REQUIRED_FIELD,
      statusCode: ERROR_STATUS_CODES.MISSING_REQUIRED_FIELD,
    };
  }

  // Connection errors
  if (
    errorCode === '08000' ||
    errorCode === '08003' ||
    errorCode === '08006' ||
    errorMessage.includes('connection')
  ) {
    return {
      code: ERROR_CODES.DB_CONNECTION_ERROR,
      message: ERROR_MESSAGES.DB_CONNECTION_ERROR,
      statusCode: ERROR_STATUS_CODES.DB_CONNECTION_ERROR,
    };
  }

  // Not found (Supabase-specific)
  if (errorCode === 'PGRST116' || errorMessage.includes('not found')) {
    return {
      code: ERROR_CODES.NOT_FOUND,
      message: ERROR_MESSAGES.NOT_FOUND,
      statusCode: ERROR_STATUS_CODES.NOT_FOUND,
    };
  }

  // Default database error
  return {
    code: ERROR_CODES.DB_ERROR,
    message: ERROR_MESSAGES.DB_ERROR,
    statusCode: ERROR_STATUS_CODES.DB_ERROR,
  };
}
