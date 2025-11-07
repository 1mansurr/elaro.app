/**
 * Application Error Class
 *
 * Provides consistent error handling across the application.
 * Extends the native Error class with additional properties for
 * better error categorization and handling.
 */

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: any,
  ) {
    super(message);
    this.name = 'AppError';

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  /**
   * Convert error to a plain object for serialization
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      code: this.code,
      details: this.details,
      stack: this.stack,
    };
  }

  /**
   * Create an AppError from a plain object
   */
  static fromJSON(obj: any): AppError {
    const error = new AppError(
      obj.message,
      obj.statusCode,
      obj.code,
      obj.details,
    );
    error.stack = obj.stack;
    return error;
  }
}

/**
 * Common error codes used throughout the application
 */
export const ERROR_CODES = {
  // Authentication errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',

  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',

  // Database errors
  DATABASE_ERROR: 'DATABASE_ERROR',
  RECORD_NOT_FOUND: 'RECORD_NOT_FOUND',
  DUPLICATE_RECORD: 'DUPLICATE_RECORD',

  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',

  // Business logic errors
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  OPERATION_NOT_ALLOWED: 'OPERATION_NOT_ALLOWED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',

  // System errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
  DEPENDENCY_ERROR: 'DEPENDENCY_ERROR',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
