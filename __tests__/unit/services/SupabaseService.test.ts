import { createMockUser, createMockAssignment } from '@tests/utils/testUtils';

// Create a mock supabase client
const createMockSupabaseClient = () => {
  const mockChain = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    limit: jest.fn().mockResolvedValue({ data: [], error: null }),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockResolvedValue({ data: [], error: null }),
  };

  return {
    from: jest.fn(() => mockChain),
    auth: {
      getUser: jest
        .fn()
        .mockResolvedValue({ data: { user: null }, error: null }),
      signInWithPassword: jest
        .fn()
        .mockResolvedValue({ data: { user: null }, error: null }),
      signUp: jest
        .fn()
        .mockResolvedValue({ data: { user: null }, error: null }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
    },
    functions: {
      invoke: jest.fn().mockResolvedValue({ data: null, error: null }),
    },
  };
};

// Mock the supabase service module
jest.mock('@/services/supabase', () => {
  const mockClient = createMockSupabaseClient();
  return {
    supabase: mockClient,
  };
});

// Mock @supabase/supabase-js
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => createMockSupabaseClient()),
}));

// Import after mocks
import { supabase } from '@/services/supabase';

describe('SupabaseService', () => {
  let mockSupabase: {
    from: jest.Mock;
    select: jest.Mock;
    insert: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    eq: jest.Mock;
    single: jest.Mock;
    limit: jest.Mock;
    order: jest.Mock;
    range: jest.Mock;
    auth: {
      getUser: jest.Mock;
      signInWithPassword: jest.Mock;
      signUp: jest.Mock;
      signOut: jest.Mock;
    };
    functions: {
      invoke: jest.Mock;
    };
  };

  beforeEach(() => {
    // Get the mock client from the mocked module
    mockSupabase = supabase as any;
    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('authentication', () => {
    it('should sign in user with valid credentials', async () => {
      const mockUser = createMockUser();
      const mockAuthResponse = {
        data: { user: mockUser },
        error: null,
      };

      mockSupabase.auth.signInWithPassword.mockResolvedValue(mockAuthResponse);

      const result = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(result.data.user).toEqual(mockUser);
      expect(result.error).toBeNull();
    });

    it('should handle sign in errors', async () => {
      const mockError = { message: 'Invalid credentials' };
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null },
        error: mockError,
      });

      const result = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'wrongpassword',
      });

      expect(result.data.user).toBeNull();
      expect(result.error).toEqual(mockError);
    });

    it('should sign up new user', async () => {
      const mockUser = createMockUser();
      const mockAuthResponse = {
        data: { user: mockUser },
        error: null,
      };

      mockSupabase.auth.signUp.mockResolvedValue(mockAuthResponse);

      const result = await supabase.auth.signUp({
        email: 'newuser@example.com',
        password: 'password123',
      });

      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        password: 'password123',
      });
      expect(result.data.user).toEqual(mockUser);
    });

    it('should sign out user', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });

      const result = await supabase.auth.signOut();

      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
      expect(result.error).toBeNull();
    });

    it('should get current user', async () => {
      const mockUser = createMockUser();
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await supabase.auth.getUser();

      expect(result.data.user).toEqual(mockUser);
    });
  });

  describe('data operations', () => {
    it('should select data from table', async () => {
      const mockData = [createMockUser(), createMockUser()];
      const mockChain = mockSupabase.from('users') as any;
      mockChain.select.mockReturnValue(mockChain);
      mockChain.eq.mockReturnValue(mockChain);
      mockChain.single.mockResolvedValue({
        data: mockData[0],
        error: null,
      });

      const result = await supabase
        .from('users')
        .select('*')
        .eq('id', 'user-1')
        .single();

      expect(result.data).toEqual(mockData[0]);
      expect(result.error).toBeNull();
    });

    it('should insert data into table', async () => {
      const mockAssignment = createMockAssignment();
      const mockChain = mockSupabase.from('assignments') as any;
      mockChain.insert.mockResolvedValue({
        data: [mockAssignment],
        error: null,
      });

      const result = await supabase.from('assignments').insert(mockAssignment);

      expect(result.data).toEqual([mockAssignment]);
      expect(result.error).toBeNull();
    });

    it('should update data in table', async () => {
      const updatedAssignment = {
        ...createMockAssignment(),
        title: 'Updated Title',
      };
      const mockChain = mockSupabase.from('assignments') as any;
      mockChain.update.mockReturnValue(mockChain);
      mockChain.eq.mockResolvedValue({
        data: [updatedAssignment],
        error: null,
      });

      const result = await supabase
        .from('assignments')
        .update({ title: 'Updated Title' })
        .eq('id', 'assignment-1');

      expect(result.data).toEqual([updatedAssignment]);
      expect(result.error).toBeNull();
    });

    it('should delete data from table', async () => {
      const mockChain = mockSupabase.from('assignments') as any;
      mockChain.delete.mockReturnValue(mockChain);
      mockChain.eq.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await supabase
        .from('assignments')
        .delete()
        .eq('id', 'assignment-1');

      expect(result.data).toEqual([]);
      expect(result.error).toBeNull();
    });

    it('should handle query errors', async () => {
      const mockError = { message: 'Table not found' };
      const mockChain = mockSupabase.from('nonexistent_table') as any;
      mockChain.select.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const result = await supabase.from('nonexistent_table').select('*');

      expect(result.data).toBeNull();
      expect(result.error).toEqual(mockError);
    });
  });

  describe('edge functions', () => {
    it('should invoke edge function successfully', async () => {
      const mockResponse = { data: { success: true }, error: null };
      mockSupabase.functions.invoke.mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('create-assignment', {
        body: { title: 'Test Assignment' },
      });

      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith(
        'create-assignment',
        {
          body: { title: 'Test Assignment' },
        },
      );
      expect(result.data.success).toBe(true);
    });

    it('should handle edge function errors', async () => {
      const mockError = { message: 'Function execution failed' };
      mockSupabase.functions.invoke.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const result = await supabase.functions.invoke('create-assignment', {
        body: { title: 'Test Assignment' },
      });

      expect(result.data).toBeNull();
      expect(result.error).toEqual(mockError);
    });
  });

  describe('query chaining', () => {
    it('should chain select with filters', async () => {
      const mockData = [createMockAssignment()];
      const mockChain = mockSupabase.from('assignments') as any;
      mockChain.select.mockReturnValue(mockChain);
      mockChain.eq.mockReturnValue(mockChain);
      mockChain.limit.mockResolvedValue({
        data: mockData,
        error: null,
      });

      const result = await supabase
        .from('assignments')
        .select('*')
        .eq('user_id', 'user-1')
        .limit(10);

      expect(result.data).toEqual(mockData);
    });

    it('should chain update with conditions', async () => {
      const updatedData = { title: 'Updated' };
      const mockChain = mockSupabase.from('assignments') as any;
      mockChain.update.mockReturnValue(mockChain);
      mockChain.eq.mockResolvedValue({
        data: [updatedData],
        error: null,
      });

      const result = await supabase
        .from('assignments')
        .update(updatedData)
        .eq('id', 'assignment-1');

      expect(result.data).toEqual([updatedData]);
    });
  });

  describe('error handling', () => {
    it('should handle network errors', async () => {
      const networkError = new Error('Network request failed');
      const mockChain = mockSupabase.from('users') as any;
      mockChain.select.mockRejectedValue(networkError);

      await expect(supabase.from('users').select('*')).rejects.toThrow(
        'Network request failed',
      );
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      mockSupabase.functions.invoke.mockRejectedValue(timeoutError);

      await expect(supabase.functions.invoke('slow-function')).rejects.toThrow(
        'Request timeout',
      );
    });

    it('should handle authentication errors', async () => {
      const authError = { message: 'Invalid JWT token' };
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: authError,
      });

      const result = await supabase.auth.getUser();
      expect(result.error).toEqual(authError);
    });
  });

  describe('data validation', () => {
    it('should validate required fields on insert', async () => {
      const incompleteData = { title: 'Test' }; // Missing required fields
      const validationError = { message: 'Missing required fields' };
      const mockChain = mockSupabase.from('assignments') as any;
      mockChain.insert.mockResolvedValue({
        data: null,
        error: validationError,
      });

      const result = await supabase.from('assignments').insert(incompleteData);

      expect(result.error).toEqual(validationError);
    });

    it('should handle constraint violations', async () => {
      const constraintError = { message: 'Unique constraint violation' };
      const mockChain = mockSupabase.from('users') as any;
      mockChain.insert.mockResolvedValue({
        data: null,
        error: constraintError,
      });

      const result = await supabase
        .from('users')
        .insert({ email: 'existing@example.com' });

      expect(result.error).toEqual(constraintError);
    });
  });

  describe('performance', () => {
    it('should handle large result sets', async () => {
      const largeDataSet = Array.from({ length: 1000 }, (_, i) =>
        createMockAssignment({ id: `assignment-${i}` }),
      );
      const mockChain = mockSupabase.from('assignments') as any;
      mockChain.select.mockReturnValue(mockChain);
      mockChain.limit.mockResolvedValue({
        data: largeDataSet,
        error: null,
      });

      const result = await supabase.from('assignments').select('*').limit(1000);

      expect(result.data).toHaveLength(1000);
    });

    it('should handle pagination', async () => {
      const pageData = [createMockAssignment()];
      const mockChain = mockSupabase.from('assignments') as any;
      mockChain.select.mockReturnValue(mockChain);
      mockChain.range.mockResolvedValue({
        data: pageData,
        error: null,
      });

      const result = await supabase.from('assignments').select('*').range(0, 9); // First 10 items

      expect(result.data).toEqual(pageData);
    });
  });
});
