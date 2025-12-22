// Jest setup file for unit and integration tests
// This runs after jest-expo's setup

// Set global __DEV__ flag
(global as any).__DEV__ = true;

// Mock React Native modules
// Note: We avoid using jest.requireActual to prevent ES module transformation issues
jest.mock('react-native', () => {
  return {
    Platform: {
      OS: 'ios',
      select: jest.fn((obj: any) => obj.ios || obj.default),
      Version: '1.0.0',
    },
    InteractionManager: {
      runAfterInteractions: jest.fn((callback: () => void) => callback()),
    },
    StyleSheet: {
      create: (styles: any) => styles,
      flatten: (style: any) => style,
      compose: (...styles: any[]) => styles,
    },
    View: 'View',
    Text: 'Text',
    ScrollView: 'ScrollView',
    TouchableOpacity: 'TouchableOpacity',
    TouchableHighlight: 'TouchableHighlight',
    TouchableWithoutFeedback: 'TouchableWithoutFeedback',
    Image: 'Image',
    TextInput: 'TextInput',
    ActivityIndicator: 'ActivityIndicator',
    SafeAreaView: 'SafeAreaView',
    FlatList: 'FlatList',
    SectionList: 'SectionList',
    Alert: {
      alert: jest.fn(),
      prompt: jest.fn(),
    },
    AppState: {
      currentState: 'active',
      addEventListener: jest.fn(() => ({ remove: jest.fn() })),
      removeEventListener: jest.fn(),
    },
    Dimensions: {
      get: jest.fn(() => ({ width: 375, height: 812 })),
      addEventListener: jest.fn(() => ({ remove: jest.fn() })),
      removeEventListener: jest.fn(),
    },
    Linking: {
      openURL: jest.fn(() => Promise.resolve()),
      canOpenURL: jest.fn(() => Promise.resolve(true)),
      getInitialURL: jest.fn(() => Promise.resolve(null)),
      addEventListener: jest.fn(() => ({ remove: jest.fn() })),
      removeEventListener: jest.fn(),
    },
    BackHandler: {
      addEventListener: jest.fn(() => ({ remove: jest.fn() })),
      removeEventListener: jest.fn(),
      exitApp: jest.fn(),
    },
    Keyboard: {
      dismiss: jest.fn(),
      addListener: jest.fn(() => ({ remove: jest.fn() })),
      removeListener: jest.fn(),
    },
    Animated: {
      View: 'Animated.View',
      Text: 'Animated.Text',
      Image: 'Animated.Image',
      ScrollView: 'Animated.ScrollView',
      Value: jest.fn(() => ({
        setValue: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        stopAnimation: jest.fn(),
      })),
      timing: jest.fn(() => ({
        start: jest.fn((callback) => callback && callback({ finished: true })),
      })),
      spring: jest.fn(() => ({
        start: jest.fn((callback) => callback && callback({ finished: true })),
      })),
      sequence: jest.fn(() => ({
        start: jest.fn((callback) => callback && callback({ finished: true })),
      })),
      parallel: jest.fn(() => ({
        start: jest.fn((callback) => callback && callback({ finished: true })),
      })),
    },
    Easing: {
      linear: jest.fn(),
      ease: jest.fn(),
      quad: jest.fn(),
      cubic: jest.fn(),
      poly: jest.fn(),
      sin: jest.fn(),
      circle: jest.fn(),
      exp: jest.fn(),
      elastic: jest.fn(),
      back: jest.fn(),
      bounce: jest.fn(),
      bezier: jest.fn(),
      in: jest.fn(),
      out: jest.fn(),
      inOut: jest.fn(),
    },
    NativeModules: {},
    DeviceEventEmitter: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
      emit: jest.fn(),
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
jest.mock('@tanstack/react-query', () => {
  const actual = jest.requireActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: jest.fn(() => ({
      data: null,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    })),
    useInfiniteQuery: jest.fn(() => ({
      data: { pages: [], pageParams: [] },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    })),
    useMutation: jest.fn(() => ({
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
      isLoading: false,
      error: null,
    })),
    useQueryClient: jest.fn(() => ({
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
  };
});

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

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => {
  const NetInfoStateType = {
    unknown: 'unknown',
    none: 'none',
    cellular: 'cellular',
    wifi: 'wifi',
    bluetooth: 'bluetooth',
    ethernet: 'ethernet',
    wimax: 'wimax',
    vpn: 'vpn',
    other: 'other',
  };

  const NetInfoState = {
    unknown: {
      type: NetInfoStateType.unknown,
      isConnected: null,
      isInternetReachable: null,
      details: null,
    },
    none: {
      type: NetInfoStateType.none,
      isConnected: false,
      isInternetReachable: false,
      details: null,
    },
    wifi: {
      type: NetInfoStateType.wifi,
      isConnected: true,
      isInternetReachable: true,
      details: {
        ssid: 'test-ssid',
        bssid: 'test-bssid',
        strength: 100,
        ipAddress: '192.168.1.1',
        subnet: '255.255.255.0',
        frequency: 2400,
      },
    },
  };

  return {
    __esModule: true,
    default: {
      fetch: jest.fn(() =>
        Promise.resolve({
          type: NetInfoStateType.wifi,
          isConnected: true,
          isInternetReachable: true,
          details: NetInfoState.wifi.details,
        }),
      ),
      addEventListener: jest.fn(() => ({
        remove: jest.fn(),
      })),
      configure: jest.fn(),
      useNetInfo: jest.fn(() => ({
        type: NetInfoStateType.wifi,
        isConnected: true,
        isInternetReachable: true,
        details: NetInfoState.wifi.details,
      })),
    },
    NetInfoStateType,
    NetInfoState,
  };
});

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
  useAuth: jest.fn(() => ({
    user: {
      id: 'test-user-id',
      username: 'testuser',
      first_name: 'Test',
      last_name: 'User',
    },
    session: null,
    isLoading: false,
  })),
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

// Mock Expo modules that might be imported
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('notification-id')),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
  cancelAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve()),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  DEFAULT_ACTION_IDENTIFIER: 'DEFAULT',
}));

// Mock native modules
jest.mock('expo-modules-core', () => ({
  NativeModulesProxy: {},
  requireNativeModule: jest.fn(() => ({
    addListener: jest.fn(),
    removeListeners: jest.fn(),
  })),
}));

jest.mock('expo-device', () => ({
  __esModule: true,
  default: {
    isDevice: true,
    brand: 'Apple',
    modelName: 'iPhone',
    osName: 'iOS',
    osVersion: '15.0',
  },
  isDevice: true,
  brand: 'Apple',
  modelName: 'iPhone',
  osName: 'iOS',
  osVersion: '15.0',
}));

// Note: ExpoPushTokenManager is an internal module, we'll handle it via expo-notifications mock

// Suppress console warnings in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};
