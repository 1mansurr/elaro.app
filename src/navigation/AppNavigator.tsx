import React from 'react';

import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useScreenTracking } from '../hooks/useScreenTracking';
import { AuthenticatedNavigator } from './AuthenticatedNavigator';
import { GuestNavigator } from './GuestNavigator';

// Main App Navigator component
export const AppNavigator: React.FC = () => {
  const { session } = useAuth(); // Auth loading is handled at splash level
  
  // Enable automatic screen tracking
  useScreenTracking();

  // Return appropriate navigator based on authentication state
  // Auth loading is handled in AppInitializer, so at this point auth is ready
  return session ? <AuthenticatedNavigator /> : <GuestNavigator />;
};