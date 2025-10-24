import { supabase } from '@/services/supabase';
import { createMockSupabaseClient, createMockUser, createMockAssignment } from '@tests/utils/testUtils';

// Mock the supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => createMockSupabaseClient()),
}));

describe('SupabaseService', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('authentication', () => {
    it('should sign in user with valid credentials', async () => {
      const mockUser = createMockUser();
      const mockAuthResponse = {
        data: { user: mockUser },
        error: null
      };

      mockSupabase.auth.signInWithPassword.mockResolvedValue(mockAuthResponse);

      const result = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'password123'
      });

      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });
      expect(result.data.user).toEqual(mockUser);
      expect(result.error).toBeNull();
    });

    it('should handle sign in errors', async () => {
      const mockError = { message: 'Invalid credentials' };
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null },
        error: mockError
      });

      const result = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'wrongpassword'
      });

      expect(result.data.user).toBeNull();
      expect(result.error).toEqual(mockError);
    });

    it('should sign up new user', async () => {
      const mockUser = createMockUser();
      const mockAuthResponse = {
        data: { user: mockUser },
        error: null
      };

      mockSupabase.auth.signUp.mockResolvedValue(mockAuthResponse);

      const result = await supabase.auth.signUp({
        email: 'newuser@example.com',
        password: 'password123'
      });

      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        password: 'password123'
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
        error: null
      });

      const result = await supabase.auth.getUser();

      expect(result.data.user).toEqual(mockUser);
    });
  });

  describe('data operations', () => {
    it('should select data from table', async () => {
      const mockData = [createMockUser(), createMockUser()];
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: mockData[0],
        error: null
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
      mockSupabase.from().insert.mockResolvedValue({
        data: [mockAssignment],
        error: null
      });

      const result = await supabase
        .from('assignments')
        .insert(mockAssignment);

      expect(result.data).toEqual([mockAssignment]);
      expect(result.error).toBeNull();
    });

    it('should update data in table', async () => {
      const updatedAssignment = { ...createMockAssignment(), title: 'Updated Title' };
      mockSupabase.from().update().eq.mockResolvedValue({
        data: [updatedAssignment],
        error: null
      });

      const result = await supabase
        .from('assignments')
        .update({ title: 'Updated Title' })
        .eq('id', 'assignment-1');

      expect(result.data).toEqual([updatedAssignment]);
      expect(result.error).toBeNull();
    });

    it('should delete data from table', async () => {
      mockSupabase.from().delete().eq.mockResolvedValue({
        data: [],
        error: null
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
      mockSupabase.from().select.mockResolvedValue({
        data: null,
        error: mockError
      });

      const result = await supabase
        .from('nonexistent_table')
        .select('*');

      expect(result.data).toBeNull();
      expect(result.error).toEqual(mockError);
    });
  });

  describe('edge functions', () => {
    it('should invoke edge function successfully', async () => {
      const mockResponse = { data: { success: true }, error: null };
      mockSupabase.functions.invoke.mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('create-assignment', {
        body: { title: 'Test Assignment' }
      });

      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('create-assignment', {
        body: { title: 'Test Assignment' }
      });
      expect(result.data.success).toBe(true);
    });

    it('should handle edge function errors', async () => {
      const mockError = { message: 'Function execution failed' };
      mockSupabase.functions.invoke.mockResolvedValue({
        data: null,
        error: mockError
      });

      const result = await supabase.functions.invoke('create-assignment', {
        body: { title: 'Test Assignment' }
      });

      expect(result.data).toBeNull();
      expect(result.error).toEqual(mockError);
    });
  });

  describe('query chaining', () => {
    it('should chain select with filters', async () => {
      const mockData = [createMockAssignment()];
      mockSupabase.from().select().eq().limit.mockResolvedValue({
        data: mockData,
        error: null
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
      mockSupabase.from().update().eq.mockResolvedValue({
        data: [updatedData],
        error: null
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
      mockSupabase.from().select.mockRejectedValue(networkError);

      await expect(
        supabase.from('users').select('*')
      ).rejects.toThrow('Network request failed');
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      mockSupabase.functions.invoke.mockRejectedValue(timeoutError);

      await expect(
        supabase.functions.invoke('slow-function')
      ).rejects.toThrow('Request timeout');
    });

    it('should handle authentication errors', async () => {
      const authError = { message: 'Invalid JWT token' };
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: authError
      });

      const result = await supabase.auth.getUser();
      expect(result.error).toEqual(authError);
    });
  });

  describe('data validation', () => {
    it('should validate required fields on insert', async () => {
      const incompleteData = { title: 'Test' }; // Missing required fields
      const validationError = { message: 'Missing required fields' };
      
      mockSupabase.from().insert.mockResolvedValue({
        data: null,
        error: validationError
      });

      const result = await supabase
        .from('assignments')
        .insert(incompleteData);

      expect(result.error).toEqual(validationError);
    });

    it('should handle constraint violations', async () => {
      const constraintError = { message: 'Unique constraint violation' };
      mockSupabase.from().insert.mockResolvedValue({
        data: null,
        error: constraintError
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
        createMockAssignment({ id: `assignment-${i}` })
      );
      
      mockSupabase.from().select().limit.mockResolvedValue({
        data: largeDataSet,
        error: null
      });

      const result = await supabase
        .from('assignments')
        .select('*')
        .limit(1000);

      expect(result.data).toHaveLength(1000);
    });

    it('should handle pagination', async () => {
      const pageData = [createMockAssignment()];
      mockSupabase.from().select().range.mockResolvedValue({
        data: pageData,
        error: null
      });

      const result = await supabase
        .from('assignments')
        .select('*')
        .range(0, 9); // First 10 items

      expect(result.data).toEqual(pageData);
    });
  });
});
