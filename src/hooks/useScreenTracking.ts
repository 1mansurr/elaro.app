import { useEffect } from 'react';
import { useNavigationState } from '@react-navigation/native';
import { mixpanelService } from '@/services/mixpanel';
import { AnalyticsEvents } from '@/services/analyticsEvents';

export const useScreenTracking = () => {
  // useNavigationState will return undefined if navigation container isn't ready
  // This hook can only be used inside NavigationContainer, so it should be safe
  const navigationState = useNavigationState(state => state);

  useEffect(() => {
    // Only track if navigation state is valid and has routes
    // Add comprehensive validation to prevent errors during initialization
    if (
      navigationState &&
      navigationState.routes &&
      Array.isArray(navigationState.routes) &&
      navigationState.routes.length > 0 &&
      typeof navigationState.index === 'number' &&
      navigationState.index >= 0 &&
      navigationState.index < navigationState.routes.length
    ) {
      const currentRoute = navigationState.routes[navigationState.index];

      if (currentRoute && currentRoute.name) {
        try {
          mixpanelService.track(AnalyticsEvents.SCREEN_VIEWED, {
            screen_name: currentRoute.name,
            route_name: currentRoute.name,
            route_params: currentRoute.params,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          // Silently fail if Mixpanel isn't initialized yet
          // This prevents errors during app startup
          // The warning "Mixpanel not initialized" is already handled by mixpanelService
        }
      }
    }
  }, [navigationState?.index, navigationState?.routes]);
};
