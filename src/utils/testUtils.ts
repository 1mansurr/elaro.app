// Test utilities for ELARO app

// Mock data for testing
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  is_subscribed_to_oddity: false,
  timezone: 'UTC',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

export const mockSession = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    created_at: '2024-01-01T00:00:00Z',
  },
};

export const mockStudySession = {
  id: 'test-session-id',
  user_id: 'test-user-id',
  course: 'Test Course',
  topic: 'Test Topic',
  date_time: '2024-12-25T10:00:00Z',
  color: 'blue' as const,
  spaced_repetition_enabled: true,
  reminders: ['30min', '24hr'] as const,
  completed: false,
  created_at: '2024-01-01T00:00:00Z',
};

export const mockTaskEvent = {
  id: 'test-task-id',
  user_id: 'test-user-id',
  type: 'assignment' as const,
  title: 'Test Assignment',
  date_time: '2024-12-25T14:00:00Z',
  color: 'green' as const,
  reminders: ['30min'] as const,
  completed: false,
  created_at: '2024-01-01T00:00:00Z',
};

// Mock functions for testing
export const mockFunctions = {
  signIn: () => Promise.resolve(),
  signUp: () => Promise.resolve(),
  signOut: () => Promise.resolve(),
  createSession: () => Promise.resolve(),
  createTask: () => Promise.resolve(),
  updateUser: () => Promise.resolve(),
  showToast: () => {},
  navigate: () => {},
};

// Test data generators
export const testDataGenerators = {
  generateUser: (overrides = {}) => ({
    ...mockUser,
    ...overrides,
  }),

  generateStudySession: (overrides = {}) => ({
    ...mockStudySession,
    ...overrides,
  }),

  generateTaskEvent: (overrides = {}) => ({
    ...mockTaskEvent,
    ...overrides,
  }),

  generateFormData: (overrides = {}) => ({
    email: 'test@example.com',
    password: 'password123',
    name: 'Test User',
    ...overrides,
  }),
};

// Validation testing utilities
export const validationUtils = {
  testEmailValidation: (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  testPasswordValidation: (password: string) => {
    return password.length >= 6;
  },

  testRequiredField: (value: any) => {
    return value && value.toString().trim().length > 0;
  },

  testMinLength: (value: string, minLength: number) => {
    return value.length >= minLength;
  },

  testMaxLength: (value: string, maxLength: number) => {
    return value.length <= maxLength;
  },
};

// Performance testing utilities
export const performanceUtils = {
  measureRenderTime: async (renderFunction: () => void) => {
    const startTime = performance.now();
    renderFunction();
    const endTime = performance.now();
    return endTime - startTime;
  },

  measureInteractionTime: async (interaction: () => void) => {
    const startTime = performance.now();
    interaction();
    const endTime = performance.now();
    return endTime - startTime;
  },
}; 