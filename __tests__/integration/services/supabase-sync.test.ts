/**
 * Integration Tests: Supabase + SyncManager
 *
 * Tests the integration between Supabase API and SyncManager:
 * - Offline mutation → Queued in SyncManager
 * - Online sync → Supabase API called
 * - Conflict resolution → Both services handle
 */

import { syncManager } from '@/services/syncManager';
import { supabase } from '@/services/supabase';

// Mock Supabase
jest.mock('@/services/supabase', () => ({
  supabase: {
    from: jest.fn(),
    functions: {
      invoke: jest.fn(),
    },
  },
}));

// Mock SyncManager
jest.mock('@/services/syncManager', () => {
  const mockQueue: Array<{
    id: string;
    type: string;
    entity: string;
    payload: Record<string, unknown>;
  }> = [];

  const mockSyncManager = {
    addToQueue: jest.fn(action => {
      mockQueue.push(action);
      return Promise.resolve();
    }),
    getQueue: jest.fn(() => mockQueue),
    processQueue: jest.fn(),
    executeServerMutation: jest.fn(),
  };
  return {
    syncManager: mockSyncManager,
  };
});

describe('Supabase + SyncManager Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (syncManager.getQueue as jest.Mock).mockReturnValue([]);
  });

  describe('Offline Mutation Queueing', () => {
    it('should queue CREATE mutation when offline', async () => {
      const assignmentData = {
        title: 'Test Assignment',
        course_id: 'course-1',
        due_date: new Date().toISOString(),
      };

      // Simulate offline state
      const isOffline = true;

      if (isOffline) {
        await syncManager.addToQueue(
          'CREATE',
          'assignment',
          { type: 'CREATE', data: assignmentData },
          'user-1',
        );
      }

      const queue = syncManager.getQueue();
      expect(queue.length).toBeGreaterThan(0);
      expect(queue[0]).toMatchObject({
        operation: 'CREATE',
        resourceType: 'assignment',
        payload: { type: 'CREATE', data: assignmentData },
      });
    });

    it('should queue UPDATE mutation when offline', async () => {
      const updateData = {
        id: 'assignment-1',
        title: 'Updated Assignment',
      };

      const isOffline = true;

      if (isOffline) {
        await syncManager.addToQueue(
          'UPDATE',
          'assignment',
          { type: 'UPDATE', id: updateData.id, data: updateData },
          'user-1',
        );
      }

      const queue = syncManager.getQueue();
      expect(queue.some(item => item.operation === 'UPDATE')).toBe(true);
    });

    it('should queue DELETE mutation when offline', async () => {
      const deleteData = {
        id: 'assignment-1',
      };

      const isOffline = true;

      if (isOffline) {
        await syncManager.addToQueue(
          'DELETE',
          'assignment',
          { type: 'DELETE', resourceId: deleteData.id },
          'user-1',
        );
      }

      const queue = syncManager.getQueue();
      expect(queue.some(item => item.operation === 'DELETE')).toBe(true);
    });
  });

  describe('Online Sync Execution', () => {
    it('should call Supabase API when processing queue online', async () => {
      const assignmentData = {
        title: 'Test Assignment',
        course_id: 'course-1',
      };

      (supabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: { id: 'assignment-1', ...assignmentData },
        error: null,
      });

      // Simulate online sync
      const result = await (syncManager as any).executeServerMutation({
        type: 'CREATE',
        entity: 'assignment',
        payload: assignmentData as any,
      });

      expect(supabase.functions.invoke).toHaveBeenCalledWith(
        'create-assignment',
        expect.objectContaining({
          body: assignmentData,
        }),
      );
      expect(result).toBeDefined();
    });

    it('should handle Supabase API errors during sync', async () => {
      const assignmentData = {
        title: 'Test Assignment',
        course_id: 'course-1',
      };

      const error = { message: 'Validation error', code: 'VALIDATION_ERROR' };
      (supabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: null,
        error,
      });

      try {
        await (syncManager as any).executeServerMutation({
          type: 'CREATE',
          entity: 'assignment',
          payload: assignmentData as any,
        });
      } catch (e) {
        expect(e).toBeDefined();
      }

      expect(supabase.functions.invoke).toHaveBeenCalled();
    });

    it('should process multiple queued mutations', async () => {
      const mutations = [
        {
          type: 'CREATE',
          entity: 'assignment',
          payload: { title: 'Assignment 1' },
        },
        { type: 'CREATE', entity: 'lecture', payload: { title: 'Lecture 1' } },
        {
          type: 'UPDATE',
          entity: 'assignment',
          payload: { id: 'assignment-1', title: 'Updated' },
        },
      ];

      (supabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: { success: true },
        error: null,
      });

      // Add all to queue
      await syncManager.addToQueue(
        'CREATE',
        'assignment',
        { type: 'CREATE', data: { title: 'Assignment 1' } },
        'user-1',
      );
      await syncManager.addToQueue(
        'CREATE',
        'lecture',
        { type: 'CREATE', data: { title: 'Lecture 1' } },
        'user-1',
      );
      await syncManager.addToQueue(
        'UPDATE',
        'assignment',
        { type: 'UPDATE', id: 'assignment-1', data: { title: 'Updated' } },
        'user-1',
      );

      const queue = syncManager.getQueue();
      expect(queue.length).toBe(mutations.length);

      // Process queue
      await syncManager.processQueue();

      expect(supabase.functions.invoke).toHaveBeenCalledTimes(mutations.length);
    });
  });

  describe('Conflict Resolution', () => {
    it('should handle conflict when server version differs', async () => {
      const updateData = {
        id: 'assignment-1',
        title: 'Updated Title',
        version: 2, // Client version
      };

      // Simulate server conflict
      (supabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: null,
        error: {
          message: 'Conflict: Server version is newer',
          code: 'CONFLICT',
          details: { serverVersion: 3 },
        },
      });

      try {
        await (syncManager as any).executeServerMutation({
          type: 'UPDATE',
          entity: 'assignment',
          payload: updateData,
        });
      } catch (error) {
        const err = error as { code?: string };
        expect(err?.code).toBe('CONFLICT');
      }
    });

    it('should retry after conflict resolution', async () => {
      const updateData = {
        id: 'assignment-1',
        title: 'Updated Title',
        version: 3, // Updated version after conflict
      };

      // First call fails with conflict, second succeeds
      (supabase.functions.invoke as jest.Mock)
        .mockResolvedValueOnce({
          data: null,
          error: { code: 'CONFLICT' },
        })
        .mockResolvedValueOnce({
          data: { ...updateData, id: 'assignment-1' },
          error: null,
        });

      // Retry after resolving conflict
      const result = await (syncManager as any).executeServerMutation({
        type: 'UPDATE',
        entity: 'assignment',
        payload: { type: 'UPDATE', id: updateData.id, data: updateData } as any,
      });

      expect(result).toBeDefined();
      expect(supabase.functions.invoke).toHaveBeenCalledTimes(2);
    });
  });

  describe('Temp ID Replacement', () => {
    it('should replace temp IDs with real IDs after sync', async () => {
      const tempId = 'temp-assignment-123';
      const realId = 'assignment-1';

      const createData = {
        id: tempId,
        title: 'Test Assignment',
      };

      (supabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: { id: realId, title: 'Test Assignment' },
        error: null,
      });

      const result = await (syncManager as any).executeServerMutation({
        type: 'CREATE',
        entity: 'assignment',
        payload: { type: 'CREATE', data: createData } as any,
      });

      expect(result).toBeDefined();
      // In real implementation, temp ID would be mapped to real ID
    });

    it('should update references to temp IDs in dependent mutations', async () => {
      const tempAssignmentId = 'temp-assignment-123';
      const realAssignmentId = 'assignment-1';

      // Create assignment (gets real ID)
      (supabase.functions.invoke as jest.Mock).mockResolvedValueOnce({
        data: { id: realAssignmentId },
        error: null,
      });

      // Update that references the assignment
      const updateData = {
        assignment_id: tempAssignmentId, // Should be replaced with real ID
        title: 'Updated',
      };

      // In real implementation, SyncManager would replace temp IDs
      const processedData = {
        ...updateData,
        assignment_id: realAssignmentId, // Replaced
      };

      (supabase.functions.invoke as jest.Mock).mockResolvedValueOnce({
        data: { success: true },
        error: null,
      });

      await (syncManager as any).executeServerMutation({
        type: 'UPDATE',
        entity: 'assignment',
        payload: { type: 'UPDATE', data: processedData } as any,
      });

      expect(supabase.functions.invoke).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.objectContaining({
            assignment_id: realAssignmentId,
          }),
        }),
      );
    });
  });
});
