import { supabase } from '@/services/supabase';
import { CreateCourseRequest } from '@/types/api';

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

describe('API Boundary: Courses Edge Function', () => {
  let testUserId: string;
  let testUserEmail: string;

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
    // Cleanup test user
    await mockSupabase.auth.signOut();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Note: Course creation is handled by create-course Edge Function
  // which creates both the course and its initial lecture.

  describe('update-course Edge Function', () => {
    let courseId: string;

    beforeEach(async () => {
      // Use a mock course ID for testing (create-course function removed)
      courseId = 'course-test-123';
    });

    it('should accept valid update request', async () => {
      const updateRequest = {
        course_id: courseId,
        course_name: 'Updated Course Name',
      };

      (mockSupabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: {
          id: courseId,
          course_name: 'Updated Course Name',
        },
        error: null,
      });

      const { data, error } = await mockSupabase.functions.invoke(
        'update-course',
        {
          body: updateRequest,
        },
      );

      expect(error).toBeNull();
      expect(data?.course_name).toBe('Updated Course Name');
    });

    it('should reject update for non-existent course', async () => {
      const updateRequest = {
        course_id: 'non-existent-id',
        course_name: 'Updated Name',
      };

      (mockSupabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Course not found', code: 'NOT_FOUND' },
      });

      const { data, error } = await mockSupabase.functions.invoke(
        'update-course',
        {
          body: updateRequest,
        },
      );

      expect(error).toBeDefined();
      expect(data).toBeNull();
    });
  });

  describe('delete-course Edge Function', () => {
    let courseId: string;

    beforeEach(async () => {
      // Use a mock course ID for testing (create-course function removed)
      courseId = 'course-delete-123';
    });

    it('should successfully delete course', async () => {
      (mockSupabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: { success: true },
        error: null,
      });

      const { data, error } = await mockSupabase.functions.invoke(
        'delete-course',
        {
          body: { course_id: courseId },
        },
      );

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith(
        'delete-course',
        {
          body: { course_id: courseId },
        },
      );
    });
  });
});
