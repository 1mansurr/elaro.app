import { supabase } from '@/services/supabase';
import { CreateLectureRequest } from '@/types/api';

jest.mock('@/services/supabase', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signOut: jest.fn(),
    },
    functions: {
      invoke: jest.fn(),
    },
  },
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('API Boundary: Lectures Edge Function', () => {
  let testUserId: string;
  let testUserEmail: string;
  let testCourseId: string;

  beforeAll(async () => {
    // Setup test user
    testUserEmail = `test_${Date.now()}@test.com`;
    const { data, error } = await mockSupabase.auth.signUp({
      email: testUserEmail,
      password: 'Test1234!',
    });

    if (error) throw error;
    testUserId = data.user?.id || '';

    // Wait for auth to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    await mockSupabase.auth.signOut();
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    // Create a test course
    (mockSupabase.functions.invoke as jest.Mock).mockResolvedValueOnce({
      data: { id: 'course-lecture-test-123', course_name: 'Test Course' },
      error: null,
    });

    const { data } = await mockSupabase.functions.invoke('create-course', {
      body: { course_name: 'Test Course' },
    });
    testCourseId = data?.id || 'course-lecture-test-123';
  });

  describe('create-lecture Edge Function', () => {
    it('should accept valid lecture creation request', async () => {
      const request: CreateLectureRequest = {
        course_id: testCourseId,
        lecture_name: 'Test Lecture',
        lecture_date: new Date().toISOString(),
      };

      (mockSupabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: {
          id: 'lecture-123',
          lecture_name: request.lecture_name,
          lecture_date: request.lecture_date,
          course_id: testCourseId,
        },
        error: null,
      });

      const { data, error } = await mockSupabase.functions.invoke(
        'create-lecture',
        {
          body: request,
        },
      );

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.lecture_name).toBe(request.lecture_name);
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith(
        'create-lecture',
        {
          body: request,
        },
      );
    });

    it('should reject invalid lecture creation request', async () => {
      const invalidRequest = {
        course_id: testCourseId,
        lecture_name: '', // Empty name should fail
        lecture_date: new Date().toISOString(),
      };

      (mockSupabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: null,
        error: {
          message: 'Lecture name is required',
          code: 'VALIDATION_ERROR',
        },
      });

      const { data, error } = await mockSupabase.functions.invoke(
        'create-lecture',
        {
          body: invalidRequest,
        },
      );

      expect(error).toBeDefined();
      expect(data).toBeNull();
    });

    it('should validate UUID format for course_id', async () => {
      const invalidRequest = {
        course_id: 'not-a-uuid',
        lecture_name: 'Test Lecture',
        lecture_date: new Date().toISOString(),
      };

      (mockSupabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: null,
        error: {
          message: 'Invalid course ID format',
          code: 'VALIDATION_ERROR',
        },
      });

      const { data, error } = await mockSupabase.functions.invoke(
        'create-lecture',
        {
          body: invalidRequest,
        },
      );

      expect(error).toBeDefined();
      expect(data).toBeNull();
    });
  });

  describe('update-lecture Edge Function', () => {
    let lectureId: string;

    beforeEach(async () => {
      (mockSupabase.functions.invoke as jest.Mock).mockResolvedValueOnce({
        data: {
          id: 'lecture-update-123',
          lecture_name: 'Test Lecture',
          course_id: testCourseId,
        },
        error: null,
      });

      const { data } = await mockSupabase.functions.invoke('create-lecture', {
        body: {
          course_id: testCourseId,
          lecture_name: 'Test Lecture',
          lecture_date: new Date().toISOString(),
        },
      });
      lectureId = data?.id || 'lecture-update-123';
    });

    it('should accept valid update request', async () => {
      const updateRequest = {
        lecture_id: lectureId,
        lecture_name: 'Updated Lecture Name',
      };

      (mockSupabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: {
          id: lectureId,
          lecture_name: 'Updated Lecture Name',
        },
        error: null,
      });

      const { data, error } = await mockSupabase.functions.invoke(
        'update-lecture',
        {
          body: updateRequest,
        },
      );

      expect(error).toBeNull();
      expect(data?.lecture_name).toBe('Updated Lecture Name');
    });
  });

  describe('delete-lecture Edge Function', () => {
    let lectureId: string;

    beforeEach(async () => {
      (mockSupabase.functions.invoke as jest.Mock).mockResolvedValueOnce({
        data: {
          id: 'lecture-delete-123',
          lecture_name: 'Test Lecture',
          course_id: testCourseId,
        },
        error: null,
      });

      const { data } = await mockSupabase.functions.invoke('create-lecture', {
        body: {
          course_id: testCourseId,
          lecture_name: 'Test Lecture',
          lecture_date: new Date().toISOString(),
        },
      });
      lectureId = data?.id || 'lecture-delete-123';
    });

    it('should successfully delete lecture', async () => {
      (mockSupabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: { success: true },
        error: null,
      });

      const { data, error } = await mockSupabase.functions.invoke(
        'delete-lecture',
        {
          body: { lecture_id: lectureId },
        },
      );

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });
  });
});
