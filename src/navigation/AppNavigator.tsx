import React from 'react';
import { View, ActivityIndicator } from 'react-native';

import { useAuth } from '@/contexts/AuthContext';
import { useScreenTracking } from '../hooks/useScreenTracking';
import { AuthenticatedNavigator } from './AuthenticatedNavigator';
import { GuestNavigator } from './GuestNavigator';

// Loading fallback component
const LoadingFallback = () => (
  <View
    style={{
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#f8f9fa',
    }}>
    <ActivityIndicator size="large" color="#007AFF" />
  </View>
);

// Main App Navigator component
export const AppNavigator: React.FC = () => {
  const { session, loading } = useAuth();

  // Enable automatic screen tracking
  useScreenTracking();

  // Show loading screen while determining auth state
  if (loading) {
    return <LoadingFallback />;
  }

  // Return appropriate navigator based on authentication state
  return session ? <AuthenticatedNavigator /> : <GuestNavigator />;
};
