import { createMockUser, createMockAssignment, createMockSupabaseClient } from '@tests/utils/testUtils';

// Mock Supabase client
const mockSupabase = createMockSupabaseClient();

describe('Assignments API Integration', () => {
  let mockUser: any;

  beforeEach(() => {
    mockUser = createMockUser();
    jest.clearAllMocks();
  });

  describe('POST /api/assignments', () => {
    it('should create assignment successfully', async () => {
      const assignmentData = {
        title: 'Test Assignment',
        description: 'Test description',
        due_date: new Date(Date.now() + 86400000).toISOString(),
        course_id: 'course-1'
      };

      const mockResponse = {
        data: createMockAssignment(assignmentData),
        error: null
      };

      mockSupabase.functions.invoke.mockResolvedValue(mockResponse);

      const response = await fetch('/api/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockUser.id}`
        },
        body: JSON.stringify(assignmentData)
      });

      expect(response.status).toBe(201);
      const result = await response.json();
      expect(result.data.title).toBe('Test Assignment');
    });

    it('should handle validation errors', async () => {
      const invalidData = {
        title: '', // Empty title should fail validation
        description: 'Test description'
      };

      const mockError = {
        data: null,
        error: { message: 'Title is required' }
      };

      mockSupabase.functions.invoke.mockResolvedValue(mockError);

      const response = await fetch('/api/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockUser.id}`
        },
        body: JSON.stringify(invalidData)
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.error.message).toBe('Title is required');
    });

    it('should handle authentication errors', async () => {
      const assignmentData = {
        title: 'Test Assignment',
        description: 'Test description'
      };

      const response = await fetch('/api/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
          // Missing Authorization header
        },
        body: JSON.stringify(assignmentData)
      });

      expect(response.status).toBe(401);
    });

    it('should handle rate limiting', async () => {
      const assignmentData = {
        title: 'Test Assignment',
        description: 'Test description'
      };

      // Mock rate limit error
      const rateLimitError = {
        data: null,
        error: { message: 'Rate limit exceeded' }
      };

      mockSupabase.functions.invoke.mockResolvedValue(rateLimitError);

      const response = await fetch('/api/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockUser.id}`
        },
        body: JSON.stringify(assignmentData)
      });

      expect(response.status).toBe(429);
    });
  });

  describe('GET /api/assignments', () => {
    it('should fetch user assignments', async () => {
      const mockAssignments = [
        createMockAssignment({ id: 'assignment-1' }),
        createMockAssignment({ id: 'assignment-2' })
      ];

      const mockResponse = {
        data: mockAssignments,
        error: null
      };

      mockSupabase.functions.invoke.mockResolvedValue(mockResponse);

      const response = await fetch('/api/assignments', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${mockUser.id}`
        }
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.data).toHaveLength(2);
      expect(result.data[0].id).toBe('assignment-1');
    });

    it('should handle empty results', async () => {
      const mockResponse = {
        data: [],
        error: null
      };

      mockSupabase.functions.invoke.mockResolvedValue(mockResponse);

      const response = await fetch('/api/assignments', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${mockUser.id}`
        }
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.data).toHaveLength(0);
    });

    it('should support pagination', async () => {
      const mockAssignments = [createMockAssignment()];
      const mockResponse = {
        data: mockAssignments,
        error: null,
        pagination: {
          page: 1,
          limit: 10,
          total: 25
        }
      };

      mockSupabase.functions.invoke.mockResolvedValue(mockResponse);

      const response = await fetch('/api/assignments?page=1&limit=10', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${mockUser.id}`
        }
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.pagination.total).toBe(25);
    });
  });

  describe('PUT /api/assignments/:id', () => {
    it('should update assignment successfully', async () => {
      const assignmentId = 'assignment-1';
      const updateData = {
        title: 'Updated Assignment',
        description: 'Updated description'
      };

      const mockResponse = {
        data: createMockAssignment({ id: assignmentId, ...updateData }),
        error: null
      };

      mockSupabase.functions.invoke.mockResolvedValue(mockResponse);

      const response = await fetch(`/api/assignments/${assignmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockUser.id}`
        },
        body: JSON.stringify(updateData)
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.data.title).toBe('Updated Assignment');
    });

    it('should handle assignment not found', async () => {
      const assignmentId = 'nonexistent-assignment';
      const updateData = {
        title: 'Updated Assignment'
      };

      const mockError = {
        data: null,
        error: { message: 'Assignment not found' }
      };

      mockSupabase.functions.invoke.mockResolvedValue(mockError);

      const response = await fetch(`/api/assignments/${assignmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockUser.id}`
        },
        body: JSON.stringify(updateData)
      });

      expect(response.status).toBe(404);
      const result = await response.json();
      expect(result.error.message).toBe('Assignment not found');
    });

    it('should handle permission errors', async () => {
      const assignmentId = 'assignment-1';
      const updateData = {
        title: 'Updated Assignment'
      };

      const mockError = {
        data: null,
        error: { message: 'Permission denied' }
      };

      mockSupabase.functions.invoke.mockResolvedValue(mockError);

      const response = await fetch(`/api/assignments/${assignmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockUser.id}`
        },
        body: JSON.stringify(updateData)
      });

      expect(response.status).toBe(403);
      const result = await response.json();
      expect(result.error.message).toBe('Permission denied');
    });
  });

  describe('DELETE /api/assignments/:id', () => {
    it('should delete assignment successfully', async () => {
      const assignmentId = 'assignment-1';

      const mockResponse = {
        data: { id: assignmentId, deleted: true },
        error: null
      };

      mockSupabase.functions.invoke.mockResolvedValue(mockResponse);

      const response = await fetch(`/api/assignments/${assignmentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${mockUser.id}`
        }
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.data.deleted).toBe(true);
    });

    it('should handle soft delete', async () => {
      const assignmentId = 'assignment-1';

      const mockResponse = {
        data: { id: assignmentId, deleted_at: new Date().toISOString() },
        error: null
      };

      mockSupabase.functions.invoke.mockResolvedValue(mockResponse);

      const response = await fetch(`/api/assignments/${assignmentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${mockUser.id}`
        }
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.data.deleted_at).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle network timeouts', async () => {
      mockSupabase.functions.invoke.mockRejectedValue(new Error('Request timeout'));

      const response = await fetch('/api/assignments', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${mockUser.id}`
        }
      });

      expect(response.status).toBe(500);
    });

    it('should handle server errors', async () => {
      const mockError = {
        data: null,
        error: { message: 'Internal server error' }
      };

      mockSupabase.functions.invoke.mockResolvedValue(mockError);

      const response = await fetch('/api/assignments', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${mockUser.id}`
        }
      });

      expect(response.status).toBe(500);
      const result = await response.json();
      expect(result.error.message).toBe('Internal server error');
    });

    it('should handle malformed JSON', async () => {
      const response = await fetch('/api/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockUser.id}`
        },
        body: 'invalid json'
      });

      expect(response.status).toBe(400);
    });
  });

  describe('performance', () => {
    it('should handle concurrent requests', async () => {
      const mockResponse = {
        data: createMockAssignment(),
        error: null
      };

      mockSupabase.functions.invoke.mockResolvedValue(mockResponse);

      const promises = Array.from({ length: 10 }, () =>
        fetch('/api/assignments', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${mockUser.id}`
          }
        })
      );

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    it('should handle large payloads', async () => {
      const largeAssignment = {
        title: 'Large Assignment',
        description: 'A'.repeat(10000), // Large description
        due_date: new Date(Date.now() + 86400000).toISOString()
      };

      const mockResponse = {
        data: createMockAssignment(largeAssignment),
        error: null
      };

      mockSupabase.functions.invoke.mockResolvedValue(mockResponse);

      const response = await fetch('/api/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockUser.id}`
        },
        body: JSON.stringify(largeAssignment)
      });

      expect(response.status).toBe(201);
    });
  });
});
