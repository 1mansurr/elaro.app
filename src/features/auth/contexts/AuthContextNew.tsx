import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { Alert } from 'react-native';
import { supabase, authService as supabaseAuthService } from '@/services/supabase';
import { authService } from '@/features/auth/services/authService';
import { User } from '@/types';
import { UserProfileService } from '../services/UserProfileService';
import { SessionTimeoutService } from '../services/SessionTimeoutService';
import { AuthAnalyticsService } from '../services/AuthAnalyticsService';
import { BiometricAuthService } from '../services/BiometricAuthService';
import { cache } from '@/utils/cache';
// import { errorTrackingService } from '@/services/ErrorTrackingService';
import { 
  checkAccountLockout, 
  recordFailedAttempt, 
  recordSuccessfulLogin, 
  getLockoutMessage,
  resetFailedAttempts 
} from '@/utils/authLockout';
import { Platform } from 'react-native';

interface LoginCredentials {
  email: string;
  password: string;
}

interface SignUpCredentials extends LoginCredentials {
  firstName: string;
  lastName: string;
}

interface BiometricAuthState {
  isAvailable: boolean;
  isEnabled: boolean;
  enable: (user: User) => Promise<{ success: boolean; error?: string }>;
  disable: () => Promise<void>;
  authenticate: (promptMessage?: string) => Promise<{ success: boolean; error?: string }>;
  signIn: () => Promise<{ 
    success: boolean; 
    credentials?: { email: string; userId: string }; 
    error?: string 
  }>;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isGuest: boolean;
  biometricAuth: BiometricAuthState;
  signIn: (credentials: LoginCredentials) => Promise<{ user: SupabaseUser; session: Session } | { error: unknown }>;
  signUp: (credentials: SignUpCredentials) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Services
  const userProfileService = UserProfileService.getInstance();
  const sessionTimeoutService = SessionTimeoutService.getInstance();
  const authAnalyticsService = AuthAnalyticsService.getInstance();
  const biometricAuthService = BiometricAuthService.getInstance();

  const fetchUserProfile = useCallback(async (userId: string): Promise<User | null> => {
    try {
      return await userProfileService.fetchUserProfile(userId);
    } catch (error) {
      console.error('❌ Error fetching user profile:', error);
      return null;
    }
  }, [userProfileService]);

  const refreshUser = useCallback(async () => {
    if (session?.user?.id) {
      const userProfile = await fetchUserProfile(session.user.id);
      if (userProfile) {
        setUser(userProfile);
      }
    }
  }, [session, fetchUserProfile]);

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const initialSession = await authService.getSession();
        setSession(initialSession);
        
        if (initialSession?.user) {
          const userProfile = await fetchUserProfile(initialSession.user.id);
          setUser(userProfile);
        }
      } catch (error) {
        console.error('❌ Error getting initial session:', error);
        setSession(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [fetchUserProfile]);

  // Listen for auth changes
  useEffect(() => {
    const subscription = authService.onAuthChange(async (event, session) => {
      setSession(session);
      
      if (session?.user) {
        const userProfile = await fetchUserProfile(session.user.id);
        setUser(userProfile);

        // Handle analytics and trial logic
        if (userProfile) {
          authAnalyticsService.identifyUser(userProfile);
          authAnalyticsService.trackLogin({
            method: 'email',
            subscription_tier: userProfile.subscription_tier || 'free',
            onboarding_completed: userProfile.onboarding_completed,
          });

          // Trial logic
          if (userProfile.subscription_tier === 'free' && userProfile.subscription_expires_at === null) {
            // Trial logic here
          }
        }

        // Update last active timestamp
        await sessionTimeoutService.updateLastActiveTimestamp();
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserProfile, authAnalyticsService, sessionTimeoutService]);

  // Check for session timeout
  useEffect(() => {
    const checkSessionTimeout = async () => {
      if (session) {
        const expired = await sessionTimeoutService.checkAndHandleTimeout();
        if (expired) {
          await signOut();
        }
      }
    };

    if (session) {
      checkSessionTimeout();
    }
  }, [session, sessionTimeoutService]);

  const signIn = useCallback(async (credentials: LoginCredentials) => {
    try {
      // Check account lockout
      const lockoutCheck = await checkAccountLockout(credentials.email);
      if (lockoutCheck.isLocked) {
        return { error: { message: getLockoutMessage(lockoutCheck.minutesRemaining || 0) } };
      }

      const result = await authService.login(credentials);
      
      // If we get here, login was successful
      await recordSuccessfulLogin(credentials.email);
      resetFailedAttempts(credentials.email);
      
      // Update last active timestamp
      await sessionTimeoutService.updateLastActiveTimestamp();
      
      // Track successful login
      authAnalyticsService.trackLogin({
        method: 'email',
        subscription_tier: user?.subscription_tier || 'free',
        onboarding_completed: user?.onboarding_completed,
      });
      
      return result;
    } catch (error) {
      console.error('❌ Sign in error:', error);
      await recordFailedAttempt(credentials.email);
      
      authAnalyticsService.trackError({
        type: 'signin_failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      
      return { error };
    }
  }, [authAnalyticsService, sessionTimeoutService, user]);

  const signUp = useCallback(async (credentials: SignUpCredentials) => {
    try {
      await authService.signUp(credentials);
      
      authAnalyticsService.trackSignup({
        method: 'email',
        has_first_name: !!credentials.firstName,
        has_last_name: !!credentials.lastName,
      });
      
      return { error: null };
    } catch (error) {
      console.error('❌ Sign up error:', error);
      
      authAnalyticsService.trackError({
        type: 'signup_failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      
      return { error };
    }
  }, [authAnalyticsService]);

  const signOut = useCallback(async () => {
    try {
      authAnalyticsService.trackLogout({
        reason: 'manual',
      });
      
      // Clear all cached data on logout
      await cache.clearAll();
      
      // Clear session timeout
      await sessionTimeoutService.clearSessionTimeout();
      
      await authService.signOut();
    } catch (error) {
      console.error('❌ Sign out error:', error);
    }
  }, [authAnalyticsService, sessionTimeoutService]);

  // Biometric auth state
  const biometricAuth: BiometricAuthState = {
    isAvailable: false, // Will be updated by biometric hook
    isEnabled: false,   // Will be updated by biometric hook
    enable: async (user: User) => {
      return await biometricAuthService.enableBiometricAuth(user);
    },
    disable: async () => {
      await biometricAuthService.disableBiometricAuth();
    },
    authenticate: async (promptMessage?: string) => {
      return await biometricAuthService.authenticateWithBiometric(promptMessage);
    },
    signIn: async () => {
      return await biometricAuthService.signInWithBiometric();
    },
  };

  const value: AuthContextType = {
    session,
    user,
    loading,
    isGuest: !session,
    biometricAuth,
    signIn,
    signUp,
    signOut,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
