import React from 'react';
import { useScreenTracking } from '@/hooks/useScreenTracking';
import { AuthenticatedNavigator } from './AuthenticatedNavigator';

export const AppNavigator: React.FC = () => {
  useScreenTracking();
  return <AuthenticatedNavigator />;
};
