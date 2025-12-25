import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useBatchAction } from '@/hooks/useBatchAction';
import { useNetwork } from '@/contexts/NetworkContext';
import { useAuth } from '@/contexts/AuthContext';
import { syncManager } from '@/services/syncManager';

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
jest.mock('@/utils/cache', () => ({
  cache: {
    remove: jest.fn().mockResolvedValue(undefined),
  },
}));

const mockUseNetwork = useNetwork as jest.MockedFunction<typeof useNetwork>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockSyncManager = syncManager as jest.Mocked<typeof syncManager>;

describe('useBatchAction', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    mockUseNetwork.mockReturnValue({
      isOnline: true,
      isOffline: false,
      isInternetReachable: true,
    } as any);

    mockUseAuth.mockReturnValue({
      user: { id: 'test-user-id' },
      session: {} as any,
      loading: false,
    } as any);

    mockSyncManager.addToQueue = jest.fn().mockResolvedValue({} as any);
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('should create batch action mutation', () => {
    const { result } = renderHook(() => useBatchAction(), { wrapper });

    expect(result.current.mutate).toBeDefined();
    expect(result.current.mutateAsync).toBeDefined();
  });

  it('should handle online batch delete', async () => {
    const mockResult = {
      message: 'Batch operation completed',
      results: {
        total: 2,
        succeeded: 2,
        failed: 0,
        details: {
          success: [
            { id: 'item-1', type: 'assignment' },
            { id: 'item-2', type: 'assignment' },
          ],
          failed: [],
        },
      },
    };

    const {
      invokeEdgeFunctionWithAuth,
    } = require('@/utils/invokeEdgeFunction');
    (invokeEdgeFunctionWithAuth as jest.Mock).mockResolvedValue({
      data: mockResult,
      error: null,
    });

    const { result } = renderHook(() => useBatchAction(), { wrapper });

    await result.current.mutateAsync({
      action: 'DELETE_PERMANENTLY',
      items: [
        { id: 'item-1', type: 'assignment' },
        { id: 'item-2', type: 'assignment' },
      ],
    });

    await waitFor(() => {
      expect(invokeEdgeFunctionWithAuth).toHaveBeenCalledWith('batch-action', {
        body: expect.objectContaining({
          action: 'DELETE_PERMANENTLY',
          items: expect.arrayContaining([
            { id: 'item-1', type: 'assignment' },
            { id: 'item-2', type: 'assignment' },
          ]),
        }),
      });
    });
  });

  it('should queue batch actions when offline', async () => {
    mockUseNetwork.mockReturnValue({
      isOnline: false,
      isOffline: true,
      isInternetReachable: false,
    } as any);

    const { result } = renderHook(() => useBatchAction(), { wrapper });

    await result.current.mutateAsync({
      action: 'DELETE_PERMANENTLY',
      items: [{ id: 'item-1', type: 'assignment' }],
    });

    await waitFor(() => {
      expect(mockSyncManager.addToQueue).toHaveBeenCalled();
    });

    const {
      invokeEdgeFunctionWithAuth,
    } = require('@/utils/invokeEdgeFunction');
    expect(invokeEdgeFunctionWithAuth).not.toHaveBeenCalled();
  });

  it('should handle batch restore', async () => {
    const mockResult = {
      message: 'Batch restore completed',
      results: {
        total: 1,
        succeeded: 1,
        failed: 0,
        details: {
          success: [{ id: 'item-1', type: 'assignment' }],
          failed: [],
        },
      },
    };

    const {
      invokeEdgeFunctionWithAuth,
    } = require('@/utils/invokeEdgeFunction');
    (invokeEdgeFunctionWithAuth as jest.Mock).mockResolvedValue({
      data: mockResult,
      error: null,
    });

    const { result } = renderHook(() => useBatchAction(), { wrapper });

    await result.current.mutateAsync({
      action: 'RESTORE',
      items: [{ id: 'item-1', type: 'assignment' }],
    });

    await waitFor(() => {
      expect(invokeEdgeFunctionWithAuth).toHaveBeenCalledWith('batch-action', {
        body: expect.objectContaining({
          action: 'RESTORE',
        }),
      });
    });
  });

  it('should invalidate queries on success', async () => {
    const mockResult = {
      message: 'Success',
      results: {
        total: 1,
        succeeded: 1,
        failed: 0,
        details: {
          success: [{ id: 'item-1', type: 'assignment' }],
          failed: [],
        },
      },
    };

    const {
      invokeEdgeFunctionWithAuth,
    } = require('@/utils/invokeEdgeFunction');
    (invokeEdgeFunctionWithAuth as jest.Mock).mockResolvedValue({
      data: mockResult,
      error: null,
    });

    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useBatchAction(), { wrapper });

    await result.current.mutateAsync({
      action: 'DELETE_PERMANENTLY',
      items: [{ id: 'item-1', type: 'assignment' }],
    });

    await waitFor(() => {
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['deletedItems'],
      });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['assignments'],
      });
    });
  });

  it('should handle errors gracefully', async () => {
    const {
      invokeEdgeFunctionWithAuth,
    } = require('@/utils/invokeEdgeFunction');
    (invokeEdgeFunctionWithAuth as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'Batch operation failed' },
    });

    const { result } = renderHook(() => useBatchAction(), { wrapper });

    await expect(
      result.current.mutateAsync({
        action: 'DELETE_PERMANENTLY',
        items: [{ id: 'item-1', type: 'assignment' }],
      }),
    ).rejects.toThrow();
  });
});
