import {
  mapErrorCodeToMessage,
  getErrorTitle,
  isRecoverableError,
} from '@/utils/errorMapping';

describe('errorMapping', () => {
  describe('mapErrorCodeToMessage', () => {
    it('should map error codes to user-friendly messages', () => {
      expect(mapErrorCodeToMessage({ code: 'UNAUTHORIZED' })).toContain(
        'logged in',
      );
      expect(mapErrorCodeToMessage({ code: 'FORBIDDEN' })).toContain(
        'permission',
      );
      expect(mapErrorCodeToMessage({ code: 'NOT_FOUND' })).toContain(
        'not found',
      );
      expect(mapErrorCodeToMessage({ code: 'TOO_MANY_REQUESTS' })).toContain(
        'too many',
      );
    });

    it('should handle error objects with message property', () => {
      expect(
        mapErrorCodeToMessage({ message: 'Email already exists' }),
      ).toContain('already registered');
    });

    it('should detect email conflicts from message', () => {
      expect(
        mapErrorCodeToMessage({ message: 'Email is already taken' }),
      ).toContain('already registered');
      expect(
        mapErrorCodeToMessage({ message: 'This email already exists' }),
      ).toContain('already registered');
    });

    it('should detect rate limiting from message', () => {
      expect(
        mapErrorCodeToMessage({ message: 'Rate limit exceeded' }),
      ).toContain('too many requests');
      expect(mapErrorCodeToMessage({ message: 'Too many requests' })).toContain(
        'too many requests',
      );
    });

    it('should detect network errors from message', () => {
      expect(
        mapErrorCodeToMessage({ message: 'Network error occurred' }),
      ).toContain('Network error');
      expect(
        mapErrorCodeToMessage({ message: 'Connection timeout' }),
      ).toContain('Network error');
      expect(mapErrorCodeToMessage({ message: 'Failed to fetch' })).toContain(
        'Network error',
      );
    });

    it('should detect database errors from message', () => {
      const result1 = mapErrorCodeToMessage({
        message: 'Database connection failed',
      });
      expect(result1.toLowerCase()).toContain('database');
      const result2 = mapErrorCodeToMessage({ message: 'SQL error occurred' });
      expect(result2.toLowerCase()).toContain('database');
    });

    it('should detect token/session errors from message', () => {
      expect(mapErrorCodeToMessage({ message: 'Token expired' })).toContain(
        'session has expired',
      );
      expect(mapErrorCodeToMessage({ message: 'Invalid session' })).toContain(
        'session has expired',
      );
    });

    it('should detect permission errors from message', () => {
      expect(
        mapErrorCodeToMessage({ message: 'Unauthorized access' }),
      ).toContain('logged in');
      expect(
        mapErrorCodeToMessage({ message: 'Forbidden operation' }),
      ).toContain('logged in');
    });

    it('should detect not found errors from message', () => {
      expect(
        mapErrorCodeToMessage({ message: 'Resource not found' }),
      ).toContain('not found');
    });

    it('should detect limit reached errors from message', () => {
      expect(
        mapErrorCodeToMessage({ message: 'Limit reached for this action' }),
      ).toContain('reached your limit');
    });

    it('should use user-friendly message if already short and clear', () => {
      const friendlyMessage = 'Please check your input';
      expect(mapErrorCodeToMessage({ message: friendlyMessage })).toBe(
        friendlyMessage,
      );
    });

    it('should handle Error instances', () => {
      const error = new Error('Test error');
      expect(mapErrorCodeToMessage(error)).toBe(
        'An unexpected error occurred. Please try again.',
      );
    });

    it('should handle string errors', () => {
      expect(mapErrorCodeToMessage('String error')).toBe(
        'An unexpected error occurred. Please try again.',
      );
    });

    it('should handle null/undefined errors', () => {
      expect(mapErrorCodeToMessage(null)).toBe(
        'An unexpected error occurred. Please try again.',
      );
      expect(mapErrorCodeToMessage(undefined)).toBe(
        'An unexpected error occurred. Please try again.',
      );
    });

    it('should handle validation errors with details', () => {
      const result = mapErrorCodeToMessage({
        code: 'VALIDATION_ERROR',
        details: { field: 'email' },
      });
      expect(result).toContain('check your input');
    });

    it('should return default message for unknown errors', () => {
      expect(mapErrorCodeToMessage({ code: 'UNKNOWN_ERROR_CODE' })).toBe(
        'An unexpected error occurred. Please try again.',
      );
    });
  });

  describe('getErrorTitle', () => {
    it('should return appropriate titles for error codes', () => {
      expect(getErrorTitle({ code: 'UNAUTHORIZED' })).toBe(
        'Authentication Required',
      );
      expect(getErrorTitle({ code: 'FORBIDDEN' })).toBe('Access Denied');
      expect(getErrorTitle({ code: 'NOT_FOUND' })).toBe('Not Found');
      expect(getErrorTitle({ code: 'VALIDATION_ERROR' })).toBe(
        'Validation Error',
      );
      expect(getErrorTitle({ code: 'TOO_MANY_REQUESTS' })).toBe(
        'Too Many Requests',
      );
    });

    it('should return default title for unknown errors', () => {
      expect(getErrorTitle({ code: 'UNKNOWN_CODE' })).toBe('Error');
      expect(getErrorTitle({})).toBe('Error');
    });

    it('should handle error objects without code', () => {
      expect(getErrorTitle({ message: 'Some error' })).toBe('Error');
    });
  });

  describe('isRecoverableError', () => {
    it('should return false for non-recoverable errors', () => {
      expect(isRecoverableError({ code: 'UNAUTHORIZED' })).toBe(false);
      expect(isRecoverableError({ code: 'FORBIDDEN' })).toBe(false);
      expect(isRecoverableError({ code: 'TOKEN_EXPIRED' })).toBe(false);
      expect(isRecoverableError({ code: 'LIMIT_REACHED' })).toBe(false);
      expect(isRecoverableError({ code: 'ACCOUNT_LOCKED' })).toBe(false);
      expect(isRecoverableError({ code: 'AGE_RESTRICTION' })).toBe(false);
    });

    it('should return true for recoverable errors', () => {
      expect(isRecoverableError({ code: 'NETWORK_ERROR' })).toBe(true);
      expect(isRecoverableError({ code: 'TIMEOUT' })).toBe(true);
      expect(isRecoverableError({ code: 'DB_ERROR' })).toBe(true);
      expect(isRecoverableError({ code: 'SERVICE_UNAVAILABLE' })).toBe(true);
    });

    it('should return true for errors without code', () => {
      expect(isRecoverableError({ message: 'Some error' })).toBe(true);
      expect(isRecoverableError(null)).toBe(true);
    });

    it('should return true for unknown error codes', () => {
      expect(isRecoverableError({ code: 'UNKNOWN_CODE' })).toBe(true);
    });
  });
});
