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
  // FIX 3: Include isInitializing to prevent navigation during auth transitions
  const { session, loading, isInitializing, user } = useAuth();

  // Enable automatic screen tracking
  useScreenTracking();

  // FIX 3: Wait until auth initialization is complete before deciding which navigator to show
  // This prevents switching navigators during transient auth states
  if (loading || isInitializing) {
    return <LoadingFallback />;
  }

  // Debug logging to verify session state
  if (__DEV__) {
    console.log('🔍 [AppNavigator] Session state:', {
      hasSession: !!session,
      hasUser: !!user,
      isInitializing,
      sessionId: session?.access_token
        ? session.access_token.substring(0, 10) + '...'
        : 'none',
    });
  }

  // FIX 3: Only show AuthenticatedNavigator when we have both session AND user
  // This ensures navigation doesn't happen with session but no user profile
  // FIX 5: Ensure session → user relationship is consistent
  const isAuthenticated = !!session && !!user;

  // CRITICAL FIX: Add production logging for auth state transitions
  // This helps diagnose blank screen issues in production after OTA updates
  if (!__DEV__) {
    console.log('[AppNavigator] Auth state:', {
      hasSession: !!session,
      hasUser: !!user,
      isAuthenticated,
      isInitializing,
      loading,
    });
  }

  // Return appropriate navigator based on authentication state
  return isAuthenticated ? <AuthenticatedNavigator /> : <AuthNavigator />;
};
