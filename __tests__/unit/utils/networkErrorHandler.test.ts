import {
  isNetworkError,
  getNetworkErrorMessage,
  networkAwareFetch,
  checkInternetConnectivity,
} from '@/utils/networkErrorHandler';

// Mock fetch globally
global.fetch = jest.fn();

describe('networkErrorHandler utilities', () => {
  describe('isNetworkError', () => {
    it('should identify network errors by message', () => {
      const error = new Error('Network request failed');
      expect(isNetworkError(error)).toBe(true);
    });

    it('should identify network errors by name', () => {
      const error = { name: 'NetworkError', message: 'Failed to fetch' };
      expect(isNetworkError(error)).toBe(true);
    });

    it('should identify timeout errors', () => {
      const error = { name: 'TimeoutError', message: 'Request timed out' };
      expect(isNetworkError(error)).toBe(true);
    });

    it('should identify errors by code', () => {
      expect(isNetworkError({ code: 'net_error' })).toBe(true);
      expect(isNetworkError({ code: 'network_error' })).toBe(true);
      expect(isNetworkError({ code: 'timeout' })).toBe(true);
      expect(isNetworkError({ code: 'econnreset' })).toBe(true);
      expect(isNetworkError({ code: 'enotfound' })).toBe(true);
    });

    it('should identify connection errors', () => {
      const error = new Error('Connection failed');
      expect(isNetworkError(error)).toBe(true);
    });

    it('should return false for non-network errors', () => {
      const error = new Error('Validation failed');
      expect(isNetworkError(error)).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(isNetworkError(null)).toBe(false);
      expect(isNetworkError(undefined)).toBe(false);
    });
  });

  describe('getNetworkErrorMessage', () => {
    it('should return offline message when offline', () => {
      const error = new Error('Network error');
      const message = getNetworkErrorMessage(error, true);
      expect(message).toContain('offline');
    });

    it('should return timeout message for timeout errors', () => {
      const error = { message: 'Request timeout', code: 'timeout' };
      const message = getNetworkErrorMessage(error, false);
      expect(message).toContain('timed out');
    });

    it('should return DNS error message', () => {
      const error = { message: 'DNS lookup failed', code: 'enotfound' };
      const message = getNetworkErrorMessage(error, false);
      expect(message).toContain('reach the server');
    });

    it('should return connection reset message', () => {
      const error = { message: 'Connection reset', code: 'econnreset' };
      const message = getNetworkErrorMessage(error, false);
      expect(message).toContain('reset');
    });

    it('should return generic network error message', () => {
      const error = new Error('Network request failed');
      const message = getNetworkErrorMessage(error, false);
      expect(message).toContain('Network error');
    });

    it('should handle non-network errors', () => {
      const error = new Error('Validation failed');
      const message = getNetworkErrorMessage(error, false);
      // Should not contain network-specific message
      expect(message).not.toContain('offline');
    });
  });

  describe('networkAwareFetch', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should throw error when offline', async () => {
      await expect(
        networkAwareFetch('https://api.example.com', {}, false),
      ).rejects.toThrow('offline');
    });

    it('should make fetch request when online', async () => {
      const mockResponse = { ok: true, status: 200 };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const response = await networkAwareFetch(
        'https://api.example.com',
        {},
        true,
      );
      expect(response).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com',
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    it('should handle timeout', async () => {
      jest.useFakeTimers();

      (global.fetch as jest.Mock).mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => resolve({ ok: true }), 35000);
        });
      });

      const fetchPromise = networkAwareFetch(
        'https://api.example.com',
        {} as RequestInit,
        true,
      );

      jest.advanceTimersByTime(30000);

      await expect(fetchPromise).rejects.toThrow('timed out');

      jest.useRealTimers();
    });

    it('should throw error for non-ok responses', async () => {
      const mockResponse = { ok: false, status: 404, statusText: 'Not Found' };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await expect(
        networkAwareFetch('https://api.example.com', {}, true),
      ).rejects.toThrow('HTTP 404');
    });
  });

  describe('checkInternetConnectivity', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return true when internet is available', async () => {
      const mockResponse = { ok: true };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await checkInternetConnectivity();
      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://www.google.com/favicon.ico',
        expect.objectContaining({
          method: 'HEAD',
          cache: 'no-cache',
        }),
      );
    });

    it('should return false when internet is unavailable', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await checkInternetConnectivity();
      expect(result).toBe(false);
    });

    it('should return false on timeout', async () => {
      jest.useFakeTimers();

      (global.fetch as jest.Mock).mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => resolve({ ok: true }), 10000);
        });
      });

      const connectivityPromise = checkInternetConnectivity();

      jest.advanceTimersByTime(5000);

      // Should reject due to AbortSignal.timeout(5000)
      await expect(connectivityPromise).resolves.toBe(false);

      jest.useRealTimers();
    });
  });
});
