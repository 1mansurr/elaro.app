/**
 * Assignments Mutations Tests
 * 
 * Tests for src/features/assignments/services/mutations.ts
 * Target: 70%+ coverage
 */

import { assignmentsApiMutations } from '@/features/assignments/services/mutations';
import { supabase } from '@/services/supabase';
import { syncManager } from '@/services/syncManager';
import { CreateAssignmentRequest, UpdateAssignmentRequest } from '@/types/api';

// Mock dependencies
jest.mock('@/services/supabase', () => ({
  supabase: {
    functions: {
      invoke: jest.fn(),
    },
  },
}));

jest.mock('@/services/syncManager', () => ({
  syncManager: {
    addToQueue: jest.fn(),
  },
}));

jest.mock('@/utils/uuid', () => ({
  generateTempId: jest.fn((prefix) => `temp-${prefix}-123`),
}));

jest.mock('@/utils/taskCache', () => ({
  getCachedTask: jest.fn(),
  mergeTaskUpdates: jest.fn((task, updates) => ({ ...task, ...updates })),
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockSyncManager = syncManager as jest.Mocked<typeof syncManager>;

describe('assignmentsApiMutations', () => {
  const userId = 'user-123';
  const mockAssignment = {
    id: 'assignment-123',
    user_id: userId,
    course_id: 'course-123',
    title: 'Test Assignment',
    description: 'Test Description',
    due_date: new Date().toISOString(),
    submission_method: 'Online',
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createRequest: CreateAssignmentRequest = {
      course_id: 'course-123',
      title: 'Test Assignment',
      description: 'Test Description',
      due_date: new Date().toISOString(),
      submission_method: 'Online',
      reminders: [120],
    };

    it('should create assignment when online', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: mockAssignment,
        error: null,
      });

      const result = await assignmentsApiMutations.create(
        createRequest,
        true,
        userId,
      );

      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith(
        'create-assignment',
        { body: createRequest },
      );
      expect(result).toEqual(mockAssignment);
      expect(mockSyncManager.addToQueue).not.toHaveBeenCalled();
    });

    it('should queue assignment when offline', async () => {
      mockSyncManager.addToQueue.mockResolvedValue(undefined as any);

      const result = await assignmentsApiMutations.create(
        createRequest,
        false,
        userId,
      );

      expect(mockSyncManager.addToQueue).toHaveBeenCalledWith(
        'CREATE',
        'assignment',
        {
          type: 'CREATE',
          data: createRequest,
        },
        userId,
        { syncImmediately: false },
      );

      expect(result).toMatchObject({
        id: expect.stringContaining('temp-assignment'),
        user_id: userId,
        course_id: createRequest.course_id,
        title: createRequest.title,
        _offline: true,
        _tempId: expect.stringContaining('temp-assignment'),
      });

      expect(mockSupabase.functions.invoke).not.toHaveBeenCalled();
    });

    it('should handle create errors', async () => {
      const mockError = {
        message: 'Failed to create assignment',
        status: 500,
      };

      mockSupabase.functions.invoke.mockResolvedValue({
        data: null,
        error: mockError,
      });

      await expect(
        assignmentsApiMutations.create(createRequest, true, userId),
      ).rejects.toBeDefined();
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network request failed');
      mockSupabase.functions.invoke.mockRejectedValue(networkError);

      await expect(
        assignmentsApiMutations.create(createRequest, true, userId),
      ).rejects.toThrow('Network request failed');
    });

    it('should include all request fields in optimistic assignment', async () => {
      const requestWithAllFields: CreateAssignmentRequest = {
        course_id: 'course-123',
        title: 'Complete Assignment',
        description: 'Full description',
        due_date: new Date('2025-12-31').toISOString(),
        submission_method: 'In-person',
        submission_link: 'https://example.com',
        reminders: [60, 120, 240],
      };

      mockSyncManager.addToQueue.mockResolvedValue(undefined as any);

      const result = await assignmentsApiMutations.create(
        requestWithAllFields,
        false,
        userId,
      );

      expect(result).toMatchObject({
        title: requestWithAllFields.title,
        description: requestWithAllFields.description,
        due_date: requestWithAllFields.due_date,
        submission_method: requestWithAllFields.submission_method,
        status: 'pending',
      });
    });
  });

  describe('update', () => {
    const assignmentId = 'assignment-123';
    const updateRequest: UpdateAssignmentRequest = {
      title: 'Updated Assignment',
      description: 'Updated Description',
    };

    it('should update assignment when online', async () => {
      const updatedAssignment = {
        ...mockAssignment,
        ...updateRequest,
      };

      mockSupabase.functions.invoke.mockResolvedValue({
        data: updatedAssignment,
        error: null,
      });

      const result = await assignmentsApiMutations.update(
        assignmentId,
        updateRequest,
        true,
        userId,
      );

      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith(
        'update-assignment',
        {
          body: {
            assignment_id: assignmentId,
            ...updateRequest,
          },
        },
      );

      expect(result).toEqual(updatedAssignment);
      expect(mockSyncManager.addToQueue).not.toHaveBeenCalled();
    });

    it('should queue update when offline', async () => {
      const { getCachedTask, mergeTaskUpdates } = require('@/utils/taskCache');
      getCachedTask.mockResolvedValue(mockAssignment);
      mergeTaskUpdates.mockReturnValue({
        ...mockAssignment,
        ...updateRequest,
      });

      mockSyncManager.addToQueue.mockResolvedValue(undefined as any);

      const result = await assignmentsApiMutations.update(
        assignmentId,
        updateRequest,
        false,
        userId,
      );

      expect(getCachedTask).toHaveBeenCalledWith(assignmentId, 'assignment');
      expect(mockSyncManager.addToQueue).toHaveBeenCalledWith(
        'UPDATE',
        'assignment',
        {
          type: 'UPDATE',
          id: assignmentId,
          data: updateRequest,
        },
        userId,
        { syncImmediately: false },
      );

      expect(result).toMatchObject({
        ...mockAssignment,
        ...updateRequest,
      });

      expect(mockSupabase.functions.invoke).not.toHaveBeenCalled();
    });

    it('should throw error when assignment not in cache (offline)', async () => {
      const { getCachedTask } = require('@/utils/taskCache');
      getCachedTask.mockResolvedValue(null);

      await expect(
        assignmentsApiMutations.update(assignmentId, updateRequest, false, userId),
      ).rejects.toThrow('Assignment not found in cache');
    });

    it('should handle update errors', async () => {
      const mockError = {
        message: 'Failed to update assignment',
        status: 500,
      };

      mockSupabase.functions.invoke.mockResolvedValue({
        data: null,
        error: mockError,
      });

      await expect(
        assignmentsApiMutations.update(assignmentId, updateRequest, true, userId),
      ).rejects.toBeDefined();
    });

    it('should handle network errors during update', async () => {
      const networkError = new Error('Network request failed');
      mockSupabase.functions.invoke.mockRejectedValue(networkError);

      await expect(
        assignmentsApiMutations.update(assignmentId, updateRequest, true, userId),
      ).rejects.toThrow('Network request failed');
    });

    it('should merge updates with cached task correctly', async () => {
      const { getCachedTask, mergeTaskUpdates } = require('@/utils/taskCache');
      const cachedTask = {
        ...mockAssignment,
        title: 'Original Title',
        description: 'Original Description',
      };

      getCachedTask.mockResolvedValue(cachedTask);
      mergeTaskUpdates.mockReturnValue({
        ...cachedTask,
        title: 'Updated Title',
      });

      mockSyncManager.addToQueue.mockResolvedValue(undefined as any);

      const result = await assignmentsApiMutations.update(
        assignmentId,
        { title: 'Updated Title' },
        false,
        userId,
      );

      expect(mergeTaskUpdates).toHaveBeenCalledWith(cachedTask, {
        title: 'Updated Title',
      });
      expect(result.title).toBe('Updated Title');
    });
  });

  describe('edge cases', () => {
    it('should handle null description in create request', async () => {
      const requestWithoutDescription: CreateAssignmentRequest = {
        course_id: 'course-123',
        title: 'Test Assignment',
        due_date: new Date().toISOString(),
      };

      mockSupabase.functions.invoke.mockResolvedValue({
        data: {
          ...mockAssignment,
          description: null,
        },
        error: null,
      });

      const result = await assignmentsApiMutations.create(
        requestWithoutDescription,
        true,
        userId,
      );

      expect(result.description).toBeNull();
    });

    it('should handle null submission_method in create request', async () => {
      const requestWithoutSubmission: CreateAssignmentRequest = {
        course_id: 'course-123',
        title: 'Test Assignment',
        due_date: new Date().toISOString(),
      };

      mockSyncManager.addToQueue.mockResolvedValue(undefined as any);

      const result = await assignmentsApiMutations.create(
        requestWithoutSubmission,
        false,
        userId,
      );

      expect(result.submission_method).toBeNull();
    });

    it('should handle empty reminders array', async () => {
      const requestWithoutReminders: CreateAssignmentRequest = {
        course_id: 'course-123',
        title: 'Test Assignment',
        due_date: new Date().toISOString(),
      };

      mockSupabase.functions.invoke.mockResolvedValue({
        data: mockAssignment,
        error: null,
      });

      await assignmentsApiMutations.create(
        requestWithoutReminders,
        true,
        userId,
      );

      expect(mockSupabase.functions.invoke).toHaveBeenCalled();
    });

    it('should handle partial update request', async () => {
      const partialUpdate: UpdateAssignmentRequest = {
        title: 'Only Title Updated',
      };

      const { getCachedTask, mergeTaskUpdates } = require('@/utils/taskCache');
      getCachedTask.mockResolvedValue(mockAssignment);
      mergeTaskUpdates.mockReturnValue({
        ...mockAssignment,
        title: 'Only Title Updated',
      });

      mockSyncManager.addToQueue.mockResolvedValue(undefined as any);

      const result = await assignmentsApiMutations.update(
        'assignment-123',
        partialUpdate,
        false,
        userId,
      );

      expect(result.title).toBe('Only Title Updated');
      expect(result.description).toBe(mockAssignment.description);
    });
  });
});

