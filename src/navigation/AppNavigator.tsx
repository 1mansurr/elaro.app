import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';

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
      backgroundColor: '#f8f9fa',
    }}>
    <ActivityIndicator size="large" color="#007AFF" />
  </View>
);

// Main App Navigator component
export const AppNavigator: React.FC = () => {
  const { session, loading } = useAuth();
  const [forceShow, setForceShow] = useState(false);

  // Enable automatic screen tracking
  useScreenTracking();

  // Add maximum timeout - don't wait more than 5 seconds for auth to load
  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        console.warn(
          '⚠️ [AppNavigator] Auth loading timeout - showing app anyway',
        );
        setForceShow(true);
      }, 5000); // 5 second max timeout

      return () => clearTimeout(timeout);
    } else {
      setForceShow(false);
    }
  }, [loading]);

  // Show loading screen while determining auth state (but not forever)
  if (loading && !forceShow) {
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
