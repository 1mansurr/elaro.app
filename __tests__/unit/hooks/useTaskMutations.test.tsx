import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCompleteTask, useDeleteTask } from '@/hooks/useTaskMutations';
import { useNetwork } from '@/contexts/NetworkContext';
import { useAuth } from '@/contexts/AuthContext';
import { syncManager } from '@/services/syncManager';

// Mock dependencies
jest.mock('@/contexts/NetworkContext');
jest.mock('@/contexts/AuthContext');
jest.mock('@/services/syncManager');
jest.mock('@/services/supabase', () => ({
  supabase: {
    functions: {
      invoke: jest.fn(),
    },
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
    },
  },
}));

jest.mock('@/utils/invokeEdgeFunction', () => ({
  invokeEdgeFunctionWithAuth: jest.fn(),
}));

const mockUseNetwork = useNetwork as jest.MockedFunction<typeof useNetwork>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockSyncManager = syncManager as jest.Mocked<typeof syncManager>;

describe('useTaskMutations', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Default mocks
    mockUseNetwork.mockReturnValue({
      isOnline: true,
      isOffline: false,
      isInternetReachable: true,
    });

    mockUseAuth.mockReturnValue({
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
      },
      session: {} as any,
      loading: false,
      signIn: jest.fn(),
      signOut: jest.fn(),
      signUp: jest.fn(),
    } as any);

    mockSyncManager.addToQueue = jest.fn().mockResolvedValue({} as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('useCompleteTask', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    it('should create a mutation function', () => {
      const { result } = renderHook(() => useCompleteTask(), { wrapper });

      expect(result.current.mutate).toBeDefined();
      expect(result.current.mutateAsync).toBeDefined();
    });

    it('should handle online completion', async () => {
      const {
        invokeEdgeFunctionWithAuth,
      } = require('@/utils/invokeEdgeFunction');
      (invokeEdgeFunctionWithAuth as jest.Mock).mockResolvedValue({
        data: { success: true },
        error: null,
      });

      const { result } = renderHook(() => useCompleteTask(), { wrapper });

      await result.current.mutateAsync({
        taskId: 'task-1',
        taskType: 'assignment',
        taskTitle: 'Test Task',
      });

      await waitFor(() => {
        expect(invokeEdgeFunctionWithAuth).toHaveBeenCalledWith(
          'update-assignment',
          {
            body: expect.objectContaining({
              assignmentId: 'task-1',
              updates: { status: 'completed' },
            }),
          },
        );
      });
    });

    it('should handle offline completion by queueing', async () => {
      mockUseNetwork.mockReturnValue({
        isOnline: false,
        isOffline: true,
        isInternetReachable: false,
      });

      const { result } = renderHook(() => useCompleteTask(), { wrapper });

      await result.current.mutateAsync({
        taskId: 'task-1',
        taskType: 'assignment',
        taskTitle: 'Test Task',
      });

      await waitFor(() => {
        expect(mockSyncManager.addToQueue).toHaveBeenCalledWith(
          'COMPLETE',
          'assignment',
          expect.objectContaining({
            type: 'COMPLETE',
            resourceId: 'task-1',
          }),
          'test-user-id',
          expect.objectContaining({ syncImmediately: false }),
        );
      });
    });

    it('should handle errors gracefully', async () => {
      const {
        invokeEdgeFunctionWithAuth,
      } = require('@/utils/invokeEdgeFunction');
      (invokeEdgeFunctionWithAuth as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Server error' },
      });

      const { result } = renderHook(() => useCompleteTask(), { wrapper });

      await expect(
        result.current.mutateAsync({
          taskId: 'task-1',
          taskType: 'assignment',
          taskTitle: 'Test Task',
        }),
      ).rejects.toBeDefined();
    });
  });

  describe('useDeleteTask', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    it('should create a mutation function', () => {
      const { result } = renderHook(() => useDeleteTask(), { wrapper });

      expect(result.current.mutate).toBeDefined();
      expect(result.current.mutateAsync).toBeDefined();
    });

    it('should handle online deletion', async () => {
      const {
        invokeEdgeFunctionWithAuth,
      } = require('@/utils/invokeEdgeFunction');
      (invokeEdgeFunctionWithAuth as jest.Mock).mockResolvedValue({
        data: { success: true },
        error: null,
      });

      const { result } = renderHook(() => useDeleteTask(), { wrapper });

      await result.current.mutateAsync({
        taskId: 'task-1',
        taskType: 'assignment',
        taskTitle: 'Test Task',
      });

      await waitFor(() => {
        expect(invokeEdgeFunctionWithAuth).toHaveBeenCalled();
      });
    });

    it('should handle offline deletion by queueing', async () => {
      mockUseNetwork.mockReturnValue({
        isOnline: false,
        isOffline: true,
        isInternetReachable: false,
      });

      const { result } = renderHook(() => useDeleteTask(), { wrapper });

      await result.current.mutateAsync({
        taskId: 'task-1',
        taskType: 'assignment',
        taskTitle: 'Test Task',
      });

      await waitFor(() => {
        expect(mockSyncManager.addToQueue).toHaveBeenCalled();
      });
    });
  });
});
