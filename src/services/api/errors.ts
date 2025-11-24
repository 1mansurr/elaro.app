interface ErrorWithMessage {
  message?: string;
  code?: string;
  details?: Record<string, unknown>;
  name?: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: Record<string, unknown>,
    public originalError?: Error | unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const handleApiError = (error: unknown): ApiError => {
  if (error instanceof ApiError) return error;

  const err = error as ErrorWithMessage;

  // Handle Supabase-specific errors which often have a message property
  if (err?.message) {
    return new ApiError(err.message, err.code, err.details, error);
  }

  // Handle generic network errors
  if (err?.name === 'NetworkError') {
    return new ApiError(
      'Network error. Please check your connection.',
      'NETWORK_ERROR',
      undefined,
      error,
    );
  }

  // Fallback for any other unexpected errors
  return new ApiError(
    'An unexpected error occurred.',
    'UNKNOWN_ERROR',
    undefined,
    error,
  );
};
