// Jest setup file for unit and integration tests
// This runs after jest-expo's setup

// Set global __DEV__ flag
(global as any).__DEV__ = true;

// Mock React Native modules
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Platform: {
      OS: 'ios',
      select: jest.fn(obj => obj.ios || obj.default),
    },
    InteractionManager: {
      runAfterInteractions: jest.fn(callback => callback()),
    },
  };
});

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    replace: jest.fn(),
    reset: jest.fn(),
    dispatch: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
  useFocusEffect: jest.fn(),
  NavigationContainer: ({ children }: { children: React.ReactNode }) =>
    children,
}));

// Mock React Query
jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(() => ({
    data: null,
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  })),
  useMutation: jest.fn(() => ({
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isLoading: false,
    error: null,
  })),
  QueryClient: jest.fn(() => ({
    getQueryCache: jest.fn(() => ({
      getAll: jest.fn(() => []),
      subscribe: jest.fn(() => jest.fn()),
    })),
    setQueryData: jest.fn(),
    getQueryData: jest.fn(),
    invalidateQueries: jest.fn(),
    removeQueries: jest.fn(),
    clear: jest.fn(),
  })),
  QueryClientProvider: ({ children }: { children: React.ReactNode }) =>
    children,
  QueryCache: jest.fn(),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
          limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
      update: jest.fn(() => Promise.resolve({ data: null, error: null })),
      delete: jest.fn(() => Promise.resolve({ data: null, error: null })),
    })),
    auth: {
      getUser: jest.fn(() =>
        Promise.resolve({ data: { user: null }, error: null }),
      ),
      signInWithPassword: jest.fn(() =>
        Promise.resolve({ data: { user: null }, error: null }),
      ),
      signUp: jest.fn(() =>
        Promise.resolve({ data: { user: null }, error: null }),
      ),
      signOut: jest.fn(() => Promise.resolve({ error: null })),
      getSession: jest.fn(() =>
        Promise.resolve({ data: { session: null }, error: null }),
      ),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
    functions: {
      invoke: jest.fn(() => Promise.resolve({ data: null, error: null })),
    },
  })),
}));

// Mock Auth Context
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user-id',
      username: 'testuser',
      first_name: 'Test',
      last_name: 'User',
    },
    session: null,
    isLoading: false,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock services
jest.mock('@/services/PerformanceMonitoringService', () => ({
  performanceMonitoringService: {
    startTimer: jest.fn(),
    endTimer: jest.fn(),
  },
}));

jest.mock('@/services/RequestDeduplicationService', () => ({
  requestDeduplicationService: {
    deduplicateRequest: jest.fn((key, fn) => fn()),
  },
}));

// Mock Expo modules
jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {},
      version: '1.0.0',
    },
    platform: {
      ios: true,
    },
  },
}));

jest.mock('expo-updates', () => ({
  channel: 'default',
  updateId: 'test-update-id',
}));

// Suppress console warnings in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};
