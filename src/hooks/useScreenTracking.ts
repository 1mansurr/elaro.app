import { useEffect } from 'react';
import { useNavigationState } from '@react-navigation/native';
import { mixpanelService } from '@/services/mixpanel';
import { AnalyticsEvents } from '@/services/analyticsEvents';

export const useScreenTracking = () => {
  const navigationState = useNavigationState(state => state);

  useEffect(() => {
    if (navigationState) {
      const currentRoute = navigationState.routes[navigationState.index];

      if (currentRoute && currentRoute.name) {
        mixpanelService.track(AnalyticsEvents.SCREEN_VIEWED, {
          screen_name: currentRoute.name,
          route_name: currentRoute.name,
          route_params: currentRoute.params,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }, [navigationState?.index, navigationState?.routes]);
};
