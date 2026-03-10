// MVP stub: app is always treated as connected (offline-first)
import React, { createContext, useContext } from 'react';

interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean;
  isOnline: boolean;
  isOffline: boolean;
}

const always: NetworkState = {
  isConnected: true,
  isInternetReachable: true,
  isOnline: true,
  isOffline: false,
};

const NetworkContext = createContext<NetworkState>(always);

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <NetworkContext.Provider value={always}>
    {children}
  </NetworkContext.Provider>
);

export const useNetwork = () => useContext(NetworkContext);
