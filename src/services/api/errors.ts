export class ApiError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any,
    public originalError?: Error,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const handleApiError = (error: any): ApiError => {
  if (error instanceof ApiError) return error;

  // Handle Supabase-specific errors which often have a message property
  if (error?.message) {
    return new ApiError(error.message, error.code, error.details, error);
  }

  // Handle generic network errors
  if (error?.name === 'NetworkError') {
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
