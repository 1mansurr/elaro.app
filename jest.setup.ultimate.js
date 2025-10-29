// Global variables
global.__DEV__ = true;

// Mock React Native completely without using requireActual
jest.mock('react-native', () => ({
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
  RefreshControl: 'RefreshControl',
  Alert: {
    alert: jest.fn(),
  },
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
  AccessibilityInfo: {
    isScreenReaderEnabled: jest.fn(() => Promise.resolve(false)),
  },
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
  BackHandler: {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
  DeviceEventEmitter: {
    addListener: jest.fn(),
    removeListener: jest.fn(),
  },
  NativeModules: {},
  NativeEventEmitter: jest.fn(),
}));

// Mock @expo/vector-icons to prevent native module access
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialIcons: 'MaterialIcons',
  FontAwesome: 'FontAwesome',
  AntDesign: 'AntDesign',
  Entypo: 'Entypo',
  EvilIcons: 'EvilIcons',
  Feather: 'Feather',
  FontAwesome5: 'FontAwesome5',
  Foundation: 'Foundation',
  MaterialCommunityIcons: 'MaterialCommunityIcons',
  Octicons: 'Octicons',
  SimpleLineIcons: 'SimpleLineIcons',
  Zocial: 'Zocial',
}));

// Mock all Expo modules
jest.mock('expo-font', () => ({
  loadAsync: jest.fn(() => Promise.resolve()),
  isLoaded: jest.fn(() => true),
  getAssetForDisplay: jest.fn(),
}));

jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {
        eas: {
          projectId: 'test-project-id'
        }
      }
    }
  }
}));

jest.mock('expo-blur', () => ({
  BlurView: 'BlurView',
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

jest.mock('expo-haptics', () => ({
  Haptics: {
    impactAsync: jest.fn(),
    notificationAsync: jest.fn(),
    selectionAsync: jest.fn(),
  },
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

// Mock services
jest.mock('@/services/mixpanel', () => ({
  mixpanelService: {
    track: jest.fn(),
    trackEvent: jest.fn(),
  },
}));

jest.mock('@/services/PerformanceMonitoringService', () => ({
  performanceMonitoringService: {
    startTimer: jest.fn(),
    endTimer: jest.fn(),
    recordMetric: jest.fn(),
    getMetrics: jest.fn(() => ({})),
    enableDebugMode: jest.fn(),
  },
}));

jest.mock('@/services/RequestDeduplicationService', () => ({
  requestDeduplicationService: {
    deduplicateRequest: jest.fn((key, fn) => fn()),
  },
}));

jest.mock('@/services/supabase', () => ({
  supabase: {
    functions: {
      invoke: jest.fn(),
    },
  },
}));

// Mock contexts
jest.mock('@/features/auth/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user-id',
      username: 'testuser',
      first_name: 'Test',
      subscription_tier: 'free',
      subscription_status: 'active',
    },
    session: { user: { id: 'test-user-id' } },
    refreshUser: jest.fn(),
  }),
}));

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light',
    colors: {
      primary: '#007AFF',
      background: '#FFFFFF',
      text: '#000000',
    },
  }),
}));

jest.mock('@/contexts/ToastContext', () => ({
  useToast: () => ({
    showToast: jest.fn(),
  }),
}));

// Mock hooks
jest.mock('@/hooks', () => ({
  useHomeScreenData: () => ({
    data: null,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    isRefetching: false,
  }),
  useMonthlyTaskCount: () => ({
    monthlyTaskCount: 0,
  }),
  useCompleteTask: () => ({
    mutateAsync: jest.fn(),
  }),
  useDeleteTask: () => ({
    mutateAsync: jest.fn(),
  }),
  useRestoreTask: () => ({
    mutateAsync: jest.fn(),
  }),
}));

jest.mock('@/hooks/useMemoization', () => ({
  useStableCallback: (callback) => callback,
  useExpensiveMemo: (fn, deps, options) => fn(),
}));

// Mock utility functions
jest.mock('@/utils/exampleData', () => ({
  createExampleData: jest.fn(() => Promise.resolve({ success: true })),
}));

jest.mock('@/utils/draftStorage', () => ({
  getDraftCount: jest.fn(() => Promise.resolve(0)),
}));

jest.mock('@/utils/errorMapping', () => ({
  mapErrorCodeToMessage: jest.fn((error) => 'Error message'),
  getErrorTitle: jest.fn((error) => 'Error'),
}));

jest.mock('@/utils/analyticsEvents', () => ({
  TASK_EVENTS: {
    TASK_EDIT_INITIATED: 'task_edit_initiated',
  },
}));

jest.mock('@/services/analyticsEvents', () => ({
  AnalyticsEvents: {
    SIGN_UP_PROMPTED: 'sign_up_prompted',
    TASK_DETAILS_VIEWED: 'task_details_viewed',
    STUDY_SESSION_CREATED: 'study_session_created',
    ASSIGNMENT_CREATED: 'assignment_created',
    LECTURE_CREATED: 'lecture_created',
  },
}));
