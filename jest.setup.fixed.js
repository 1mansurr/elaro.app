// Global variables
global.__DEV__ = true;

// Mock React Native modules
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Platform: {
      OS: 'ios',
      select: jest.fn((obj) => obj.ios || obj.default),
    },
    Dimensions: {
      get: jest.fn(() => ({ width: 375, height: 812 })),
    },
    StyleSheet: {
      create: jest.fn((styles) => styles),
      flatten: jest.fn((style) => style),
      absoluteFill: {},
      absoluteFillObject: {},
      hairlineWidth: 1,
    },
    View: 'View',
    Text: 'Text',
    ScrollView: 'ScrollView',
    TouchableOpacity: 'TouchableOpacity',
    TouchableWithoutFeedback: 'TouchableWithoutFeedback',
    Animated: {
      View: 'Animated.View',
      Text: 'Animated.Text',
      Value: jest.fn(() => ({
        interpolate: jest.fn(() => ({})),
        addListener: jest.fn(),
        removeListener: jest.fn(),
      })),
      spring: jest.fn(),
      timing: jest.fn(),
      sequence: jest.fn(),
      parallel: jest.fn(),
      stagger: jest.fn(),
      loop: jest.fn(),
      delay: jest.fn(),
    },
  };
});

// Mock all Expo modules
jest.mock('@expo/vector-icons', () => require('./__tests__/__mocks__/expo-vector-icons'));
jest.mock('expo-font', () => require('./__tests__/__mocks__/expo-font'));
jest.mock('expo-constants', () => require('./__tests__/__mocks__/expo-constants'));

// Mock other problematic modules
jest.mock('expo-blur', () => ({
  BlurView: 'BlurView',
}));

jest.mock('expo-device', () => ({
  isDevice: true,
  osName: 'iOS',
  osVersion: '17.0',
}));

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('notification-id')),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
  getAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve([])),
  setNotificationHandler: jest.fn(),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
  multiRemove: jest.fn(),
}));

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
          limit: jest.fn(() => Promise.resolve({ data: [], error: null }))
        })),
        limit: jest.fn(() => Promise.resolve({ data: [], error: null }))
      })),
      insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
      update: jest.fn(() => Promise.resolve({ data: null, error: null })),
      delete: jest.fn(() => Promise.resolve({ data: null, error: null })),
    })),
    auth: {
      getUser: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      signInWithPassword: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      signUp: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      signOut: jest.fn(() => Promise.resolve({ error: null })),
    },
    functions: {
      invoke: jest.fn(() => Promise.resolve({ data: null, error: null })),
    },
  })),
}));

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    replace: jest.fn(),
    reset: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
  useFocusEffect: jest.fn(),
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
  QueryClient: jest.fn(),
  QueryClientProvider: ({ children }) => children,
}));

// Mock app-specific modules
jest.mock('@/features/auth/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user-id',
      username: 'testuser',
      first_name: 'Test',
      last_name: 'User',
    },
  }),
}));

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
