// Global variables
global.__DEV__ = true;

// Mock React Native completely to avoid native module issues
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
  };
});

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

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user-id',
      username: 'testuser',
      first_name: 'Test',
      last_name: 'User',
    },
  }),
}));

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      background: '#ffffff',
      text: '#000000',
      accent: '#007AFF',
    },
  }),
}));

jest.mock('@/contexts/ToastContext', () => ({
  useToast: () => ({
    showToast: jest.fn(),
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

jest.mock('@/services/notifications/NotificationHistoryService', () => ({
  notificationHistoryService: {
    getUnreadCount: jest.fn(() => Promise.resolve(0)),
    markAsRead: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('@/services/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
    })),
    auth: {
      getUser: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
    },
    functions: {
      invoke: jest.fn(() => Promise.resolve({ data: null, error: null })),
    },
  },
}));

jest.mock('@/services/mixpanel', () => require('./__tests__/__mocks__/mixpanel'));
jest.mock('@/services/analyticsEvents', () => require('./__tests__/__mocks__/analyticsEvents'));
jest.mock('@/utils/errorMapping', () => require('./__tests__/__mocks__/errorMapping'));
jest.mock('@/utils/exampleData', () => require('./__tests__/__mocks__/exampleData'));
jest.mock('@/utils/draftStorage', () => require('./__tests__/__mocks__/draftStorage'));
jest.mock('@/utils/analyticsEvents', () => require('./__tests__/__mocks__/analyticsEventsUtils'));

jest.mock('@/constants/theme', () => ({
  COLORS: {
    background: '#ffffff',
    textPrimary: '#000000',
    textSecondary: '#666666',
    accent: '#007AFF',
  },
  FONT_SIZES: {
    xxl: 24,
    xl: 20,
    lg: 18,
    md: 16,
    sm: 14,
  },
  FONT_WEIGHTS: {
    bold: 'bold',
    medium: '500',
    normal: 'normal',
  },
  SPACING: {
    lg: 24,
    md: 16,
    sm: 8,
  },
}));

// Mock hooks
jest.mock('@/hooks/useDataQueries', () => ({
  useHomeScreenData: jest.fn(() => ({
    data: null,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    isRefetching: false,
  })),
}));

jest.mock('@/hooks/useWeeklyTaskCount', () => ({
  useMonthlyTaskCount: jest.fn(() => ({
    monthlyTaskCount: 0,
  })),
}));

jest.mock('@/hooks', () => ({
  useCompleteTask: jest.fn(() => ({
    mutateAsync: jest.fn(() => Promise.resolve()),
  })),
  useDeleteTask: jest.fn(() => ({
    mutateAsync: jest.fn(() => Promise.resolve()),
  })),
  useRestoreTask: jest.fn(() => ({
    mutateAsync: jest.fn(() => Promise.resolve()),
  })),
}));

// Mock shared components
jest.mock('@/shared/components', () => ({
  Button: 'Button',
  FloatingActionButton: 'FloatingActionButton',
}));

jest.mock('@/shared/components/FloatingActionButton', () => 'FloatingActionButton');

// Mock dashboard components
jest.mock('@/features/dashboard/components/TrialBanner', () => 'TrialBanner');
jest.mock('@/features/dashboard/components/NextTaskCard', () => 'NextTaskCard');
jest.mock('@/features/dashboard/components/TodayOverviewCard', () => 'TodayOverviewCard');
jest.mock('@/features/dashboard/components/SwipeableTaskCard', () => 'SwipeableTaskCard');

// Mock notification components
jest.mock('@/features/notifications/components/NotificationBell', () => 'NotificationBell');
jest.mock('@/features/notifications/components/NotificationHistoryModal', () => 'NotificationHistoryModal');

// Mock shared components
jest.mock('@/shared/components/TaskDetailSheet', () => 'TaskDetailSheet');
jest.mock('@/shared/components', () => ({
  QuickAddModal: 'QuickAddModal',
}));
