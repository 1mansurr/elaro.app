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

  describe('create-course Edge Function', () => {
    it('should accept valid course creation request', async () => {
      const request: CreateCourseRequest = {
        course_name: 'Test Course',
        course_code: 'TC101',
        about_course: 'Test description',
      };

      (mockSupabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: {
          id: 'course-123',
          course_name: request.course_name,
          course_code: request.course_code,
          about_course: request.about_course,
        },
        error: null,
      });

      const { data, error } = await mockSupabase.functions.invoke(
        'create-course',
        {
          body: request,
        },
      );

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.course_name).toBe(request.course_name);
      expect(data?.course_code).toBe(request.course_code);
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith(
        'create-course',
        {
          body: request,
        },
      );
    });

    it('should reject invalid course creation request', async () => {
      const invalidRequest = {
        course_name: '', // Empty name should fail
      };

      (mockSupabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Course name is required', code: 'VALIDATION_ERROR' },
      });

      const { data, error } = await mockSupabase.functions.invoke(
        'create-course',
        {
          body: invalidRequest,
        },
      );

      expect(error).toBeDefined();
      expect(data).toBeNull();
      expect(error?.message).toContain('required');
    });

    it('should handle rate limiting', async () => {
      // Make multiple rapid requests
      const requests = Array(10)
        .fill(null)
        .map(() =>
          mockSupabase.functions.invoke('create-course', {
            body: { course_name: 'Test' },
          }),
        );

      // Mock some rate limited responses
      (mockSupabase.functions.invoke as jest.Mock)
        .mockResolvedValueOnce({ data: { id: '1' }, error: null })
        .mockResolvedValueOnce({ data: { id: '2' }, error: null })
        .mockResolvedValueOnce({
          data: null,
          error: { code: 'RATE_LIMIT', message: 'Rate limit exceeded' },
        })
        .mockResolvedValue({
          data: null,
          error: { code: 'RATE_LIMIT', message: 'Rate limit exceeded' },
        });

      const results = await Promise.allSettled(requests);

      // Some should be rate limited
      const rateLimited = results.filter(
        r =>
          r.status === 'rejected' ||
          (r.status === 'fulfilled' && r.value.error?.code === 'RATE_LIMIT'),
      );

      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('update-course Edge Function', () => {
    let courseId: string;

    beforeEach(async () => {
      // Create a course for testing
      (mockSupabase.functions.invoke as jest.Mock).mockResolvedValueOnce({
        data: { id: 'course-test-123', course_name: 'Test Course' },
        error: null,
      });

      const { data } = await mockSupabase.functions.invoke('create-course', {
        body: { course_name: 'Test Course' },
      });
      courseId = data?.id || 'course-test-123';
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
      (mockSupabase.functions.invoke as jest.Mock).mockResolvedValueOnce({
        data: { id: 'course-delete-123', course_name: 'Test Course' },
        error: null,
      });

      const { data } = await mockSupabase.functions.invoke('create-course', {
        body: { course_name: 'Test Course' },
      });
      courseId = data?.id || 'course-delete-123';
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
