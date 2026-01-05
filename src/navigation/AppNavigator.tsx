import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';

import { useAuth } from '@/contexts/AuthContext';
import { useScreenTracking } from '@/hooks/useScreenTracking';
import { AuthenticatedNavigator } from './AuthenticatedNavigator';
import { AuthNavigator } from './AuthNavigator';

// Loading fallback component
const LoadingFallback = () => (
  <View
    style={{
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#f8f9fa', // Changed from COLORS.background to ensure visibility
    }}>
    <ActivityIndicator size="large" color="#007AFF" />
    <Text style={{ marginTop: 16, color: '#666', fontSize: 14 }}>
      Loading...
    </Text>
  </View>
);

// Main App Navigator component
export const AppNavigator: React.FC = () => {
  const { session, loading } = useAuth();

  // Enable automatic screen tracking
  useScreenTracking();

  // STEP 3 FIX: Removed forceShow timeout - rely on master timeout in AppWithErrorBoundary
  // Show loading screen while determining auth state
  if (loading) {
    return <LoadingFallback />;
  }

  // Debug logging to verify session state
  if (__DEV__) {
    console.log('🔍 [AppNavigator] Session state:', {
      hasSession: !!session,
      sessionId: session?.access_token
        ? session.access_token.substring(0, 10) + '...'
        : 'none',
    });
  }

  // Return appropriate navigator based on authentication state
  return session ? <AuthenticatedNavigator /> : <AuthNavigator />;
};
