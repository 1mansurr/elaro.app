/**
 * AppProviders - Consolidated Provider Component
 *
 * This component wraps all application-level providers in the correct order.
 * It consolidates the provider tree to improve maintainability and reduce nesting.
 *
 * Provider Order (outermost to innermost):
 * 1. QueryClientProvider - React Query for server state
 * 2. NetworkProvider - Network connectivity state
 * 3. ThemeProvider - Theme and dark mode support
 * 4. AuthProvider - Authentication state
 * 5. SoftLaunchProvider - Soft launch feature flags
 * 6. NotificationProvider - Notification state
 * 7. ToastProvider - Toast notifications
 *
 * Note: ErrorBoundary and NavigationContainer remain in App.tsx as they
 * require special handling with error reset and navigation refs.
 */

import React, { ReactNode, useMemo } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NetworkProvider } from '@/contexts/NetworkContext';
import { LocaleProvider } from '@/contexts/LocaleContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { SoftLaunchProvider } from '@/contexts/SoftLaunchContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { ToastProvider } from '@/contexts/ToastContext';

interface AppProvidersProps {
  children: ReactNode;
  queryClient: QueryClient; // QueryClient instance passed from App.tsx
}

/**
 * Consolidated provider component
 *
 * Wraps all app-level providers in the correct dependency order.
 * Providers are memoized to prevent unnecessary re-renders.
 */
export const AppProviders: React.FC<AppProvidersProps> = ({
  children,
  queryClient,
}) => {
  // Memoize providers to prevent unnecessary re-renders
  // Only recreate if queryClient changes
  const providers = useMemo(() => {
    return (
      <QueryClientProvider client={queryClient}>
        <NetworkProvider>
          <LocaleProvider>
            <ThemeProvider>
              <AuthProvider>
                <SoftLaunchProvider>
                  <NotificationProvider>
                    <ToastProvider>{children}</ToastProvider>
                  </NotificationProvider>
                </SoftLaunchProvider>
              </AuthProvider>
            </ThemeProvider>
          </LocaleProvider>
        </NetworkProvider>
      </QueryClientProvider>
    );
  }, [queryClient, children]);

  return providers;
};

/**
 * Provider Documentation:
 *
 * 1. QueryClientProvider (outermost)
 *    - Provides React Query client for server state management
 *    - Must wrap all components that use React Query hooks
 *
 * 2. NetworkProvider
 *    - Provides network connectivity state (isOnline, isOffline)
 *    - Used by components to handle offline scenarios
 *
 * 3. LocaleProvider
 *    - Provides locale state and i18n functions
 *    - Used for internationalization and RTL support
 *
 * 4. ThemeProvider
 *    - Provides theme state (light/dark mode)
 *    - Used by all themed components
 *
 * 5. AuthProvider
 *    - Provides authentication state (user, session)
 *    - Used throughout the app for auth checks
 *
 * 6. SoftLaunchProvider
 *    - Provides soft launch feature flags
 *    - Used for gradual feature rollouts
 *
 * 7. NotificationProvider
 *    - Provides notification state and handlers
 *    - Used for in-app notifications
 *
 * 8. ToastProvider (innermost)
 *    - Provides toast notification functionality
 *    - Used for temporary user feedback messages
 */
