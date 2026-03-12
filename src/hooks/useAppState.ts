import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';

/**
 * Hook to handle app state changes (offline MVP — auth sync removed)
 */
export function useAppStateSync() {
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (_nextAppState: AppStateStatus) => {
        // Offline mode — no auth sync needed
      },
    );

    return () => {
      subscription.remove();
    };
  }, []);
}
