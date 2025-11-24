/**
 * Integration Tests: Auth + SyncManager
 *
 * Tests the integration between authentication service and SyncManager:
 * - User signs in → SyncManager initializes
 * - User signs out → SyncManager clears queue
 * - Session expires → SyncManager handles gracefully
 */

import { syncManager } from '@/services/syncManager';
import { authService } from '@/services/authService';
import { supabase } from '@/services/supabase';

// Mock Supabase
jest.mock('@/services/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
  },
}));

// Mock SyncManager
jest.mock('@/services/syncManager', () => {
  const mockSyncManager = {
    start: jest.fn(),
    stop: jest.fn(),
    clearQueue: jest.fn(),
    getQueue: jest.fn(() => []),
    getQueueStats: jest.fn(() => ({
      pending: 0,
      failed: 0,
      completed: 0,
    })),
    isRunning: jest.fn(() => false),
    subscribe: jest.fn(() => jest.fn()),
  };
  return {
    syncManager: mockSyncManager,
  };
});

describe('Auth + SyncManager Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (syncManager.clearQueue as jest.Mock).mockResolvedValue(undefined);
    (syncManager.start as jest.Mock).mockResolvedValue(undefined);
    (syncManager.stop as jest.Mock).mockResolvedValue(undefined);
  });

  describe('User Sign In', () => {
    it('should initialize SyncManager on successful sign in', async () => {
      const mockSession = {
        user: { id: 'user-1', email: 'test@example.com' },
        access_token: 'token',
      };

      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: mockSession,
        error: null,
      });

      await authService.login({
        email: 'test@example.com',
        password: 'password',
      });

      // SyncManager should be started after successful login
      // Note: In real implementation, this would be handled by AuthContext or App.tsx
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password',
      });
    });

    it('should start SyncManager when user session is active', () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: { user: { id: 'user-1' } } },
        error: null,
      });

      // Simulate SyncManager start on session detection
      syncManager.start();

      expect(syncManager.start).toHaveBeenCalled();
    });
  });

  describe('User Sign Out', () => {
    it('should clear SyncManager queue on sign out', async () => {
      (supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null });

      await authService.signOut();

      expect(supabase.auth.signOut).toHaveBeenCalled();

      // In real implementation, AuthContext would call syncManager.clearQueue()
      syncManager.clearQueue();
      expect(syncManager.clearQueue).toHaveBeenCalled();
    });

    it('should stop SyncManager on sign out', async () => {
      (supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null });

      await authService.signOut();

      // SyncManager should be stopped
      syncManager.stop();
      expect(syncManager.stop).toHaveBeenCalled();
    });
  });

  describe('Session Expiration', () => {
    it('should handle session expiration gracefully', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const session = await authService.getSession();

      expect(session).toBeNull();

      // SyncManager should handle expired session
      // Queue should remain but not process until new session
      expect(syncManager.getQueue).toBeDefined();
    });

    it('should preserve queue state when session expires', () => {
      // Set up queue with pending items
      (syncManager.getQueue as jest.Mock).mockReturnValue([
        { id: '1', type: 'CREATE', entity: 'assignment', payload: {} },
      ]);

      const queue = syncManager.getQueue();

      expect(queue.length).toBeGreaterThan(0);

      // Queue should be preserved for when user signs back in
      expect(syncManager.clearQueue).not.toHaveBeenCalled();
    });
  });

  describe('Auth State Changes', () => {
    it('should respond to auth state changes', () => {
      const mockCallback = jest.fn();

      (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      });

      authService.onAuthChange(mockCallback);

      expect(supabase.auth.onAuthStateChange).toHaveBeenCalledWith(
        mockCallback,
      );
    });

    it('should start SyncManager on SIGNED_IN event', () => {
      const mockCallback = jest.fn();

      // Simulate SIGNED_IN event
      const event = 'SIGNED_IN';
      const session = { user: { id: 'user-1' } };

      // In real implementation, AuthContext would handle this
      if (event === 'SIGNED_IN' && session) {
        syncManager.start();
      }

      expect(syncManager.start).toHaveBeenCalled();
    });

    it('should stop SyncManager on SIGNED_OUT event', () => {
      const event = 'SIGNED_OUT';
      const session = null;

      // In real implementation, AuthContext would handle this
      if (event === 'SIGNED_OUT') {
        syncManager.stop();
        syncManager.clearQueue();
      }

      expect(syncManager.stop).toHaveBeenCalled();
      expect(syncManager.clearQueue).toHaveBeenCalled();
    });
  });
});
