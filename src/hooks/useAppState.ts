import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { authSyncService } from '@/services/authSync';

/**
 * Hook to handle app state changes and sync auth on resume
 */
export function useAppStateSync() {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        console.log('📱 App became active, syncing auth...');
        await authSyncService.onAppResume();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);
}
