import { User } from '@/types';

// Mock user data factory
export const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'test-user-1',
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  subscription_tier: 'free',
  onboarding_completed: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  university: 'Test University',
  program: 'Test Program',
  subscription_expires_at: null,
  account_status: 'active',
  ...overrides,
});

export const createMockPremiumUser = (overrides: Partial<User> = {}): User =>
  createMockUser({
    id: 'premium-user-1',
    subscription_tier: 'oddity',
    subscription_expires_at: '2025-12-31T23:59:59Z',
    ...overrides,
  });

export const createMockAdminUser = (overrides: Partial<User> = {}): User =>
  createMockUser({
    id: 'admin-user-1',
    subscription_tier: 'admin',
    ...overrides,
  });

// Mock Supabase client factory
export const createMockSupabaseClient = (overrides: any = {}) => ({
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: null, error: null }),
  limit: jest.fn().mockResolvedValue({ data: [], error: null }),
  order: jest.fn().mockReturnThis(),
  range: jest.fn().mockReturnThis(),
  auth: {
    getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
    signInWithPassword: jest
      .fn()
      .mockResolvedValue({ data: { user: null }, error: null }),
    signUp: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
  },
  functions: {
    invoke: jest.fn().mockResolvedValue({ data: null, error: null }),
  },
  ...overrides,
});

// Mock notification data
export const createMockNotification = (overrides: any = {}) => ({
  id: 'notification-1',
  title: 'Test Notification',
  body: 'This is a test notification',
  type: 'reminder',
  scheduled_for: new Date(Date.now() + 60000).toISOString(),
  status: 'pending',
  user_id: 'test-user-1',
  created_at: new Date().toISOString(),
  ...overrides,
});

// Mock assignment data
export const createMockAssignment = (overrides: any = {}) => ({
  id: 'assignment-1',
  title: 'Test Assignment',
  description: 'This is a test assignment',
  due_date: new Date(Date.now() + 86400000).toISOString(),
  course_id: 'course-1',
  user_id: 'test-user-1',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  deleted_at: null,
  ...overrides,
});

// Mock course data
export const createMockCourse = (overrides: any = {}) => ({
  id: 'course-1',
  name: 'Test Course',
  code: 'TEST101',
  university: 'Test University',
  user_id: 'test-user-1',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  deleted_at: null,
  ...overrides,
});

// Mock study session data
export const createMockStudySession = (overrides: any = {}) => ({
  id: 'session-1',
  title: 'Test Study Session',
  description: 'This is a test study session',
  start_time: new Date().toISOString(),
  end_time: new Date(Date.now() + 3600000).toISOString(),
  course_id: 'course-1',
  user_id: 'test-user-1',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  deleted_at: null,
  ...overrides,
});

// Mock API response
export const createMockApiResponse = (data: any = null, error: any = null) => ({
  data,
  error,
  status: error ? 400 : 200,
  statusText: error ? 'Bad Request' : 'OK',
});

// Mock navigation
export const createMockNavigation = () => ({
  navigate: jest.fn(),
  goBack: jest.fn(),
  replace: jest.fn(),
  reset: jest.fn(),
  push: jest.fn(),
  pop: jest.fn(),
  popToTop: jest.fn(),
});

// Mock route
export const createMockRoute = (params: any = {}) => ({
  key: 'test-route',
  name: 'TestScreen',
  params,
});

// Wait for async operations
export const waitFor = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms));

// Mock fetch
export const createMockFetch = (
  response: any = { data: null, error: null },
) => {
  return jest.fn().mockResolvedValue({
    ok: !response.error,
    status: response.error ? 400 : 200,
    json: () => Promise.resolve(response),
    text: () => Promise.resolve(JSON.stringify(response)),
  });
};

// Mock environment variables
export const mockEnvVars = {
  EXPO_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
  EXPO_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
  EXPO_PUBLIC_MIXPANEL_TOKEN: 'test-mixpanel-token',
  EXPO_PUBLIC_SENTRY_DSN: 'https://test@sentry.io/test',
  EXPO_PUBLIC_REVENUECAT_APPLE_KEY: 'test-revenuecat-key',
};

// Test data generators
export const generateTestData = {
  users: (count: number) =>
    Array.from({ length: count }, (_, i) =>
      createMockUser({ id: `user-${i + 1}`, email: `user${i + 1}@test.com` }),
    ),
  assignments: (count: number, userId: string = 'test-user-1') =>
    Array.from({ length: count }, (_, i) =>
      createMockAssignment({ id: `assignment-${i + 1}`, user_id: userId }),
    ),
  courses: (count: number, userId: string = 'test-user-1') =>
    Array.from({ length: count }, (_, i) =>
      createMockCourse({ id: `course-${i + 1}`, user_id: userId }),
    ),
  notifications: (count: number, userId: string = 'test-user-1') =>
    Array.from({ length: count }, (_, i) =>
      createMockNotification({ id: `notification-${i + 1}`, user_id: userId }),
    ),
};

// Assertion helpers
export const expectToBeCalledWith = (mockFn: jest.Mock, ...args: any[]) => {
  expect(mockFn).toHaveBeenCalledWith(...args);
};

export const expectToHaveBeenCalledTimes = (
  mockFn: jest.Mock,
  times: number,
) => {
  expect(mockFn).toHaveBeenCalledTimes(times);
};

// Error testing helpers
export const expectToThrow = async (
  fn: () => Promise<any>,
  errorMessage?: string,
) => {
  await expect(fn()).rejects.toThrow(errorMessage);
};

export const expectNotToThrow = async (fn: () => Promise<any>) => {
  await expect(fn()).resolves.not.toThrow();
};

// Performance testing helpers
export const measureTime = async (fn: () => Promise<any>): Promise<number> => {
  const start = performance.now();
  await fn();
  const end = performance.now();
  return end - start;
};

// Cleanup helpers
export const cleanupMocks = () => {
  jest.clearAllMocks();
  jest.resetAllMocks();
  jest.restoreAllMocks();
};

// Test isolation helpers
export const withMockedEnv = (
  envVars: Record<string, string>,
  testFn: () => void,
) => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, ...envVars };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  testFn();
};
