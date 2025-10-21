/**
 * Custom error class for application-specific errors
 * Provides consistent error handling across the app
 */
export class AppError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number = 500, code: string = 'UNKNOWN_ERROR') {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  /**
   * Convert error to a plain object for logging or API responses
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      status: this.status,
      code: this.code,
    };
  }

  /**
   * Check if an error is an AppError instance
   */
  static isAppError(error: any): error is AppError {
    return error instanceof AppError;
  }

  /**
   * Create an AppError from an unknown error
   */
  static fromError(error: unknown, defaultMessage: string = 'An unexpected error occurred'): AppError {
    if (error instanceof AppError) {
      return error;
    }
    
    if (error instanceof Error) {
      return new AppError(error.message, 500, 'UNKNOWN_ERROR');
    }
    
    return new AppError(defaultMessage, 500, 'UNKNOWN_ERROR');
  }
}

/**
 * Type guard to check if an error is an AppError
 */
export const isAppError = (error: any): error is AppError => {
  return error instanceof AppError;
};

