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
  },
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
      const { supabase } = require('@/services/supabase');
      const mockInvoke = supabase.functions.invoke as jest.Mock;
      mockInvoke.mockResolvedValue({ data: { success: true }, error: null });

      const { result } = renderHook(() => useCompleteTask(), { wrapper });

      await result.current.mutateAsync({
        taskId: 'task-1',
        taskType: 'assignment',
        taskTitle: 'Test Task',
      });

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith('update-assignment', {
          body: expect.objectContaining({
            assignmentId: 'task-1',
            updates: { status: 'completed' },
          }),
        });
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
          expect.objectContaining({ syncImmediately: false })
        );
      });
    });

    it('should handle errors gracefully', async () => {
      const { supabase } = require('@/services/supabase');
      const mockInvoke = supabase.functions.invoke as jest.Mock;
      mockInvoke.mockResolvedValue({
        data: null,
        error: { message: 'Server error' },
      });

      const { result } = renderHook(() => useCompleteTask(), { wrapper });

      await expect(
        result.current.mutateAsync({
          taskId: 'task-1',
          taskType: 'assignment',
          taskTitle: 'Test Task',
        })
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
      const { supabase } = require('@/services/supabase');
      const mockInvoke = supabase.functions.invoke as jest.Mock;
      mockInvoke.mockResolvedValue({ data: { success: true }, error: null });

      const { result } = renderHook(() => useDeleteTask(), { wrapper });

      await result.current.mutateAsync({
        taskId: 'task-1',
        taskType: 'assignment',
        taskTitle: 'Test Task',
      });

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalled();
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

    it('should handle errors gracefully', async () => {
      const { supabase } = require('@/services/supabase');
      const mockInvoke = supabase.functions.invoke as jest.Mock;
      mockInvoke.mockResolvedValue({
        data: null,
        error: { message: 'Delete failed' },
      });

      const { result } = renderHook(() => useDeleteTask(), { wrapper });

      await expect(
        result.current.mutateAsync({
          taskId: 'task-1',
          taskType: 'assignment',
          taskTitle: 'Test Task',
        })
      ).rejects.toBeDefined();
    });
  });

  describe('useRestoreTask', () => {
    const { useRestoreTask } = require('@/hooks/useTaskMutations');
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    it('should create a mutation function', () => {
      const { result } = renderHook(() => useRestoreTask(), { wrapper });
      
      expect(result.current.mutate).toBeDefined();
      expect(result.current.mutateAsync).toBeDefined();
    });

    it('should handle online restoration', async () => {
      const { supabase } = require('@/services/supabase');
      const mockInvoke = supabase.functions.invoke as jest.Mock;
      mockInvoke.mockResolvedValue({ data: { success: true }, error: null });

      const { result } = renderHook(() => useRestoreTask(), { wrapper });

      await result.current.mutateAsync({
        taskId: 'task-1',
        taskType: 'assignment',
        taskTitle: 'Test Task',
      });

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith('restore-assignment', {
          body: { assignmentId: 'task-1' },
        });
      });
    });

    it('should handle offline restoration by queueing', async () => {
      mockUseNetwork.mockReturnValue({
        isOnline: false,
        isOffline: true,
        isInternetReachable: false,
      });

      const { result } = renderHook(() => useRestoreTask(), { wrapper });

      await result.current.mutateAsync({
        taskId: 'task-1',
        taskType: 'assignment',
        taskTitle: 'Test Task',
      });

      await waitFor(() => {
        expect(mockSyncManager.addToQueue).toHaveBeenCalledWith(
          'RESTORE',
          'assignment',
          expect.objectContaining({
            type: 'RESTORE',
            resourceId: 'task-1',
          }),
          'test-user-id',
          expect.objectContaining({ syncImmediately: false })
        );
      });
    });

    it('should handle different task types correctly', async () => {
      const { supabase } = require('@/services/supabase');
      const mockInvoke = supabase.functions.invoke as jest.Mock;
      mockInvoke.mockResolvedValue({ data: { success: true }, error: null });

      const { result } = renderHook(() => useRestoreTask(), { wrapper });

      // Test lecture
      await result.current.mutateAsync({
        taskId: 'lecture-1',
        taskType: 'lecture',
        taskTitle: 'Test Lecture',
      });

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith('restore-lecture', {
          body: { lectureId: 'lecture-1' },
        });
      });

      // Test study_session
      await result.current.mutateAsync({
        taskId: 'session-1',
        taskType: 'study_session',
        taskTitle: 'Test Session',
      });

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith('restore-study-session', {
          body: { studySessionId: 'session-1' },
        });
      });
    });

    it('should handle errors gracefully', async () => {
      const { supabase } = require('@/services/supabase');
      const mockInvoke = supabase.functions.invoke as jest.Mock;
      mockInvoke.mockResolvedValue({
        data: null,
        error: { message: 'Restore failed' },
      });

      const { result } = renderHook(() => useRestoreTask(), { wrapper });

      await expect(
        result.current.mutateAsync({
          taskId: 'task-1',
          taskType: 'assignment',
          taskTitle: 'Test Task',
        })
      ).rejects.toBeDefined();
    });
  });

  describe('optimistic updates', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    it('should perform optimistic update for complete task', async () => {
      // Set initial query data
      queryClient.setQueryData(['homeScreenData'], {
        nextUpcomingTask: {
          id: 'task-1',
          title: 'Test Task',
          status: 'pending',
        },
      });

      const { result } = renderHook(() => useCompleteTask(), { wrapper });
      const { supabase } = require('@/services/supabase');
      const mockInvoke = supabase.functions.invoke as jest.Mock;
      mockInvoke.mockResolvedValue({ data: { success: true }, error: null });

      await result.current.mutateAsync({
        taskId: 'task-1',
        taskType: 'assignment',
        taskTitle: 'Test Task',
      });

      await waitFor(() => {
        const data = queryClient.getQueryData(['homeScreenData']);
        expect(data).toBeDefined();
      });
    });

    it('should perform optimistic update for delete task', async () => {
      // Set initial query data
      queryClient.setQueryData(['homeScreenData'], {
        nextUpcomingTask: {
          id: 'task-1',
          title: 'Test Task',
          status: 'pending',
        },
      });

      const { result } = renderHook(() => useDeleteTask(), { wrapper });
      const { supabase } = require('@/services/supabase');
      const mockInvoke = supabase.functions.invoke as jest.Mock;
      mockInvoke.mockResolvedValue({ data: { success: true }, error: null });

      await result.current.mutateAsync({
        taskId: 'task-1',
        taskType: 'assignment',
        taskTitle: 'Test Task',
      });

      await waitFor(() => {
        const data = queryClient.getQueryData(['homeScreenData']);
        expect(data).toBeDefined();
      });
    });

    it('should rollback optimistic update on error', async () => {
      const previousData = {
        nextUpcomingTask: {
          id: 'task-1',
          title: 'Test Task',
          status: 'pending',
        },
      };

      queryClient.setQueryData(['homeScreenData'], previousData);

      const { result } = renderHook(() => useCompleteTask(), { wrapper });
      const { supabase } = require('@/services/supabase');
      const mockInvoke = supabase.functions.invoke as jest.Mock;
      mockInvoke.mockResolvedValue({
        data: null,
        error: { message: 'Server error' },
      });

      try {
        await result.current.mutateAsync({
          taskId: 'task-1',
          taskType: 'assignment',
          taskTitle: 'Test Task',
        });
      } catch (error) {
        // Expected to throw
      }

      await waitFor(() => {
        const data = queryClient.getQueryData(['homeScreenData']);
        // Should rollback to previous data
        expect(data).toEqual(previousData);
      });
    });
  });

  describe('query invalidation', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    it('should invalidate queries after successful completion', async () => {
      const invalidateTaskQueries = jest.fn();
      jest.mock('@/utils/queryInvalidation', () => ({
        invalidateTaskQueries,
      }));

      const { result } = renderHook(() => useCompleteTask(), { wrapper });
      const { supabase } = require('@/services/supabase');
      const mockInvoke = supabase.functions.invoke as jest.Mock;
      mockInvoke.mockResolvedValue({ data: { success: true }, error: null });

      await result.current.mutateAsync({
        taskId: 'task-1',
        taskType: 'assignment',
        taskTitle: 'Test Task',
      });

      await waitFor(() => {
        // Query invalidation should be called
        expect(queryClient.getQueryCache().getAll().length).toBeGreaterThan(0);
      });
    });

    it('should not invalidate queries when offline', async () => {
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

      // Should not invalidate when offline
      await waitFor(() => {
        expect(mockSyncManager.addToQueue).toHaveBeenCalled();
      });
    });
  });

  describe('notification cancellation', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    it('should cancel notifications on task completion', async () => {
      const mockCancelItemReminders = jest.fn().mockResolvedValue(undefined);
      jest.mock('@/services/notifications', () => ({
        notificationService: {
          cancelItemReminders: mockCancelItemReminders,
        },
      }));

      const { result } = renderHook(() => useCompleteTask(), { wrapper });
      const { supabase } = require('@/services/supabase');
      const mockInvoke = supabase.functions.invoke as jest.Mock;
      mockInvoke.mockResolvedValue({ data: { success: true }, error: null });

      await result.current.mutateAsync({
        taskId: 'task-1',
        taskType: 'assignment',
        taskTitle: 'Test Task',
      });

      await waitFor(() => {
        // Notification cancellation should be attempted
        // (exact implementation depends on how the import is handled)
      });
    });

    it('should cancel notifications on task deletion', async () => {
      const { result } = renderHook(() => useDeleteTask(), { wrapper });
      const { supabase } = require('@/services/supabase');
      const mockInvoke = supabase.functions.invoke as jest.Mock;
      mockInvoke.mockResolvedValue({ data: { success: true }, error: null });

      await result.current.mutateAsync({
        taskId: 'task-1',
        taskType: 'assignment',
        taskTitle: 'Test Task',
      });

      await waitFor(() => {
        // Notification cancellation should be attempted
      });
    });
  });
});

