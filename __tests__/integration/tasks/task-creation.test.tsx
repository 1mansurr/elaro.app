/**
 * Integration Tests: Task Creation
 *
 * Tests task creation flows for assignments, lectures, and study sessions
 */

import { renderHook, act } from '@testing-library/react-native';
import { useTaskMutations } from '@/hooks/useTaskMutations';
import { supabase } from '@/services/supabase';
import { PermissionService } from '@/features/auth/permissions/PermissionService';
import { createMockUser } from '@tests/utils/testUtils';

// Mock dependencies
jest.mock('@/services/supabase');
jest.mock('@/features/auth/permissions/PermissionService');

const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockPermissionService = PermissionService as jest.MockedClass<
  typeof PermissionService
>;

describe('Task Creation', () => {
  const mockUser = createMockUser();

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock permission service
    const permissionInstance = {
      canCreateTask: jest.fn().mockResolvedValue({ allowed: true }),
      getTaskCount: jest.fn().mockResolvedValue(5),
    };
    mockPermissionService.getInstance = jest
      .fn()
      .mockReturnValue(permissionInstance);
  });

  describe('Assignment Creation', () => {
    it('should create assignment successfully', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: { id: 'assignment-123', title: 'Test Assignment' },
        error: null,
      });

      const { result } = renderHook(() => useTaskMutations());

      await act(async () => {
        await result.current.createAssignment.mutateAsync({
          title: 'Test Assignment',
          course_id: 'course-123',
          due_date: new Date().toISOString(),
        });
      });

      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith(
        'create-assignment',
        expect.objectContaining({
          body: expect.objectContaining({
            title: 'Test Assignment',
          }),
        }),
      );
    });

    it('should check task limits before creating', async () => {
      const permissionInstance = mockPermissionService.getInstance();
      permissionInstance.canCreateTask = jest.fn().mockResolvedValue({
        allowed: false,
        reason: 'Task limit reached',
        limit: 15,
        current: 15,
      });

      const { result } = renderHook(() => useTaskMutations());

      await act(async () => {
        try {
          await result.current.createAssignment.mutateAsync({
            title: 'Test Assignment',
            course_id: 'course-123',
            due_date: new Date().toISOString(),
          });
        } catch (error) {
          expect(error).toBeTruthy();
        }
      });

      expect(permissionInstance.canCreateTask).toHaveBeenCalled();
    });
  });

  describe('Lecture Creation', () => {
    it('should create lecture successfully', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: { id: 'lecture-123', title: 'Test Lecture' },
        error: null,
      });

      const { result } = renderHook(() => useTaskMutations());

      await act(async () => {
        await result.current.createLecture.mutateAsync({
          title: 'Test Lecture',
          course_id: 'course-123',
          start_time: new Date().toISOString(),
        });
      });

      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith(
        'create-lecture',
        expect.any(Object),
      );
    });
  });

  describe('Study Session Creation', () => {
    it('should create study session successfully', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: { id: 'session-123', topic: 'Test Session' },
        error: null,
      });

      const { result } = renderHook(() => useTaskMutations());

      await act(async () => {
        await result.current.createStudySession.mutateAsync({
          topic: 'Test Session',
          course_id: 'course-123',
          session_date: new Date().toISOString(),
        });
      });

      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith(
        'create-study-session',
        expect.any(Object),
      );
    });
  });
});
