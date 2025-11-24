/**
 * NetworkContext - Global Network Connectivity State
 *
 * This context provides real-time network connectivity information to the entire app.
 * It uses @react-native-community/netinfo to listen for connectivity changes and
 * exposes the current online/offline state.
 *
 * Usage:
 * ```tsx
 * const { isOnline, isOffline, networkType } = useNetwork();
 *
 * if (isOffline) {
 *   // Queue action for later sync
 * } else {
 *   // Execute action immediately
 * }
 * ```
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import NetInfo, {
  NetInfoState,
  NetInfoStateType,
} from '@react-native-community/netinfo';

/**
 * Network context state interface
 */
interface NetworkContextState {
  /** Whether the device is currently connected to the internet */
  isOnline: boolean;

  /** Whether the device is currently offline (inverse of isOnline) */
  isOffline: boolean;

  /** The type of network connection (wifi, cellular, none, etc.) */
  networkType: NetInfoStateType;

  /** Whether we're still checking the initial network state */
  isLoading: boolean;

  /** Detailed network information from NetInfo */
  netInfoState: NetInfoState | null;

  /** Manually refresh the network state */
  refresh: () => Promise<void>;
}

/**
 * Default context value (used for type safety)
 */
const defaultContextValue: NetworkContextState = {
  isOnline: true, // Assume online by default
  isOffline: false,
  networkType: 'unknown' as NetInfoStateType,
  isLoading: true,
  netInfoState: null,
  refresh: async () => {},
};

/**
 * Create the Network Context
 */
const NetworkContext = createContext<NetworkContextState>(defaultContextValue);

/**
 * Hook to access network state from any component
 */
export const useNetwork = (): NetworkContextState => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};

/**
 * Props for NetworkProvider
 */
interface NetworkProviderProps {
  children: ReactNode;
}

/**
 * NetworkProvider Component
 *
 * Wraps the app and provides network connectivity state to all children.
 * Should be placed high in the component tree (in App.tsx).
 */
export const NetworkProvider: React.FC<NetworkProviderProps> = ({
  children,
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [networkType, setNetworkType] = useState<NetInfoStateType>(
    'unknown' as NetInfoStateType,
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [netInfoState, setNetInfoState] = useState<NetInfoState | null>(null);

  /**
   * Handle network state changes from NetInfo
   */
  const handleNetworkChange = (state: NetInfoState) => {
    console.log('🌐 Network state changed:', {
      isConnected: state.isConnected,
      isInternetReachable: state.isInternetReachable,
      type: state.type,
    });

    setNetInfoState(state);
    setNetworkType(state.type);

    // Consider online if connected AND internet is reachable
    // If isInternetReachable is null, we assume online (optimistic)
    const online =
      state.isConnected === true &&
      (state.isInternetReachable === true ||
        state.isInternetReachable === null);

    setIsOnline(online);
    setIsLoading(false);

    // Log status change
    if (online) {
      console.log('✅ Device is ONLINE');
    } else {
      console.log('⚠️ Device is OFFLINE');
    }
  };

  /**
   * Manually refresh network state
   */
  const refresh = async () => {
    try {
      const state = await NetInfo.fetch();
      handleNetworkChange(state);
    } catch (error) {
      console.error('❌ Error refreshing network state:', error);
    }
  };

  /**
   * Subscribe to network state changes on mount
   */
  useEffect(() => {
    console.log('🚀 NetworkProvider: Initializing network monitoring...');

    // Get initial network state
    NetInfo.fetch().then(handleNetworkChange);

    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener(handleNetworkChange);

    // Cleanup subscription on unmount
    return () => {
      console.log('🔌 NetworkProvider: Cleaning up network monitoring...');
      unsubscribe();
    };
  }, []);

  /**
   * Context value to provide to consumers
   */
  const value: NetworkContextState = {
    isOnline,
    isOffline: !isOnline,
    networkType,
    isLoading,
    netInfoState,
    refresh,
  };

  return (
    <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>
  );
};

/**
 * Export the context itself (for advanced use cases)
 */
export { NetworkContext };
