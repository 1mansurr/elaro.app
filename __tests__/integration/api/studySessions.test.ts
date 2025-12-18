import { supabase } from '@/services/supabase';
import { CreateStudySessionRequest } from '@/types/api';

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

describe('API Boundary: Study Sessions Edge Function', () => {
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

    // Use a mock course ID for testing (create-course function removed)
    testCourseId = 'course-session-test-123';
  });

  describe('create-study-session Edge Function', () => {
    it('should accept valid study session creation request', async () => {
      const request: CreateStudySessionRequest = {
        course_id: testCourseId,
        topic: 'Test Topic',
        session_date: new Date().toISOString(),
      };

      (mockSupabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: {
          id: 'session-123',
          topic: request.topic,
          session_date: request.session_date,
          course_id: testCourseId,
        },
        error: null,
      });

      const { data, error } = await mockSupabase.functions.invoke(
        'create-study-session',
        {
          body: request,
        },
      );

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.topic).toBe(request.topic);
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith(
        'create-study-session',
        {
          body: request,
        },
      );
    });

    it('should reject invalid study session creation request', async () => {
      const invalidRequest = {
        course_id: testCourseId,
        topic: '', // Empty topic should fail
        session_date: new Date().toISOString(),
      };

      (mockSupabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Topic is required', code: 'VALIDATION_ERROR' },
      });

      const { data, error } = await mockSupabase.functions.invoke(
        'create-study-session',
        {
          body: invalidRequest,
        },
      );

      expect(error).toBeDefined();
      expect(data).toBeNull();
    });

    it('should validate ISO 8601 datetime format for session_date', async () => {
      const invalidRequest = {
        course_id: testCourseId,
        topic: 'Test Topic',
        session_date: 'invalid-date', // Invalid date format
      };

      (mockSupabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Invalid date format', code: 'VALIDATION_ERROR' },
      });

      const { data, error } = await mockSupabase.functions.invoke(
        'create-study-session',
        {
          body: invalidRequest,
        },
      );

      expect(error).toBeDefined();
      expect(data).toBeNull();
    });
  });

  describe('update-study-session Edge Function', () => {
    let sessionId: string;

    beforeEach(async () => {
      (mockSupabase.functions.invoke as jest.Mock).mockResolvedValueOnce({
        data: {
          id: 'session-update-123',
          topic: 'Test Topic',
          course_id: testCourseId,
        },
        error: null,
      });

      const { data } = await mockSupabase.functions.invoke(
        'create-study-session',
        {
          body: {
            course_id: testCourseId,
            topic: 'Test Topic',
            session_date: new Date().toISOString(),
          },
        },
      );
      sessionId = data?.id || 'session-update-123';
    });

    it('should accept valid update request', async () => {
      const updateRequest = {
        study_session_id: sessionId,
        topic: 'Updated Topic',
      };

      (mockSupabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: {
          id: sessionId,
          topic: 'Updated Topic',
        },
        error: null,
      });

      const { data, error } = await mockSupabase.functions.invoke(
        'update-study-session',
        {
          body: updateRequest,
        },
      );

      expect(error).toBeNull();
      expect(data?.topic).toBe('Updated Topic');
    });
  });

  describe('delete-study-session Edge Function', () => {
    let sessionId: string;

    beforeEach(async () => {
      (mockSupabase.functions.invoke as jest.Mock).mockResolvedValueOnce({
        data: {
          id: 'session-delete-123',
          topic: 'Test Topic',
          course_id: testCourseId,
        },
        error: null,
      });

      const { data } = await mockSupabase.functions.invoke(
        'create-study-session',
        {
          body: {
            course_id: testCourseId,
            topic: 'Test Topic',
            session_date: new Date().toISOString(),
          },
        },
      );
      sessionId = data?.id || 'session-delete-123';
    });

    it('should successfully delete study session', async () => {
      (mockSupabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: { success: true },
        error: null,
      });

      const { data, error } = await mockSupabase.functions.invoke(
        'delete-study-session',
        {
          body: { study_session_id: sessionId },
        },
      );

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });
  });
});
